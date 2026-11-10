import { coverForStance, eyeHeightForStance, findPath, isLineBlocked, type GarrisonSnapshot, isDeepWater, isPointBlockedByCovers, positionsFor, type PositionDef, type PositionPort, type SimEvent, type Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import { queueUnitOrder } from './movement';
import { reject } from './commands';
import { applyTacticalOrder } from './orders';
import { dropAssault } from './assault';

/**
 * garrison-and-assault D2-D3, D6: positions a section goes into and leaves.
 * A garrisoned soldier stands at his port (just outside the wall of a
 * building, on the fire step of a trench, at a yard's wall), is not moved by
 * any other system, and takes the position's cover on top of his stance's.
 */

export type GarrisonSide = 'column' | 'legalist';

export interface Garrison {
  positionId: number;
  side: GarrisonSide;
  /** The men inside, by id order. */
  unitIds: number[];
  /** Shared suppression of the whole garrison (0-100). */
  suppression: number;
}

/** A soldier this close to an entrance goes in (m). */
export const ENTER_DISTANCE = 1.2;
/** The exit point may lie this far from the position at most (m). */
export const EXIT_RANGE = 30;
/** One man leaves every this many ticks (0.5 s). */
export const EXIT_EVERY = 5;
/** Defenders re-pick their ports every this many ticks. */
export const PORT_EVERY = 10;
/** A defender's cover inside never exceeds this. */
export const GARRISON_COVER_CAP = 0.75;

export function createPositions(map: Parameters<typeof positionsFor>[0] | null): { positions: PositionDef[]; byId: Map<number, PositionDef> } {
  const positions = map ? positionsFor(map) : [];
  return { positions, byId: new Map(positions.map((position) => [position.id, position])) };
}

function sideOf(unit: MutableUnit): GarrisonSide | null {
  return unit.faction === 'column' || unit.faction === 'legalist' ? unit.faction : null;
}

function squared(a: Vec2, b: Vec2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function nearest<T extends Vec2>(points: readonly T[], to: Vec2): T | null {
  let best: T | null = null;
  for (const point of points) if (!best || squared(point, to) < squared(best, to)) best = point;
  return best;
}

/** Sends a soldier along a path to `destination`. */
/** A man walking in who halted short of the doors sets off again this often (ticks). */
const ENTER_RETRY_EVERY = 20;

export function walkToPoint(ctx: SimContext, unit: MutableUnit, destination: Vec2): void {
  const path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
  unit.targetX = destination.x;
  unit.targetY = destination.y;
  unit.path = path;
  unit.pathIndex = 0;
  unit.orderIssued = true;
  unit.holdPosition = false;
  unit.lineMove = false;
  unit.slotId = null;
  if (path.length > 0) queueUnitOrder(ctx, unit, path, 'move');
}

/**
 * The entrance a man gets to soonest on foot (4.7): every house now has a
 * back door, often in a walled yard, so the nearest one as the crow flies
 * may be a long way round. Falls back to the nearest when none has a route.
 */
export function reachableEntrance(ctx: SimContext, unit: MutableUnit, position: PositionDef): Vec2 {
  const closest = nearest(position.entrances, unit)!;
  if (position.kind !== 'building' || position.entrances.length < 2) return closest;
  let best = closest;
  let bestLength = Number.POSITIVE_INFINITY;
  for (const entrance of position.entrances) {
    let length: number;
    if (squared(unit, entrance) <= ENTER_DISTANCE * ENTER_DISTANCE) length = 0;
    else {
      const path = findPath({ x: unit.x, y: unit.y }, entrance, ctx.covers);
      if (path.length === 0) continue;
      length = 0;
      let from: Vec2 = unit;
      for (const point of path) {
        length += Math.sqrt(squared(from, point));
        from = point;
      }
      // A route that stops short of the door does not reach it.
      if (squared(from, entrance) > 9) continue;
    }
    if (length < bestLength) {
      bestLength = length;
      best = entrance;
    }
  }
  return best;
}

export function garrisonOf(ctx: SimContext, unit: MutableUnit): Garrison | null {
  return unit.garrison === undefined ? null : (ctx.garrisons.get(unit.garrison) ?? null);
}

/** Who holds a position now (men inside, alive). */
export function holder(ctx: SimContext, positionId: number): GarrisonSide | null {
  return ctx.garrisons.get(positionId)?.side ?? null;
}

function occupied(ctx: SimContext, position: PositionDef): number {
  return ctx.garrisons.get(position.id)?.unitIds.length ?? 0;
}

/**
 * The enter order (D3): refused on an unknown position or one the enemy
 * holds; each soldier walks to the entrance nearest him.
 */
export function orderEnter(ctx: SimContext, units: readonly MutableUnit[], positionId: number | undefined, tick: number, seq: number, events: SimEvent[]): void {
  const position = positionId === undefined ? undefined : ctx.positionById.get(positionId);
  if (!position) {
    reject(ctx, tick, seq, 'invalid_target', events);
    return;
  }
  const side = sideOf(units[0]!);
  const held = holder(ctx, position.id);
  if (side === null || (held !== null && held !== side)) {
    reject(ctx, tick, seq, 'position_held', events);
    return;
  }
  ctx.orders = ctx.orders.filter((order) => !order.unitIds.some((id) => units.some((unit) => unit.id === id)));
  for (const unit of units) {
    if (unit.garrison === position.id) continue;
    if (unit.garrison !== undefined) leave(ctx, unit, position, tick, events);
    dropAssault(ctx, unit);
    unit.entering = position.id;
    unit.currentOrder = 'enter';
    unit.targetId = null;
    walkToPoint(ctx, unit, reachableEntrance(ctx, unit, position));
    unit.currentOrder = 'enter';
  }
}

/** Where a man's threat is: the way to it and, when it is a man he knows of, that man. */
interface Threat {
  bearing: Vec2;
  /** The enemy man to look at: where he is (or was last seen), his eye height, and the church he is in the tower of. */
  enemy: { x: number; y: number; eye: number; inTower?: number } | null;
}

/**
 * garrison-and-assault 4.0: how good a port is against the threat, compared
 * rank first, then how squarely it faces. In a building with raised ports
 * (upper floor, loft, tower), a port that sees the enemy man outranks one
 * that does not, and a ground window that sees him outranks a raised one;
 * so the men go up only when the enemy is behind a wall, a hedge or a crop
 * the ground floor cannot see past. Elsewhere, and with no enemy known,
 * facing alone decides (D4), ground windows first on a tie.
 */
function portScore(ctx: SimContext, unit: MutableUnit, position: PositionDef, port: PositionPort, threat: Threat): [number, number] {
  const dot = port.facing.x * threat.bearing.x + port.facing.y * threat.bearing.y;
  const raised = port.elevation !== undefined;
  if (!position.raisedPorts || !threat.enemy || (dot <= 0 && !port.tower)) return [raised ? 0 : 0.5, dot];
  const enemy = threat.enemy;
  const sees = !isLineBlocked(
    port.x,
    port.y,
    enemy.x,
    enemy.y,
    ctx.covers,
    ctx.sightObstacles,
    eyeHeightForStance(unit.stance) + (port.elevation ?? 0),
    enemy.eye,
    port.tower ? position.id : undefined,
    enemy.inTower,
  );
  if (!sees) return [raised ? 0 : 0.5, dot];
  return [raised ? 2 : 3, dot];
}

function better(a: [number, number], b: [number, number]): boolean {
  return a[0] > b[0] + 1e-9 || (Math.abs(a[0] - b[0]) <= 1e-9 && a[1] > b[1] + 1e-9);
}

/** The free port best against the threat (portScore), ties by index (D4). */
function freePort(ctx: SimContext, unit: MutableUnit, position: PositionDef, threat: Threat, taken: ReadonlySet<number>): number | null {
  let best: number | null = null;
  let bestScore: [number, number] = [-Infinity, -Infinity];
  // 1.5: the tower holds so many men at most.
  const inTower = [...taken].filter((index) => position.ports[index]?.tower).length;
  const towerFull = inTower >= (position.towerCapacity ?? 0);
  for (const [index, port] of position.ports.entries()) {
    if (taken.has(index)) continue;
    if (port.tower && towerFull) continue;
    const score = portScore(ctx, unit, position, port, threat);
    if (better(score, bestScore)) {
      best = index;
      bestScore = score;
    }
  }
  return best;
}

function takenPorts(ctx: SimContext, garrison: Garrison | undefined, except?: number): Set<number> {
  const taken = new Set<number>();
  for (const id of garrison?.unitIds ?? []) {
    if (id === except) continue;
    const unit = ctx.units.find((entry) => entry.id === id);
    if (unit?.port !== undefined) taken.add(unit.port);
  }
  return taken;
}

/** Where a garrison's side expects the enemy: its target, the nearest known enemy, or the enemy's area. */
function threatOf(ctx: SimContext, unit: MutableUnit, position: PositionDef): Threat {
  const man = (other: MutableUnit) => ({ x: other.x, y: other.y, eye: eyeHeightForStance(other.stance) + (other.elevation ?? 0), inTower: other.inTower });
  const target = unit.targetId === null ? undefined : ctx.units.find((entry) => entry.id === unit.targetId && entry.alive);
  let enemy: Threat['enemy'] = target ? man(target) : null;
  const side = sideOf(unit);
  if (!enemy) {
    let best: MutableUnit | null = null;
    for (const other of ctx.units) {
      if (!other.alive || other.incapacitated || other.faction === unit.faction || sideOf(other) === null) continue;
      if (side && ctx.fog && !ctx.vision.seen[side].has(other.id)) continue;
      if (!best || squared(other, position) < squared(best, position)) best = other;
    }
    if (best) enemy = man(best);
  }
  if (!enemy && side && ctx.fog && position.raisedPorts) {
    // 4.0: an enemy his side saw lately, now out of sight (behind a wall, in the corn): where he was, crouched.
    let best: Vec2 | null = null;
    for (const [id, sighting] of ctx.vision.lastSeen[side]) {
      const other = ctx.units.find((entry) => entry.id === id);
      if (!other || !other.alive || other.incapacitated) continue;
      if (!best || squared(sighting, position) < squared(best, position)) best = sighting;
    }
    if (best) enemy = { x: best.x, y: best.y, eye: eyeHeightForStance('crouched') };
  }
  let toward: Vec2 | null = enemy;
  if (!toward && ctx.battleMap) {
    const area = ctx.battleMap.deployment[unit.faction === 'column' ? 'legalist' : 'column'];
    const points = area.area.length > 0 ? area.area : area.sections;
    toward = { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
  }
  const dx = (toward?.x ?? position.x) - position.x;
  const dy = (toward?.y ?? position.y + 1) - position.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  return { bearing: { x: dx / length, y: dy / length }, enemy };
}

/** Puts a soldier inside a position at a free port facing his threat. */
export function enter(ctx: SimContext, unit: MutableUnit, position: PositionDef, tick: number, events: SimEvent[]): boolean {
  const side = sideOf(unit);
  if (side === null) return false;
  let garrison = ctx.garrisons.get(position.id);
  if (garrison && garrison.side !== side) return false;
  if (occupied(ctx, position) >= position.capacity) return false;
  const port = freePort(ctx, unit, position, threatOf(ctx, unit, position), takenPorts(ctx, garrison));
  if (port === null) return false;
  if (!garrison) {
    garrison = { positionId: position.id, side, unitIds: [], suppression: 0 };
    ctx.garrisons.set(position.id, garrison);
  }
  garrison.unitIds.push(unit.id);
  garrison.unitIds.sort((a, b) => a - b);
  unit.garrison = position.id;
  unit.port = port;
  delete unit.entering;
  ctx.orders = ctx.orders.filter((order) => !order.unitIds.includes(unit.id));
  unit.currentOrder = 'hold';
  unit.holdPosition = true;
  placeAtPort(unit, position, position.ports[port]!);
  events.push({ type: 'unit_entered', tick, unitId: unit.id, positionId: position.id });
  return true;
}

function placeAtPort(unit: MutableUnit, position: PositionDef, port: PositionPort): void {
  unit.x = port.x;
  unit.y = port.y;
  unit.targetX = port.x;
  unit.targetY = port.y;
  unit.path = [];
  unit.pathIndex = 0;
  unit.moveSpeed = 0;
  unit.stuckFrom = undefined;
  unit.slotId = port.slotId ?? null;
  if (port.elevation) unit.elevation = port.elevation;
  else delete unit.elevation;
  if (port.tower) unit.inTower = position.id;
  else delete unit.inTower;
  if (port.facing.x !== 0 || port.facing.y !== 0) {
    if (unit.targetId === null) {
      unit.facingX = port.facing.x;
      unit.facingY = port.facing.y;
    }
  }
}

/** Takes a soldier out of his position, at the entrance nearest `toward`. */
export function leave(ctx: SimContext, unit: MutableUnit, toward: Vec2, tick: number, events: SimEvent[]): void {
  const positionId = unit.garrison;
  if (positionId === undefined) return;
  const position = ctx.positionById.get(positionId);
  const garrison = ctx.garrisons.get(positionId);
  if (garrison) {
    garrison.unitIds = garrison.unitIds.filter((id) => id !== unit.id);
    if (garrison.unitIds.length === 0) ctx.garrisons.delete(positionId);
  }
  delete unit.garrison;
  delete unit.port;
  delete unit.exitAt;
  delete unit.exitTo;
  delete unit.elevation;
  delete unit.inTower;
  unit.holdPosition = false;
  unit.slotId = null;
  if (position && position.kind !== 'trench-line') {
    const door = nearest(position.entrances, toward) ?? position.entrances[0]!;
    unit.x = door.x;
    unit.y = door.y;
    unit.targetX = door.x;
    unit.targetY = door.y;
  }
  unit.path = [];
  unit.pathIndex = 0;
  events.push({ type: 'unit_left', tick, unitId: unit.id, positionId });
}

/**
 * The exit order (D6): refused for men not inside, for a point over 30 m
 * from the position or on blocked ground; else the men leave one every
 * 0.5 s by the entrance nearest the point and defend around it.
 */
export function orderExit(ctx: SimContext, units: readonly MutableUnit[], to: Vec2 | undefined, tick: number, seq: number, events: SimEvent[]): void {
  const inside = units.filter((unit) => unit.garrison !== undefined);
  if (!to || inside.length === 0) {
    reject(ctx, tick, seq, 'not_garrisoned', events);
    return;
  }
  for (const unit of inside) {
    const position = ctx.positionById.get(unit.garrison!)!;
    const door = nearest(position.entrances, to)!;
    if (squared(door, to) > EXIT_RANGE * EXIT_RANGE) {
      reject(ctx, tick, seq, 'too_far', events);
      return;
    }
  }
  if (blockedGround(ctx, to)) {
    reject(ctx, tick, seq, 'blocked', events);
    return;
  }
  inside.forEach((unit, index) => {
    unit.exitAt = tick + index * EXIT_EVERY;
    unit.exitTo = { x: to.x, y: to.y };
  });
}

function blockedGround(ctx: SimContext, to: Vec2): boolean {
  const map = ctx.battleMap;
  if (map) {
    const { minX, minY, maxX, maxY } = map.bounds;
    if (to.x < minX || to.x > maxX || to.y < minY || to.y > maxY) return true;
    if (isDeepWater(to.x, to.y)) return true;
  }
  return isPointBlockedByCovers(to.x, to.y, ctx.covers, 0);
}

/**
 * Each tick, after movement: soldiers ordered in go in at an entrance (or,
 * with the position full, defend around it); men leaving go out on their
 * turn; the fallen leave their garrison.
 */
export function updateGarrisons(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const overflow = new Map<number, MutableUnit[]>();
  for (const unit of ctx.units) {
    if (unit.entering === undefined) continue;
    if (!unit.alive || unit.incapacitated || unit.routed) {
      delete unit.entering;
      continue;
    }
    const position = ctx.positionById.get(unit.entering);
    if (!position) {
      delete unit.entering;
      continue;
    }
    const door = nearest(position.entrances, unit)!;
    const arrived = squared(unit, door) <= ENTER_DISTANCE * ENTER_DISTANCE || (unit.path.length === 0 && squared(unit, door) <= 9);
    if (!arrived) {
      // Halted short of every door (crowded at a corner, or nudged aside): set off again.
      if (unit.path.length === 0 && !unit.moveSpeed && (tick + unit.id) % ENTER_RETRY_EVERY === 0) {
        walkToPoint(ctx, unit, reachableEntrance(ctx, unit, position));
        unit.currentOrder = 'enter';
      }
      continue;
    }
    if (!enter(ctx, unit, position, tick, events)) {
      delete unit.entering;
      overflow.set(position.id, [...(overflow.get(position.id) ?? []), unit]);
    }
  }
  // Over the capacity, or turned away: they take the cover slots outside.
  for (const [positionId, units] of overflow) {
    const position = ctx.positionById.get(positionId)!;
    applyTacticalOrder(ctx, { type: 'order', order: 'defend', unitIds: units.map((unit) => unit.id), to: { x: position.entrances[0]!.x, y: position.entrances[0]!.y } }, units, tick, 0, events);
  }
  const leaving: MutableUnit[] = [];
  for (const unit of ctx.units) {
    if (unit.garrison === undefined) continue;
    if (!unit.alive || unit.incapacitated) {
      // A casualty lies where he fell, at his port.
      const { x, y } = unit;
      leave(ctx, unit, unit, tick, events);
      unit.x = x;
      unit.y = y;
      unit.targetX = x;
      unit.targetY = y;
      continue;
    }
    if (unit.exitAt !== undefined && unit.exitTo && tick >= unit.exitAt) {
      const to = unit.exitTo;
      leave(ctx, unit, to, tick, events);
      unit.exitTo = to;
      leaving.push(unit);
    }
  }
  for (const unit of leaving) {
    const to = unit.exitTo!;
    delete unit.exitTo;
    applyTacticalOrder(ctx, { type: 'order', order: 'defend', unitIds: [unit.id], to }, [unit], tick, 0, events);
  }
}

/**
 * At the end of a tick, every garrisoned soldier is back at his port (no
 * other system moves him), and every PORT_EVERY ticks the men re-pick the
 * free ports facing their threats.
 */
export function pinGarrisons(ctx: SimContext, tick: number): void {
  for (const garrison of ctx.garrisons.values()) {
    const position = ctx.positionById.get(garrison.positionId);
    if (!position) continue;
    shareSuppression(ctx, garrison);
    for (const id of garrison.unitIds) {
      const unit = ctx.units.find((entry) => entry.id === id);
      if (!unit || unit.port === undefined) continue;
      if (tick % PORT_EVERY === 0) {
        const taken = takenPorts(ctx, garrison, unit.id);
        const threat = threatOf(ctx, unit, position);
        const next = freePort(ctx, unit, position, threat, taken);
        if (
          next !== null &&
          next !== unit.port &&
          better(portScore(ctx, unit, position, position.ports[next]!, threat), portScore(ctx, unit, position, position.ports[unit.port]!, threat))
        ) {
          unit.port = next;
        }
      }
      placeAtPort(unit, position, position.ports[unit.port]!);
      unit.currentOrder = 'hold';
      unit.holdPosition = true;
      unit.cover = garrisonCover(ctx, unit) ?? unit.cover;
    }
  }
}

/**
 * D4: fire at the position keeps every man in it down. The shots meet the
 * man at the port facing the shooter, but their weight falls on the whole
 * garrison: its suppression is the mean of its men's (each gains and
 * recovers as outside), and every man reads it as his own. (The highest
 * instead panicked a whole house through the one man at the facing port.)
 */
function shareSuppression(ctx: SimContext, garrison: Garrison): void {
  const men = garrison.unitIds
    .map((id) => ctx.units.find((entry) => entry.id === id))
    .filter((unit): unit is MutableUnit => unit !== undefined && unit.alive && !unit.incapacitated);
  garrison.suppression = men.length > 0 ? men.reduce((sum, unit) => sum + unit.suppression, 0) / men.length : 0;
  for (const unit of men) unit.suppression = garrison.suppression;
}

/**
 * D4: a shot at a garrison is taken by the defender at the port that faces
 * the shooter most nearly; a man outside is his own target.
 */
export function facingDefender(ctx: SimContext, target: MutableUnit, shooter: Vec2): MutableUnit {
  if (target.garrison === undefined) return target;
  const garrison = ctx.garrisons.get(target.garrison);
  const position = ctx.positionById.get(target.garrison);
  if (!garrison || !position) return target;
  let best = target;
  let bestDot = -Infinity;
  for (const id of garrison.unitIds) {
    const unit = ctx.units.find((entry) => entry.id === id);
    if (!unit || !unit.alive || unit.incapacitated || unit.port === undefined) continue;
    const port = position.ports[unit.port]!;
    const dx = shooter.x - port.x;
    const dy = shooter.y - port.y;
    const dot = (port.facing.x * dx + port.facing.y * dy) / (Math.sqrt(dx * dx + dy * dy) || 1);
    if (dot > bestDot + 1e-9) {
      best = unit;
      bestDot = dot;
    }
  }
  return best;
}

/** A defender's cover: his stance's plus the position's, within the cap (D4). */
export function garrisonCover(ctx: SimContext, unit: MutableUnit): number | null {
  if (unit.garrison === undefined) return null;
  const position = ctx.positionById.get(unit.garrison);
  if (!position) return null;
  return Math.min(GARRISON_COVER_CAP, coverForStance(unit.stance) + position.cover);
}

/**
 * Ground orders take men out first (by the entrance nearest their goal);
 * fire, stance and hold orders keep them inside.
 */
export function releaseForOrder(ctx: SimContext, units: readonly MutableUnit[], toward: Vec2 | undefined, tick: number, events: SimEvent[]): void {
  for (const unit of units) {
    dropAssault(ctx, unit);
    if (unit.garrison === undefined) continue;
    leave(ctx, unit, toward ?? unit, tick, events);
  }
}

/** The frame's view of the garrisons, by position id. */
export function garrisonSnapshot(ctx: SimContext): GarrisonSnapshot[] {
  return [...ctx.garrisons.values()]
    .sort((a, b) => a.positionId - b.positionId)
    .map((garrison) => {
      // 3.3: what the other side knows of it, when it knows anything.
      const enemy = garrison.side === 'column' ? 'legalist' : 'column';
      const known = ctx.vision.garrisons[enemy].get(garrison.positionId);
      return {
        positionId: garrison.positionId,
        side: garrison.side,
        unitIds: [...garrison.unitIds],
        suppression: Math.round(garrison.suppression),
        ...(known ? { known } : {}),
      };
    });
}
