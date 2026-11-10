import type { AssaultSnapshot, PositionDef, SimEvent, Vec2, WeaponId } from '@prestes/shared';
import type { SimContext } from './context';
import { clamp, type MutableUnit } from './model';
import { reject } from './commands';
import { applyTacticalOrder } from './orders';
import { enter, holder, leave, reachableEntrance, walkToPoint } from './garrison';

/**
 * garrison-and-assault D5: a close assault on an enemy-held position. The
 * attackers make for the nearest entrance; when two are at it the fight
 * starts, and each second both sides lose men by chance until one side has
 * no fit man in it, or gives up the fight in panic.
 */

export type AssaultSide = 'column' | 'legalist';

export interface Assault {
  positionId: number;
  attackerSide: AssaultSide;
  /** The attackers in the fight, by id order (up to the position's capacity). */
  fighters: number[];
  /** Fit fighters on each side when the fight started (attackers: the most that fought). */
  attackersStart: number;
  defendersStart: number;
  startedAt: number;
  /** Where the attackers came from: losers fall back that way. */
  from: Vec2;
}

/** An assault may be ordered from this close to an entrance (m). */
export const ASSAULT_RANGE = 15;
/** An attacker this close to an entrance is at it (m). */
export const ASSAULT_REACH = 3;
/** Attackers at the entrance needed to start the fight. */
export const ASSAULT_MIN_ATTACKERS = 2;
/** Each fighter's chance to fall in a second, before the factors. */
export const ASSAULT_BASE = 0.12;
/** The fight is resolved once a second (ticks). */
export const ASSAULT_EVERY = 10;
/** Defenders' losses are this much of the attackers' rate unless pinned (design 0.7; tuned by test, see Apply findings). */
export const DEFENDER_BONUS = 0.6;
/** Share of the men down in the fight who are wounded rather than killed. */
export const ASSAULT_WOUNDED = 0.6;
/** Losers fall back this far from the entrance (m). */
const FALL_BACK = 20;

/** Close-quarters weapon factors (D5): pistols and repeaters beat a bolt rifle in a room. */
const CLOSE_WEAPON: Partial<Record<WeaponId, number>> = {
  revolver: 1.4,
  'fuzil-automatico-7mm': 1.3,
  'winchester-44': 1.15,
  'mauser-7mm': 1.0,
  'metralhadora-7mm': 0.8,
};

const MORALE_FACTOR: Record<MutableUnit['state'], number> = {
  steady: 1,
  suppressed: 1.25,
  pinned: 1.6,
  panicked: 2.2,
  routed: 2.2,
};

function sideOf(unit: MutableUnit): AssaultSide | null {
  return unit.faction === 'column' || unit.faction === 'legalist' ? unit.faction : null;
}

function squared(a: Vec2, b: Vec2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function nearestEntrance(position: PositionDef, to: Vec2): Vec2 {
  let best = position.entrances[0]!;
  for (const entrance of position.entrances) if (squared(entrance, to) < squared(best, to)) best = entrance;
  return best;
}

function fit(unit: MutableUnit | undefined): unit is MutableUnit {
  return unit !== undefined && unit.alive && !unit.incapacitated && !unit.routed;
}

function unitById(ctx: SimContext, id: number): MutableUnit | undefined {
  return ctx.units.find((unit) => unit.id === id);
}

/**
 * The assault command (D5): refused on an unknown position (invalid_target),
 * one the enemy does not hold (not_garrisoned), or from over 15 m of its
 * entrances (too_far); else each man makes for the entrance nearest him.
 */
export function orderAssault(ctx: SimContext, units: readonly MutableUnit[], positionId: number, tick: number, seq: number, events: SimEvent[]): void {
  const position = ctx.positionById.get(positionId);
  if (!position || position.entrances.length === 0) {
    reject(ctx, tick, seq, 'invalid_target', events);
    return;
  }
  const side = sideOf(units[0]!);
  const held = holder(ctx, position.id);
  if (side === null || held === null || held === side) {
    reject(ctx, tick, seq, 'not_garrisoned', events);
    return;
  }
  const centre = { x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length, y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length };
  if (squared(nearestEntrance(position, centre), centre) > ASSAULT_RANGE * ASSAULT_RANGE) {
    reject(ctx, tick, seq, 'too_far', events);
    return;
  }
  ctx.orders = ctx.orders.filter((order) => !order.unitIds.some((id) => units.some((unit) => unit.id === id)));
  for (const unit of units) {
    if (unit.garrison !== undefined) leave(ctx, unit, position, tick, events);
    delete unit.entering;
    unit.assaulting = position.id;
    unit.assaultFrom = { x: centre.x, y: centre.y };
    unit.targetId = null;
    walkToPoint(ctx, unit, reachableEntrance(ctx, unit, position));
    unit.currentOrder = 'assault';
  }
}

/** Stops a man's part in an assault (another order, or the fight's end). */
export function dropAssault(ctx: SimContext, unit: MutableUnit): void {
  if (unit.assaulting === undefined) return;
  const assault = ctx.assaults.get(unit.assaulting);
  if (assault) assault.fighters = assault.fighters.filter((id) => id !== unit.id);
  delete unit.assaulting;
  delete unit.assaultFrom;
}

/** Holds a fighter at the entrance: the fight is in the doorway and the rooms. */
function holdAt(unit: MutableUnit, point: Vec2): void {
  unit.x = point.x;
  unit.y = point.y;
  unit.targetX = point.x;
  unit.targetY = point.y;
  unit.path = [];
  unit.pathIndex = 0;
  unit.moveSpeed = 0;
  unit.holdPosition = true;
}

function averageFactor(units: readonly MutableUnit[], factor: (unit: MutableUnit) => number): number {
  return units.length === 0 ? 1 : units.reduce((sum, unit) => sum + factor(unit), 0) / units.length;
}

/** One man down in the fight: wounded or killed, and his comrades near him shaken. */
function fall(ctx: SimContext, unit: MutableUnit, tick: number, events: SimEvent[]): void {
  unit.hp = 0;
  unit.targetId = null;
  unit.path = [];
  unit.pathIndex = 0;
  unit.currentOrder = null;
  if (unit.wound !== 'severe' && ctx.rng.nextFloat() < ASSAULT_WOUNDED) {
    unit.incapacitated = true;
    unit.soldierState = 'incapacitated';
    unit.wound = 'severe';
    events.push({ type: 'unit_incapacitated', tick, unitId: unit.id });
  } else {
    unit.alive = false;
    unit.soldierState = 'dead';
    unit.wound = 'fatal';
    events.push({ type: 'unit_died', tick, unitId: unit.id });
  }
  for (const ally of ctx.units) {
    if (!ally.alive || ally.incapacitated || ally.faction !== unit.faction || ally.id === unit.id) continue;
    if (squared(ally, unit) > 12 * 12) continue;
    ally.morale = Math.max(0, ally.morale - 8);
    ally.suppression = clamp(ally.suppression + 8, 0, 100);
  }
}

function end(ctx: SimContext, assault: Assault, position: PositionDef, winner: AssaultSide, tick: number, events: SimEvent[]): void {
  ctx.assaults.delete(assault.positionId);
  events.push({ type: 'assault_ended', tick, positionId: assault.positionId, winner });
  const attackers = ctx.units.filter((unit) => unit.assaulting === assault.positionId).sort((a, b) => a.id - b.id);
  const fighters = new Set(assault.fighters);
  // Fighters first, then the men still coming up.
  attackers.sort((a, b) => Number(fighters.has(b.id)) - Number(fighters.has(a.id)) || a.id - b.id);
  const fitAttackers = attackers.filter((unit) => fit(unit) && unit.state !== 'panicked');
  for (const unit of attackers) {
    delete unit.assaulting;
    delete unit.assaultFrom;
  }
  if (winner === assault.attackerSide) {
    // The winners hold the position: in up to its capacity, the rest at the door.
    const outside: MutableUnit[] = [];
    for (const unit of fitAttackers) if (!enter(ctx, unit, position, tick, events)) outside.push(unit);
    if (outside.length > 0) {
      const door = nearestEntrance(position, assault.from);
      applyTacticalOrder(ctx, { type: 'order', order: 'defend', unitIds: outside.map((unit) => unit.id), to: { x: door.x, y: door.y } }, outside, tick, 0, events);
    }
    return;
  }
  // The attackers fall back to cover the way they came.
  if (fitAttackers.length === 0) return;
  const door = nearestEntrance(position, assault.from);
  const dx = assault.from.x - door.x;
  const dy = assault.from.y - door.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const to = { x: door.x + (dx / length) * FALL_BACK, y: door.y + (dy / length) * FALL_BACK };
  for (const unit of fitAttackers) unit.holdPosition = false;
  applyTacticalOrder(ctx, { type: 'order', order: 'defend', unitIds: fitAttackers.map((unit) => unit.id), to }, fitAttackers, tick, 0, events);
}

/** Each tick: attackers reach the door, fights start, and once a second they are resolved. */
export function updateAssaults(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const coming = new Map<number, MutableUnit[]>();
  for (const unit of ctx.units) {
    if (unit.assaulting === undefined) continue;
    if (!fit(unit) || unit.state === 'panicked') {
      dropAssault(ctx, unit);
      continue;
    }
    coming.set(unit.assaulting, [...(coming.get(unit.assaulting) ?? []), unit]);
  }
  const positionIds = [...new Set([...coming.keys(), ...ctx.assaults.keys()])].sort((a, b) => a - b);
  for (const positionId of positionIds) {
    const position = ctx.positionById.get(positionId);
    if (!position) continue;
    const attackers = coming.get(positionId) ?? [];
    let assault = ctx.assaults.get(positionId);
    const side = assault?.attackerSide ?? (attackers[0] ? sideOf(attackers[0]) : null);
    if (side === null) continue;
    const garrison = ctx.garrisons.get(positionId);
    const defenders = garrison && garrison.side !== side ? garrison.unitIds.map((id) => unitById(ctx, id)).filter(fit) : [];
    // Nobody left inside (shot out, or gone): the attackers simply go in.
    if (defenders.length === 0) {
      if (assault) end(ctx, assault, position, side, tick, events);
      else if (garrison?.side === side || !garrison) {
        const outside: MutableUnit[] = [];
        for (const unit of attackers) {
          delete unit.assaulting;
          delete unit.assaultFrom;
          if (!enter(ctx, unit, position, tick, events)) outside.push(unit);
        }
        if (outside.length > 0) {
          applyTacticalOrder(ctx, { type: 'order', order: 'defend', unitIds: outside.map((unit) => unit.id), to: { ...position.entrances[0]! } }, outside, tick, 0, events);
        }
      }
      continue;
    }
    const atDoor = attackers.filter(
      (unit) => squared(unit, nearestEntrance(position, unit)) <= ASSAULT_REACH * ASSAULT_REACH || (unit.path.length === 0 && squared(unit, nearestEntrance(position, unit)) <= (ASSAULT_REACH + 2) ** 2),
    );
    if (!assault) {
      if (atDoor.length < ASSAULT_MIN_ATTACKERS) continue;
      const from = attackers[0]!.assaultFrom ?? { x: attackers[0]!.x, y: attackers[0]!.y };
      assault = { positionId, attackerSide: side, fighters: [], attackersStart: 0, defendersStart: defenders.length, startedAt: tick, from };
      ctx.assaults.set(positionId, assault);
      events.push({ type: 'assault_started', tick, positionId });
    }
    // Men at the door join the fight up to the position's capacity.
    assault.fighters = assault.fighters.filter((id) => fit(unitById(ctx, id)) && unitById(ctx, id)!.assaulting === positionId);
    for (const unit of atDoor) {
      if (assault.fighters.length >= Math.max(ASSAULT_MIN_ATTACKERS, position.capacity)) break;
      if (!assault.fighters.includes(unit.id)) assault.fighters.push(unit.id);
    }
    assault.fighters.sort((a, b) => a - b);
    const fighters = assault.fighters.map((id) => unitById(ctx, id)).filter(fit);
    assault.attackersStart = Math.max(assault.attackersStart, fighters.length);
    for (const unit of fighters) {
      holdAt(unit, nearestEntrance(position, unit));
      unit.currentOrder = 'assault';
      unit.targetId = defenders[0]!.id;
    }
    // A side whose fit fighters all panic gives up the fight.
    if (fighters.length > 0 && fighters.every((unit) => unit.state === 'panicked')) {
      end(ctx, assault, position, garrison!.side, tick, events);
      continue;
    }
    if (defenders.every((unit) => unit.state === 'panicked')) {
      // The defenders flee by the entrance farthest from the attackers.
      const far = position.entrances.reduce((best, entrance) => (squared(entrance, assault!.from) > squared(best, assault!.from) ? entrance : best));
      for (const unit of defenders) leave(ctx, unit, far, tick, events);
      end(ctx, assault, position, side, tick, events);
      continue;
    }
    if ((tick - assault.startedAt) % ASSAULT_EVERY !== 0 || tick === assault.startedAt) continue;
    resolveSecond(ctx, fighters, defenders, tick, events);
    const fightersLeft = fighters.filter(fit);
    const defendersLeft = defenders.filter(fit);
    for (const unit of defenders) if (!fit(unit)) leave(ctx, unit, unit, tick, events);
    if (defendersLeft.length === 0) end(ctx, assault, position, side, tick, events);
    else if (fightersLeft.length === 0 && !attackers.some((unit) => fit(unit) && !fighters.includes(unit))) {
      // No attacker left in the fight and none coming up to take it on.
      end(ctx, assault, position, garrison!.side, tick, events);
    }
  }
}

/** One second of the fight (D5): each fit fighter falls with his side's chance. */
function resolveSecond(ctx: SimContext, attackers: readonly MutableUnit[], defenders: readonly MutableUnit[], tick: number, events: SimEvent[]): void {
  const weapon = (unit: MutableUnit) => CLOSE_WEAPON[unit.weaponId] ?? 1;
  const morale = (unit: MutableUnit) => MORALE_FACTOR[unit.state] ?? 1;
  const defendersPinned = defenders.filter((unit) => unit.state === 'pinned' || unit.state === 'panicked').length * 2 >= defenders.length;
  const pAttacker =
    ASSAULT_BASE * Math.sqrt(defenders.length / attackers.length) * averageFactor(defenders, weapon) * averageFactor(attackers, morale);
  const pDefender =
    ASSAULT_BASE *
    Math.sqrt(attackers.length / defenders.length) *
    averageFactor(attackers, weapon) *
    averageFactor(defenders, morale) *
    (defendersPinned ? 1 : DEFENDER_BONUS);
  // Drawn in id order on each side, attackers first, for determinism.
  const fallen: MutableUnit[] = [];
  for (const unit of attackers) if (ctx.rng.nextFloat() < pAttacker) fallen.push(unit);
  for (const unit of defenders) if (ctx.rng.nextFloat() < pDefender) fallen.push(unit);
  for (const unit of fallen) fall(ctx, unit, tick, events);
}

/** The frame's view of the fights, for the bars. */
export function assaultSnapshot(ctx: SimContext): AssaultSnapshot[] {
  return [...ctx.assaults.values()]
    .sort((a, b) => a.positionId - b.positionId)
    .map((assault) => {
      const garrison = ctx.garrisons.get(assault.positionId);
      return {
        positionId: assault.positionId,
        attackerSide: assault.attackerSide,
        attackers: assault.fighters.map((id) => unitById(ctx, id)).filter(fit).length,
        defenders: garrison ? garrison.unitIds.map((id) => unitById(ctx, id)).filter(fit).length : 0,
        attackersStart: assault.attackersStart,
        defendersStart: assault.defendersStart,
      };
    });
}
