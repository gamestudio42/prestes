import type { CoverPoint } from '../protocol';
import { activeMapRuntime, MAP_BOUNDS } from './runtime';

/**
 * A uniform grid over the active battle map's covers (add-battle-maps). A
 * town has hundreds of walls, fences and houses; sight, cover and movement
 * queries visit only the covers near a point or along a segment instead of
 * every cover. Feature maps (few covers) never use it, so their results and
 * visiting order are unchanged. Every query that uses it is a pure filter in
 * front of the exact test, so results do not depend on the index.
 */
const CELL = 8;
/** Covers are filed this far beyond their reach, so a 1 m walk along a segment cannot miss one. */
const SLACK = 1;
/** Fewer covers than this are cheaper to scan. */
const MIN_COVERS = 48;

interface CoverIndex {
  length: number;
  first: CoverPoint | undefined;
  last: CoverPoint | undefined;
  minX: number;
  minY: number;
  columns: number;
  rows: number;
  cells: number[][];
  marks: Uint32Array;
  mark: number;
}

const indexes = new WeakMap<readonly CoverPoint[], CoverIndex>();

/**
 * Whether an index (or any cache keyed the same way) still fits these covers:
 * the same count and the same first and last objects. Covers are added or
 * removed in the simulation, never moved in place.
 */
export function sameCovers(
  cached: { length: number; first: CoverPoint | undefined; last: CoverPoint | undefined },
  covers: readonly CoverPoint[],
): boolean {
  return cached.length === covers.length && cached.first === covers[0] && cached.last === covers[covers.length - 1];
}

/** The reach a cover is filed with: its footprint, its shelter radius and a margin. */
function reachOf(cover: CoverPoint): number {
  return Math.max(cover.halfWidth + cover.halfDepth + 1, cover.radius) + SLACK;
}

function build(covers: readonly CoverPoint[]): CoverIndex {
  const minX = MAP_BOUNDS.minX - CELL;
  const minY = MAP_BOUNDS.minY - CELL;
  const columns = Math.ceil((MAP_BOUNDS.maxX - MAP_BOUNDS.minX + 2 * CELL) / CELL);
  const rows = Math.ceil((MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 2 * CELL) / CELL);
  const cells: number[][] = Array.from({ length: columns * rows }, () => []);
  covers.forEach((cover, index) => {
    const reach = reachOf(cover);
    const fromX = Math.max(0, Math.floor((cover.x - reach - minX) / CELL));
    const toX = Math.min(columns - 1, Math.floor((cover.x + reach - minX) / CELL));
    const fromY = Math.max(0, Math.floor((cover.y - reach - minY) / CELL));
    const toY = Math.min(rows - 1, Math.floor((cover.y + reach - minY) / CELL));
    for (let row = fromY; row <= toY; row += 1) {
      for (let column = fromX; column <= toX; column += 1) cells[row * columns + column]!.push(index);
    }
  });
  return {
    length: covers.length,
    first: covers[0],
    last: covers[covers.length - 1],
    minX,
    minY,
    columns,
    rows,
    cells,
    marks: new Uint32Array(covers.length),
    mark: 0,
  };
}

/** The index for these covers, or null where a plain scan is used. */
function indexFor(covers: readonly CoverPoint[]): CoverIndex | null {
  if (covers.length < MIN_COVERS || !activeMapRuntime()) return null;
  let index = indexes.get(covers);
  if (!index || !sameCovers(index, covers)) {
    index = build(covers);
    indexes.set(covers, index);
  }
  return index;
}

function cellAt(index: CoverIndex, x: number, y: number): number[] | null {
  const column = Math.floor((x - index.minX) / CELL);
  const row = Math.floor((y - index.minY) / CELL);
  if (column < 0 || row < 0 || column >= index.columns || row >= index.rows) return null;
  return index.cells[row * index.columns + column]!;
}

/**
 * Whether `test` holds for some cover near (x, y). Without an index, every
 * cover is tested in order.
 */
export function someCoverNear(
  covers: readonly CoverPoint[],
  x: number,
  y: number,
  test: (cover: CoverPoint) => boolean,
): boolean {
  const index = indexFor(covers);
  if (!index) return covers.some(test);
  const cell = cellAt(index, x, y);
  if (!cell) return false;
  for (const entry of cell) if (test(covers[entry]!)) return true;
  return false;
}

/** Visits each cover near (x, y) once (all covers without an index). */
export function forEachCoverNear(
  covers: readonly CoverPoint[],
  x: number,
  y: number,
  visit: (cover: CoverPoint) => void,
): void {
  const index = indexFor(covers);
  if (!index) {
    for (const cover of covers) visit(cover);
    return;
  }
  const cell = cellAt(index, x, y);
  if (cell) for (const entry of cell) visit(covers[entry]!);
}

/**
 * Whether `test` holds for some cover near the segment A-B, each cover tested
 * at most once. Without an index, every cover is tested in order.
 */
export function someCoverAlong(
  covers: readonly CoverPoint[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  test: (cover: CoverPoint) => boolean,
): boolean {
  const index = indexFor(covers);
  if (!index) return covers.some(test);
  index.mark += 1;
  if (index.mark >= 0xfffffff0) {
    index.marks.fill(0);
    index.mark = 1;
  }
  const mark = index.mark;
  const length = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  const steps = Math.max(1, Math.ceil(length));
  let last: number[] | null = null;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const cell = cellAt(index, ax + (bx - ax) * t, ay + (by - ay) * t);
    if (!cell || cell === last) continue;
    last = cell;
    for (const entry of cell) {
      if (index.marks[entry] === mark) continue;
      index.marks[entry] = mark;
      if (test(covers[entry]!)) return true;
    }
  }
  return false;
}
