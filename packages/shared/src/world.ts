import type { CoverPoint, Stance } from './protocol';
import { terrainCoverAgainst, terrainHeightAt } from './terrain';
import { activeMapRuntime, isDeepWater, MAP_BOUNDS, waterAt } from './maps/runtime';
import { cropBlocksLine } from './maps/concealment';
import { forEachCoverNear, someCoverAlong, someCoverNear } from './maps/cover-index';

export { MAP_BOUNDS };

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

export type BuildingModel =
  | 'farmhouse'
  | 'barn'
  | 'chapel'
  | 'training-house'
  // add-battle-maps: Fazenda, Serra e Rio and Bairro.
  | 'casa-sede'
  | 'colonist-house'
  | 'engenho'
  | 'ferry-house'
  | 'terraced-house'
  | 'terraced-house-wide'
  | 'sobrado'
  | 'factory'
  | 'church'
  | 'warehouse'
  | 'casa-terrea'
  | 'venda'
  | 'armazem'
  | 'coreto';

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

export function buildingCover(
  building: Pick<Building, 'id' | 'x' | 'y' | 'rotation' | 'halfWidth' | 'halfDepth' | 'height'>,
): CoverPoint {
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

/**
 * A defensive line for one section of the 3v3 (battle-feel-3v3): four short
 * trench bays, each with a sandbag parapet on the enemy's side. Bays are short
 * because a cover shelters only within its radius of the centre.
 */
function battleLine(firstId: number, x: number, y: number, enemySide: 1 | -1): CoverPoint[] {
  return [-9, -3, 3, 9].flatMap((dx, index): CoverPoint[] => [
    { id: firstId + index * 2, kind: 'trench', x: x + dx, y, halfWidth: 2.8, halfDepth: 1.6, height: 0.2, radius: 3.2, quality: 0.4, blocksMovement: false, blocksSight: false },
    { id: firstId + index * 2 + 1, kind: 'sandbag', x: x + dx, y: y + enemySide * 1.9, halfWidth: 2.8, halfDepth: 0.4, height: 0.9, radius: 3.5, quality: 0.3, blocksMovement: false, blocksSight: false },
  ]);
}

/** The 3v3 field: the battle kit plus a defensive line in front of each section's start. */
export const BATTLE_COVERS: readonly CoverPoint[] = [
  ...BOOTCAMP_COVERS,
  ...[-44, 0, 44].flatMap((x, index) => battleLine(300 + index * 10, x, -78, 1)),
  ...[-44, 0, 44].flatMap((x, index) => battleLine(330 + index * 10, x, 78, -1)),
];

export const FIRE_RANGE = 26;
export const MAX_HP = 100;
export const MAX_MORALE = 100;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

const ROTATION_AXES = new WeakMap<object, { rotation: number; cos: number; sin: number }>();

/** A cover's long axis as a unit vector (cos, sin of its rotation), cached. */
export function coverAxes(cover: { rotation?: number }): { cos: number; sin: number } {
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
  return someCoverNear(covers, x, y, (cover) => cover.blocksMovement && isPointInCover(x, y, cover, margin));
}

/**
 * Whether the segment A-B passes through the cover's footprint (a rotated
 * rectangle), clipped exactly in the cover's frame. It replaced a 32-point
 * sampling that, over a long line of fire, stepped right over a parapet or a
 * wall a metre or two from either end (battle-feel-3v3).
 */
function segmentCrossesCover(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cover: { x: number; y: number; halfWidth: number; halfDepth: number; rotation?: number },
  margin = 0,
): boolean {
  // A cheap reject first: the segment's box against the cover's reach.
  const reach = cover.halfWidth + cover.halfDepth + margin;
  if (
    cover.x + reach < Math.min(ax, bx) ||
    cover.x - reach > Math.max(ax, bx) ||
    cover.y + reach < Math.min(ay, by) ||
    cover.y - reach > Math.max(ay, by)
  ) {
    return false;
  }
  const { cos, sin } = coverAxes(cover);
  const halfWidth = cover.halfWidth + margin;
  const halfDepth = cover.halfDepth + margin;
  const startX = (ax - cover.x) * cos + (ay - cover.y) * sin;
  const startY = -(ax - cover.x) * sin + (ay - cover.y) * cos;
  const endX = (bx - cover.x) * cos + (by - cover.y) * sin;
  const endY = -(bx - cover.x) * sin + (by - cover.y) * cos;
  let enter = 0;
  let leave = 1;
  for (const [origin, delta, half] of [
    [startX, endX - startX, halfWidth],
    [startY, endY - startY, halfDepth],
  ] as const) {
    if (Math.abs(delta) < 1e-12) {
      if (Math.abs(origin) > half) return false;
      continue;
    }
    let near = (-half - origin) / delta;
    let far = (half - origin) / delta;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    leave = Math.min(leave, far);
    if (enter > leave) return false;
  }
  // Touching only at an end point does not count, as with the sampling.
  return leave > 0 && enter < 1 && leave - enter > 1e-9;
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
    someCoverAlong(
      covers,
      ax,
      ay,
      bx,
      by,
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
  // Battle maps sample the ground every 2 m (its heightfield spacing); the
  // feature maps keep their 32 samples.
  const runtime = activeMapRuntime();
  const samples = runtime ? Math.max(32, Math.ceil(Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2) / 2)) : 32;
  for (let index = 1; index < samples; index += 1) {
    const t = index / samples;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (terrainHeightAt(x, y) > lineHeightAt(t) + 0.05) {
      return true;
    }
  }
  if (runtime && cropBlocksLine(runtime, ax, ay, startHeight, bx, by, endHeight)) {
    return true;
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
      someCoverNear(covers, x, y, (entry) => entry.height >= eyeHeight && isPointInCover(x, y, entry)) ||
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
  // Battle maps clip the line exactly against each blocking cover, grown by
  // the margin, and stop at deep water sampled every metre.
  const runtime = activeMapRuntime();
  if (runtime) {
    if (
      someCoverAlong(covers, ax, ay, bx, by, (cover) => cover.blocksMovement && segmentCrossesCover(ax, ay, bx, by, cover, margin))
    ) {
      return true;
    }
    const samples = Math.max(2, Math.ceil(Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)));
    for (let index = 1; index < samples; index += 1) {
      const t = index / samples;
      if (isDeepWater(ax + (bx - ax) * t, ay + (by - ay) * t)) return true;
    }
    return false;
  }
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

/** Share of a cover's protection left against a shooter this far away (m). */
export function closeQuartersFactor(distance: number): number {
  if (distance <= 10) return 1 / 3;
  if (distance >= 20) return 1;
  return 1 / 3 + ((distance - 10) / 10) * (2 / 3);
}

export function coverAgainst(
  x: number,
  y: number,
  threatX: number,
  threatY: number,
  stance: Stance,
  covers: readonly CoverPoint[] = COVER_POINTS,
): number {
  // A man in a ford has no cover at all (add-battle-maps).
  if (waterAt(x, y) !== 0) return 0;
  let wall = 0;
  forEachCoverNear(covers, x, y, (point) => {
    const dx = x - point.x;
    const dy = y - point.y;
    if (dx * dx + dy * dy > point.radius * point.radius) {
      return;
    }
    if (point.height < 1.2 && stance === 'standing') {
      return;
    }
    // A shooter inside the same cover (in the same trench) gets no cover from it.
    if (isPointInCover(threatX, threatY, point) && isPointInCover(x, y, point)) {
      return;
    }
    if (!segmentCrossesCover(x, y, threatX, threatY, point)) {
      return;
    }
    wall = Math.max(wall, point.quality);
  });
  // At close quarters a parapet or wall shelters far less: a third of its value
  // inside 10 m, full value from 20 m (battle-feel-3v3).
  wall *= closeQuartersFactor(Math.sqrt((threatX - x) ** 2 + (threatY - y) ** 2));
  return clamp(
    coverForStance(stance) + Math.max(wall, terrainCoverAgainst(x, y, threatX, threatY)),
    0,
    0.75,
  );
}
















