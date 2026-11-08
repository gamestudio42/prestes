import {
  groundMaterialIndex,
  heightNodes,
  HEIGHT_SPACING,
  mapSide,
  MAX_HEIGHT,
  MIN_HEIGHT,
  type EditableMap,
} from '@prestes/shared';
import type { DirtyBox, RasterLayer, ToolId, ToolSettings } from './store';

/**
 * The editor's raster strokes (add-map-editor): texture paint, vegetation,
 * and the height brushes, applied straight to the open map while the
 * pointer is down. A stroke remembers each cell's first value, so it becomes
 * one undo step when the pointer comes up.
 */

const smooth = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Seeded value noise in [0, 1], `cell` m lattice. */
export function valueNoise(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smooth(gx - x0);
  const fy = smooth(gy - y0);
  const top = hash(x0, y0, seed) * (1 - fx) + hash(x0 + 1, y0, seed) * fx;
  const bottom = hash(x0, y0 + 1, seed) * (1 - fx) + hash(x0 + 1, y0 + 1, seed) * fx;
  return top * (1 - fy) + bottom * fy;
}

export function layerOf(tool: ToolId): RasterLayer | null {
  if (tool === 'paint' || tool === 'erase' || tool === 'fill') return 'paint';
  if (tool === 'vegetation') return 'vegetation';
  if (['raise', 'lower', 'smooth', 'flatten', 'setHeight', 'noise'].includes(tool)) return 'heights';
  return null;
}

export class Stroke {
  readonly changes = new Map<number, number>();
  readonly layer: RasterLayer;
  box: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private readonly touched = new Set<number>();
  private readonly flattenTo: number;
  private readonly strokeSeed: number;

  constructor(
    private readonly map: EditableMap,
    private readonly tool: ToolId,
    private readonly settings: ToolSettings,
    start: { x: number; y: number },
    private readonly erase = false,
  ) {
    this.layer = layerOf(tool)!;
    this.flattenTo = sampleHeight(map, start.x, start.y);
    this.strokeSeed = Math.floor(start.x * 131 + start.y * 977 + settings.seed);
  }

  private grow(x: number, y: number, reach: number): void {
    const box = { minX: x - reach, minY: y - reach, maxX: x + reach, maxY: y + reach };
    this.box = this.box
      ? {
          minX: Math.min(this.box.minX, box.minX),
          minY: Math.min(this.box.minY, box.minY),
          maxX: Math.max(this.box.maxX, box.maxX),
          maxY: Math.max(this.box.maxY, box.maxY),
        }
      : box;
  }

  private set(index: number, value: number): void {
    const data = this.map[this.layer];
    if (data[index] === value) return;
    if (!this.changes.has(index)) this.changes.set(index, data[index]!);
    data[index] = value;
  }

  /** Paints or shapes at a point; `dt` seconds since the last call (height rates). */
  apply(x: number, y: number, dt: number): void {
    const radius = this.settings.size / 2;
    this.grow(x, y, radius + 2);
    if (this.layer === 'heights') this.applyHeights(x, y, radius, dt);
    else this.applyCells(x, y, radius);
  }

  /** Paints along a segment, every quarter of the brush. */
  applyAlong(from: { x: number; y: number }, to: { x: number; y: number }, dt: number): void {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.max(0.5, this.settings.size / 4);
    const count = Math.max(1, Math.ceil(length / step));
    for (let n = 1; n <= count; n += 1) {
      const t = n / count;
      this.apply(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, dt / count);
    }
  }

  private applyCells(x: number, y: number, radius: number): void {
    const side = mapSide(this.map.size);
    const half = side / 2;
    const value =
      this.layer === 'vegetation'
        ? this.erase
          ? 0
          : this.settings.vegetation
        : this.erase || this.tool === 'erase'
          ? groundMaterialIndex(this.map.baseMaterial)
          : groundMaterialIndex(this.settings.material);
    const fromX = Math.max(0, Math.floor(x - radius + half));
    const toX = Math.min(side - 1, Math.ceil(x + radius + half) - 1);
    const fromY = Math.max(0, Math.floor(y - radius + half));
    const toY = Math.min(side - 1, Math.ceil(y + radius + half) - 1);
    for (let cy = fromY; cy <= toY; cy += 1) {
      for (let cx = fromX; cx <= toX; cx += 1) {
        const px = cx - half + 0.5;
        const py = cy - half + 0.5;
        const inside =
          this.settings.shape === 'square'
            ? Math.abs(px - x) <= Math.max(radius, 0.5) && Math.abs(py - y) <= Math.max(radius, 0.5)
            : Math.hypot(px - x, py - y) <= Math.max(radius, 0.5);
        if (!inside) continue;
        const index = cy * side + cx;
        if (this.settings.strength < 1 && !this.touched.has(index)) {
          // Strength is the dither density of the stroke: a seeded share of the cells.
          this.touched.add(index);
          if (hash(cx, cy, this.strokeSeed) > this.settings.strength) continue;
        } else if (this.settings.strength < 1) continue;
        this.set(index, value);
      }
    }
  }

  private applyHeights(x: number, y: number, radius: number, dt: number): void {
    const nodes = heightNodes(this.map.size);
    const half = mapSide(this.map.size) / 2;
    const heights = this.map.heights;
    const reach = Math.max(radius, HEIGHT_SPACING);
    const fromC = Math.max(0, Math.floor((x - reach + half) / HEIGHT_SPACING));
    const toC = Math.min(nodes - 1, Math.ceil((x + reach + half) / HEIGHT_SPACING));
    const fromR = Math.max(0, Math.floor((y - reach + half) / HEIGHT_SPACING));
    const toR = Math.min(nodes - 1, Math.ceil((y + reach + half) / HEIGHT_SPACING));
    const strength = this.settings.strength;
    const rate = 200 * strength * dt; // cm per second at full strength
    const original = this.tool === 'smooth' ? heights.slice() : heights;
    for (let row = fromR; row <= toR; row += 1) {
      for (let column = fromC; column <= toC; column += 1) {
        const px = column * HEIGHT_SPACING - half;
        const py = row * HEIGHT_SPACING - half;
        const distance = this.settings.shape === 'square' ? Math.max(Math.abs(px - x), Math.abs(py - y)) : Math.hypot(px - x, py - y);
        if (distance > reach) continue;
        const falloff = smooth(1 - distance / reach);
        const index = row * nodes + column;
        const current = heights[index]!;
        let next = current;
        switch (this.tool) {
          case 'raise':
            next = current + rate * falloff;
            break;
          case 'lower':
            next = current - rate * falloff;
            break;
          case 'smooth': {
            let sum = 0;
            let count = 0;
            for (let dr = -1; dr <= 1; dr += 1) {
              for (let dc = -1; dc <= 1; dc += 1) {
                const r = row + dr;
                const c = column + dc;
                if (r < 0 || c < 0 || r >= nodes || c >= nodes) continue;
                sum += original[r * nodes + c]!;
                count += 1;
              }
            }
            next = current + (sum / count - current) * Math.min(1, strength * falloff * dt * 8);
            break;
          }
          case 'flatten':
            next = current + (this.flattenTo * 100 - current) * Math.min(1, strength * falloff * dt * 8);
            break;
          case 'setHeight':
            next = current + (this.settings.heightValue * 100 - current) * Math.min(1, strength * falloff * dt * 8);
            break;
          case 'noise':
            // Once per node per stroke, seeded: the same stroke gives the same ground.
            if (this.touched.has(index)) continue;
            this.touched.add(index);
            // The lattice and the height follow the brush: a big brush rolls hills, a small one roughens.
            next = current + (valueNoise(px, py, Math.max(6, this.settings.size / 2.5), this.settings.seed) - 0.5) * 2 * Math.max(150, this.settings.size * 8) * strength * falloff;
            break;
          default:
            break;
        }
        this.set(index, Math.round(Math.max(MIN_HEIGHT * 100, Math.min(MAX_HEIGHT * 100, next))));
      }
    }
  }

  dirtyBox(): DirtyBox {
    return this.box;
  }
}

/** Bilinear height (m) of the open map's stored grid, before roads and water. */
export function sampleHeight(map: EditableMap, x: number, y: number): number {
  const nodes = heightNodes(map.size);
  const half = mapSide(map.size) / 2;
  const gx = Math.max(0, Math.min(nodes - 1.000001, (x + half) / HEIGHT_SPACING));
  const gy = Math.max(0, Math.min(nodes - 1.000001, (y + half) / HEIGHT_SPACING));
  const c = Math.floor(gx);
  const r = Math.floor(gy);
  const fx = gx - c;
  const fy = gy - r;
  const h = map.heights;
  const i = r * nodes + c;
  return ((h[i]! * (1 - fx) + h[i + 1]! * fx) * (1 - fy) + (h[i + nodes]! * (1 - fx) + h[i + nodes + 1]! * fx) * fy) / 100;
}

/** Flood-fills the connected cells of one material from a point. Returns the changes. */
export function fill(map: EditableMap, x: number, y: number, material: number): Map<number, number> {
  const side = mapSide(map.size);
  const half = side / 2;
  const cx = Math.floor(x + half);
  const cy = Math.floor(y + half);
  const changes = new Map<number, number>();
  if (cx < 0 || cy < 0 || cx >= side || cy >= side) return changes;
  const start = cy * side + cx;
  const from = map.paint[start]!;
  if (from === material) return changes;
  const stack = [start];
  while (stack.length > 0) {
    const index = stack.pop()!;
    if (map.paint[index] !== from) continue;
    changes.set(index, from);
    map.paint[index] = material;
    const ix = index % side;
    const iy = (index - ix) / side;
    if (ix > 0) stack.push(index - 1);
    if (ix < side - 1) stack.push(index + 1);
    if (iy > 0) stack.push(index - side);
    if (iy < side - 1) stack.push(index + side);
  }
  return changes;
}
