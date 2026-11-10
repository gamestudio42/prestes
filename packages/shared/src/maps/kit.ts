import type { CoverPoint, Vec2 } from '../protocol';
import type { Building } from '../world';
import type { DeploymentZone, HeightShape, MapLine, Polygon, PropPlacement, Strip } from './types';
import { catalogObject, solidBlocksSight, solidQuality } from './catalog-objects';

/**
 * Shared pieces for building battle maps (add-battle-maps):
 * rock and barricade covers, deployment zones and prop rows.
 */

/** How a hand-written map's walls look (refine-battle-maps 5.1): the editor's wall kinds. */
export type WallLook = 'brick-wall' | 'stone-wall' | 'taipa-wall';

/**
 * refine-battle-maps 5.1: the view's lines for walls the map layer draws as
 * plastered, stone or taipa walls (along each cover's long axis, at its
 * height); the covers themselves are marked `drawnBy: 'map'` so the cover
 * layer does not draw them as fortification blocks.
 */
export function wallLines(covers: readonly CoverPoint[], look: WallLook): MapLine[] {
  return covers.map((cover) => {
    const angle = cover.rotation ?? 0;
    const dx = Math.cos(angle) * cover.halfWidth;
    const dy = Math.sin(angle) * cover.halfWidth;
    return {
      kind: look,
      points: [
        { x: cover.x - dx, y: cover.y - dy },
        { x: cover.x + dx, y: cover.y + dy },
      ],
      height: cover.height,
    };
  });
}

/** The longest piece of a trench run (m): a cover shelters within its radius of its centre. */
const TRENCH_PIECE = 6;

/**
 * A trench along a polyline, in pieces of at most 6 m like a line's bays, so
 * a man anywhere along its floor is within a piece's shelter radius (a single
 * long cover shelters only near its centre). `halfDepth` is half the floor's
 * width.
 */
export function trenchRun(firstId: number, points: readonly Vec2[], halfDepth: number): CoverPoint[] {
  const covers: CoverPoint[] = [];
  let id = firstId;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const pieces = Math.max(1, Math.ceil(length / TRENCH_PIECE));
    for (let piece = 0; piece < pieces; piece += 1) {
      const middle = (piece + 0.5) / pieces;
      const halfWidth = length / pieces / 2;
      covers.push({
        id: id++,
        kind: 'trench',
        x: from.x + (to.x - from.x) * middle,
        y: from.y + (to.y - from.y) * middle,
        rotation: Math.atan2(to.y - from.y, to.x - from.x),
        halfWidth,
        halfDepth,
        height: 0.2,
        radius: halfWidth + 0.4,
        quality: 0.35,
        blocksMovement: false,
        blocksSight: false,
      });
    }
  }
  return covers;
}

/** A roadside ditch (vala, refine-battle-maps 5.5): floor width, depth and bank (m). */
export const DITCH = { width: 1.5, depth: 0.8, bank: 0.6, verge: 0.3 } as const;

/** Which side of a road, looking along its points, has a ditch. */
export type DitchSide = 'both' | 'left' | 'right';

/**
 * The drainage ditches along a dirt road: a channel sunk into the heightfield
 * on each ditched side, past a narrow verge, and a trench run along its floor
 * (trench cover and slots, a trench floor to walk). "Left" is the side to the
 * left looking from the road's first point to its last.
 */
export function roadDitches(firstId: number, road: Strip, side: DitchSide): { shapes: HeightShape[]; covers: CoverPoint[] } {
  const offset = road.width / 2 + DITCH.verge + DITCH.bank + DITCH.width / 2;
  const sides = side === 'both' ? [1, -1] : side === 'left' ? [1] : [-1];
  const shapes: HeightShape[] = [];
  const covers: CoverPoint[] = [];
  let id = firstId;
  for (const sign of sides) {
    const line = offsetLine(road.points, sign * offset);
    shapes.push({ kind: 'channel', points: line, width: DITCH.width, bank: DITCH.bank, depth: DITCH.depth });
    const run = trenchRun(id, line, DITCH.width / 2).map((cover) => ({ ...cover, ditch: true }));
    covers.push(...run);
    id += run.length;
  }
  return { shapes, covers };
}

/** A strip as a polygon: its left edge out, its right edge back. */
export function stripPolygon(strip: Strip): Vec2[] {
  return [...offsetLine(strip.points, strip.width / 2), ...offsetLine(strip.points, -strip.width / 2).reverse()];
}

/** A polyline moved sideways by `distance` (positive to the left), mitred at its corners. */
function offsetLine(points: readonly Vec2[], distance: number): Vec2[] {
  const normals = points.slice(1).map((to, index) => {
    const from = points[index]!;
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    // North is negative y, drawn up: left of a road running north is west.
    return { x: (to.y - from.y) / length, y: -(to.x - from.x) / length };
  });
  return points.map((point, index) => {
    const before = normals[index - 1] ?? normals[index]!;
    const after = normals[index] ?? normals[index - 1]!;
    const mx = before.x + after.x;
    const my = before.y + after.y;
    const length = Math.hypot(mx, my) || 1;
    // The mitre keeps the ditch its distance from both segments at a bend.
    const scale = distance / Math.max(0.5, (mx * after.x + my * after.y) / length);
    return { x: point.x + (mx / length) * scale, y: point.y + (my / length) * scale };
  });
}

/** A rock outcrop: hard cover a man can lie behind; tall ones block sight. */
export function rock(id: number, x: number, y: number, halfWidth: number, halfDepth: number, height: number): CoverPoint {
  return {
    id,
    kind: 'stone',
    x,
    y,
    halfWidth,
    halfDepth,
    height,
    radius: Math.max(halfWidth, halfDepth) + 1.6,
    quality: height >= 1.2 ? 0.55 : 0.4,
    blocksMovement: true,
    blocksSight: height >= 1.75,
  };
}

/** A barricade of paving stones and sacks across part of a street. */
export function barricade(id: number, x: number, y: number, halfWidth: number, rotation = 0): CoverPoint {
  return {
    id,
    kind: 'low-wall',
    x,
    y,
    rotation,
    halfWidth,
    halfDepth: 0.6,
    height: 1.2,
    radius: halfWidth + 1.4,
    quality: 0.45,
    blocksMovement: true,
    blocksSight: false,
  };
}

/** A low wall (a yard wall, a stone fence). */
export function lowWall(id: number, x: number, y: number, halfWidth: number, rotation = 0, height = 1.3): CoverPoint {
  return {
    id,
    kind: 'low-wall',
    x,
    y,
    rotation,
    halfWidth,
    halfDepth: 0.35,
    height,
    radius: halfWidth + 1.2,
    quality: 0.35,
    blocksMovement: true,
    blocksSight: height >= 1.75,
  };
}

/** Three sections abreast at `y`, facing `facingY`. */
export function zone(xs: readonly [number, number, number], y: number, facingY: 1 | -1, area: Polygon): DeploymentZone {
  return { sections: xs.map((x) => ({ x, y })), facing: { x: 0, y: facingY }, area };
}

/**
 * add-deployment-phase 1.1: a hand-drawn area from x0 to x1 across, from the
 * front line `front` back to `back` (the side's rear).
 */
export function band(x0: number, x1: number, front: number, back: number): Polygon {
  return [
    { x: x0, y: front },
    { x: x1, y: front },
    { x: x1, y: back },
    { x: x0, y: back },
  ];
}

/**
 * Props every `step` m along a polyline, at the middle of each step. Their
 * rotation points their local length (the view's z) along the line.
 */
export function propRow(model: string, points: readonly Vec2[], step: number, scale = 1): PropPlacement[] {
  const props: PropPlacement[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const count = Math.max(1, Math.floor(length / step));
    for (let step2 = 0; step2 < count; step2 += 1) {
      const t = (step2 + 0.5) / count;
      props.push({
        model,
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        rotation: Math.atan2(to.x - from.x, to.y - from.y),
        scale,
      });
    }
  }
  return props;
}

/** Rail pieces: `rail` props laid along a polyline, each `length` m long. */
export function railLine(points: readonly Vec2[], length = 6): PropPlacement[] {
  return propRow('rail', points, length, length);
}

/** A rectangle polygon from its corners. */
export function box(minX: number, minY: number, maxX: number, maxY: number): Vec2[] {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/** Buildings' covers, numbered from their own ids. */
export type BuildingList = readonly Building[];

/**
 * Fences along polylines, as movement-blocking covers that give no cover:
 * one piece per stretch of at most 12 m (so the cover index stays fine).
 * `height` 1.2 for wire and rails, about 1.6 for a hedge or a coffee row.
 */
export function fenceCovers(firstId: number, lines: readonly (readonly Vec2[])[], height = 1.2): CoverPoint[] {
  const covers: CoverPoint[] = [];
  let id = firstId;
  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      const from = line[index - 1]!;
      const to = line[index]!;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const pieces = Math.max(1, Math.ceil(length / 12));
      for (let piece = 0; piece < pieces; piece += 1) {
        const t0 = piece / pieces;
        const t1 = (piece + 1) / pieces;
        covers.push({
          id: id++,
          kind: 'fence',
          x: from.x + (to.x - from.x) * ((t0 + t1) / 2),
          y: from.y + (to.y - from.y) * ((t0 + t1) / 2),
          rotation: Math.atan2(to.y - from.y, to.x - from.x),
          halfWidth: length / pieces / 2,
          halfDepth: 0.15,
          height,
          radius: 0.5,
          quality: 0,
          blocksMovement: true,
          blocksSight: false,
        });
      }
    }
  }
  return covers;
}

/** A piece of field clutter: an editor catalog object with a solid footprint. */
export interface ClutterItem {
  model: string;
  x: number;
  y: number;
  rotation?: number;
}

/**
 * refine-battle-maps 5.7: carts, haystacks, woodpiles, logs, troughs, stones
 * on a hand-written map, each the view's prop and the cover the map editor's
 * catalog gives it (same size, quality and sight rule), so open ground gains
 * cover a man can reach.
 */
export function clutter(firstId: number, items: readonly ClutterItem[]): { props: PropPlacement[]; covers: CoverPoint[] } {
  const props: PropPlacement[] = [];
  const covers: CoverPoint[] = [];
  items.forEach((item, index) => {
    const entry = catalogObject(item.model);
    if (!entry || entry.footprint.kind !== 'solid') throw new Error(`clutter: ${item.model} has no solid footprint`);
    const rotation = item.rotation ?? 0;
    props.push({ model: entry.model, x: item.x, y: item.y, rotation });
    covers.push({
      id: firstId + index,
      kind: entry.footprint.cover,
      x: item.x,
      y: item.y,
      rotation,
      halfWidth: entry.halfWidth,
      halfDepth: entry.halfDepth,
      height: entry.height,
      radius: Math.max(entry.halfWidth, entry.halfDepth) + 1.4,
      quality: solidQuality(entry.height),
      blocksMovement: true,
      blocksSight: solidBlocksSight(entry.height, entry.halfWidth, entry.halfDepth),
      drawnBy: 'map',
    });
  });
  return { props, covers };
}
