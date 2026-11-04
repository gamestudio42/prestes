import type { CoverPoint, Stance, Vec2 } from './protocol';
import { isPointBlockedByCovers } from './world';

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

/** Slots of every cover that are not inside some movement-blocking footprint. */
export function allCoverSlots(covers: readonly CoverPoint[]): CoverSlot[] {
  return covers
    .flatMap((cover) => coverSlots(cover))
    .filter((slot) => !isPointBlockedByCovers(slot.x, slot.y, covers, 0.8));
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
  const pairs: Array<{ unit: { id: number; x: number; y: number }; slot: CoverSlot; score: number }> = [];
  for (const unit of units) {
    const anchor = anchors.get(unit.id) ?? unit;
    for (const slot of candidates) {
      const distance = Math.hypot(slot.x - anchor.x, slot.y - anchor.y);
      if (distance > maxDistance) {
        continue;
      }
      const preferred = options.preferCoverId != null && slot.coverId === options.preferCoverId;
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
