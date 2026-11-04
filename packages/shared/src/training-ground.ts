import type { CoverPoint, Vec2 } from './protocol';
import type { TerrainFeature } from './terrain';
import { buildingCover, type Building } from './world';

/**
 * The bootcamp map: a fictional army training field near Vila Militar /
 * Deodoro, Rio de Janeiro, 1922. One course runs along a road that winds
 * through three rows: the northern row west to east (parade ground, firing
 * range, maneuver field), the middle row east to west (trench line, hamlet)
 * and the southern row west to east (aid post, assault line). North (negative
 * y) is the enemy side of every station. Everything stays inside the
 * pathfinding grid (within 96 m of the centre).
 *
 * Every station keeps the same local layout, measured from its entry (where
 * the section starts): the training line 24 m east and 22 m north, the bound
 * line 12 m east and 8 m north, and so on. Objectives were tuned on these
 * distances, so stations move as a whole.
 */
export type TrainingStationId =
  | 'formation'
  | 'fire'
  | 'maneuver'
  | 'defense'
  | 'recon'
  | 'wounded'
  | 'final';

export interface TrainingStation {
  id: TrainingStationId;
  /** Where the section starts the station (the old assembly point). */
  entry: Vec2;
  /** Centre and radius of the station's area on the map. */
  center: Vec2;
  radius: number;
}

/** Offsets from a station entry, shared by every station. */
export const STATION_OFFSETS = {
  /** Station 1 only: the section starts west of the parade ground. */
  start: { x: -28, y: 2 },
  line: { x: 24, y: -22 },
  approach: { x: 54, y: 6 },
  bound: { x: 12, y: -8 },
  face: { x: 0, y: 30 },
  recon: { x: 14, y: -14 },
} as const;

const ROW_NORTH = -56;
const ROW_MIDDLE = 4;
const ROW_SOUTH = 62;

export const TRAINING_STATIONS: readonly TrainingStation[] = [
  { id: 'formation', entry: { x: -60, y: ROW_NORTH }, center: { x: -74, y: ROW_NORTH }, radius: 20 },
  { id: 'fire', entry: { x: -16, y: ROW_NORTH }, center: { x: -4, y: ROW_NORTH - 10 }, radius: 22 },
  { id: 'maneuver', entry: { x: 32, y: ROW_NORTH }, center: { x: 50, y: ROW_NORTH - 10 }, radius: 26 },
  { id: 'defense', entry: { x: 30, y: ROW_MIDDLE }, center: { x: 58, y: ROW_MIDDLE - 6 }, radius: 32 },
  { id: 'recon', entry: { x: -40, y: ROW_MIDDLE }, center: { x: -22, y: ROW_MIDDLE - 12 }, radius: 26 },
  { id: 'wounded', entry: { x: -50, y: ROW_SOUTH }, center: { x: -44, y: ROW_SOUTH }, radius: 18 },
  { id: 'final', entry: { x: 4, y: ROW_SOUTH }, center: { x: 18, y: ROW_SOUTH - 10 }, radius: 24 },
];

export function trainingStation(id: TrainingStationId): TrainingStation {
  const station = TRAINING_STATIONS.find((entry) => entry.id === id);
  if (!station) throw new Error(`unknown training station ${id}`);
  return station;
}

/** A point of a station's local layout, in map coordinates. */
export function stationPoint(id: TrainingStationId, offset: Vec2): Vec2 {
  const { entry } = trainingStation(id);
  return { x: entry.x + offset.x, y: entry.y + offset.y };
}

const at = (id: TrainingStationId, dx: number, dy: number): Vec2 => stationPoint(id, { x: dx, y: dy });

/** A training trench with its sandbag parapet on the near (south) side. */
function trainingLine(id: number, centre: Vec2): CoverPoint[] {
  return [
    { id, kind: 'trench', x: centre.x, y: centre.y, halfWidth: 7, halfDepth: 2.8, height: 0.2, radius: 3, quality: 0.4, blocksMovement: false, blocksSight: false },
    { id: id + 1, kind: 'sandbag', x: centre.x, y: centre.y + 2.5, halfWidth: 7, halfDepth: 0.4, height: 0.9, radius: 3.5, quality: 0.3, blocksMovement: false, blocksSight: false },
  ];
}

function wall(id: number, kind: 'stone' | 'low-wall' | 'sandbag', point: Vec2, halfWidth: number, halfDepth: number, height: number, rotation = 0): CoverPoint {
  const blocksSight = kind === 'stone' || height >= 1.3;
  return {
    id,
    kind,
    x: point.x,
    y: point.y,
    ...(rotation === 0 ? {} : { rotation }),
    halfWidth,
    halfDepth,
    height,
    radius: Math.sqrt(halfWidth * halfWidth + halfDepth * halfDepth) + 0.5,
    quality: kind === 'stone' ? 0.55 : kind === 'low-wall' ? 0.35 : 0.3,
    blocksMovement: kind !== 'sandbag',
    blocksSight,
  };
}

export type TrainingBuildingModel = 'barracks' | 'farmhouse' | 'barn' | 'chapel' | 'aid-tent';

export interface TrainingBuilding extends Omit<Building, 'model'> {
  model: TrainingBuildingModel;
}

export const TRAINING_BUILDINGS: readonly TrainingBuilding[] = [
  // Parade ground: two barracks blocks south of the road.
  { id: 301, model: 'barracks', ...at('formation', -22, 14), rotation: 0, halfWidth: 5.5, halfDepth: 3, height: 4 },
  { id: 302, model: 'barracks', ...at('formation', -6, 14), rotation: 0, halfWidth: 5.5, halfDepth: 3, height: 4 },
  // Hamlet north of the recon station's line.
  { id: 303, model: 'farmhouse', ...at('recon', 36, -28), rotation: -0.2, halfWidth: 4.35, halfDepth: 2.85, height: 4.8 },
  { id: 304, model: 'barn', ...at('recon', 4, -34), rotation: 0.12, halfWidth: 5.65, halfDepth: 3.5, height: 6 },
  { id: 305, model: 'chapel', ...at('recon', -12, -30), rotation: -0.1, halfWidth: 3.2, halfDepth: 4.8, height: 5.2 },
  // Aid post behind the wounded station.
  { id: 306, model: 'aid-tent', ...at('wounded', -4, 13), rotation: 0, halfWidth: 2.8, halfDepth: 2.3, height: 2.8 },
];

const covers: CoverPoint[] = [
  // Firing range: firing line in front of the section, target trench and the
  // earth butts behind it.
  wall(201, 'sandbag', at('fire', 0, -4), 8, 0.4, 0.9),
  ...trainingLine(202, at('fire', STATION_OFFSETS.line.x, STATION_OFFSETS.line.y)),
  wall(204, 'stone', at('fire', 24, -32), 9, 2, 3),
  // Maneuver field: target trench, the low wall at the bound line, a stone
  // wall on the open flank and a wall behind the start.
  ...trainingLine(210, at('maneuver', STATION_OFFSETS.line.x, STATION_OFFSETS.line.y)),
  wall(212, 'low-wall', at('maneuver', STATION_OFFSETS.bound.x, STATION_OFFSETS.bound.y), 5, 0.5, 1.4),
  wall(213, 'stone', at('maneuver', 36, -12), 4, 2.5, 3.2),
  wall(214, 'low-wall', at('maneuver', 12, 12), 5, 0.5, 1.4),
  // Trench line: the defended trench, cover on the approach.
  ...trainingLine(220, at('defense', STATION_OFFSETS.line.x, STATION_OFFSETS.line.y)),
  wall(222, 'stone', at('defense', 46, -16), 3, 2.5, 3.2),
  wall(223, 'low-wall', at('defense', 40, -4), 4, 0.5, 1.2, 0.5),
  // Hamlet: the training troop holds a ditch among the houses.
  ...trainingLine(230, at('recon', STATION_OFFSETS.line.x, STATION_OFFSETS.line.y)),
  wall(232, 'low-wall', at('recon', 12, -8), 5, 0.5, 1.2),
  // Aid post: a wall for the casualty party.
  ...trainingLine(240, at('wounded', STATION_OFFSETS.line.x, STATION_OFFSETS.line.y)),
  wall(242, 'low-wall', at('wounded', 12, 12), 5, 0.5, 1.4),
  // Assault line: the trench to take and stone walls on its flanks.
  ...trainingLine(250, at('final', STATION_OFFSETS.line.x, STATION_OFFSETS.line.y)),
  wall(252, 'low-wall', at('final', STATION_OFFSETS.bound.x, STATION_OFFSETS.bound.y), 5, 0.5, 1.4),
  wall(253, 'stone', at('final', 36, -12), 4, 2.5, 3.2),
  wall(254, 'stone', at('final', 6, -24), 3, 2, 2.6),
];

/** Trees along the road edges, away from every line of fire. */
export const TRAINING_TREES: readonly (readonly [number, number, number])[] = [
  [-94, -44, 1.2], [-40, -44, 1.0], [-28, -44, 1.1], [8, -42, 0.95], [22, -44, 1.15], [86, -40, 1.2],
  [94, -20, 1.1], [92, 16, 1.25], [10, 18, 1.0], [-8, 18, 1.1], [-74, 16, 1.15],
  [-94, 30, 1.2], [-92, 50, 1.0], [-22, 76, 1.05], [-30, 76, 1.15], [48, 76, 1.2], [70, 74, 1.0],
];

/** The trees' trunks block sight like posts. */
const trainingSightObstacles = TRAINING_TREES.map(([x, y], index) => ({
  id: 400 + index,
  x,
  y,
  halfWidth: 1.1,
  halfDepth: 1.1,
  height: 4.2,
}));

/** Roads and the parade ground (packed earth, the road surface). */
export const TRAINING_TERRAIN: readonly TerrainFeature[] = [
  // Northern row, west to east, then down the east side.
  { id: 'road-north-1', kind: 'road', x: -50, y: ROW_NORTH + 4, radiusX: 46, radiusY: 1.8, height: 0, cover: 0 },
  { id: 'road-north-2', kind: 'road', x: 40, y: ROW_NORTH + 4, radiusX: 50, radiusY: 1.8, height: 0, cover: 0 },
  { id: 'road-east', kind: 'road', x: 88, y: (ROW_NORTH + ROW_MIDDLE) / 2 + 4, radiusX: 1.8, radiusY: 34, height: 0, cover: 0 },
  // Middle row, east to west, then down the west side.
  { id: 'road-middle-1', kind: 'road', x: 40, y: ROW_MIDDLE + 4, radiusX: 50, radiusY: 1.8, height: 0, cover: 0 },
  { id: 'road-middle-2', kind: 'road', x: -50, y: ROW_MIDDLE + 4, radiusX: 46, radiusY: 1.8, height: 0, cover: 0 },
  { id: 'road-west', kind: 'road', x: -88, y: (ROW_MIDDLE + ROW_SOUTH) / 2 + 4, radiusX: 1.8, radiusY: 33, height: 0, cover: 0 },
  // Southern row, west to east.
  { id: 'road-south', kind: 'road', x: -30, y: ROW_SOUTH + 4, radiusX: 62, radiusY: 1.8, height: 0, cover: 0 },
  { id: 'parade-ground', kind: 'road', x: -74, y: ROW_NORTH, radiusX: 18, radiusY: 9, height: 0, cover: 0 },
];

/** Wooden fence lines bounding the training field (view only). */
export const TRAINING_FENCES: readonly (readonly Vec2[])[] = [
  [{ x: -98, y: -98 }, { x: 98, y: -98 }, { x: 98, y: 92 }, { x: -98, y: 92 }, { x: -98, y: -98 }],
];

/** Small props drawn by the view only (no simulation effect). */
export type TrainingPropKind = 'flagpole' | 'target-frame' | 'haystack' | 'crate' | 'well' | 'cart' | 'signpost';

export interface TrainingProp {
  kind: TrainingPropKind;
  x: number;
  y: number;
  rotation?: number;
}

export const TRAINING_PROPS: readonly TrainingProp[] = [
  { kind: 'flagpole', ...at('formation', -14, -8) },
  ...[-6, -2, 2, 6].map((dx) => ({ kind: 'target-frame' as const, ...at('fire', 24 + dx, -29) })),
  { kind: 'crate', ...at('fire', -8, 6) },
  { kind: 'crate', ...at('fire', -6.5, 6.5) },
  { kind: 'haystack', ...at('recon', 26, -36) },
  { kind: 'haystack', ...at('recon', 30, -38) },
  { kind: 'well', ...at('recon', 30, -16) },
  { kind: 'cart', ...at('recon', 0, -24), rotation: 0.4 },
  { kind: 'crate', ...at('wounded', 2, 12) },
  ...TRAINING_STATIONS.map((station) => ({ kind: 'signpost' as const, x: station.entry.x - 4, y: station.entry.y + 6 })),
];

export const TRAINING_GROUND = {
  covers: [...covers, ...TRAINING_BUILDINGS.map(buildingCover)] as readonly CoverPoint[],
  buildings: TRAINING_BUILDINGS,
  sightObstacles: trainingSightObstacles,
  terrain: TRAINING_TERRAIN,
  trees: TRAINING_TREES,
  fences: TRAINING_FENCES,
  props: TRAINING_PROPS,
  stations: TRAINING_STATIONS,
} as const;
