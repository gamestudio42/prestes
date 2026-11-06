import type { Vec2 } from './protocol';
import { COVER_POINTS, isLineBlockedForMovement, isPointBlockedByCovers } from './world';
import type { CoverPoint } from './protocol';
import { activeMapGeneration, activeMapRuntime, FERRY_PATH_PENALTY, isDeepWater, PATH_GRID } from './maps/runtime';
import { sameCovers } from './maps/cover-index';

// The grid follows the active map (add-battle-maps): ±100 m on the feature
// maps, the map's bounds on the battle maps. Read at the start of each search.
let MIN = PATH_GRID.min;
let MAX = PATH_GRID.max;
let SIZE = MAX - MIN + 1;

function syncGrid(): void {
  MIN = PATH_GRID.min;
  MAX = PATH_GRID.max;
  SIZE = MAX - MIN + 1;
}

/** True inside the walkable pathfinding grid (one cell in from its edge). */
export function isInsidePathGrid(x: number, y: number): boolean {
  return x > PATH_GRID.min + 1 && x < PATH_GRID.max - 1 && y > PATH_GRID.min + 1 && y < PATH_GRID.max - 1;
}
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function cell(value: number): number {
  return Math.max(0, Math.min(SIZE - 1, Math.round(value - MIN)));
}

function world(value: number): number {
  return value + MIN;
}

/**
 * Battle maps: each cell's blocked state is worked out once and kept while
 * the map and its movement-blocking covers stay the same. 0 unknown, 1 open,
 * 2 blocked.
 */
let blockedCache: {
  covers: readonly CoverPoint[];
  generation: number;
  length: number;
  first: CoverPoint | undefined;
  last: CoverPoint | undefined;
  cells: Uint8Array;
} | null = null;

function prepareBlocked(covers: readonly CoverPoint[]): void {
  if (!activeMapRuntime()) {
    blockedCache = null;
    return;
  }
  // The same covers on the same map keep their worked-out cells.
  if (
    blockedCache &&
    blockedCache.covers === covers &&
    blockedCache.generation === activeMapGeneration() &&
    sameCovers(blockedCache, covers)
  ) {
    return;
  }
  blockedCache = {
    covers,
    generation: activeMapGeneration(),
    length: covers.length,
    first: covers[0],
    last: covers[covers.length - 1],
    cells: new Uint8Array(SIZE * SIZE),
  };
}

function blockedNow(x: number, y: number, covers: readonly CoverPoint[]): boolean {
  if (x < MIN || x > MAX || y < MIN || y > MAX) {
    return true;
  }
  if (isDeepWater(x, y) || isDeepWater(x + 0.8, y) || isDeepWater(x - 0.8, y) || isDeepWater(x, y + 0.8) || isDeepWater(x, y - 0.8)) {
    return true;
  }
  return isPointBlockedByCovers(x, y, covers, 0.8);
}

function blocked(x: number, y: number, covers: readonly CoverPoint[]): boolean {
  if (x < MIN || x > MAX || y < MIN || y > MAX) {
    return true;
  }
  const cache = blockedCache;
  if (cache && Number.isInteger(x) && Number.isInteger(y)) {
    const index = (y - MIN) * SIZE + (x - MIN);
    const known = cache.cells[index];
    if (known === 1) return false;
    if (known === 2) return true;
    const result = blockedNow(x, y, covers);
    cache.cells[index] = result ? 2 : 1;
    return result;
  }
  return blockedNow(x, y, covers);
}

/**
 * Search buffers, reused while the grid size stays the same. A cell's
 * scores count only when its stamp is this search's, so nothing is cleared
 * between searches.
 */
let buffers: {
  size: number;
  g: Float32Array;
  f: Float32Array;
  parent: Int32Array;
  touched: Uint32Array;
  closed: Uint32Array;
  stamp: number;
} | null = null;

function searchBuffers(total: number) {
  if (!buffers || buffers.size !== total || buffers.stamp >= 0xfffffff0) {
    buffers = {
      size: total,
      g: new Float32Array(total),
      f: new Float32Array(total),
      parent: new Int32Array(total),
      touched: new Uint32Array(total),
      closed: new Uint32Array(total),
      stamp: 0,
    };
  }
  buffers.stamp += 1;
  return buffers;
}

/** Whether a point is walkable for an order or a path on the active map. */
export function isWalkable(x: number, y: number, covers: readonly CoverPoint[] = COVER_POINTS): boolean {
  syncGrid();
  prepareBlocked(covers);
  return !blockedNow(x, y, covers);
}

/**
 * The nearest walkable point to `target` within `reach` m (searched on a 1 m
 * ring pattern), or null. Used to move an order out of deep water.
 */
export function nearestWalkable(target: Vec2, covers: readonly CoverPoint[] = COVER_POINTS, reach = 24): Vec2 | null {
  syncGrid();
  prepareBlocked(covers);
  if (!blockedNow(target.x, target.y, covers)) return { ...target };
  for (let radius = 1; radius <= reach; radius += 1) {
    let best: Vec2 | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = Math.round(target.x) + dx;
        const y = Math.round(target.y) + dy;
        if (blocked(x, y, covers)) continue;
        const distance = (x - target.x) ** 2 + (y - target.y) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

class MinHeap {
  private readonly items: number[] = [];

  constructor(private readonly scores: Float32Array) {}

  get size(): number {
    return this.items.length;
  }

  push(value: number): void {
    this.items.push(value);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if ((this.scores[this.items[parent]!] ?? Infinity) <= (this.scores[value] ?? Infinity)) {
        break;
      }
      this.items[index] = this.items[parent]!;
      index = parent;
    }
    this.items[index] = value;
  }

  pop(): number | null {
    if (this.items.length === 0) {
      return null;
    }
    const first = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.items.length) {
          break;
        }
        let child = left;
        if (
          right < this.items.length &&
          (this.scores[this.items[right]!] ?? Infinity) <
            (this.scores[this.items[left]!] ?? Infinity)
        ) {
          child = right;
        }
        if ((this.scores[this.items[child]!] ?? Infinity) >= (this.scores[last] ?? Infinity)) {
          break;
        }
        this.items[index] = this.items[child]!;
        index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
}

function nearestOpenCell(target: Vec2, covers: readonly CoverPoint[]): [number, number] {
  const x = cell(target.x);
  const y = cell(target.y);
  if (!blocked(world(x), world(y), covers)) {
    return [x, y];
  }
  let best: [number, number] = [x, y];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || blocked(world(nx), world(ny), covers)) {
        continue;
      }
      const distance = (world(nx) - target.x) ** 2 + (world(ny) - target.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = [nx, ny];
      }
    }
  }
  return best;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

/** Paths on the 1 m grid; over deep water, by the nearest crossing. */
export function findPath(
  start: Vec2,
  target: Vec2,
  covers: readonly CoverPoint[] = COVER_POINTS,
  /** Give up after this many grid cells (a short hop that must not flood the map). */
  maxExpansions = Number.POSITIVE_INFINITY,
): Vec2[] {
  syncGrid();
  prepareBlocked(covers);
  // Battle maps: a route over deep water goes by a crossing. Searching each
  // bank to its end of each crossing is far cheaper than letting A* flood
  // the whole bank looking for one.
  const runtime = activeMapRuntime();
  if (runtime && crossesDeepWater(start, target)) {
    let best: Vec2[] | null = null;
    let bestLength = Number.POSITIVE_INFINITY;
    for (const [near, far, penalty] of crossingEnds(runtime.map)) {
      for (const [entry, exit] of [
        [near, far],
        [far, near],
      ] as const) {
        if (crossesDeepWater(start, entry) || crossesDeepWater(exit, target)) continue;
        const first = searchPath(start, entry, covers);
        if (first.length === 0) continue;
        const second = searchPath(exit, target, covers);
        if (second.length === 0) continue;
        const route = [...first, { ...exit }, ...second];
        const length = routeLength(start, route) + penalty;
        if (length < bestLength) {
          bestLength = length;
          best = route;
        }
      }
    }
    if (best) return best;
  }
  return searchPath(start, target, covers, maxExpansions);
}

/** Whether the straight line between two points passes over deep water. */
export function crossesDeepWater(a: Vec2, b: Vec2): boolean {
  const length = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const steps = Math.max(1, Math.ceil(length));
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    if (isDeepWater(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return true;
  }
  return false;
}

function routeLength(start: Vec2, route: readonly Vec2[]): number {
  let length = 0;
  let previous = start;
  for (const point of route) {
    length += Math.sqrt((point.x - previous.x) ** 2 + (point.y - previous.y) ** 2);
    previous = point;
  }
  return length;
}

type CrossingEnds = readonly [Vec2, Vec2, number];
const crossingCache = new WeakMap<object, CrossingEnds[]>();

/**
 * Each crossing's two ends, a little onto each bank, with the extra metres a
 * path pays for it. A ferry path runs landing to landing; the movement stops
 * at the near landing and the ferry carries the soldier over.
 */
function crossingEnds(map: {
  bridges: readonly { x: number; y: number; rotation: number; halfDepth: number }[];
  water: readonly { kind: 'deep' | 'ford'; ends?: readonly [Vec2, Vec2] }[];
  ferries: readonly { landingA: Vec2; landingB: Vec2 }[];
}): CrossingEnds[] {
  const cached = crossingCache.get(map);
  if (cached) return cached;
  const ends: CrossingEnds[] = [];
  for (const bridge of map.bridges) {
    const reach = bridge.halfDepth + 2;
    // The deck runs along its local y axis.
    const dx = -Math.sin(bridge.rotation) * reach;
    const dy = Math.cos(bridge.rotation) * reach;
    ends.push([
      { x: Math.round(bridge.x - dx), y: Math.round(bridge.y - dy) },
      { x: Math.round(bridge.x + dx), y: Math.round(bridge.y + dy) },
      0,
    ]);
  }
  for (const area of map.water) {
    if (area.kind === 'ford' && area.ends) ends.push([area.ends[0], area.ends[1], 0]);
  }
  for (const ferry of map.ferries) {
    ends.push([ferry.landingA, ferry.landingB, FERRY_PATH_PENALTY]);
  }
  crossingCache.set(map, ends);
  return ends;
}

/** Deterministic A* on the 1 m grid. */
function searchPath(
  start: Vec2,
  target: Vec2,
  covers: readonly CoverPoint[],
  maxExpansions = Number.POSITIVE_INFINITY,
): Vec2[] {
  if (blocked(target.x, target.y, covers)) {
    return [];
  }
  if (!isLineBlockedForMovement(start.x, start.y, target.x, target.y, covers, 0.8)) {
    return [{ ...target }];
  }

  const startX = cell(start.x);
  const startY = cell(start.y);
  // An open target can round to a grid cell inside a cover's clearance; aim the
  // search at the nearest open cell instead, and the exact target is appended.
  const [targetX, targetY] = nearestOpenCell(target, covers);
  const startIndex = startY * SIZE + startX;
  const targetIndex = targetY * SIZE + targetX;

  const total = SIZE * SIZE;
  const { g: gScore, f: fScore, parent, touched, closed, stamp } = searchBuffers(total);
  const open = new MinHeap(fScore);
  const g = (index: number): number => (touched[index] === stamp ? gScore[index]! : Number.POSITIVE_INFINITY);

  gScore[startIndex] = 0;
  parent[startIndex] = -1;
  touched[startIndex] = stamp;
  // Battle maps search a 400 m grid: a weighted heuristic keeps a detour to a
  // far crossing fast, and the path is smoothed afterwards anyway.
  const weight = blockedCache ? 1.6 : 1;
  fScore[startIndex] = heuristic(startX, startY, targetX, targetY) * weight;
  open.push(startIndex);

  let found = false;
  let expansions = 0;
  while (open.size > 0) {
    expansions += 1;
    if (expansions > maxExpansions) break;
    const current = open.pop();
    if (current === null) break;
    if (closed[current] === stamp) continue;
    if (current === targetIndex) {
      found = true;
      break;
    }
    closed[current] = stamp;
    const cx = current % SIZE;
    const cy = Math.floor(current / SIZE);

    for (const [dx, dy] of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      if (blocked(world(nx), world(ny), covers)) continue;
      if (dx !== 0 && dy !== 0) {
        if (blocked(world(cx + dx), world(cy), covers) || blocked(world(cx), world(cy + dy), covers)) {
          continue;
        }
      }
      const neighbour = ny * SIZE + nx;
      if (closed[neighbour] === stamp) continue;
      const step = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const tentative = g(current) + step;
      if (tentative >= g(neighbour)) continue;
      parent[neighbour] = current;
      gScore[neighbour] = tentative;
      touched[neighbour] = stamp;
      fScore[neighbour] = tentative + heuristic(nx, ny, targetX, targetY) * weight;
      open.push(neighbour);
    }
  }

  if (!found) {
    return [];
  }

  const raw: Vec2[] = [];
  let current = targetIndex;
  while (current !== startIndex && current >= 0) {
    const x = current % SIZE;
    const y = Math.floor(current / SIZE);
    raw.push({ x: world(x), y: world(y) });
    current = parent[current] ?? -1;
  }
  raw.reverse();
  if (!blocked(target.x, target.y, covers)) {
    const last = raw[raw.length - 1];
    if (!last || Math.abs(last.x - target.x) > 0.5 || Math.abs(last.y - target.y) > 0.5) {
      raw.push({ ...target });
    }
  }

  const smoothed: Vec2[] = [];
  let anchor = start;
  let index = 0;
  while (index < raw.length) {
    let chosen = raw[index]!;
    let advanced = false;
    for (let candidate = raw.length - 1; candidate >= index; candidate -= 1) {
      const point = raw[candidate]!;
      if (!isLineBlockedForMovement(anchor.x, anchor.y, point.x, point.y, covers, 0.8)) {
        chosen = point;
        index = candidate + 1;
        advanced = true;
        break;
      }
    }
    if (!advanced) {
      index += 1;
    }
    smoothed.push(chosen);
    anchor = chosen;
  }
  return smoothed;
}




