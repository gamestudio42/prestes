import type { CoverPoint, Vec2 } from '../protocol';
import type { HeightShape, Strip } from './types';

/**
 * refine-map-editor D6: trench lines, one builder for authored and
 * hand-written maps. A line is a polyline with a kind, a depth, the side its
 * parapet faces (left or right of travel from its first point), optional
 * firing bays and an earth or sandbag parapet.
 */
export type TrenchKind = 'fire' | 'communication';
export type TrenchDepth = 1.2 | 0.8;
export type TrenchFacing = 'left' | 'right';
export type TrenchParapet = 'earth' | 'sandbag';

export interface TrenchLineDef {
  id: number;
  kind: TrenchKind;
  depth: TrenchDepth;
  facing: TrenchFacing;
  bays: boolean;
  parapet: TrenchParapet;
  points: Vec2[];
}

export const TRENCH = {
  /** The floor's width (m): its walking surface, its cover and its slots. */
  floor: 1.5,
  /** Sloped wall from the floor to the ground (m). */
  wall: 0.3,
  /** The fire step stands this much above the floor, on the parapet side (m). */
  step: 0.3,
  parapetHeight: 0.4,
  parapetWidth: 1.2,
  /** Nominal cover piece length (m): a whole number of slots. */
  piece: 3.6,
  slotSpacing: 1.2,
  /** A traverse every this many metres along a fire trench with bays. */
  bayEvery: 10,
  /** The shortest line the editor draws (m). */
  minLength: 4,
  /**
   * The height cut is widened to this, so the 2 m heightfield shows it: its
   * nodes would otherwise straddle a 1.5 m floor (deviation noted in 2.1).
   */
  cutWidth: 2.4,
  cutBank: 1.0,
  /**
   * The simulation's cut is shallow (refine-map-editor 2.3, user decision):
   * a crouched man on the fire step must see over the 0.4 m parapet, so the
   * heightfield sinks 0.5 m for a 1.2 m trench and 0.3 m for a 0.8 m one. The
   * view draws the full depth with its own walls and floor.
   */
  simDepth: { 1.2: 0.5, 0.8: 0.3 },
} as const;

/** A traverse: an earth block across the forward half of the floor. */
export interface Traverse {
  x: number;
  y: number;
  /** Along the trench (radians). */
  rotation: number;
}

export interface BuiltTrench {
  covers: CoverPoint[];
  /** Height shapes: the cut and, for a fire trench, the parapet berm. */
  shapes: HeightShape[];
  /** The floor, for the trench-floor surface and the view. */
  floor: Strip;
  /** The parapet's line (fire trenches), for the view. */
  parapet: Vec2[] | null;
  traverses: Traverse[];
}

export function trenchLength(points: readonly Vec2[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.y - points[index - 1]!.y);
  }
  return length;
}

/** The unit normal toward the parapet for a segment (x east, y south; right of travel is (-dy, dx)). */
function frontOf(a: Vec2, b: Vec2, facing: TrenchFacing): Vec2 {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const right = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
  return facing === 'right' ? right : { x: -right.x, y: -right.y };
}

/** The polyline moved `offset` metres toward the front, joint normals averaged. */
function offsetLine(points: readonly Vec2[], facing: TrenchFacing, offset: number): Vec2[] {
  return points.map((point, index) => {
    const a = points[Math.max(0, index - 1)]!;
    const b = points[Math.min(points.length - 1, index + 1)]!;
    const front = frontOf(a, b, facing);
    return { x: point.x + front.x * offset, y: point.y + front.y * offset };
  });
}

/** Slots along one segment: one per 1.2 m (at least one). */
function segmentSlots(length: number): number {
  return Math.max(1, Math.round(length / TRENCH.slotSpacing));
}

/**
 * A segment's cover pieces as [start, end] fractions: whole slots each, about
 * `TRENCH.piece` long, so a piece's slots (`coverSlots` rounds its length by
 * 1.2 m) add up to the segment's.
 */
function segmentPieces(length: number): [number, number][] {
  const slots = segmentSlots(length);
  const perPiece = Math.round(TRENCH.piece / TRENCH.slotSpacing);
  const count = Math.max(1, Math.round(slots / perPiece));
  return Array.from({ length: count }, (_, piece) => [Math.floor((piece * slots) / count) / slots, Math.floor(((piece + 1) * slots) / count) / slots]);
}

/** Cover slots a line gives: one per 1.2 m of fire step, none for a communication trench. */
export function trenchSlotCount(line: Pick<TrenchLineDef, 'kind' | 'points'>): number {
  if (line.kind !== 'fire') return 0;
  let slots = 0;
  for (let index = 1; index < line.points.length; index += 1) {
    const length = Math.hypot(line.points[index]!.x - line.points[index - 1]!.x, line.points[index]!.y - line.points[index - 1]!.y);
    if (length >= 0.01) slots += segmentSlots(length);
  }
  return slots;
}

/**
 * Builds a trench line: height shapes for its cut and parapet, cover pieces
 * along its floor (a fire trench's face its parapet and shelter only from
 * that side; a communication trench's shelter from both and have no slots),
 * its floor strip, parapet line and traverses.
 */
export function buildTrenchLine(line: TrenchLineDef, firstCoverId: number): BuiltTrench {
  const fire = line.kind === 'fire';
  const covers: CoverPoint[] = [];
  const traverses: Traverse[] = [];
  let id = firstCoverId;
  let travelled = 0;
  let nextTraverse = TRENCH.bayEvery;
  for (let index = 1; index < line.points.length; index += 1) {
    const a = line.points[index - 1]!;
    const b = line.points[index]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 0.01) continue;
    const rotation = Math.atan2(b.y - a.y, b.x - a.x);
    const front = frontOf(a, b, line.facing);
    for (const [from, to] of segmentPieces(length)) {
      const middle = (from + to) / 2;
      const halfWidth = ((to - from) * length) / 2;
      covers.push({
        id: id++,
        kind: 'trench',
        x: a.x + (b.x - a.x) * middle,
        y: a.y + (b.y - a.y) * middle,
        rotation,
        halfWidth,
        halfDepth: TRENCH.floor / 2,
        height: 0.2,
        radius: halfWidth + 0.4,
        quality: fire ? 0.4 : 0.35,
        blocksMovement: false,
        blocksSight: false,
        drawnBy: 'map',
        ...(fire ? { facing: front } : { noSlots: true }),
      });
    }
    if (fire && line.bays) {
      while (nextTraverse < travelled + length) {
        const t = (nextTraverse - travelled) / length;
        // Across the forward half of the floor: the back stays open.
        traverses.push({
          x: a.x + (b.x - a.x) * t + front.x * TRENCH.floor * 0.25,
          y: a.y + (b.y - a.y) * t + front.y * TRENCH.floor * 0.25,
          rotation,
        });
        nextTraverse += TRENCH.bayEvery;
      }
    }
    travelled += length;
  }
  const shapes: HeightShape[] = [
    { kind: 'channel', points: line.points, width: TRENCH.cutWidth, bank: TRENCH.cutBank, depth: TRENCH.simDepth[line.depth] },
  ];
  let parapet: Vec2[] | null = null;
  if (fire) {
    parapet = offsetLine(line.points, line.facing, TRENCH.floor / 2 + TRENCH.wall + TRENCH.parapetWidth / 2);
    shapes.push({ kind: 'embankment', points: parapet, width: TRENCH.parapetWidth, slope: 0.8, height: TRENCH.parapetHeight });
    if (line.parapet === 'sandbag') {
      const bags = offsetLine(line.points, line.facing, TRENCH.floor / 2 + 0.4);
      for (let index = 1; index < bags.length; index += 1) {
        const a = bags[index - 1]!;
        const b = bags[index]!;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length < 0.01) continue;
        const pieces = Math.max(1, Math.round(length / TRENCH.piece));
        for (let piece = 0; piece < pieces; piece += 1) {
          const middle = (piece + 0.5) / pieces;
          covers.push({
            id: id++,
            kind: 'sandbag',
            x: a.x + (b.x - a.x) * middle,
            y: a.y + (b.y - a.y) * middle,
            rotation: Math.atan2(b.y - a.y, b.x - a.x),
            halfWidth: length / pieces / 2,
            halfDepth: 0.4,
            height: 0.9,
            radius: length / pieces / 2 + 1,
            quality: 0.3,
            blocksMovement: false,
            blocksSight: false,
            drawnBy: 'map',
            noSlots: true,
          });
        }
      }
    }
  }
  return { covers, shapes, floor: { points: line.points, width: TRENCH.floor }, parapet, traverses };
}

/** The ids the covers of `lines` take, from `firstCoverId`, in order (for callers that number other covers after them). */
export function buildTrenchLines(lines: readonly TrenchLineDef[], firstCoverId: number): BuiltTrench[] {
  let id = firstCoverId;
  return [...lines]
    .sort((a, b) => a.id - b.id)
    .map((line) => {
      const built = buildTrenchLine(line, id);
      id += built.covers.length;
      return built;
    });
}
