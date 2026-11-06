import type { CoverPoint, Vec2 } from '../protocol';
import type { Building } from '../world';
import type { DeploymentZone, PropPlacement } from './types';

/**
 * Shared pieces for building battle maps (add-battle-maps): trench lines,
 * rock and barricade covers, deployment zones and prop rows.
 */

/**
 * A section's trench line: four short bays with a sandbag parapet on the
 * enemy's side (`enemySide` -1 north, 1 south), as on the Vila Militar field.
 */
export function trenchLine(firstId: number, x: number, y: number, enemySide: 1 | -1): CoverPoint[] {
  return [-9, -3, 3, 9].flatMap((dx, index): CoverPoint[] => [
    { id: firstId + index * 2, kind: 'trench', x: x + dx, y, halfWidth: 2.8, halfDepth: 1.6, height: 0.2, radius: 3.2, quality: 0.4, blocksMovement: false, blocksSight: false },
    { id: firstId + index * 2 + 1, kind: 'sandbag', x: x + dx, y: y + enemySide * 1.9, halfWidth: 2.8, halfDepth: 0.4, height: 0.9, radius: 3.5, quality: 0.3, blocksMovement: false, blocksSight: false },
  ]);
}

/** A communication trench from a line back to the rear: a long narrow trench. */
export function communicationTrench(id: number, from: Vec2, to: Vec2): CoverPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return {
    id,
    kind: 'trench',
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
    // The trench's long axis is its local x; rotate it onto the line.
    rotation: Math.atan2(dy, dx),
    halfWidth: length / 2,
    halfDepth: 0.9,
    height: 0.2,
    radius: 2.2,
    quality: 0.35,
    blocksMovement: false,
    blocksSight: false,
  };
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
export function zone(xs: readonly [number, number, number], y: number, facingY: 1 | -1): DeploymentZone {
  return { sections: xs.map((x) => ({ x, y })), facing: { x: 0, y: facingY } };
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
