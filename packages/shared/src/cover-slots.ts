import type { CoverPoint, Stance, Vec2 } from './protocol';
import { findPath, isInsidePathGrid } from './pathfinding';
import { isPointBlockedByCovers, isPointInCover } from './world';

/** A place where one soldier takes cover behind (or inside) a cover object. */
export interface CoverSlot {
  /** Stable id: coverId * 64 + index. */
  id: number;
  coverId: number;
  x: number;
  y: number;
  /**
   * Direction the slot is covered against (toward the cover face, where the
   * threat should be). Null for slots covered on every side, such as a trench.
   */
  guard: Vec2 | null;
  stance: Stance;
}

/** Distance from a cover face to its slots: just outside the 0.8 m clearance. */
const SLOT_OFFSET = 1.0;
const LINEAR_SPACING = 1.2;
const BUILDING_SPACING = 2.0;
const LOW_COVER_HEIGHT = 1.2;
const MAX_SLOTS = 64;
/** Metres a cover slot may lie closer to the threat than the soldier's formation spot. */
const MAX_ADVANCE_TO_COVER = 2;

function toWorld(cover: CoverPoint, localX: number, localY: number): Vec2 {
  const rotation = cover.rotation ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: cover.x + localX * cos - localY * sin,
    y: cover.y + localX * sin + localY * cos,
  };
}

function toWorldDirection(cover: CoverPoint, localX: number, localY: number): Vec2 {
  const rotation = cover.rotation ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const x = localX * cos - localY * sin;
  const y = localX * sin + localY * cos;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

/** Evenly spaced positions along a segment of `length`, centred on 0. */
function spread(length: number, spacing: number): number[] {
  const count = Math.max(1, Math.floor(length / spacing));
  const step = length / count;
  return Array.from({ length: count }, (_, index) => -length / 2 + step * (index + 0.5));
}

/**
 * The cover slots of one cover object, derived from its footprint. Linear cover
 * has slots along both long faces, a trench along its floor, a barrel one per
 * side and a building at its corners and along its walls.
 */
export function coverSlots(cover: CoverPoint): CoverSlot[] {
  // A fence stops a man but shelters no one: it has no slots.
  if (cover.kind === 'fence') return [];
  const low = cover.height < LOW_COVER_HEIGHT;
  const slotStance: Stance = cover.kind === 'trench' || low ? 'crouched' : 'standing';
  const local: Array<{ x: number; y: number; guard: Vec2 | null }> = [];

  if (cover.kind === 'trench') {
    for (const x of spread(cover.halfWidth * 2, LINEAR_SPACING)) {
      local.push({ x, y: 0, guard: null });
    }
  } else if (cover.kind === 'barrel') {
    local.push(
      { x: 0, y: cover.halfDepth + SLOT_OFFSET, guard: { x: 0, y: -1 } },
      { x: 0, y: -(cover.halfDepth + SLOT_OFFSET), guard: { x: 0, y: 1 } },
      { x: cover.halfWidth + SLOT_OFFSET, y: 0, guard: { x: -1, y: 0 } },
      { x: -(cover.halfWidth + SLOT_OFFSET), y: 0, guard: { x: 1, y: 0 } },
    );
  } else if (cover.kind === 'building') {
    const cx = cover.halfWidth + SLOT_OFFSET;
    const cy = cover.halfDepth + SLOT_OFFSET;
    for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const) {
      local.push({ x: sx * cx, y: sy * cy, guard: { x: -sx, y: -sy } });
    }
    for (const x of spread(cover.halfWidth * 2, BUILDING_SPACING)) {
      local.push({ x, y: cy, guard: { x: 0, y: -1 } }, { x, y: -cy, guard: { x: 0, y: 1 } });
    }
    for (const y of spread(cover.halfDepth * 2, BUILDING_SPACING)) {
      local.push({ x: cx, y, guard: { x: -1, y: 0 } }, { x: -cx, y, guard: { x: 1, y: 0 } });
    }
  } else {
    // Sandbags, stone and low walls: both long faces.
    for (const x of spread(cover.halfWidth * 2, LINEAR_SPACING)) {
      local.push(
        { x, y: cover.halfDepth + SLOT_OFFSET, guard: { x: 0, y: -1 } },
        { x, y: -(cover.halfDepth + SLOT_OFFSET), guard: { x: 0, y: 1 } },
      );
    }
  }

  return local.slice(0, MAX_SLOTS).map((slot, index) => {
    const position = toWorld(cover, slot.x, slot.y);
    return {
      id: cover.id * MAX_SLOTS + index,
      coverId: cover.id,
      x: position.x,
      y: position.y,
      guard: slot.guard ? toWorldDirection(cover, slot.guard.x, slot.guard.y) : null,
      stance: slotStance,
    };
  });
}

/**
 * Slots of every cover that are on the walkable grid and not inside some
 * movement-blocking footprint.
 */
export function allCoverSlots(covers: readonly CoverPoint[]): CoverSlot[] {
  const walkable = covers
    .flatMap((cover) => coverSlots(cover))
    .filter(
      (slot) =>
        isInsidePathGrid(slot.x, slot.y) && !isPointBlockedByCovers(slot.x, slot.y, covers, 0.8),
    );
  return keepRoom(walkable, covers);
}

/** Two slots closer than this are one place: a man's width (movement-polish). */
export const SLOT_ROOM = 1.15;

/**
 * Overlapping covers (a trench bay and its parapet) offer slots on top of each
 * other, which stood soldiers in pairs half a metre apart. Keeps the slots of
 * the better cover first (quality, then cover id, then slot order) and drops
 * any slot within a man's width of one already kept.
 */
function keepRoom(slots: readonly CoverSlot[], covers: readonly CoverPoint[]): CoverSlot[] {
  const quality = new Map(covers.map((cover) => [cover.id, cover.quality]));
  const ordered = [...slots].sort(
    (left, right) =>
      (quality.get(right.coverId) ?? 0) - (quality.get(left.coverId) ?? 0) ||
      left.coverId - right.coverId ||
      left.id - right.id,
  );
  const cell = (value: number) => Math.floor(value / SLOT_ROOM);
  const grid = new Map<string, CoverSlot[]>();
  const kept: CoverSlot[] = [];
  for (const slot of ordered) {
    const cx = cell(slot.x);
    const cy = cell(slot.y);
    let crowded = false;
    for (let dx = -1; dx <= 1 && !crowded; dx += 1) {
      for (let dy = -1; dy <= 1 && !crowded; dy += 1) {
        for (const other of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
          if ((other.x - slot.x) ** 2 + (other.y - slot.y) ** 2 < SLOT_ROOM * SLOT_ROOM) {
            crowded = true;
            break;
          }
        }
      }
    }
    if (crowded) continue;
    kept.push(slot);
    const key = `${cx}:${cy}`;
    grid.set(key, [...(grid.get(key) ?? []), slot]);
  }
  // Back to the generation order, which the rest of the planner expects.
  const keep = new Set(kept);
  return slots.filter((slot) => keep.has(slot));
}

export interface SlotPickOptions {
  /** Slot id -> unit id currently holding it. */
  held?: ReadonlyMap<number, number>;
  /** Threat position; slots must guard toward it. */
  threat?: Vec2 | null;
  /** Used as the threat direction when no threat is known. */
  facing?: Vec2 | null;
  /** Only slots within this distance of the anchor. */
  maxDistance?: number;
  /** Defend and ambush regions. */
  region?: { center: Vec2; radius: number } | null;
  /** A cover clicked by the player: its slots come first. */
  preferCoverId?: number | null;
  /** Reachability test from a unit to a slot (pathfinding in the simulation). */
  reachable?: (unit: { id: number; x: number; y: number }, slot: CoverSlot) => boolean;
}

/** True when the slot covers its soldier against the threat direction. */
export function slotGuards(slot: CoverSlot, threat: Vec2 | null, facing: Vec2 | null): boolean {
  if (!slot.guard) {
    return true;
  }
  const direction = threat
    ? { x: threat.x - slot.x, y: threat.y - slot.y }
    : facing ?? null;
  if (!direction) {
    return true;
  }
  return slot.guard.x * direction.x + slot.guard.y * direction.y > 0;
}

/**
 * Assigns free cover slots to soldiers: each soldier gets at most one slot, each
 * slot at most one soldier, closest soldier-to-slot pairs first (ties by unit id
 * then slot id). `anchors` gives each soldier's formation position.
 */
export function pickSlots(
  units: readonly { id: number; x: number; y: number }[],
  anchors: ReadonlyMap<number, Vec2>,
  slots: readonly CoverSlot[],
  options: SlotPickOptions = {},
): Map<number, CoverSlot> {
  const held = options.held ?? new Map<number, number>();
  const maxDistance = options.maxDistance ?? 12;
  const candidates = slots.filter((slot) => {
    const holder = held.get(slot.id);
    if (holder !== undefined && !units.some((unit) => unit.id === holder)) {
      return false;
    }
    if (
      options.region &&
      (slot.x - options.region.center.x) ** 2 + (slot.y - options.region.center.y) ** 2 >
        options.region.radius ** 2
    ) {
      return false;
    }
    return slotGuards(slot, options.threat ?? null, options.facing ?? null);
  });
  const threat = options.threat ?? null;
  const pairs: Array<{ unit: { id: number; x: number; y: number }; slot: CoverSlot; score: number }> = [];
  for (const unit of units) {
    const anchor = anchors.get(unit.id) ?? unit;
    for (const slot of candidates) {
      const distance = Math.hypot(slot.x - anchor.x, slot.y - anchor.y);
      if (distance > maxDistance) {
        continue;
      }
      const preferred = options.preferCoverId != null && slot.coverId === options.preferCoverId;
      // Cover-first never draws a soldier toward the enemy, unless that cover was clicked.
      if (
        threat &&
        !preferred &&
        Math.hypot(slot.x - threat.x, slot.y - threat.y) <
          Math.hypot(anchor.x - threat.x, anchor.y - threat.y) - MAX_ADVANCE_TO_COVER
      ) {
        continue;
      }
      pairs.push({ unit, slot, score: distance - (preferred ? 100 : 0) });
    }
  }
  pairs.sort((left, right) => left.score - right.score || left.unit.id - right.unit.id || left.slot.id - right.slot.id);
  const assigned = new Map<number, CoverSlot>();
  const taken = new Set<number>();
  for (const pair of pairs) {
    if (assigned.has(pair.unit.id) || taken.has(pair.slot.id)) {
      continue;
    }
    if (options.reachable && !options.reachable(pair.unit, pair.slot)) {
      continue;
    }
    assigned.set(pair.unit.id, pair.slot);
    taken.add(pair.slot.id);
  }
  return assigned;
}

/** Slot index cell size (m). */
const SLOT_CELL = 8;

interface SlotIndex {
  key: number;
  length: number;
  slots: CoverSlot[];
  byId: Map<number, CoverSlot>;
  /** Slot positions in `slots` by 8 m cell. */
  cells: Map<number, number[]>;
}

const slotCache = new WeakMap<readonly CoverPoint[], SlotIndex>();

/**
 * A numeric digest of every cover's id, position and rotation: the cache key.
 * refine-battle-maps: it was a joined string of the same fields, rebuilt on
 * every call (each soldier, each tick).
 */
function coversKey(covers: readonly CoverPoint[]): number {
  let hash = 2166136261;
  const mix = (value: number) => {
    hash = Math.imul(hash ^ Math.round(value * 1000), 16777619);
  };
  for (const cover of covers) {
    mix(cover.id);
    mix(cover.x);
    mix(cover.y);
    mix(cover.rotation ?? 0);
  }
  return hash >>> 0;
}

const cellKey = (cx: number, cy: number) => cx * 100003 + cy;

function slotIndex(covers: readonly CoverPoint[]): SlotIndex {
  const key = coversKey(covers);
  const cached = slotCache.get(covers);
  if (cached && cached.key === key && cached.length === covers.length) {
    return cached;
  }
  const slots = allCoverSlots(covers);
  const byId = new Map<number, CoverSlot>();
  const cells = new Map<number, number[]>();
  slots.forEach((slot, index) => {
    // The first slot of an id wins, as a search through `slots` finds it.
    if (!byId.has(slot.id)) byId.set(slot.id, slot);
    const cell = cellKey(Math.floor(slot.x / SLOT_CELL), Math.floor(slot.y / SLOT_CELL));
    const list = cells.get(cell);
    if (list) list.push(index);
    else cells.set(cell, [index]);
  });
  const index: SlotIndex = { key, length: covers.length, slots, byId, cells };
  slotCache.set(covers, index);
  return index;
}

/** `allCoverSlots`, cached per cover array until the cover set changes. */
export function cachedCoverSlots(covers: readonly CoverPoint[]): CoverSlot[] {
  return slotIndex(covers).slots;
}

/** One cover slot by id (cached). */
export function coverSlotById(covers: readonly CoverPoint[], id: number): CoverSlot | undefined {
  return slotIndex(covers).byId.get(id);
}

/**
 * Every cached slot that may lie within `radius` of a point (the slots of the
 * 8 m cells the circle touches), in `cachedCoverSlots` order, so a search
 * over them breaks ties as a search over all slots does.
 */
export function coverSlotsNear(covers: readonly CoverPoint[], x: number, y: number, radius: number): CoverSlot[] {
  const index = slotIndex(covers);
  const found: number[] = [];
  for (let cx = Math.floor((x - radius) / SLOT_CELL); cx <= Math.floor((x + radius) / SLOT_CELL); cx += 1) {
    for (let cy = Math.floor((y - radius) / SLOT_CELL); cy <= Math.floor((y + radius) / SLOT_CELL); cy += 1) {
      const list = index.cells.get(cellKey(cx, cy));
      if (list) found.push(...list);
    }
  }
  found.sort((left, right) => left - right);
  return found.map((position) => index.slots[position]!);
}

export interface CoverSlotPlan {
  held?: ReadonlyMap<number, number>;
  threat?: Vec2 | null;
  facing?: Vec2 | null;
  region?: { center: Vec2; radius: number } | null;
  /** The clicked ground point: a click on a cover fills that cover first. */
  click?: Vec2 | null;
  /** Distance from each soldier's formation slot to an acceptable cover slot. */
  maxDistance?: number;
}

/** The cover whose footprint (plus a small margin) contains the point. */
export function coverAtPoint(point: Vec2, covers: readonly CoverPoint[]): CoverPoint | null {
  return covers.find((cover) => isPointInCover(point.x, point.y, cover, 1)) ?? null;
}

/**
 * Cover slots for an order: the same planner drives the simulation and the
 * preview. `anchors` maps each soldier to its formation slot.
 */
export function planCoverSlots(
  units: readonly { id: number; x: number; y: number }[],
  anchors: ReadonlyMap<number, Vec2>,
  covers: readonly CoverPoint[],
  plan: CoverSlotPlan = {},
): Map<number, CoverSlot> {
  const clicked = plan.click ? coverAtPoint(plan.click, covers) : null;
  return pickSlots(units, anchors, cachedCoverSlots(covers), {
    held: plan.held,
    threat: plan.threat ?? null,
    facing: plan.facing ?? null,
    region: plan.region ?? null,
    preferCoverId: clicked?.id ?? null,
    maxDistance: clicked ? 16 : (plan.maxDistance ?? 4),
    reachable: (unit, slot) => findPath({ x: unit.x, y: unit.y }, slot, covers).length > 0,
  });
}

export interface SlotMarker {
  slotId: number;
  x: number;
  y: number;
  state: 'free' | 'taken' | 'planned';
}

export interface CoverSlotView {
  coverId: number | null;
  free: number;
  total: number;
  markers: SlotMarker[];
}

/**
 * Slot markers for the HUD: every slot of the hovered cover (free or taken) and
 * the slots the pending order would take, with the hovered cover's free count.
 */
export function coverSlotView(
  covers: readonly CoverPoint[],
  units: readonly { id: number; slotId?: number | null; alive: boolean; incapacitated?: boolean }[],
  hovered: Vec2 | null,
  planned: ReadonlySet<number>,
): CoverSlotView {
  const held = new Set<number>();
  for (const unit of units) {
    if (unit.slotId != null && unit.alive && !unit.incapacitated) {
      held.add(unit.slotId);
    }
  }
  const cover = hovered ? coverAtPoint(hovered, covers) : null;
  const markers: SlotMarker[] = [];
  let free = 0;
  let total = 0;
  for (const slot of cachedCoverSlots(covers)) {
    const onCover = cover !== null && slot.coverId === cover.id;
    if (!onCover && !planned.has(slot.id)) {
      continue;
    }
    const state = planned.has(slot.id) ? 'planned' : held.has(slot.id) ? 'taken' : 'free';
    if (onCover) {
      total += 1;
      if (!held.has(slot.id)) {
        free += 1;
      }
    }
    markers.push({ slotId: slot.id, x: slot.x, y: slot.y, state });
  }
  return { coverId: cover?.id ?? null, free, total, markers };
}
