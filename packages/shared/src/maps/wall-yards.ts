import type { Vec2 } from '../protocol';
import type { GarrisonYard } from './types';

/**
 * author-game-maps (the user's choice, 2026-11-09): a walled yard on an
 * authored map is found from its walls, with no marking. Walls tall enough
 * to fight over whose ends meet, or nearly meet, form a group; a group that
 * walls in most of the ground it spans is a yard a section can hold, its
 * gaps the entrances (see `yardPosition`).
 */

/** Walls lower than this (m) are not a yard's: a man must stand behind them. */
export const YARD_WALL_MIN_HEIGHT = 1.5;
/** Two walls are one group when an end of one comes this close to the other's points (m). */
export const YARD_JOIN_REACH = 12;
/** The walls must run along at least this share of the ground's outline. */
export const YARD_ENCLOSED_SHARE = 0.7;
/** The ground walled in: at least this area (m²), at most this across (m). */
export const YARD_MIN_AREA = 60;
export const YARD_MAX_ACROSS = 80;
/** The most men a yard holds (the Bairro factory yard's); fewer if it has fewer ports. */
export const YARD_CAPACITY = 12;

export interface YardWall {
  /** The line's id, for a stable order. */
  id: number;
  points: readonly Vec2[];
  height: number;
  /** The cover ids of its pieces, in order. */
  coverIds: readonly number[];
}

function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function length(points: readonly Vec2[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distance(points[index - 1]!, points[index]!);
  return total;
}

/** Convex hull, counter-clockwise (monotone chain). */
function hull(points: readonly Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Vec2[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function area(polygon: readonly Vec2[]): number {
  let sum = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function centroid(polygon: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const point of polygon) {
    x += point.x;
    y += point.y;
  }
  return { x: x / polygon.length, y: y / polygon.length };
}

/** The yards the walls form, in the order of their first wall's id. */
export function detectWallYards(walls: readonly YardWall[]): GarrisonYard[] {
  const tall = [...walls].filter((wall) => wall.height >= YARD_WALL_MIN_HEIGHT && wall.points.length >= 2 && wall.coverIds.length > 0).sort((a, b) => a.id - b.id);
  // Group walls whose ends reach another wall's points (union-find).
  const parent = tall.map((_, index) => index);
  const root = (index: number): number => (parent[index] === index ? index : (parent[index] = root(parent[index]!)));
  for (let i = 0; i < tall.length; i += 1) {
    for (let j = i + 1; j < tall.length; j += 1) {
      const a = tall[i]!;
      const b = tall[j]!;
      const endsOf = (wall: YardWall) => [wall.points[0]!, wall.points[wall.points.length - 1]!];
      const touches =
        endsOf(a).some((end) => b.points.some((point) => distance(end, point) <= YARD_JOIN_REACH)) ||
        endsOf(b).some((end) => a.points.some((point) => distance(end, point) <= YARD_JOIN_REACH));
      if (touches) parent[root(i)] = root(j);
    }
  }
  const groups = new Map<number, YardWall[]>();
  tall.forEach((wall, index) => {
    const key = root(index);
    groups.set(key, [...(groups.get(key) ?? []), wall]);
  });
  const yards: GarrisonYard[] = [];
  for (const group of groups.values()) {
    const points = group.flatMap((wall) => wall.points);
    const outline = hull(points);
    if (outline.length < 3) continue;
    const across = Math.max(...points.flatMap((a) => points.map((b) => distance(a, b))));
    if (across > YARD_MAX_ACROSS || area(outline) < YARD_MIN_AREA) continue;
    let perimeter = 0;
    for (let index = 0; index < outline.length; index += 1) perimeter += distance(outline[index]!, outline[(index + 1) % outline.length]!);
    const walled = group.reduce((sum, wall) => sum + length(wall.points), 0);
    if (walled < perimeter * YARD_ENCLOSED_SHARE) continue;
    const wallIds = group.flatMap((wall) => wall.coverIds);
    yards.push({ id: wallIds[0]!, wallIds, capacity: YARD_CAPACITY, centre: centroid(outline) });
  }
  return yards.sort((a, b) => a.id - b.id);
}
