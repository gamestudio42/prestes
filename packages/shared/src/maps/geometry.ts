import type { Vec2 } from '../protocol';
import type { Polygon, Strip } from './types';

/** Even-odd point in polygon. */
export function pointInPolygon(x: number, y: number, polygon: Polygon): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index]!;
    const b = polygon[previous]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance from a point to a polyline. */
export function distanceToPolyline(x: number, y: number, points: readonly Vec2[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length));
    const px = a.x + dx * t - x;
    const py = a.y + dy * t - y;
    best = Math.min(best, px * px + py * py);
  }
  return Math.sqrt(best);
}

export function pointInStrip(x: number, y: number, strip: Strip): boolean {
  return distanceToPolyline(x, y, strip.points) <= strip.width / 2;
}

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function polygonBox(polygon: Polygon): Box {
  return pointsBox(polygon, 0);
}

export function pointsBox(points: readonly Vec2[], margin: number): Box {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX: minX - margin, minY: minY - margin, maxX: maxX + margin, maxY: maxY + margin };
}

/** Smoothstep on [0, 1], polynomial (no trigonometry). */
export function smooth(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/** A rectangle as a polygon, rotated by `rotation` radians about its centre. */
export function rectangle(x: number, y: number, halfWidth: number, halfDepth: number, rotation = 0): Vec2[] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ].map(([lx, ly]) => ({ x: x + lx! * cos - ly! * sin, y: y + lx! * sin + ly! * cos }));
}
