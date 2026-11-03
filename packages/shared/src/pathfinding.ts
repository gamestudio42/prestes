import type { Vec2 } from './protocol';
import { COVER_POINTS, isLineBlockedForMovement, isPointBlockedByCovers } from './world';
import type { CoverPoint } from './protocol';

const MIN = -100;
const MAX = 100;
const SIZE = MAX - MIN + 1;
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

function blocked(x: number, y: number, covers: readonly CoverPoint[]): boolean {
  if (x < MIN || x > MAX || y < MIN || y > MAX) {
    return true;
  }
  return isPointBlockedByCovers(x, y, covers, 0.8);
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

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

/** Deterministic A* on a 1 m grid around the building. */
export function findPath(
  start: Vec2,
  target: Vec2,
  covers: readonly CoverPoint[] = COVER_POINTS,
): Vec2[] {
  if (blocked(target.x, target.y, covers)) {
    return [];
  }
  if (!isLineBlockedForMovement(start.x, start.y, target.x, target.y, covers, 0.8)) {
    return [{ ...target }];
  }

  const startX = cell(start.x);
  const startY = cell(start.y);
  const targetX = cell(target.x);
  const targetY = cell(target.y);
  const startIndex = startY * SIZE + startX;
  const targetIndex = targetY * SIZE + targetX;

  const total = SIZE * SIZE;
  const gScore = new Float32Array(total);
  gScore.fill(Number.POSITIVE_INFINITY);
  const fScore = new Float32Array(total);
  fScore.fill(Number.POSITIVE_INFINITY);
  const parent = new Int32Array(total);
  parent.fill(-1);
  const closed = new Uint8Array(total);
  const open = new MinHeap(fScore);

  gScore[startIndex] = 0;
  fScore[startIndex] = heuristic(startX, startY, targetX, targetY);
  open.push(startIndex);

  let found = false;
  while (open.size > 0) {
    const current = open.pop();
    if (current === null) break;
    if (closed[current]) continue;
    if (current === targetIndex) {
      found = true;
      break;
    }
    closed[current] = 1;
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
      if (closed[neighbour]) continue;
      const step = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const tentative = (gScore[current] ?? Infinity) + step;
      if (tentative >= (gScore[neighbour] ?? Infinity)) continue;
      parent[neighbour] = current;
      gScore[neighbour] = tentative;
      fScore[neighbour] = tentative + heuristic(nx, ny, targetX, targetY);
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




