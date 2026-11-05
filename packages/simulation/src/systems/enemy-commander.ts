import type { Command, SimEvent, Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import { applyCommand } from './commands';
import { MARKER_TICKS, REMEMBER_TICKS, otherSide, type Side } from './vision';

/**
 * The 3v3 battle's flow (battle-feel-3v3): the legalist commander and the rule
 * that keeps either side from standing idle once contact is lost. Both act
 * only through ordinary commands, the same ones the player's HUD sends.
 */

/** A withdrawn section that has stopped rallies: it defends where it stands and is never pulled back again. */
export type SectionPlan = 'hold' | 'attack' | 'withdraw' | 'rallied';

export interface BattleMemory {
  /** Each side's deployment line (centroid at the start): a fact of the map both sides know. */
  readonly deployment: Map<'column' | 'legalist', Vec2>;
  /** Each side's starting strength, a fact of the battle both sides know. */
  readonly strength: Map<'column' | 'legalist', number>;
  /** Enemy soldiers each side has seen fall (its only count of the enemy's losses under fog). */
  readonly seenDown: Record<'column' | 'legalist', Set<number>>;
  /** The enemy commander's plan for each legalist section. */
  readonly plans: Map<number, SectionPlan>;
  /** Where each section last knew an enemy to be, and when (tick). */
  readonly contacts: Map<number, { x: number; y: number; tick: number }>;
  lastShotTick: number;
}

export function createBattleMemory(): BattleMemory {
  return {
    plans: new Map(),
    contacts: new Map(),
    lastShotTick: 0,
    deployment: new Map(),
    strength: new Map(),
    seenDown: { column: new Set(), legalist: new Set() },
  };
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

/** An enemy soldier a side knows of: where it saw him last, and whether it sees him now. */
interface KnownEnemy {
  unit: MutableUnit;
  x: number;
  y: number;
  seenNow: boolean;
}

/**
 * What a side knows of the other (fog-of-war): soldiers seen now or in the
 * last REMEMBER_TICKS, at the position last seen. With fog off, everything.
 */
export function knownEnemies(ctx: SimContext, side: Side, tick: number): KnownEnemy[] {
  const enemy = otherSide(side);
  const known: KnownEnemy[] = [];
  for (const unit of ctx.units) {
    if (unit.faction !== enemy || !fit(unit)) continue;
    if (!ctx.fog || ctx.vision.seen[side].has(unit.id)) {
      known.push({ unit, x: unit.x, y: unit.y, seenNow: true });
      continue;
    }
    const sighting = ctx.vision.lastSeen[side].get(unit.id);
    if (sighting && tick - sighting.tick <= REMEMBER_TICKS) {
      known.push({ unit, x: sighting.x, y: sighting.y, seenNow: false });
    }
  }
  return known;
}

/**
 * Where a section of `side` should go for the enemy: the nearest enemy it sees
 * (attacked by id), else the nearest place it knows him to be (last seen, a
 * heard shot, the section's contact), else the enemy's deployment line.
 */
function objectiveFor(
  ctx: SimContext,
  side: Side,
  from: Vec2,
  squadId: number,
  tick: number,
): { targetId: number } | { to: Vec2 } | null {
  const known = knownEnemies(ctx, side, tick);
  const distance = (point: Vec2) => (point.x - from.x) ** 2 + (point.y - from.y) ** 2;
  const seen = known.filter((entry) => entry.seenNow).sort((a, b) => distance(a) - distance(b) || a.unit.id - b.unit.id);
  if (seen[0]) return { targetId: seen[0].unit.id };
  const places: Vec2[] = known.map((entry) => ({ x: entry.x, y: entry.y }));
  for (const mark of ctx.vision.heard[side]) {
    if (tick - mark.tick <= MARKER_TICKS * 3) places.push({ x: mark.x, y: mark.y });
  }
  const contact = ctx.battle.contacts.get(squadId);
  if (contact) places.push({ x: contact.x, y: contact.y });
  places.sort((a, b) => distance(a) - distance(b));
  if (places[0]) return { to: places[0] };
  const deployment = ctx.battle.deployment.get(otherSide(side));
  return deployment ? { to: deployment } : null;
}

function goFor(ctx: SimContext, side: Side, ids: number[], from: Vec2, squadId: number, tick: number, events: SimEvent[]): boolean {
  const objective = objectiveFor(ctx, side, from, squadId, tick);
  if (!objective) return false;
  if ('targetId' in objective) {
    issue(ctx, { type: 'attack', unitIds: ids, targetId: objective.targetId }, tick, events);
  } else {
    issue(ctx, { type: 'order', order: 'advance', unitIds: ids, to: objective.to }, tick, events);
  }
  return true;
}

/** A section busy going for the enemy: attacking a fit target, or advancing. */
function goingFor(ctx: SimContext, section: readonly MutableUnit[]): boolean {
  return section.some((unit) => {
    if (unit.currentOrder === 'advance' && (unit.path.length > 0 || unit.boundTeam !== null)) return true;
    if (unit.currentOrder !== 'attack' || unit.targetId === null) return false;
    const target = ctx.units.find((entry) => entry.id === unit.targetId);
    return target !== undefined && fit(target);
  });
}
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
      const mainBody = ctx.fog ? (ctx.battle.deployment.get(enemy) ?? centroid(enemies)) : centroid(enemies);
      const to = contact && !reached ? { x: contact.x, y: contact.y } : mainBody;
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
  if (ctx.units.every((unit) => unit.faction !== 'column' || !fit(unit))) return;
  const ownFit = [...own.values()].reduce((sum, list) => sum + list.length, 0);
  // fog-of-war: he cannot count men he does not see, nor assume they are not
  // there: he takes the player's starting strength less the losses he saw,
  // and never less than the soldiers he knows of.
  for (const unit of ctx.units) {
    if (unit.faction === 'column' && !fit(unit) && ctx.vision.seen.legalist.has(unit.id)) ctx.battle.seenDown.legalist.add(unit.id);
  }
  const theirFit = ctx.fog
    ? Math.max(
        knownEnemies(ctx, 'legalist', tick).length,
        (ctx.battle.strength.get('column') ?? 0) - ctx.battle.seenDown.legalist.size,
      )
    : knownEnemies(ctx, 'legalist', tick).length;
  const enemyCentre = ctx.battle.deployment.get('column')!;

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
      // A section advancing to look for the enemy attacks him as soon as it
      // sees him, instead of marching on into his fire.
      const advancing = section.some((unit) => unit.currentOrder === 'advance');
      const sighted = advancing && knownEnemies(ctx, 'legalist', tick).some((entry) => entry.seenNow);
      if (!goingFor(ctx, section) || sighted) {
        goFor(ctx, 'legalist', ids, here, squadId, tick, events);
      }
    }
  }

  // With the advantage, one more section goes forward. When the field has
  // gone quiet he must find the enemy: he attacks with all but one section,
  // keeping the weakest back in its line as a reserve.
  const quiet = tick - ctx.battle.lastShotTick > QUIET_TICKS;
  if ((theirFit > 0 && ownFit >= theirFit * ADVANTAGE) || quiet) {
    const ready = [...own]
      .filter(([squadId]) => {
        const plan = plans.get(squadId);
        return plan === 'hold' || (quiet && plan === 'rallied');
      })
      .sort((left, right) => right[1].length - left[1].length || left[0] - right[0]);
    const attacking = [...plans.values()].filter((plan) => plan === 'attack').length;
    const count = quiet ? Math.max(1, Math.min(ready.length, own.size - 1 - attacking)) : 1;
    for (const [squadId, section] of ready.slice(0, count)) {
      if (goFor(ctx, 'legalist', section.map((unit) => unit.id), centroid(section), squadId, tick, events)) {
        plans.set(squadId, 'attack');
      }
    }
    if (quiet) ctx.battle.lastShotTick = tick;
  }
}

export function updateBattleFlow(ctx: SimContext, tick: number, events: SimEvent[]): void {
  if (ctx.scenario !== 'battle3v3') return;
  if (ctx.battle.deployment.size === 0) {
    for (const side of SIDES) {
      const start = ctx.units.filter((unit) => unit.faction === side);
      if (start.length > 0) ctx.battle.deployment.set(side, centroid(start));
      ctx.battle.strength.set(side, start.length);
    }
  }
  recordContacts(ctx, tick, events);
  if (tick % THINK_EVERY !== 0) return;
  commandLegalists(ctx, tick, events);
  closeOnLostContact(ctx, tick, events);
}
