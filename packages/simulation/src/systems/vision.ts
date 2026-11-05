import { eyeHeightForStance, isLineBlocked, isPointInVision } from '@prestes/shared';
import type { SimEvent } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';

/**
 * Fog of war (fog-of-war): what each side sees of the other. A side sees an
 * enemy soldier when one of its fit soldiers has him within VISION_RANGE and
 * inside his vision cone or within NEAR_SENSE, with a clear line of sight at
 * the two men's eye heights. The result is simulation state, sent with every
 * frame; the view hides what the player's side does not see, and the enemy
 * commander knows only what his side saw.
 */

export type Side = 'column' | 'legalist';
export const SIDES: readonly Side[] = ['column', 'legalist'];

/** Sight range (m): the rifle's range. */
export const VISION_RANGE = 120;
/** A man is sensed this close (m) in any direction. */
export const NEAR_SENSE = 15;
/** Vision is refreshed every this many ticks (0.2 s). */
export const VISION_EVERY = 2;
/** The enemy remembers a soldier it saw for this long (ticks, 30 s). */
export const REMEMBER_TICKS = 300;

export interface Sighting {
  x: number;
  y: number;
  tick: number;
}

export interface VisionState {
  /** Enemy soldiers each side sees now. */
  readonly seen: Record<Side, Set<number>>;
  /** Where each side last saw each enemy soldier. */
  readonly lastSeen: Record<Side, Map<number, Sighting>>;
  /** Unseen fire each side has heard: the marker and where the shot really came from. */
  readonly heard: Record<Side, Array<{ x: number; y: number; fromX: number; fromY: number; tick: number }>>;
}

export function createVisionState(): VisionState {
  return {
    seen: { column: new Set(), legalist: new Set() },
    lastSeen: { column: new Map(), legalist: new Map() },
    heard: { column: [], legalist: [] },
  };
}

/** Marker error (m): MARKER_BASE plus MARKER_PER_METRE of the distance... */
const MARKER_BASE = 3;
const MARKER_PER_METRE = 0.08;
/** ...halved for each earlier marker from within MARKER_NEAR m in the last MARKER_TICKS... */
const MARKER_NEAR = 6;
export const MARKER_TICKS = 100;
/** ...and never under MARKER_FLOOR m. */
const MARKER_FLOOR = 2;

/**
 * A shot by a soldier the target's side does not see leaves a marker near
 * him: off by a seeded error that grows with distance and shrinks as more
 * shots come from the same spot. The event never names the shooter.
 */
export function unseenFireMarker(
  ctx: SimContext,
  shooter: MutableUnit,
  target: MutableUnit,
  tick: number,
): SimEvent | null {
  if (target.faction !== 'column' && target.faction !== 'legalist') return null;
  const listener: Side = target.faction;
  if (ctx.vision.seen[listener].has(shooter.id)) return null;
  const heard = ctx.vision.heard[listener];
  while (heard.length > 0 && tick - heard[0]!.tick > MARKER_TICKS) heard.shift();
  const repeats = heard.filter(
    (entry) => (entry.fromX - shooter.x) ** 2 + (entry.fromY - shooter.y) ** 2 <= MARKER_NEAR * MARKER_NEAR,
  ).length;
  const distance = Math.sqrt((target.x - shooter.x) ** 2 + (target.y - shooter.y) ** 2);
  const radius = Math.max(MARKER_FLOOR, (MARKER_BASE + MARKER_PER_METRE * distance) / 2 ** repeats);
  // A point in the disc, by rejection (no trigonometry in the simulation).
  let offsetX = 0;
  let offsetY = 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    offsetX = ctx.rng.nextFloat() * 2 - 1;
    offsetY = ctx.rng.nextFloat() * 2 - 1;
    if (offsetX * offsetX + offsetY * offsetY <= 1) break;
  }
  const x = shooter.x + offsetX * radius;
  const y = shooter.y + offsetY * radius;
  heard.push({ x, y, fromX: shooter.x, fromY: shooter.y, tick });
  return { type: 'unseen_fire', tick, side: shooter.faction, target: target.id, x, y, radius };
}

const fit = (unit: MutableUnit) => unit.alive && !unit.incapacitated && !unit.routed && !unit.dummy;

export function otherSide(side: Side): Side {
  return side === 'column' ? 'legalist' : 'column';
}

/** Whether `observer` sees `target` (range, cone or near sense, line of sight). */
export function sees(ctx: SimContext, observer: MutableUnit, target: MutableUnit): boolean {
  const dx = target.x - observer.x;
  const dy = target.y - observer.y;
  const squared = dx * dx + dy * dy;
  if (squared > VISION_RANGE * VISION_RANGE) return false;
  if (squared > NEAR_SENSE * NEAR_SENSE && !isPointInVision(observer, target)) return false;
  return !isLineBlocked(
    observer.x,
    observer.y,
    target.x,
    target.y,
    ctx.covers,
    ctx.sightObstacles,
    eyeHeightForStance(observer.stance),
    eyeHeightForStance(target.stance),
  );
}

/** Refreshes both sides' seen sets; runs every VISION_EVERY ticks. */
export function updateVision(ctx: SimContext, tick: number): void {
  if (tick % VISION_EVERY !== 0) return;
  for (const side of SIDES) {
    const seen = ctx.vision.seen[side];
    const lastSeen = ctx.vision.lastSeen[side];
    seen.clear();
    const observers = ctx.units.filter((unit) => unit.faction === side && fit(unit));
    if (observers.length === 0) continue;
    const enemy = otherSide(side);
    for (const target of ctx.units) {
      if (target.faction !== enemy || target.routed) continue;
      // Nearest observers first: most enemies are settled by a near one.
      let found = false;
      const ordered = observers
        .map((observer) => ({ observer, distance: (observer.x - target.x) ** 2 + (observer.y - target.y) ** 2 }))
        .filter((entry) => entry.distance <= VISION_RANGE * VISION_RANGE)
        .sort((left, right) => left.distance - right.distance || left.observer.id - right.observer.id);
      for (const { observer } of ordered) {
        if (sees(ctx, observer, target)) {
          found = true;
          break;
        }
      }
      if (found) {
        seen.add(target.id);
        lastSeen.set(target.id, { x: target.x, y: target.y, tick });
      }
    }
  }
}

/** The seen sets as sorted id lists, for the frame. */
export function seenSnapshot(ctx: SimContext): { column: number[]; legalist: number[] } {
  return {
    column: [...ctx.vision.seen.column].sort((left, right) => left - right),
    legalist: [...ctx.vision.seen.legalist].sort((left, right) => left - right),
  };
}
