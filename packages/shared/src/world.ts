import type { CoverPoint, Stance } from './protocol';
import { terrainCoverAgainst, terrainHeightAt } from './terrain';

export const COVER_POINTS: readonly CoverPoint[] = [
  {
    id: 1,
    kind: 'sandbag',
    x: -8,
    y: 4,
    halfWidth: 1.7,
    halfDepth: 0.4,
    height: 0.9,
    radius: 2.4,
    quality: 0.25,
    blocksMovement: true,
    blocksSight: false,
  },
  {
    id: 2,
    kind: 'sandbag',
    x: 8,
    y: 4,
    halfWidth: 1.7,
    halfDepth: 0.4,
    height: 0.9,
    radius: 2.4,
    quality: 0.25,
    blocksMovement: true,
    blocksSight: false,
  },
  {
    id: 3,
    kind: 'sandbag',
    x: -8,
    y: -5,
    halfWidth: 1.7,
    halfDepth: 0.4,
    height: 0.9,
    radius: 2.4,
    quality: 0.25,
    blocksMovement: true,
    blocksSight: false,
  },
  {
    id: 4,
    kind: 'sandbag',
    x: 8,
    y: -5,
    halfWidth: 1.7,
    halfDepth: 0.4,
    height: 0.9,
    radius: 2.4,
    quality: 0.25,
    blocksMovement: true,
    blocksSight: false,
  },
  {
    id: 5,
    kind: 'stone',
    x: 0,
    y: 4,
    halfWidth: 4.5,
    halfDepth: 0.5,
    height: 1.8,
    radius: 3.2,
    quality: 0.55,
    blocksMovement: true,
    blocksSight: true,
  },
  {
    id: 6,
    kind: 'low-wall',
    x: 0,
    y: -5,
    halfWidth: 4.5,
    halfDepth: 0.4,
    height: 0.65,
    radius: 3,
    quality: 0.3,
    blocksMovement: true,
    blocksSight: false,
  },
  {
    id: 7,
    kind: 'barrel',
    x: -16,
    y: -2,
    halfWidth: 0.6,
    halfDepth: 0.6,
    height: 0.9,
    radius: 2,
    quality: 0.2,
    blocksMovement: true,
    blocksSight: false,
  },
  {
    id: 8,
    kind: 'barrel',
    x: 16,
    y: -2,
    halfWidth: 0.6,
    halfDepth: 0.6,
    height: 0.9,
    radius: 2,
    quality: 0.2,
    blocksMovement: true,
    blocksSight: false,
  },
  {
    id: 9,
    kind: 'trench',
    x: -15,
    y: -13,
    halfWidth: 7,
    halfDepth: 1.6,
    height: 0.2,
    radius: 3,
    quality: 0.35,
    blocksMovement: false,
    blocksSight: false,
  },
];

export const SIGHT_BLOCK_HEIGHT = 1.75;
export const EYE_HEIGHTS = { standing: 1.6, crouched: 1.0, prone: 0.4 } as const;

export function eyeHeightForStance(stance: Stance): number {
  return EYE_HEIGHTS[stance];
}

export const TRAINING_SIGHT_OBSTACLES = [
  { id: 1, x: -26, y: 15, halfWidth: 2.8, halfDepth: 2.8, height: 3.0 },
  { id: 2, x: 26, y: 15, halfWidth: 2.8, halfDepth: 2.8, height: 3.0 },
  { id: 3, x: -25, y: -10, halfWidth: 2.8, halfDepth: 2.8, height: 3.0 },
  { id: 5, x: -16, y: 9, halfWidth: 1.1, halfDepth: 1.1, height: 4.2 },
  { id: 6, x: 17, y: 8, halfWidth: 1.1, halfDepth: 1.1, height: 4.2 },
  { id: 7, x: -13, y: -13, halfWidth: 1.1, halfDepth: 1.1, height: 4.2 },
  { id: 8, x: 15, y: -12, halfWidth: 1.1, halfDepth: 1.1, height: 4.2 },
];

export type BuildingModel = 'farmhouse' | 'barn' | 'chapel' | 'training-house';

/**
 * Buildings shared by the simulation (as `building` cover) and the view (which
 * places its meshes from this table). `rotation` is the simulation rotation;
 * the view turns the mesh by `-rotation` about its vertical axis.
 */
export interface Building {
  id: number;
  model: BuildingModel;
  x: number;
  y: number;
  rotation: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
}

export const BUILDINGS: readonly Building[] = [
  { id: 121, model: 'training-house', x: 24, y: 17, rotation: 0.1, halfWidth: 3.6, halfDepth: 2.5, height: 3.7 },
  { id: 122, model: 'farmhouse', x: -56, y: 36, rotation: -0.22, halfWidth: 4.35, halfDepth: 2.85, height: 4.8 },
  { id: 123, model: 'barn', x: 58, y: 44, rotation: 0.16, halfWidth: 5.65, halfDepth: 3.5, height: 6 },
  { id: 124, model: 'chapel', x: 78, y: -52, rotation: -0.1, halfWidth: 3.2, halfDepth: 4.8, height: 5.2 },
];

export function buildingCover(building: Building): CoverPoint {
  return {
    id: building.id,
    kind: 'building',
    x: building.x,
    y: building.y,
    rotation: building.rotation,
    halfWidth: building.halfWidth,
    halfDepth: building.halfDepth,
    height: building.height,
    // Reaches the corner slots, so a soldier there counts the building as cover.
    radius: Math.hypot(building.halfWidth + 1, building.halfDepth + 1) + 0.5,
    quality: 0.8,
    blocksMovement: true,
    blocksSight: true,
  };
}

export const BOOTCAMP_COVERS: readonly CoverPoint[] = [
  ...COVER_POINTS,
  { id: 101, kind: 'stone', x: -8, y: -30, halfWidth: 7, halfDepth: 4, height: 4, radius: 8, quality: 0.6, blocksMovement: true, blocksSight: true },
  { id: 102, kind: 'stone', x: 30, y: -30, halfWidth: 6, halfDepth: 3, height: 3.2, radius: 7, quality: 0.55, blocksMovement: true, blocksSight: true },
  { id: 103, kind: 'stone', x: 64, y: -8, halfWidth: 8, halfDepth: 4, height: 4.2, radius: 9, quality: 0.6, blocksMovement: true, blocksSight: true },
  { id: 104, kind: 'stone', x: 96, y: -2, halfWidth: 5, halfDepth: 3.5, height: 4.8, radius: 6, quality: 0.6, blocksMovement: true, blocksSight: true },
  { id: 105, kind: 'stone', x: 66, y: 22, halfWidth: 5, halfDepth: 3, height: 3.4, radius: 6, quality: 0.5, blocksMovement: true, blocksSight: true },
  { id: 106, kind: 'low-wall', x: 40, y: -4, halfWidth: 5, halfDepth: 0.5, height: 1.4, radius: 5.2, quality: 0.35, blocksMovement: true, blocksSight: true },
  { id: 107, kind: 'low-wall', x: 40, y: 16, halfWidth: 5, halfDepth: 0.5, height: 1.4, radius: 5.2, quality: 0.35, blocksMovement: true, blocksSight: true },
  { id: 108, kind: 'stone', x: 18, y: 22, halfWidth: 4, halfDepth: 3, height: 3, radius: 5, quality: 0.5, blocksMovement: true, blocksSight: true },
  { id: 109, kind: 'trench', x: 52, y: -18, halfWidth: 7, halfDepth: 2.8, height: 0.2, radius: 3, quality: 0.4, blocksMovement: false, blocksSight: false },
  { id: 110, kind: 'sandbag', x: 52, y: -15.5, halfWidth: 7, halfDepth: 0.4, height: 0.9, radius: 3.5, quality: 0.3, blocksMovement: false, blocksSight: false },
  ...BUILDINGS.map(buildingCover),
] as const;
export const MAP_BOUNDS = { minX: -120, minY: -120, maxX: 120, maxY: 120 } as const;

export const FIRE_RANGE = 26;
export const MAX_HP = 100;
export const MAX_MORALE = 100;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

const ROTATION_AXES = new WeakMap<object, { rotation: number; cos: number; sin: number }>();

function coverAxes(cover: { rotation?: number }): { cos: number; sin: number } {
  const rotation = cover.rotation ?? 0;
  const cached = ROTATION_AXES.get(cover);
  if (cached && cached.rotation === rotation) {
    return cached;
  }
  const axes = { rotation, cos: Math.cos(rotation), sin: Math.sin(rotation) };
  ROTATION_AXES.set(cover, axes);
  return axes;
}

export function isPointInCover(
  x: number,
  y: number,
  cover: { x: number; y: number; halfWidth: number; halfDepth: number; rotation?: number },
  margin = 0,
): boolean {
  const dx = x - cover.x;
  const dy = y - cover.y;
  const { cos, sin } = coverAxes(cover);
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  return (
    Math.abs(localX) <= cover.halfWidth + margin &&
    Math.abs(localY) <= cover.halfDepth + margin
  );
}

export function isPointBlockedByCovers(
  x: number,
  y: number,
  covers: readonly CoverPoint[] = COVER_POINTS,
  margin = 0,
): boolean {
  return covers.some((cover) => cover.blocksMovement && isPointInCover(x, y, cover, margin));
}

function segmentCrossesCover(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cover: { x: number; y: number; halfWidth: number; halfDepth: number },
): boolean {
  const samples = 32;
  for (let index = 1; index < samples; index += 1) {
    const t = index / samples;
    if (isPointInCover(ax + (bx - ax) * t, ay + (by - ay) * t, cover)) {
      return true;
    }
  }
  return false;
}

export function isLineBlocked(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  covers: readonly CoverPoint[] = COVER_POINTS,
  obstacles: readonly { x: number; y: number; halfWidth: number; halfDepth: number; height: number }[] = [],
  eyeHeight: number = EYE_HEIGHTS.standing,
  targetEyeHeight: number = eyeHeight,
): boolean {
  const startHeight = terrainHeightAt(ax, ay) + eyeHeight;
  const endHeight = terrainHeightAt(bx, by) + targetEyeHeight;
  const lineHeightAt = (t: number): number => startHeight + (endHeight - startHeight) * t;
  if (
    covers.some(
      (cover) => cover.height >= eyeHeight && segmentCrossesCover(ax, ay, bx, by, cover),
    )
  ) {
    return true;
  }
  if (
    obstacles.some(
      (obstacle) => obstacle.height >= eyeHeight && segmentCrossesCover(ax, ay, bx, by, obstacle),
    )
  ) {
    return true;
  }
  for (let index = 1; index < 32; index += 1) {
    const t = index / 32;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (terrainHeightAt(x, y) > lineHeightAt(t) + 0.05) {
      return true;
    }
  }
  return false;
}

export function firstSightBlocker(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  covers: readonly CoverPoint[],
  obstacles: readonly { x: number; y: number; halfWidth: number; halfDepth: number; height: number }[] = [],
  eyeHeight: number = EYE_HEIGHTS.standing,
  targetEyeHeight: number = eyeHeight,
): { x: number; y: number } | null {
  const samples = 48;
  const startHeight = terrainHeightAt(ax, ay) + eyeHeight;
  const endHeight = terrainHeightAt(bx, by) + targetEyeHeight;
  for (let index = 1; index <= samples; index += 1) {
    const t = index / samples;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const lineHeight = startHeight + (endHeight - startHeight) * t;
    if (terrainHeightAt(x, y) > lineHeight + 0.05) {
      return { x, y };
    }
    if (
      covers.some(
        (entry) => entry.height >= eyeHeight && isPointInCover(x, y, entry),
      ) ||
      obstacles.some(
        (entry) =>
          entry.height >= eyeHeight &&
          Math.abs(x - entry.x) <= entry.halfWidth &&
          Math.abs(y - entry.y) <= entry.halfDepth,
      )
    ) {
      return { x, y };
    }
  }
  return null;
}

export function isLineBlockedForMovement(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  covers: readonly CoverPoint[] = COVER_POINTS,
  margin = 0,
): boolean {
  const samples = 32;
  for (let index = 1; index < samples; index += 1) {
    const t = index / samples;
    if (
      isPointBlockedByCovers(
        ax + (bx - ax) * t,
        ay + (by - ay) * t,
        covers,
        margin,
      )
    ) {
      return true;
    }
  }
  return false;
}

export function coverForStance(stance: Stance): number {
  if (stance === 'prone') return 0.5;
  if (stance === 'crouched') return 0.25;
  return 0;
}

export function coverAgainst(
  x: number,
  y: number,
  threatX: number,
  threatY: number,
  stance: Stance,
  covers: readonly CoverPoint[] = COVER_POINTS,
): number {
  let wall = 0;
  for (const point of covers) {
    const dx = x - point.x;
    const dy = y - point.y;
    if (dx * dx + dy * dy > point.radius * point.radius) {
      continue;
    }
    if (point.height < 1.2 && stance === 'standing') {
      continue;
    }
    if (!segmentCrossesCover(x, y, threatX, threatY, point)) {
      continue;
    }
    wall = Math.max(wall, point.quality);
  }
  return clamp(
    coverForStance(stance) + Math.max(wall, terrainCoverAgainst(x, y, threatX, threatY)),
    0,
    0.75,
  );
}
















