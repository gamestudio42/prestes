import type { Vec2 } from '../protocol';
import { pointInPolygon } from './geometry';
import type { BattleMap, WaterArea } from './types';

/**
 * ambient-sound-and-voices 3.3 (design D5): the nearest water of each kind
 * to a point. Shared so the water sounds and, later, the footsteps' shallow
 * water read the map the same way. Presentation only: nothing here feeds
 * the simulation.
 */

/** How a stretch of water sounds. */
export type WaterSoundKind = 'river' | 'stream' | 'ford' | 'pond' | 'sea';

export const WATER_SOUND_KINDS: readonly WaterSoundKind[] = ['river', 'stream', 'ford', 'pond', 'sea'];

/** A river this wide or narrower is a stream (the editor's rivers run 3 to 60 m). */
export const STREAM_MAX_WIDTH = 8;

/** Two stretches of one kind closer than this (m) are the same water: one emitter. */
export const WATER_SEPARATION = 40;

/** The most stretches of one kind returned (design D5: two emitters per kind). */
export const WATER_PER_KIND = 2;

export interface NearWater {
  kind: WaterSoundKind;
  /** The nearest point on the water's surface. */
  point: Vec2;
  /** Metres from the point asked to the water's edge (0 on the water). */
  distance: number;
}

/**
 * The sound kind of one water area: the sea and its surf sound of waves; a
 * ford sounds shallow wherever it is; deep water by its shape and width.
 */
export function waterSoundKind(area: WaterArea): WaterSoundKind {
  if (area.sea) return 'sea';
  if (area.kind === 'ford') return 'ford';
  if (area.strip) return area.strip.width <= STREAM_MAX_WIDTH ? 'stream' : 'river';
  return 'pond';
}

function closestOnSegments(x: number, y: number, points: readonly Vec2[], closed: boolean): { point: Vec2; distance: number } {
  let best = { point: points[0] ?? { x, y }, distance: Number.POSITIVE_INFINITY };
  const count = closed ? points.length : points.length - 1;
  for (let index = 0; index < count; index += 1) {
    const a = points[index]!;
    const b = points[(index + 1) % points.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length));
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const distance = Math.hypot(px - x, py - y);
    if (distance < best.distance) best = { point: { x: px, y: py }, distance };
  }
  return best;
}

/** The nearest point of one water area to (x, y), and the distance to its edge. */
export function nearestOnWater(area: WaterArea, x: number, y: number): { point: Vec2; distance: number } | null {
  if (area.strip && area.strip.points.length >= 2) {
    const centre = closestOnSegments(x, y, area.strip.points, false);
    const half = area.strip.width / 2;
    if (centre.distance <= half) return { point: { x, y }, distance: 0 };
    // On the near bank, towards the point asked.
    const share = half / centre.distance;
    return { point: { x: centre.point.x + (x - centre.point.x) * share, y: centre.point.y + (y - centre.point.y) * share }, distance: centre.distance - half };
  }
  if (area.polygon && area.polygon.length >= 3) {
    if (pointInPolygon(x, y, area.polygon)) return { point: { x, y }, distance: 0 };
    return closestOnSegments(x, y, area.polygon, true);
  }
  return null;
}

/**
 * The nearest stretches of each kind within `range` metres of (x, y),
 * nearest first: at most `WATER_PER_KIND` of a kind, and a second only when
 * it lies `WATER_SEPARATION` from the first (a river's next segment is the
 * same water, not a second stretch).
 */
export function nearestWater(map: Pick<BattleMap, 'water'>, x: number, y: number, range: number): NearWater[] {
  const found: NearWater[] = [];
  for (const area of map.water) {
    const near = nearestOnWater(area, x, y);
    if (near && near.distance <= range) found.push({ kind: waterSoundKind(area), ...near });
  }
  found.sort((a, b) => a.distance - b.distance);
  const kept: NearWater[] = [];
  for (const water of found) {
    const same = kept.filter((other) => other.kind === water.kind);
    if (same.length >= WATER_PER_KIND) continue;
    if (same.some((other) => Math.hypot(other.point.x - water.point.x, other.point.y - water.point.y) < WATER_SEPARATION)) continue;
    kept.push(water);
  }
  return kept;
}
