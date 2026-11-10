import type { Vec2 } from '../protocol';
import { pointInPolygon, type Box } from './geometry';
import type { Polygon } from './types';

/**
 * add-deployment-phase D3: each side's deployment area. Hand-written maps
 * carry theirs; a document without areas gets the default built here.
 */

/** The default area's margin round a side's section points (m). */
export const DEFAULT_AREA_MARGIN = 30;

function centroid(points: readonly Vec2[]): Vec2 {
  const n = Math.max(1, points.length);
  return { x: points.reduce((sum, p) => sum + p.x, 0) / n, y: points.reduce((sum, p) => sum + p.y, 0) / n };
}

/** Keeps the part of a convex or simple polygon where (p - origin) . normal >= 0 (Sutherland-Hodgman). */
export function clipToHalfPlane(polygon: readonly Vec2[], origin: Vec2, normal: Vec2): Vec2[] {
  const side = (p: Vec2) => (p.x - origin.x) * normal.x + (p.y - origin.y) * normal.y;
  const out: Vec2[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push({ x: a.x, y: a.y });
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The default area of a side: the box round its section points grown by
 * DEFAULT_AREA_MARGIN, clipped to the map and to its own side of the
 * perpendicular bisector between the two sides' centres.
 */
export function defaultDeploymentArea(bounds: Box, own: readonly Vec2[], other: readonly Vec2[]): Vec2[] {
  if (own.length === 0) return [];
  const minX = Math.max(bounds.minX, Math.min(...own.map((p) => p.x)) - DEFAULT_AREA_MARGIN);
  const maxX = Math.min(bounds.maxX, Math.max(...own.map((p) => p.x)) + DEFAULT_AREA_MARGIN);
  const minY = Math.max(bounds.minY, Math.min(...own.map((p) => p.y)) - DEFAULT_AREA_MARGIN);
  const maxY = Math.min(bounds.maxY, Math.max(...own.map((p) => p.y)) + DEFAULT_AREA_MARGIN);
  let area: Vec2[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  if (other.length > 0) {
    const a = centroid(own);
    const b = centroid(other);
    const normal = { x: a.x - b.x, y: a.y - b.y };
    if (Math.hypot(normal.x, normal.y) > 1e-6) area = clipToHalfPlane(area, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, normal);
  }
  return area.map((p) => ({ x: round(p.x), y: round(p.y) }));
}

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const cross = (o: Vec2, p: Vec2, q: Vec2) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** True when two polygons share any area (a corner inside the other, or edges crossing). */
export function polygonsOverlap(a: Polygon, b: Polygon): boolean {
  if (a.some((p) => pointInPolygon(p.x, p.y, b)) || b.some((p) => pointInPolygon(p.x, p.y, a))) return true;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (segmentsCross(a[i]!, a[(i + 1) % a.length]!, b[j]!, b[(j + 1) % b.length]!)) return true;
    }
  }
  return false;
}

/** Twice the signed area: positive counter-clockwise (x right, y down: clockwise on screen). */
export function polygonArea(polygon: Polygon): number {
  let sum = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Whether a point lies in a side's area. */
export function insideDeploymentArea(area: Polygon, x: number, y: number): boolean {
  return area.length >= 3 && pointInPolygon(x, y, area);
}

/**
 * author-game-maps 8.1: a side's three section starts, derived from its
 * deployment area. They stand on the line across the middle of the area's
 * depth (along `facing`), at 1/5, 1/2 and 4/5 of the area's width on that
 * line, rounded to the metre and ordered west to east (then north to south),
 * the convention the hand-placed points followed.
 */
export function sectionStartsFromArea(area: Polygon, facing: Vec2): Vec2[] {
  if (area.length < 3) return [];
  const length = Math.hypot(facing.x, facing.y) || 1;
  const f = { x: facing.x / length, y: facing.y / length };
  const l = { x: -f.y, y: f.x };
  const depthOf = (p: Vec2) => p.x * f.x + p.y * f.y;
  const sideOf = (p: Vec2) => p.x * l.x + p.y * l.y;
  const depths = area.map(depthOf);
  const front = Math.max(...depths);
  const back = Math.min(...depths);
  const line = (front + back) / 2;
  // Where the line crosses the area's edges.
  const crossings: number[] = [];
  for (let index = 0; index < area.length; index += 1) {
    const a = area[index]!;
    const b = area[(index + 1) % area.length]!;
    const da = depthOf(a) - line;
    const db = depthOf(b) - line;
    if ((da <= 0 && db > 0) || (da > 0 && db <= 0)) {
      const t = da / (da - db);
      crossings.push(sideOf(a) + (sideOf(b) - sideOf(a)) * t);
    }
  }
  const sides = crossings.length >= 2 ? crossings : area.map(sideOf);
  const from = Math.min(...sides);
  const to = Math.max(...sides);
  return [1 / 5, 1 / 2, 4 / 5]
    .map((share) => {
      const s = from + (to - from) * share;
      return { x: Math.round(f.x * line + l.x * s) || 0, y: Math.round(f.y * line + l.y * s) || 0 };
    })
    .sort((a, b) => a.x - b.x || a.y - b.y);
}
