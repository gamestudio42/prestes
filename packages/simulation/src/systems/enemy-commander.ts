import { MAP_BOUNDS, bridgePolygon, findPath, vegetationAt } from '@prestes/shared';
import type { Command, SimEvent, Vec2, VegetationKind } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import { applyCommand } from './commands';
import { MARKER_TICKS, REMEMBER_TICKS, otherSide, type Side } from './vision';
import { dealWithGarrison, garrisonOnDeploy, leaveIfLost } from './commander-positions';
import { objectiveValues, type ObjectiveState } from './objectives';

/**
 * The 3v3 battle's flow (battle-feel-3v3): the legalist commander and the rule
 * that keeps either side from standing idle once contact is lost. Both act
 * only through ordinary commands, the same ones the player's HUD sends.
 */

/** A withdrawn section that has stopped rallies: it defends where it stands and is never pulled back again. */
export type SectionPlan = 'hold' | 'attack' | 'withdraw' | 'rallied' | 'garrison' | 'hold-objective';

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
  /** refine-battle-maps: the last tick each side shot, was shot at or saw an enemy. */
  readonly lastContact: Record<'column' | 'legalist', number>;
  /** Sides that have fallen back off the field. */
  readonly fellBack: Set<'column' | 'legalist'>;
  /**
   * Search clues: where each side heard unseen fire, was fired on from, or
   * fired at, by 8 m cell; kept after the marker fades.
   */
  readonly clues: Record<'column' | 'legalist', Map<string, Vec2>>;
  /** Search areas each side has swept, by id. */
  readonly swept: Record<'column' | 'legalist', Set<string>>;
  /** The search area each searching section is heading for. */
  readonly searching: Map<number, string>;
  /** Where the lost-contact rule last sent each section (it goes on from there). */
  readonly led: Map<number, Vec2>;
  /** add-map-objectives D4: each section holding an objective of value 2 or more, by squad id. */
  readonly objectiveGuards: Map<number, number>;
  /** add-map-objectives D4: the last objective the player took, and when; cleared on retake or after 60 s. */
  retake: { objectiveId: number; tick: number } | null;
  /** add-map-objectives D4: each objective's owner as the commander last saw it (ownership is public). */
  readonly objectiveOwners: Map<number, 'neutral' | 'column' | 'legalist'>;
}

export function createBattleMemory(): BattleMemory {
  return {
    plans: new Map(),
    contacts: new Map(),
    lastShotTick: 0,
    deployment: new Map(),
    strength: new Map(),
    seenDown: { column: new Set(), legalist: new Set() },
    lastContact: { column: 0, legalist: 0 },
    fellBack: new Set(),
    clues: { column: new Map(), legalist: new Map() },
    swept: { column: new Set(), legalist: new Set() },
    searching: new Map(),
    led: new Map(),
    objectiveGuards: new Map(),
    retake: null,
    objectiveOwners: new Map(),
  };
}

/** How often (ticks) the commander and the contact rule look at the field. */
const THINK_EVERY = 10;
/** A section idle this long (ticks) after its last contact closes on it. */
const LOST_CONTACT_TICKS = 100;
/** The commander counterattacks at this ratio of fit soldiers. */
const ADVANTAGE = 1.4;
/** add-map-objectives D4: a section has this long (ticks, 60 s) to be sent to retake a lost objective. */
const RETAKE_TICKS = 600;
/** add-map-objectives D4: with less than this left (ticks, 3 min) and less value, all but one section attacks. */
const LAST_MINUTES_TICKS = 1800;
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
  if (contact && distance(contact) > REACHED * REACHED) places.push({ x: contact.x, y: contact.y });
  places.sort((a, b) => distance(a) - distance(b));
  if (places[0]) return { to: places[0] };
  // refine-battle-maps: nothing left to go on; search where he might be.
  const area = nextSearchArea(ctx, side, from, squadId, tick);
  if (area) return { to: { x: area.x, y: area.y } };
  // add-map-objectives D4: with nothing to go on, attack the objective of most
  // value not held (public information: no unseen man is ever a destination).
  const goal = attackObjective(ctx, from);
  if (goal) return { to: { x: goal.flag.x, y: goal.flag.y } };
  const deployment = ctx.battle.deployment.get(otherSide(side));
  return deployment ? { to: deployment } : null;
}

/**
 * add-map-objectives D4: the objective of most value the legalists do not
 * hold; ties go to the nearest to `from`, then to the lowest id. Objectives
 * and owners are public, so this uses no fog.
 */
function attackObjective(ctx: SimContext, from: Vec2): ObjectiveState | null {
  let best: ObjectiveState | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const objective of ctx.objectives) {
    if (objective.owner === 'legalist') continue;
    const distance = (objective.flag.x - from.x) ** 2 + (objective.flag.y - from.y) ** 2;
    if (
      best === null ||
      objective.value > best.value ||
      (objective.value === best.value && (distance < bestDistance || (distance === bestDistance && objective.id < best.id)))
    ) {
      best = objective;
      bestDistance = distance;
    }
  }
  return best;
}

/** A section within this distance (m) of a place has reached it. */
const REACHED = 10;

// refine-battle-maps: the winning side searches, using only what it knows.

/** An area is swept when a fit soldier of the side passed this close to its centre (m). */
const SWEEP_RADIUS = 8;
/** Vegetation is searched by cells this size (m). */
const SEARCH_CELL = 20;
/** Vegetation, yards and crossings this close to a clue (m) are searched. */
const NEAR_CLUE = 60;
/** Clues kept per side; the oldest go first. */
const MAX_CLUES = 200;

interface SearchArea {
  id: string;
  x: number;
  y: number;
  /** 1 a clue, 2 cover near a clue, 3 the enemy's deployment zone. */
  tier: 1 | 2 | 3;
  /** A vegetation cell's kind. */
  kind?: VegetationKind;
}

/** Records a search clue at a place, by 8 m cell. */
function addClue(ctx: SimContext, side: Side, point: Vec2): void {
  const clues = ctx.battle.clues[side];
  const key = `c:${Math.round(point.x / 8)},${Math.round(point.y / 8)}`;
  if (clues.has(key)) return;
  clues.set(key, { x: point.x, y: point.y });
  if (clues.size > MAX_CLUES) clues.delete(clues.keys().next().value!);
}

/** Every clue of a side: its kept clues and where it last saw each enemy it did not see fall. */
function cluePoints(ctx: SimContext, side: Side): SearchArea[] {
  const points = new Map<string, SearchArea>();
  const add = (point: Vec2) => {
    const id = `c:${Math.round(point.x / 8)},${Math.round(point.y / 8)}`;
    if (!points.has(id)) points.set(id, { id, x: point.x, y: point.y, tier: 1 });
  };
  for (const [unitId, sighting] of ctx.vision.lastSeen[side]) {
    if (!ctx.battle.seenDown[side].has(unitId)) add(sighting);
  }
  for (const point of ctx.battle.clues[side].values()) add(point);
  return [...points.values()];
}

/** Vegetation sampled across a cell of this half-size: the first kind a man could hide in. */
function vegetationNear(x: number, y: number, half = SEARCH_CELL / 2 - 2): VegetationKind | null {
  for (const [dx, dy] of [[0, 0], [-half, -half], [half, -half], [-half, half], [half, half]] as const) {
    const kind = vegetationAt(x + dx, y + dy);
    if (kind !== null) return kind;
  }
  return null;
}

/** The ends of every crossing on the map: bridge ends, ferry landings, ford ends. */
function crossingEnds(ctx: SimContext): Array<{ id: string; x: number; y: number }> {
  const map = ctx.battleMap;
  if (!map) return [];
  const ends: Array<{ id: string; x: number; y: number }> = [];
  for (const bridge of map.bridges) {
    // The deck's corners run (-w,-d), (w,-d), (w,d), (-w,d): its ends are the short sides.
    const [a, b, c, d] = bridgePolygon(bridge) as [Vec2, Vec2, Vec2, Vec2];
    ends.push(
      { id: `x:b${bridge.id}:-1`, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      { id: `x:b${bridge.id}:1`, x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 },
    );
  }
  for (const ferry of map.ferries) {
    ends.push({ id: `x:f${ferry.id}:a`, ...ferry.landingA }, { id: `x:f${ferry.id}:b`, ...ferry.landingB });
  }
  map.water.forEach((water, index) => {
    water.ends?.forEach((end, side) => ends.push({ id: `x:w${index}:${side}`, x: end.x, y: end.y }));
  });
  return ends;
}

/**
 * The places a side would search, unswept: its clues; then the vegetation
 * cells, enclosed yards and crossing ends within 60 m of a clue; then the
 * enemy's deployment zone. Nothing the side never saw or heard near is added.
 */
export function searchAreas(ctx: SimContext, side: Side): SearchArea[] {
  const swept = ctx.battle.swept[side];
  const clues = cluePoints(ctx, side);
  const areas: SearchArea[] = [...clues];
  const near = (point: Vec2) => clues.some((clue) => (clue.x - point.x) ** 2 + (clue.y - point.y) ** 2 <= NEAR_CLUE ** 2);
  const map = ctx.battleMap;
  if (map && clues.length > 0) {
    const cells = new Set<string>();
    for (const clue of clues) {
      const reach = Math.ceil(NEAR_CLUE / SEARCH_CELL);
      const cx = Math.floor(clue.x / SEARCH_CELL);
      const cy = Math.floor(clue.y / SEARCH_CELL);
      for (let i = cx - reach; i <= cx + reach; i += 1) {
        for (let j = cy - reach; j <= cy + reach; j += 1) cells.add(`${i},${j}`);
      }
    }
    for (const cell of [...cells].sort()) {
      const [i, j] = cell.split(',').map(Number) as [number, number];
      const x = (i + 0.5) * SEARCH_CELL;
      const y = (j + 0.5) * SEARCH_CELL;
      if (x < map.bounds.minX || x > map.bounds.maxX || y < map.bounds.minY || y > map.bounds.maxY) continue;
      const kind = near({ x, y }) ? vegetationNear(x, y) : null;
      if (kind) areas.push({ id: `v:${cell}`, x, y, tier: 2, kind });
    }
    map.yards?.forEach((yard, index) => {
      const centre = centroid(yard);
      if (near(centre)) areas.push({ id: `y:${index}`, ...centre, tier: 2 });
    });
    for (const end of crossingEnds(ctx)) {
      if (near(end)) areas.push({ ...end, tier: 2 });
    }
  }
  const zone = map?.deployment[otherSide(side)];
  if (zone) {
    zone.sections.forEach((point, index) => areas.push({ id: `d:${index}`, x: point.x, y: point.y, tier: 3 }));
  }
  return areas.filter((area) => !swept.has(area.id));
}

/** Marks swept every area a fit soldier of the side stands within SWEEP_RADIUS of. */
function sweep(ctx: SimContext, side: Side): void {
  const men = ctx.units.filter((unit) => unit.faction === side && fit(unit));
  for (const area of searchAreas(ctx, side)) {
    if (men.some((unit) => (unit.x - area.x) ** 2 + (unit.y - area.y) ** 2 <= SWEEP_RADIUS ** 2)) {
      ctx.battle.swept[side].add(area.id);
    }
  }
}

/**
 * The next area a section searches: the first tier first; within it, one no
 * other section of the side is heading for, then the nearest, ties by id.
 */
function nextSearchArea(ctx: SimContext, side: Side, from: Vec2, squadId: number, _tick: number): SearchArea | null {
  const areas = searchAreas(ctx, side);
  if (areas.length === 0) return null;
  const own = new Set(sections(ctx, side).keys());
  const claimed = new Set<string>();
  for (const [other, id] of ctx.battle.searching) {
    if (other !== squadId && own.has(other)) claimed.add(id);
  }
  const distance = (area: SearchArea) => (area.x - from.x) ** 2 + (area.y - from.y) ** 2;
  // The search spirals out from the clues: the ring nearest a clue first.
  const clues = cluePoints(ctx, side);
  const ring = (area: SearchArea) =>
    clues.length === 0
      ? 0
      : Math.floor(Math.sqrt(Math.min(...clues.map((clue) => (clue.x - area.x) ** 2 + (clue.y - area.y) ** 2))) / SEARCH_CELL);
  const rings = new Map(areas.map((area) => [area.id, area.tier === 2 ? ring(area) : 0]));
  // He went into the vegetation by the clue: that patch's kind is searched first.
  const entered = new Set(clues.map((clue) => vegetationNear(clue.x, clue.y, 6)).filter((kind) => kind !== null));
  const other = (area: SearchArea) => Number(area.kind !== undefined && !entered.has(area.kind));
  areas.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(claimed.has(a.id)) - Number(claimed.has(b.id)) ||
      other(a) - other(b) ||
      rings.get(a.id)! - rings.get(b.id)! ||
      distance(a) - distance(b) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const next = areas[0]!;
  ctx.battle.searching.set(squadId, next.id);
  return next;
}

// refine-battle-maps: a decided battle ends.

/** A side under this share of its starting strength is broken. */
const BROKEN_SHARE = 0.2;
/** A broken side with no contact this long (ticks, 60 s) falls back. */
const FALL_BACK_TICKS = 600;

/** The point on a side's own map edge behind a soldier: beyond its deployment zone. */
function ownEdge(ctx: SimContext, unit: MutableUnit, side: Side): Vec2 {
  const facing = ctx.battleMap?.deployment[side].facing ?? { x: 0, y: side === 'column' ? -1 : 1 };
  const inset = 0.5;
  if (Math.abs(facing.y) >= Math.abs(facing.x)) {
    return {
      x: Math.min(MAP_BOUNDS.maxX - inset, Math.max(MAP_BOUNDS.minX + inset, unit.x)),
      y: facing.y > 0 ? MAP_BOUNDS.minY + inset : MAP_BOUNDS.maxY - inset,
    };
  }
  return {
    x: facing.x > 0 ? MAP_BOUNDS.minX + inset : MAP_BOUNDS.maxX - inset,
    y: Math.min(MAP_BOUNDS.maxY - inset, Math.max(MAP_BOUNDS.minY + inset, unit.y)),
  };
}

/** Each side's last contact: a shot by or at one of its men, or an enemy in sight. */
function recordSideContact(ctx: SimContext, tick: number, events: readonly SimEvent[]): void {
  const factionOf = new Map(ctx.units.map((unit) => [unit.id, unit.faction]));
  for (const event of events) {
    if (event.type !== 'shot') continue;
    for (const id of [event.source, event.target]) {
      const faction = factionOf.get(id);
      if (faction === 'column' || faction === 'legalist') ctx.battle.lastContact[faction] = tick;
    }
  }
  for (const side of SIDES) {
    for (const id of ctx.vision.seen[side]) {
      const unit = ctx.units.find((entry) => entry.id === id);
      if (unit && fit(unit)) {
        ctx.battle.lastContact[side] = tick;
        break;
      }
    }
  }
}

/**
 * A side under a fifth of its strength, with no contact for 60 s, falls back
 * off the field: its fit men rout toward its own edge, and the battle ends.
 */
function fallBack(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const side of SIDES) {
    if (ctx.battle.fellBack.has(side)) continue;
    const start = ctx.battle.strength.get(side) ?? 0;
    const men = ctx.units.filter((unit) => unit.faction === side && fit(unit));
    if (start === 0 || men.length === 0 || men.length >= start * BROKEN_SHARE) continue;
    if (tick - ctx.battle.lastContact[side] < FALL_BACK_TICKS) continue;
    ctx.battle.fellBack.add(side);
    events.push({ type: 'side_fell_back', tick, side });
    for (const unit of men) {
      const edge = ownEdge(ctx, unit, side);
      unit.routed = true;
      unit.state = 'routed';
      unit.suppressed = false;
      unit.holdPosition = false;
      unit.targetId = null;
      unit.currentOrder = 'flee';
      unit.stance = 'standing';
      unit.path = findPath({ x: unit.x, y: unit.y }, edge, ctx.covers);
      unit.pathIndex = 0;
      unit.targetX = edge.x;
      unit.targetY = edge.y;
      events.push({ type: 'unit_routed', tick, unitId: unit.id });
    }
  }
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
  const factionOf = new Map(ctx.units.map((unit) => [unit.id, unit.faction]));
  for (const event of events) {
    if (event.type !== 'shot') continue;
    memory.lastShotTick = tick;
    const shooterSquad = squadOf.get(event.source);
    const targetSquad = squadOf.get(event.target);
    if (shooterSquad !== undefined) memory.contacts.set(shooterSquad, { x: event.x2, y: event.y2, tick });
    // refine-battle-maps: the shooter's side knows where it fired.
    const shooter = factionOf.get(event.source);
    if (shooter === 'column' || shooter === 'legalist') addClue(ctx, shooter, { x: event.x2, y: event.y2 });
    if (targetSquad !== undefined) memory.contacts.set(targetSquad, { x: event.x, y: event.y, tick });
  }
  for (const unit of ctx.units) {
    if (!fit(unit) || unit.targetId === null) continue;
    // refine-battle-maps 5.13: only a target his side sees keeps the contact
    // fresh (an attacker keeps his objective when he loses sight of him).
    if (!seenBySide(ctx, unit, unit.targetId)) continue;
    const target = ctx.units.find((entry) => entry.id === unit.targetId);
    if (target && fit(target)) memory.contacts.set(unit.squadId, { x: target.x, y: target.y, tick });
  }
  for (const side of SIDES) {
    // Unseen fire heard: the marker (never the shooter) is a clue.
    for (const mark of ctx.vision.heard[side]) {
      if (mark.tick === tick) addClue(ctx, side, mark);
    }
    // Enemy soldiers each side saw fall.
    const enemy = otherSide(side);
    for (const unit of ctx.units) {
      if (unit.faction === enemy && !fit(unit) && ctx.vision.seen[side].has(unit.id)) memory.seenDown[side].add(unit.id);
    }
  }
  recordSideContact(ctx, tick, events);
}

/**
 * A section of either side that has lost the enemy for 10 s, and is not
 * holding an ordered position, advances on where it last knew him; at that
 * spot, on the enemy's main body.
 */
/** Whether `unit`'s side sees the enemy `targetId` now. */
function seenBySide(ctx: SimContext, unit: MutableUnit, targetId: number): boolean {
  return (unit.faction !== 'column' && unit.faction !== 'legalist') || ctx.vision.seen[unit.faction].has(targetId);
}

function closeOnLostContact(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const side of SIDES) {
    const enemy = side === 'column' ? 'legalist' : 'column';
    const enemies = ctx.units.filter((unit) => unit.faction === enemy && fit(unit));
    if (enemies.length === 0) continue;
    for (const [squadId, section] of sections(ctx, side)) {
      // refine-battle-maps: a section this rule sent on, halted where it was
      // sent, goes on searching; one moved elsewhere since is left alone.
      const led = ctx.battle.led.get(squadId);
      const centre = centroid(section);
      const ledHere = led !== undefined && (led.x - centre.x) ** 2 + (led.y - centre.y) ** 2 < (REACHED * 1.5) ** 2;
      // An attack that has come to a halt with its objective out of sight
      // (refine-battle-maps 5.13: a concealed enemy no longer shows himself
      // by firing from afar) is idle too: it goes on to the last contact.
      const idle = section.every(
        (unit) =>
          (unit.targetId === null || (unit.currentOrder === 'attack' && !seenBySide(ctx, unit, unit.targetId))) &&
          unit.path.length === 0 &&
          unit.boundTeam === null &&
          (!unit.holdPosition || (ledHere && unit.currentOrder === 'advance') || unit.currentOrder === 'attack') &&
          !HOLDING.has(unit.currentOrder ?? ''),
      );
      if (!idle) continue;
      // Only a section that has met the enemy goes after him: before the
      // first contact the player (or the commander) decides when to move.
      const contact = ctx.battle.contacts.get(squadId);
      if (!contact || tick - contact.tick < LOST_CONTACT_TICKS) continue;
      const here = centroid(section);
      const reached = Math.sqrt((contact.x - here.x) ** 2 + (contact.y - here.y) ** 2) < REACHED;
      // refine-battle-maps: at the reached spot, search on: the next area the
      // side has a clue for, else the enemy's main body as the side knows it.
      const area = reached ? nextSearchArea(ctx, side, here, squadId, tick) : null;
      const mainBody = ctx.fog ? (ctx.battle.deployment.get(enemy) ?? centroid(enemies)) : centroid(enemies);
      const to = !reached ? { x: contact.x, y: contact.y } : area ? { x: area.x, y: area.y } : mainBody;
      // At the reached spot, keep the contact (fresh) on the next place.
      if (reached) ctx.battle.contacts.set(squadId, { ...to, tick });
      ctx.battle.led.set(squadId, to);
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
  const theirFit = ctx.fog
    ? Math.max(
        knownEnemies(ctx, 'legalist', tick).length,
        (ctx.battle.strength.get('column') ?? 0) - ctx.battle.seenDown.legalist.size,
      )
    : knownEnemies(ctx, 'legalist', tick).length;
  const enemyCentre = ctx.battle.deployment.get('column')!;

  const command = (order: Command) => issue(ctx, order, tick, events);
  const home = ctx.battle.deployment.get('legalist')!;
  for (const [squadId, section] of own) {
    // garrison-and-assault 3.4: a section going in or assaulting keeps to it;
    // one inside holds it, and leaves it only when it is lost.
    if (section.some((unit) => unit.entering !== undefined || unit.assaulting !== undefined)) continue;
    if (section.some((unit) => unit.garrison !== undefined)) {
      plans.set(squadId, 'garrison');
      leaveIfLost(ctx, 'legalist', section, home, knownEnemies(ctx, 'legalist', tick), command);
      continue;
    }
    const plan = plans.get(squadId);
    const ids = section.map((unit) => unit.id);
    const here = centroid(section);
    if (plan === undefined) {
      // Deploy: a defended line a little forward of the start, facing the enemy.
      const dx = enemyCentre.x - here.x;
      const dy = enemyCentre.y - here.y;
      const length = Math.sqrt(dx ** 2 + dy ** 2) || 1;
      const to = { x: here.x + (dx / length) * 10, y: here.y + (dy / length) * 10 };
      // garrison-and-assault 3.4: one section garrisons a position near the line.
      if (garrisonOnDeploy(ctx, 'legalist', ids, to, command)) {
        plans.set(squadId, 'garrison');
        continue;
      }
      issue(ctx, { type: 'order', order: 'defend', unitIds: ids, to, facing: { x: dx / length, y: dy / length } }, tick, events);
      plans.set(squadId, 'hold');
      continue;
    }
    // A section that went in and came out (or was turned away) is back in the line.
    if (plan === 'garrison') {
      plans.set(squadId, 'hold');
      continue;
    }
    if (plan === 'withdraw') {
      if (section.every((unit) => unit.path.length === 0)) {
        // He ran with his back to the enemy: the rallied line turns round.
        issue(ctx, { type: 'order', order: 'defend', unitIds: ids, to: here, facing: facingFrom(here, enemyCentre) }, tick, events);
        plans.set(squadId, 'rallied');
      }
      continue;
    }
    const pinned = section.filter((unit) => unit.state === 'pinned' || unit.state === 'panicked').length;
    // add-map-objectives D4: a section holding an objective stays on it; a
    // broken one withdraws and another takes the objective over.
    if (plan === 'hold-objective') {
      if (section.length < BROKEN_SECTION || pinned * 2 > section.length) {
        issue(ctx, { type: 'withdraw', unitIds: ids }, tick, events);
        plans.set(squadId, 'withdraw');
      }
      continue;
    }
    if (plan !== 'rallied' && (section.length < BROKEN_SECTION || pinned * 2 > section.length)) {
      issue(ctx, { type: 'withdraw', unitIds: ids }, tick, events);
      plans.set(squadId, 'withdraw');
      continue;
    }
    // garrison-and-assault 3.4: an attacking section near a known enemy garrison suppresses, then assaults it.
    if (plan === 'attack' && dealWithGarrison(ctx, 'legalist', section, command)) continue;
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

  // add-map-objectives D4: one section on each objective of value 2 or more it
  // holds, then retake one the player took, then the last three minutes.
  assignObjectiveGuards(ctx, own, plans, tick, events);
  retakeObjective(ctx, own, plans, tick, events);

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

  commitLastMinutes(ctx, own, plans, tick, events);
}

/**
 * A defend order's facing from a point toward another. The legalists give
 * their defends one, so the line does not depend on seeing the enemy (fog of
 * war): undefined when the points coincide, and the order then faces by itself.
 */
function facingFrom(from: Vec2, toward: Vec2): Vec2 | undefined {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const length = Math.sqrt(dx ** 2 + dy ** 2);
  return length > 0.001 ? { x: dx / length, y: dy / length } : undefined;
}

/** add-map-objectives D4: squared distance between two points. */
function distanceTo(point: Vec2, target: Vec2): number {
  return (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
}

/**
 * add-map-objectives D4: for each objective of value 2 or more the legalists
 * hold, the nearest idle section defends at its flag; a guard that breaks is
 * replaced on the next look.
 */
function assignObjectiveGuards(
  ctx: SimContext,
  own: Map<number, MutableUnit[]>,
  plans: Map<number, SectionPlan>,
  tick: number,
  events: SimEvent[],
): void {
  const guards = ctx.battle.objectiveGuards;
  for (const [squadId, objectiveId] of [...guards]) {
    const objective = ctx.objectives.find((entry) => entry.id === objectiveId);
    if (!own.has(squadId) || plans.get(squadId) !== 'hold-objective' || objective === undefined || objective.owner !== 'legalist') {
      guards.delete(squadId);
    }
  }
  const guarded = new Set(guards.values());
  for (const objective of ctx.objectives) {
    if (objective.owner !== 'legalist' || objective.value < 2 || guarded.has(objective.id)) continue;
    const candidate = [...own]
      .filter(([squadId]) => {
        const plan = plans.get(squadId);
        return (plan === 'hold' || plan === 'rallied') && !guards.has(squadId);
      })
      .sort(
        (left, right) =>
          distanceTo(centroid(left[1]), objective.flag) - distanceTo(centroid(right[1]), objective.flag) || left[0] - right[0],
      )[0];
    if (candidate === undefined) continue;
    const [squadId, section] = candidate;
    issue(
      ctx,
      {
        type: 'order',
        order: 'defend',
        unitIds: section.map((unit) => unit.id),
        to: { x: objective.flag.x, y: objective.flag.y },
        // The guard faces where the column came from, whoever it sees.
        facing: facingFrom(objective.flag, ctx.battle.deployment.get('column') ?? objective.flag),
      },
      tick,
      events,
    );
    plans.set(squadId, 'hold-objective');
    guards.set(squadId, objective.id);
    guarded.add(objective.id);
  }
}

/**
 * add-map-objectives D4: within 60 s of the player taking an objective, the
 * nearest section that is not guarding or withdrawing goes to retake it.
 */
function retakeObjective(
  ctx: SimContext,
  own: Map<number, MutableUnit[]>,
  plans: Map<number, SectionPlan>,
  tick: number,
  events: SimEvent[],
): void {
  const retake = ctx.battle.retake;
  if (retake === null) return;
  if (tick - retake.tick > RETAKE_TICKS) {
    ctx.battle.retake = null;
    return;
  }
  const objective = ctx.objectives.find((entry) => entry.id === retake.objectiveId);
  if (objective === undefined || objective.owner === 'legalist') {
    ctx.battle.retake = null;
    return;
  }
  const pick = [...own]
    .filter(([squadId]) => {
      const plan = plans.get(squadId);
      return plan !== 'garrison' && plan !== 'hold-objective' && plan !== 'withdraw';
    })
    .filter(([, section]) =>
      section.every((unit) => unit.garrison === undefined && unit.entering === undefined && unit.assaulting === undefined),
    )
    .sort(
      (left, right) =>
        distanceTo(centroid(left[1]), objective.flag) - distanceTo(centroid(right[1]), objective.flag) || left[0] - right[0],
    )[0];
  if (pick === undefined) return;
  const [squadId, section] = pick;
  issue(
    ctx,
    { type: 'order', order: 'advance', unitIds: section.map((unit) => unit.id), to: { x: objective.flag.x, y: objective.flag.y } },
    tick,
    events,
  );
  plans.set(squadId, 'attack');
  ctx.battle.retake = null;
}

/**
 * add-map-objectives D4: in the last three minutes, holding less value, all
 * but one section attacks (a section inside a position keeps back, else the
 * weakest).
 */
function commitLastMinutes(
  ctx: SimContext,
  own: Map<number, MutableUnit[]>,
  plans: Map<number, SectionPlan>,
  tick: number,
  events: SimEvent[],
): void {
  if (ctx.objectives.length === 0) return;
  const remaining = ctx.timeLimitTicks - (tick - ctx.battleStartTick);
  if (remaining >= LAST_MINUTES_TICKS || remaining <= 0) return;
  const values = objectiveValues(ctx);
  if (values.legalist >= values.column) return;
  const inside = ([, section]: [number, MutableUnit[]]) =>
    section.some((unit) => unit.garrison !== undefined || unit.entering !== undefined || unit.assaulting !== undefined);
  const notAttacking = [...own].filter(([squadId]) => plans.get(squadId) !== 'attack');
  if (notAttacking.length === 0) return;
  // One section stays back: a section inside a position if there is one (it
  // cannot be ordered out mid-fight), else the weakest mobile one.
  const reserve = notAttacking.find(inside) ?? [...notAttacking].sort((left, right) => left[1].length - right[1].length || left[0] - right[0])[0];
  for (const [squadId, section] of notAttacking) {
    if (squadId === reserve![0] || inside([squadId, section])) continue;
    if (goFor(ctx, 'legalist', section.map((unit) => unit.id), centroid(section), squadId, tick, events)) {
      plans.set(squadId, 'attack');
      ctx.battle.objectiveGuards.delete(squadId);
    }
  }
}

/**
 * add-map-objectives D4: the player taking an objective is public, so the
 * commander knows what it must retake (and for how long it still counts). It
 * watches the owners rather than the events: objective capture runs after the
 * commander in the tick, so the change is seen on the next look.
 */
function recordObjectiveLoss(ctx: SimContext, tick: number): void {
  const owners = ctx.battle.objectiveOwners;
  for (const objective of ctx.objectives) {
    if (owners.get(objective.id) === 'legalist' && objective.owner === 'column') {
      ctx.battle.retake = { objectiveId: objective.id, tick };
    }
    owners.set(objective.id, objective.owner);
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
  recordObjectiveLoss(ctx, tick);
  if (tick % THINK_EVERY !== 0) return;
  for (const side of SIDES) sweep(ctx, side);
  fallBack(ctx, tick, events);
  commandLegalists(ctx, tick, events);
  closeOnLostContact(ctx, tick, events);
}
