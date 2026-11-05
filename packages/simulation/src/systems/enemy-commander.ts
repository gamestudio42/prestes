import type { Command, SimEvent, Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import { applyCommand } from './commands';

/**
 * The 3v3 battle's flow (battle-feel-3v3): the legalist commander and the rule
 * that keeps either side from standing idle once contact is lost. Both act
 * only through ordinary commands, the same ones the player's HUD sends.
 */

/** A withdrawn section that has stopped rallies: it defends where it stands and is never pulled back again. */
export type SectionPlan = 'hold' | 'attack' | 'withdraw' | 'rallied';

export interface BattleMemory {
  /** The enemy commander's plan for each legalist section. */
  readonly plans: Map<number, SectionPlan>;
  /** Where each section last knew an enemy to be, and when (tick). */
  readonly contacts: Map<number, { x: number; y: number; tick: number }>;
  lastShotTick: number;
}

export function createBattleMemory(): BattleMemory {
  return { plans: new Map(), contacts: new Map(), lastShotTick: 0 };
}

/** How often (ticks) the commander and the contact rule look at the field. */
const THINK_EVERY = 10;
/** A section idle this long (ticks) after its last contact closes on it. */
const LOST_CONTACT_TICKS = 100;
/** The commander counterattacks at this ratio of fit soldiers. */
const ADVANTAGE = 1.4;
/** With no shot for this long (ticks, 30 s), a holding commander goes looking. */
const QUIET_TICKS = 300;
/** A section this small, or mostly pinned, withdraws. */
const BROKEN_SECTION = 4;
/** Orders under which a section holds its ground: never moved by the contact rule. */
const HOLDING = new Set(['defend', 'ambush', 'reserve', 'withdraw', 'flee']);

const fit = (unit: MutableUnit) => unit.alive && !unit.incapacitated && !unit.routed && !unit.dummy;
const SIDES = ['column', 'legalist'] as const;

function issue(ctx: SimContext, command: Command, tick: number, events: SimEvent[]): void {
  applyCommand(ctx, { seq: -1, tick, command }, tick, events);
}

function centroid(units: readonly { x: number; y: number }[]): Vec2 {
  return {
    x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
    y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
  };
}

function sections(ctx: SimContext, faction: (typeof SIDES)[number]): Map<number, MutableUnit[]> {
  const result = new Map<number, MutableUnit[]>();
  for (const unit of ctx.units) {
    if (unit.faction !== faction || !fit(unit) || unit.role !== undefined) continue;
    const list = result.get(unit.squadId) ?? [];
    list.push(unit);
    result.set(unit.squadId, list);
  }
  return result;
}

function nearestFit(ctx: SimContext, from: Vec2, faction: string): MutableUnit | null {
  let best: MutableUnit | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const unit of ctx.units) {
    if (unit.faction !== faction || !fit(unit)) continue;
    const distance = (unit.x - from.x) ** 2 + (unit.y - from.y) ** 2;
    if (distance < bestDistance) {
      best = unit;
      bestDistance = distance;
    }
  }
  return best;
}

/** Each section remembers where it last saw or was fired on by the enemy. */
function recordContacts(ctx: SimContext, tick: number, events: readonly SimEvent[]): void {
  const memory = ctx.battle;
  const squadOf = new Map(ctx.units.map((unit) => [unit.id, unit.squadId]));
  for (const event of events) {
    if (event.type !== 'shot') continue;
    memory.lastShotTick = tick;
    const shooterSquad = squadOf.get(event.source);
    const targetSquad = squadOf.get(event.target);
    if (shooterSquad !== undefined) memory.contacts.set(shooterSquad, { x: event.x2, y: event.y2, tick });
    if (targetSquad !== undefined) memory.contacts.set(targetSquad, { x: event.x, y: event.y, tick });
  }
  for (const unit of ctx.units) {
    if (!fit(unit) || unit.targetId === null) continue;
    const target = ctx.units.find((entry) => entry.id === unit.targetId);
    if (target && fit(target)) memory.contacts.set(unit.squadId, { x: target.x, y: target.y, tick });
  }
}

/**
 * A section of either side that has lost the enemy for 10 s, and is not
 * holding an ordered position, advances on where it last knew him; at that
 * spot, on the enemy's main body.
 */
function closeOnLostContact(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const side of SIDES) {
    const enemy = side === 'column' ? 'legalist' : 'column';
    const enemies = ctx.units.filter((unit) => unit.faction === enemy && fit(unit));
    if (enemies.length === 0) continue;
    for (const [squadId, section] of sections(ctx, side)) {
      const idle = section.every(
        (unit) =>
          unit.targetId === null &&
          unit.path.length === 0 &&
          unit.boundTeam === null &&
          !unit.holdPosition &&
          !HOLDING.has(unit.currentOrder ?? ''),
      );
      if (!idle) continue;
      // Only a section that has met the enemy goes after him: before the
      // first contact the player (or the commander) decides when to move.
      const contact = ctx.battle.contacts.get(squadId);
      if (!contact || tick - contact.tick < LOST_CONTACT_TICKS) continue;
      const here = centroid(section);
      const reached = contact && Math.sqrt((contact.x - here.x) ** 2 + (contact.y - here.y) ** 2) < 10;
      const to = contact && !reached ? { x: contact.x, y: contact.y } : centroid(enemies);
      // At the reached spot, keep the contact (fresh) but aim at the main body.
      if (reached) ctx.battle.contacts.set(squadId, { ...to, tick });
      issue(ctx, { type: 'order', order: 'advance', unitIds: section.map((unit) => unit.id), to }, tick, events);
    }
  }
}

/** The legalist commander: hold in cover, counterattack with the advantage, pull back a broken section. */
function commandLegalists(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const plans = ctx.battle.plans;
  const own = sections(ctx, 'legalist');
  const theirs = sections(ctx, 'column');
  const ownFit = [...own.values()].reduce((sum, list) => sum + list.length, 0);
  const theirFit = [...theirs.values()].reduce((sum, list) => sum + list.length, 0);
  if (theirFit === 0) return;
  const enemyCentre = centroid([...theirs.values()].flat());

  for (const [squadId, section] of own) {
    const plan = plans.get(squadId);
    const ids = section.map((unit) => unit.id);
    const here = centroid(section);
    if (plan === undefined) {
      // Deploy: a defended line a little forward of the start, facing the enemy.
      const dx = enemyCentre.x - here.x;
      const dy = enemyCentre.y - here.y;
      const length = Math.sqrt(dx ** 2 + dy ** 2) || 1;
      const to = { x: here.x + (dx / length) * 10, y: here.y + (dy / length) * 10 };
      issue(ctx, { type: 'order', order: 'defend', unitIds: ids, to, facing: { x: dx / length, y: dy / length } }, tick, events);
      plans.set(squadId, 'hold');
      continue;
    }
    if (plan === 'withdraw') {
      if (section.every((unit) => unit.path.length === 0)) {
        issue(ctx, { type: 'order', order: 'defend', unitIds: ids, to: here }, tick, events);
        plans.set(squadId, 'rallied');
      }
      continue;
    }
    const pinned = section.filter((unit) => unit.state === 'pinned' || unit.state === 'panicked').length;
    if (plan !== 'rallied' && (section.length < BROKEN_SECTION || pinned * 2 > section.length)) {
      issue(ctx, { type: 'withdraw', unitIds: ids }, tick, events);
      plans.set(squadId, 'withdraw');
      continue;
    }
    if (plan === 'attack') {
      const engaged = section.some((unit) => {
        if (unit.currentOrder !== 'attack' || unit.targetId === null) return false;
        const target = ctx.units.find((entry) => entry.id === unit.targetId);
        return target !== undefined && fit(target);
      });
      if (!engaged) {
        const target = nearestFit(ctx, here, 'column');
        if (target) issue(ctx, { type: 'attack', unitIds: ids, targetId: target.id }, tick, events);
      }
    }
  }

  // With the advantage, one more section goes forward. When the field has
  // gone quiet he must find the enemy: he attacks with all but one section,
  // keeping the weakest back in its line as a reserve.
  const quiet = tick - ctx.battle.lastShotTick > QUIET_TICKS;
  if (ownFit >= theirFit * ADVANTAGE || quiet) {
    const ready = [...own]
      .filter(([squadId]) => {
        const plan = plans.get(squadId);
        return plan === 'hold' || (quiet && plan === 'rallied');
      })
      .sort((left, right) => right[1].length - left[1].length || left[0] - right[0]);
    const attacking = [...plans.values()].filter((plan) => plan === 'attack').length;
    const count = quiet ? Math.max(1, Math.min(ready.length, own.size - 1 - attacking)) : 1;
    for (const [squadId, section] of ready.slice(0, count)) {
      const target = nearestFit(ctx, centroid(section), 'column');
      if (!target) continue;
      issue(ctx, { type: 'attack', unitIds: section.map((unit) => unit.id), targetId: target.id }, tick, events);
      plans.set(squadId, 'attack');
    }
    if (quiet) ctx.battle.lastShotTick = tick;
  }
}

export function updateBattleFlow(ctx: SimContext, tick: number, events: SimEvent[]): void {
  if (ctx.scenario !== 'battle3v3') return;
  recordContacts(ctx, tick, events);
  if (tick % THINK_EVERY !== 0) return;
  commandLegalists(ctx, tick, events);
  closeOnLostContact(ctx, tick, events);
}
