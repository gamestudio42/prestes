import type { TerrainSurface } from '../terrain';
import { distanceToPolyline, pointInPolygon, pointInStrip, pointsBox, polygonBox, smooth, type Box } from './geometry';
import type { BattleMap, Bridge, HeightShape, Polygon, Strip, VegetationKind } from './types';

/**
 * The baked form of a battle map (add-battle-maps): a 2 m heightfield and
 * 1 m grids of surface, water and vegetation. Baking is pure and cached per
 * map id, so the simulation and the view, each in its own thread, bake the
 * same numbers. Maps with feature terrain (the Vila Militar field) have no
 * runtime, and every query keeps its old behaviour.
 */
export interface MapRuntime {
  readonly map: BattleMap;
  readonly minX: number;
  readonly minY: number;
  /** Cells per side of the 1 m grids. */
  readonly width: number;
  readonly depth: number;
  /** Height nodes every HEIGHT_SPACING m. */
  readonly heightColumns: number;
  readonly heightRows: number;
  readonly heights: Float32Array;
  readonly surfaces: Uint8Array;
  /** 0 dry, 1 ford, 2 deep. */
  readonly water: Uint8Array;
  /** 0 none, else VEGETATION_KINDS index + 1. */
  readonly vegetation: Uint8Array;
  readonly steepest: number;
}

export const HEIGHT_SPACING = 2;

export const SURFACES: readonly TerrainSurface[] = [
  'grass',
  'ridge',
  'trench',
  'crater',
  'road',
  'pasture',
  'dirt-road',
  'cobbles',
  'crop',
  'tall-grass',
  'scrub',
  'mud',
  'ford',
  'trench-floor',
  'floor',
  'bridge',
  'water',
  'sand',
];

export const VEGETATION_KINDS: readonly VegetationKind[] = ['cane', 'corn', 'scrub', 'tall-grass'];

/**
 * author-game-maps: a painted vegetation cell holds its kind (1-based, low
 * four bits) and how thick the plants are drawn (high bits): 0 normal, 1
 * sparse, 2 dense. Density is the view's only: the compiled raster the
 * simulation reads keeps the kind alone.
 */
export const VEGETATION_DENSITIES = ['normal', 'sparse', 'dense'] as const;
export type VegetationDensity = (typeof VEGETATION_DENSITIES)[number];
export const VEGETATION_KIND_BITS = 0x0f;
export const vegetationCell = (kind: number, density: number): number => (kind === 0 ? 0 : (kind & VEGETATION_KIND_BITS) | ((density & 0x03) << 4));
export const vegetationKindOf = (cell: number): number => cell & VEGETATION_KIND_BITS;
export const vegetationDensityOf = (cell: number): number => (cell >> 4) & 0x03;

/** Mutable bounds every system clamps to: the active map's (±120 m on the feature maps). */
export const MAP_BOUNDS = { minX: -120, minY: -120, maxX: 120, maxY: 120 };

/** The pathfinding grid's extent (square, 1 m cells): ±100 m on the feature maps. */
export const PATH_GRID = { min: -100, max: 100 };

// Keyed by the map object, not its id: an edited authored map is a new
// object under the same id (add-map-editor).
const cache = new WeakMap<BattleMap, MapRuntime>();
let active: MapRuntime | null = null;
let activeMap: BattleMap | null = null;
/** Bumped on every map change, for caches keyed on the active map. */
let generation = 0;

export function activeMapRuntime(): MapRuntime | null {
  return active;
}

export function activeMapGeneration(): number {
  return generation;
}

/**
 * Selects the battle map the terrain, water, vegetation, bounds and path
 * queries read. Null, or a feature map, restores the default extents.
 */
export function setActiveMapRuntime(map: BattleMap | null): void {
  const next = map && map.height.kind === 'field' ? map : null;
  if (next === activeMap) return;
  activeMap = next;
  generation += 1;
  if (!map || map.height.kind !== 'field') {
    active = null;
    Object.assign(MAP_BOUNDS, { minX: -120, minY: -120, maxX: 120, maxY: 120 });
    Object.assign(PATH_GRID, { min: -100, max: 100 });
    return;
  }
  let runtime = cache.get(map);
  if (!runtime) {
    runtime = bakeMap(map);
    cache.set(map, runtime);
  }
  active = runtime;
  Object.assign(MAP_BOUNDS, map.bounds);
  Object.assign(PATH_GRID, {
    min: Math.max(map.bounds.minX, map.bounds.minY),
    max: Math.min(map.bounds.maxX, map.bounds.maxY),
  });
}

function shapeHeight(shape: HeightShape, x: number, y: number): number {
  switch (shape.kind) {
    case 'hill': {
      const dx = (x - shape.x) / shape.radiusX;
      const dy = (y - shape.y) / shape.radiusY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance >= 1 ? 0 : shape.height * smooth(1 - distance);
    }
    case 'ridge': {
      const distance = distanceToPolyline(x, y, shape.points) / (shape.width / 2);
      return distance >= 1 ? 0 : shape.height * smooth(1 - distance);
    }
    case 'channel': {
      const distance = distanceToPolyline(x, y, shape.points) - shape.width / 2;
      if (distance <= 0) return -shape.depth;
      return distance >= shape.bank ? 0 : -shape.depth * smooth(1 - distance / shape.bank);
    }
    case 'embankment': {
      const distance = distanceToPolyline(x, y, shape.points) - shape.width / 2;
      if (distance <= 0) return shape.height;
      return distance >= shape.slope ? 0 : shape.height * smooth(1 - distance / shape.slope);
    }
    case 'cut': {
      const rotation = shape.rotation ?? 0;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const dx = x - shape.x;
      const dy = y - shape.y;
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      return Math.abs(localX) <= shape.halfWidth && Math.abs(localY) <= shape.halfDepth ? -shape.depth : 0;
    }
  }
}

function shapeBox(shape: HeightShape): Box | null {
  switch (shape.kind) {
    case 'hill':
      return { minX: shape.x - shape.radiusX, minY: shape.y - shape.radiusY, maxX: shape.x + shape.radiusX, maxY: shape.y + shape.radiusY };
    case 'ridge':
      return pointsBox(shape.points, shape.width / 2);
    case 'channel':
      return pointsBox(shape.points, shape.width / 2 + shape.bank);
    case 'embankment':
      return pointsBox(shape.points, shape.width / 2 + shape.slope);
    case 'cut': {
      const reach = Math.hypot(shape.halfWidth, shape.halfDepth);
      return { minX: shape.x - reach, minY: shape.y - reach, maxX: shape.x + reach, maxY: shape.y + reach };
    }
  }
}

function areaBox(area: { polygon?: Polygon; strip?: Strip }): Box {
  if (area.polygon) return polygonBox(area.polygon);
  if (area.strip) return pointsBox(area.strip.points, area.strip.width / 2);
  return { minX: 0, minY: 0, maxX: -1, maxY: -1 };
}

function inArea(area: { polygon?: Polygon; strip?: Strip }, x: number, y: number): boolean {
  if (area.polygon) return pointInPolygon(x, y, area.polygon);
  if (area.strip) return pointInStrip(x, y, area.strip);
  return false;
}

/** Visits the 1 m cells whose centre lies in the area. */
function fillCells(
  runtime: { minX: number; minY: number; width: number; depth: number },
  area: { polygon?: Polygon; strip?: Strip },
  visit: (index: number) => void,
): void {
  const box = areaBox(area);
  const fromX = Math.max(0, Math.floor(box.minX - runtime.minX));
  const toX = Math.min(runtime.width - 1, Math.ceil(box.maxX - runtime.minX));
  const fromY = Math.max(0, Math.floor(box.minY - runtime.minY));
  const toY = Math.min(runtime.depth - 1, Math.ceil(box.maxY - runtime.minY));
  for (let cy = fromY; cy <= toY; cy += 1) {
    for (let cx = fromX; cx <= toX; cx += 1) {
      if (inArea(area, runtime.minX + cx + 0.5, runtime.minY + cy + 0.5)) visit(cy * runtime.width + cx);
    }
  }
}

/** A cable ferry carries this many soldiers... */
export const FERRY_CAPACITY = 6;
/** ...and crosses in this many ticks (20 s). */
export const FERRY_CROSSING_TICKS = 200;
/**
 * Paths weigh a ferry crossing as this many extra metres: the ride and the
 * wait for the raft, at a walk.
 */
export const FERRY_PATH_PENALTY = 60;

/** Ford beds sit this far under the water surface. */
export const FORD_DEPTH = 0.45;

export function bakeMap(map: BattleMap): MapRuntime {
  if (map.height.kind !== 'field') throw new Error(`map ${map.id} has no heightfield`);
  const { minX, minY, maxX, maxY } = map.bounds;
  const width = Math.round(maxX - minX);
  const depth = Math.round(maxY - minY);
  const heightColumns = Math.round(width / HEIGHT_SPACING) + 1;
  const heightRows = Math.round(depth / HEIGHT_SPACING) + 1;
  const heights = new Float32Array(heightColumns * heightRows);
  const grid0 = map.height.grid;
  if (grid0) {
    // add-map-editor: a stored heightfield, in whole centimetres.
    if (grid0.columns !== heightColumns || grid0.rows !== heightRows) {
      throw new Error(`map ${map.id}: height grid is ${grid0.columns}x${grid0.rows}, expected ${heightColumns}x${heightRows}`);
    }
    for (let index = 0; index < heights.length; index += 1) heights[index] = grid0.centimetres[index]! / 100;
  }
  for (const shape of map.height.shapes) {
    const box = shapeBox(shape);
    if (!box) continue;
    const fromX = Math.max(0, Math.floor((box.minX - minX) / HEIGHT_SPACING));
    const toX = Math.min(heightColumns - 1, Math.ceil((box.maxX - minX) / HEIGHT_SPACING));
    const fromY = Math.max(0, Math.floor((box.minY - minY) / HEIGHT_SPACING));
    const toY = Math.min(heightRows - 1, Math.ceil((box.maxY - minY) / HEIGHT_SPACING));
    for (let row = fromY; row <= toY; row += 1) {
      for (let column = fromX; column <= toX; column += 1) {
        const index = row * heightColumns + column;
        heights[index] = heights[index]! + shapeHeight(shape, minX + column * HEIGHT_SPACING, minY + row * HEIGHT_SPACING);
      }
    }
  }

  const grid = { minX, minY, width, depth };
  const raster = map.raster;
  if (raster && (raster.surfaces.length !== width * depth || raster.vegetation.length !== width * depth)) {
    throw new Error(`map ${map.id}: raster layers do not match its bounds`);
  }
  const surfaces = raster ? raster.surfaces.slice() : new Uint8Array(width * depth).fill(SURFACES.indexOf(map.baseSurface));
  for (const area of map.surfaces) {
    const code = SURFACES.indexOf(area.surface);
    fillCells(grid, area, (index) => {
      surfaces[index] = code;
    });
  }
  const water = new Uint8Array(width * depth);
  for (const area of map.water) {
    const code = area.kind === 'deep' ? 2 : 1;
    fillCells(grid, area, (index) => {
      water[index] = code;
      surfaces[index] = SURFACES.indexOf(code === 2 ? 'water' : 'ford');
    });
  }
  for (const bridge of map.bridges) {
    fillCells(grid, { polygon: bridgePolygon(bridge) }, (index) => {
      water[index] = 0;
      surfaces[index] = SURFACES.indexOf('bridge');
    });
  }
  // A ford's bed rises to just under the water: the nodes around ford cells.
  const fordBed = map.waterLevel - FORD_DEPTH;
  for (let row = 0; row < heightRows; row += 1) {
    for (let column = 0; column < heightColumns; column += 1) {
      const cx = Math.min(width - 1, column * HEIGHT_SPACING);
      const cy = Math.min(depth - 1, row * HEIGHT_SPACING);
      let ford = false;
      for (let oy = -2; oy <= 1 && !ford; oy += 1) {
        for (let ox = -2; ox <= 1 && !ford; ox += 1) {
          const x = cx + ox;
          const y = cy + oy;
          if (x >= 0 && y >= 0 && x < width && y < depth && water[y * width + x] === 1) ford = true;
        }
      }
      if (ford) {
        const index = row * heightColumns + column;
        heights[index] = Math.max(heights[index]!, fordBed);
      }
    }
  }
  const vegetation = new Uint8Array(width * depth);
  if (raster) {
    for (let index = 0; index < vegetation.length; index += 1) {
      if (water[index] === 0) vegetation[index] = raster.vegetation[index]!;
    }
  }
  for (const area of map.vegetation) {
    const code = VEGETATION_KINDS.indexOf(area.kind) + 1;
    fillCells(grid, area, (index) => {
      if (water[index] === 0) vegetation[index] = code;
    });
  }
  // Nothing grows on a bridge deck (refine-battle-maps 5.11).
  for (const bridge of map.bridges) {
    fillCells(grid, { polygon: bridgePolygon(bridge) }, (index) => {
      vegetation[index] = 0;
    });
  }

  let steepest = 0;
  for (let row = 0; row < heightRows; row += 1) {
    for (let column = 1; column < heightColumns; column += 1) {
      const index = row * heightColumns + column;
      steepest = Math.max(steepest, Math.abs(heights[index]! - heights[index - 1]!) / HEIGHT_SPACING);
      if (row > 0) steepest = Math.max(steepest, Math.abs(heights[index]! - heights[index - heightColumns]!) / HEIGHT_SPACING);
    }
  }

  return { map, minX, minY, width, depth, heightColumns, heightRows, heights, surfaces, water, vegetation, steepest };
}

export function bridgePolygon(bridge: Bridge): Polygon {
  const cos = Math.cos(bridge.rotation);
  const sin = Math.sin(bridge.rotation);
  return [
    [-bridge.halfWidth, -bridge.halfDepth],
    [bridge.halfWidth, -bridge.halfDepth],
    [bridge.halfWidth, bridge.halfDepth],
    [-bridge.halfWidth, bridge.halfDepth],
  ].map(([lx, ly]) => ({ x: bridge.x + lx! * cos - ly! * sin, y: bridge.y + lx! * sin + ly! * cos }));
}

function onBridge(runtime: MapRuntime, x: number, y: number): Bridge | null {
  for (const bridge of runtime.map.bridges) {
    const cos = Math.cos(bridge.rotation);
    const sin = Math.sin(bridge.rotation);
    const dx = x - bridge.x;
    const dy = y - bridge.y;
    if (Math.abs(dx * cos + dy * sin) <= bridge.halfWidth && Math.abs(-dx * sin + dy * cos) <= bridge.halfDepth) {
      return bridge;
    }
  }
  return null;
}

/**
 * refine-map-editor D3: a bridge rests on its abutments. Each end meets the
 * ground at its landing; between the ramps the deck is the higher of the
 * water clearance and the straight line between the ends. The ramps blend
 * from the landing to that core, so men walk on without a step. The
 * simulation, the compiler and the view share this profile.
 */
export const BRIDGE_RAMP = 3;

/** A point on a bridge's centreline, `along` metres from its centre (local y). */
export function bridgePoint(bridge: Bridge, along: number): { x: number; y: number } {
  return { x: bridge.x - along * Math.sin(bridge.rotation), y: bridge.y + along * Math.cos(bridge.rotation) };
}

/** The deck's height `along` metres from the centre, given the ground at each end. */
export function bridgeDeckHeight(bridge: Bridge, waterLevel: number, ends: readonly [number, number], along: number): number {
  const half = bridge.halfDepth;
  const t = Math.max(0, Math.min(1, (along + half) / (2 * half)));
  const line = ends[0] + (ends[1] - ends[0]) * t;
  const core = Math.max(waterLevel + bridge.deckHeight, line);
  const ramp = Math.min(BRIDGE_RAMP, half / 2);
  const fromEnd = half - Math.abs(along);
  const weight = ramp > 0 ? smooth(Math.max(0, Math.min(1, fromEnd / ramp))) : 1;
  return line + (core - line) * weight;
}

/** Ground heights at a bridge's two landings (local y = -halfDepth, +halfDepth). */
export function bridgeLandings(bridge: Bridge, groundAt: (x: number, y: number) => number): [number, number] {
  const a = bridgePoint(bridge, -bridge.halfDepth);
  const b = bridgePoint(bridge, bridge.halfDepth);
  return [groundAt(a.x, a.y), groundAt(b.x, b.y)];
}

const landingCache = new WeakMap<MapRuntime, Map<Bridge, [number, number]>>();

/** A bridge's landings on a baked map, worked out once per runtime. */
export function runtimeBridgeLandings(runtime: MapRuntime, bridge: Bridge): [number, number] {
  let byBridge = landingCache.get(runtime);
  if (!byBridge) {
    byBridge = new Map();
    landingCache.set(runtime, byBridge);
  }
  let ends = byBridge.get(bridge);
  if (!ends) {
    ends = bridgeLandings(bridge, (x, y) => runtimeGroundAt(runtime, x, y));
    byBridge.set(bridge, ends);
  }
  return ends;
}

/** A bridge's deck height at a point over it, on a baked map. */
export function runtimeBridgeDeckAt(runtime: MapRuntime, bridge: Bridge, x: number, y: number): number {
  const along = -(x - bridge.x) * Math.sin(bridge.rotation) + (y - bridge.y) * Math.cos(bridge.rotation);
  return bridgeDeckHeight(bridge, runtime.map.waterLevel, runtimeBridgeLandings(runtime, bridge), along);
}

/** Bilinear height of the heightfield, with bridge decks on top. */
export function runtimeHeightAt(runtime: MapRuntime, x: number, y: number): number {
  const ground = runtimeGroundAt(runtime, x, y);
  if (runtime.map.bridges.length > 0) {
    const bridge = onBridge(runtime, x, y);
    if (bridge) return Math.max(ground, runtimeBridgeDeckAt(runtime, bridge, x, y));
  }
  return ground;
}

/** Bilinear height of the heightfield alone. */
export function runtimeGroundAt(runtime: MapRuntime, x: number, y: number): number {
  const gx = Math.max(0, Math.min(runtime.heightColumns - 1.000001, (x - runtime.minX) / HEIGHT_SPACING));
  const gy = Math.max(0, Math.min(runtime.heightRows - 1.000001, (y - runtime.minY) / HEIGHT_SPACING));
  const column = Math.floor(gx);
  const row = Math.floor(gy);
  const fx = gx - column;
  const fy = gy - row;
  const index = row * runtime.heightColumns + column;
  const h00 = runtime.heights[index]!;
  const h10 = runtime.heights[index + 1]!;
  const h01 = runtime.heights[index + runtime.heightColumns]!;
  const h11 = runtime.heights[index + runtime.heightColumns + 1]!;
  return (h00 * (1 - fx) + h10 * fx) * (1 - fy) + (h01 * (1 - fx) + h11 * fx) * fy;
}

function cellIndex(runtime: MapRuntime, x: number, y: number): number {
  const cx = Math.floor(x - runtime.minX);
  const cy = Math.floor(y - runtime.minY);
  if (cx < 0 || cy < 0 || cx >= runtime.width || cy >= runtime.depth) return -1;
  return cy * runtime.width + cx;
}

export function runtimeSurfaceAt(runtime: MapRuntime, x: number, y: number): TerrainSurface {
  const index = cellIndex(runtime, x, y);
  return index < 0 ? runtime.map.baseSurface : SURFACES[runtime.surfaces[index]!]!;
}

/** 0 dry, 1 ford, 2 deep (outside the map counts as dry; bounds stop it). */
export function runtimeWaterAt(runtime: MapRuntime, x: number, y: number): number {
  const index = cellIndex(runtime, x, y);
  return index < 0 ? 0 : runtime.water[index]!;
}

export function runtimeVegetationAt(runtime: MapRuntime, x: number, y: number): VegetationKind | null {
  const index = cellIndex(runtime, x, y);
  if (index < 0) return null;
  const code = runtime.vegetation[index]!;
  return code === 0 ? null : VEGETATION_KINDS[code - 1]!;
}

/** Water depth at a point on the active map (0 when dry or no map). */
export function waterAt(x: number, y: number): number {
  return active ? runtimeWaterAt(active, x, y) : 0;
}

export function isDeepWater(x: number, y: number): boolean {
  return active !== null && runtimeWaterAt(active, x, y) === 2;
}

export function vegetationAt(x: number, y: number): VegetationKind | null {
  return active ? runtimeVegetationAt(active, x, y) : null;
}
