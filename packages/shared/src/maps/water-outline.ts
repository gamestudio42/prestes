import type { Vec2 } from '../protocol';
import { distanceToPolyline, pointInPolygon, pointsBox, polygonBox, type Box } from './geometry';
import type { BattleMap, WaterArea } from './types';

/**
 * refine-map-editor D4: smooth water. River centrelines are subdivided with
 * a centripetal Catmull-Rom spline every RIVER_STEP m when a document is
 * compiled, so the simulation and the view share the smoothed water. The
 * view draws water inside outlines traced by marching squares on a
 * OUTLINE_STEP m grid of the signed distance to the water's edge, so banks
 * follow a line, not 1 m cells.
 */

export const RIVER_STEP = 2;
export const OUTLINE_STEP = 0.5;
/** Douglas-Peucker tolerance for the traced outlines (m). */
export const OUTLINE_TOLERANCE = 0.05;

/** A smoothed centreline and, for each of its segments, the source segment it came from. */
export interface SmoothedCentreline {
  points: Vec2[];
  source: number[];
}

function knot(t: number, a: Vec2, b: Vec2): number {
  return t + Math.max(1e-4, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
}

/** Centripetal Catmull-Rom through the points, a sample every `step` m or less; the corner points stay. */
export function smoothCentreline(points: readonly Vec2[], step = RIVER_STEP): SmoothedCentreline {
  if (points.length < 2) return { points: points.map((p) => ({ ...p })), source: [] };
  const out: Vec2[] = [{ ...points[0]! }];
  const source: number[] = [];
  for (let segment = 0; segment + 1 < points.length; segment += 1) {
    const p1 = points[segment]!;
    const p2 = points[segment + 1]!;
    const p0 = points[segment - 1] ?? { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y };
    const p3 = points[segment + 2] ?? { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y };
    const t0 = 0;
    const t1 = knot(t0, p0, p1);
    const t2 = knot(t1, p1, p2);
    const t3 = knot(t2, p2, p3);
    const at = (t: number): Vec2 => {
      const lerp = (a: Vec2, b: Vec2, ta: number, tb: number): Vec2 => {
        const w = (t - ta) / (tb - ta);
        return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
      };
      const a1 = lerp(p0, p1, t0, t1);
      const a2 = lerp(p1, p2, t1, t2);
      const a3 = lerp(p2, p3, t2, t3);
      return lerp(lerp(a1, a2, t0, t2), lerp(a2, a3, t1, t3), t1, t2);
    };
    // Pieces of equal length along the curve, from a table of 32 chords.
    const SAMPLES = 32;
    const table: { t: number; length: number }[] = [{ t: t1, length: 0 }];
    let previous = p1;
    for (let sample = 1; sample <= SAMPLES; sample += 1) {
      const t = t1 + ((t2 - t1) * sample) / SAMPLES;
      const point = sample === SAMPLES ? p2 : at(t);
      table.push({ t, length: table.at(-1)!.length + Math.hypot(point.x - previous.x, point.y - previous.y) });
      previous = point;
    }
    const length = table.at(-1)!.length;
    const pieces = Math.max(1, Math.ceil(length / step));
    let row = 1;
    for (let piece = 1; piece <= pieces; piece += 1) {
      if (piece === pieces) {
        out.push({ ...p2 });
      } else {
        const wanted = (length * piece) / pieces;
        while (table[row]!.length < wanted) row += 1;
        const a = table[row - 1]!;
        const b = table[row]!;
        out.push(at(a.t + ((b.t - a.t) * (wanted - a.length)) / Math.max(1e-9, b.length - a.length)));
      }
      source.push(segment);
    }
  }
  return { points: out, source };
}

/** Signed distance of a point to a water area's edge: positive inside. */
function signedDistance(area: WaterArea, x: number, y: number): number {
  let value = Number.NEGATIVE_INFINITY;
  if (area.strip) value = Math.max(value, area.strip.width / 2 - distanceToPolyline(x, y, area.strip.points));
  if (area.polygon) {
    const edge = distanceToPolyline(x, y, [...area.polygon, area.polygon[0]!]);
    value = Math.max(value, pointInPolygon(x, y, area.polygon) ? edge : -edge);
  }
  return value;
}

function areaBox(area: WaterArea): Box {
  if (area.strip && area.polygon) {
    const a = pointsBox(area.strip.points, area.strip.width / 2);
    const b = polygonBox(area.polygon);
    return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };
  }
  if (area.strip) return pointsBox(area.strip.points, area.strip.width / 2);
  return polygonBox(area.polygon!);
}

interface Field {
  minX: number;
  minY: number;
  columns: number;
  rows: number;
  values: Float32Array;
}

/** The union's signed distance, clamped to ±1 m, on a grid one node past the map on every side. */
function distanceField(map: BattleMap, areas: readonly WaterArea[]): Field {
  const minX = map.bounds.minX - OUTLINE_STEP;
  const minY = map.bounds.minY - OUTLINE_STEP;
  const columns = Math.round((map.bounds.maxX - map.bounds.minX) / OUTLINE_STEP) + 3;
  const rows = Math.round((map.bounds.maxY - map.bounds.minY) / OUTLINE_STEP) + 3;
  const values = new Float32Array(columns * rows).fill(-1);
  for (const area of areas) {
    const box = areaBox(area);
    const fromX = Math.max(1, Math.floor((box.minX - 1 - minX) / OUTLINE_STEP));
    const toX = Math.min(columns - 2, Math.ceil((box.maxX + 1 - minX) / OUTLINE_STEP));
    const fromY = Math.max(1, Math.floor((box.minY - 1 - minY) / OUTLINE_STEP));
    const toY = Math.min(rows - 2, Math.ceil((box.maxY + 1 - minY) / OUTLINE_STEP));
    for (let row = fromY; row <= toY; row += 1) {
      for (let column = fromX; column <= toX; column += 1) {
        const index = row * columns + column;
        const value = Math.max(-1, Math.min(1, signedDistance(area, minX + column * OUTLINE_STEP, minY + row * OUTLINE_STEP)));
        if (value > values[index]!) values[index] = value;
      }
    }
  }
  return { minX, minY, columns, rows, values };
}

/** Area of a closed loop (positive when it runs counter-clockwise in x, y). */
export function loopArea(loop: readonly Vec2[]): number {
  let sum = 0;
  for (let index = 0; index < loop.length; index += 1) {
    const a = loop[index]!;
    const b = loop[(index + 1) % loop.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function perpendicular(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / length;
}

/** Douglas-Peucker on an open polyline, iterative. */
function simplifyOpen(points: readonly Vec2[], tolerance: number): Vec2[] {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let worst = -1;
    let distance = tolerance;
    for (let index = first + 1; index < last; index += 1) {
      const d = perpendicular(points[index]!, points[first]!, points[last]!);
      if (d > distance) {
        distance = d;
        worst = index;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([first, worst], [worst, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

/** Douglas-Peucker on a closed loop: split at its first point and the point farthest from it. */
function simplifyLoop(loop: readonly Vec2[], tolerance: number): Vec2[] {
  if (loop.length < 4) return loop.slice();
  let far = 0;
  let best = -1;
  for (let index = 1; index < loop.length; index += 1) {
    const d = Math.hypot(loop[index]!.x - loop[0]!.x, loop[index]!.y - loop[0]!.y);
    if (d > best) {
      best = d;
      far = index;
    }
  }
  const first = simplifyOpen(loop.slice(0, far + 1), tolerance);
  const second = simplifyOpen([...loop.slice(far), loop[0]!], tolerance);
  return [...first, ...second.slice(1, -1)];
}

/**
 * Closed outlines of the water areas' union, traced by marching squares with
 * the crossing interpolated on each edge, then simplified. Outer loops and
 * holes (islands) run in opposite directions.
 */
export function traceWaterOutlines(map: BattleMap, areas: readonly WaterArea[], subtract: readonly WaterArea[] = []): Vec2[][] {
  if (areas.length === 0) return [];
  const field = distanceField(map, areas);
  if (subtract.length > 0) {
    const cut = distanceField(map, subtract);
    for (let index = 0; index < field.values.length; index += 1) field.values[index] = Math.min(field.values[index]!, -cut.values[index]!);
  }
  const { columns, rows, values, minX, minY } = field;
  const value = (column: number, row: number): number => values[row * columns + column]!;
  // Edge keys: horizontal edges (column, row)-(column + 1, row) and vertical ones (column, row)-(column, row + 1).
  const horizontal = (column: number, row: number): number => (row * columns + column) * 2;
  const vertical = (column: number, row: number): number => (row * columns + column) * 2 + 1;
  const crossing = (key: number): Vec2 => {
    const node = key >> 1;
    const column = node % columns;
    const row = Math.floor(node / columns);
    const a = value(column, row);
    const [bc, br] = key & 1 ? [column, row + 1] : [column + 1, row];
    const b = value(bc, br);
    const t = a / (a - b);
    return { x: minX + (column + (bc - column) * t) * OUTLINE_STEP, y: minY + (row + (br - row) * t) * OUTLINE_STEP };
  };
  const next = new Map<number, number>();
  for (let row = 0; row + 1 < rows; row += 1) {
    for (let column = 0; column + 1 < columns; column += 1) {
      // Corners in cyclic order and the edge after each.
      const corners = [value(column, row), value(column + 1, row), value(column + 1, row + 1), value(column, row + 1)];
      const inside = corners.map((v) => v > 0);
      const count = inside.filter(Boolean).length;
      if (count === 0 || count === 4) continue;
      const edges = [horizontal(column, row), vertical(column + 1, row), horizontal(column, row + 1), vertical(column, row)];
      const entries: number[] = [];
      const exits: number[] = [];
      for (let k = 0; k < 4; k += 1) {
        const here = inside[k]!;
        const after = inside[(k + 1) % 4]!;
        if (!here && after) entries.push(k);
        if (here && !after) exits.push(k);
      }
      if (entries.length === 1) {
        next.set(edges[entries[0]!]!, edges[exits[0]!]!);
      } else {
        // A saddle: the centre decides whether the inside corners join.
        const joined = (corners[0]! + corners[1]! + corners[2]! + corners[3]!) / 4 > 0;
        for (const entry of entries) next.set(edges[entry]!, edges[(entry + (joined ? 3 : 1)) % 4]!);
      }
    }
  }
  const loops: Vec2[][] = [];
  const seen = new Set<number>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: Vec2[] = [];
    let key: number | undefined = start;
    while (key !== undefined && !seen.has(key)) {
      seen.add(key);
      loop.push(crossing(key));
      key = next.get(key);
    }
    if (loop.length >= 3) {
      const simple = simplifyLoop(loop, OUTLINE_TOLERANCE);
      if (simple.length >= 3) loops.push(simple);
    }
  }
  return loops;
}

/** Outer loops with the holes each one contains, for drawing. */
export function outlineShapes(loops: readonly Vec2[][]): { outer: Vec2[]; holes: Vec2[][] }[] {
  if (loops.length === 0) return [];
  const largest = loops.reduce((best, loop) => (Math.abs(loopArea(loop)) > Math.abs(loopArea(best)) ? loop : best));
  const outerSign = Math.sign(loopArea(largest));
  const outers = loops.filter((loop) => Math.sign(loopArea(loop)) === outerSign).map((outer) => ({ outer, holes: [] as Vec2[][] }));
  for (const hole of loops.filter((loop) => Math.sign(loopArea(loop)) !== outerSign)) {
    const probe = hole[0]!;
    let owner: { outer: Vec2[]; holes: Vec2[][] } | null = null;
    for (const shape of outers) {
      if (!pointInPolygon(probe.x, probe.y, shape.outer)) continue;
      if (!owner || Math.abs(loopArea(shape.outer)) < Math.abs(loopArea(owner.outer))) owner = shape;
    }
    owner?.holes.push(hole);
  }
  return outers;
}
