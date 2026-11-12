export type TerrainKind = 'ridge' | 'trench' | 'crater' | 'road';
import { activeMapRuntime, runtimeGroundAt, runtimeHeightAt, runtimeSurfaceAt } from './maps/runtime';

/**
 * Ground surfaces. The first five are the feature maps'; the rest are the
 * battle maps' (add-battle-maps).
 */
export type TerrainSurface =
  | 'grass'
  | 'ridge'
  | 'trench'
  | 'crater'
  | 'road'
  | 'pasture'
  | 'dirt-road'
  | 'cobbles'
  | 'crop'
  | 'tall-grass'
  | 'scrub'
  | 'mud'
  | 'ford'
  | 'trench-floor'
  | 'floor'
  | 'bridge'
  | 'water'
  // add-map-editor: painted sand.
  | 'sand'
  // biome-trees-and-plants 3.2: a thorn patch (macambira) under its plants.
  | 'thorns';

export interface TerrainFeature {
  id: string;
  kind: TerrainKind;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  height: number;
  cover: number;
}

export const SANDBOX_TERRAIN: readonly TerrainFeature[] = [
  {
    id: 'ridge',
    kind: 'ridge',
    x: 0,
    y: -9,
    radiusX: 20,
    radiusY: 2.8,
    height: 2.2,
    cover: 0.25,
  },
  {
    id: 'trench',
    kind: 'trench',
    x: -15,
    y: -13,
    radiusX: 7,
    radiusY: 1.6,
    height: 1.1,
    cover: 0.35,
  },
  {
    id: 'crater',
    kind: 'crater',
    x: 14,
    y: -13,
    radiusX: 3,
    radiusY: 3,
    height: 1,
    cover: 0.25,
  },
  {
    id: 'road',
    kind: 'road',
    x: 12,
    y: -5,
    radiusX: 1.4,
    radiusY: 25,
    height: 0,
    cover: 0,
  },
];

let activeTerrain: readonly TerrainFeature[] = SANDBOX_TERRAIN;

/**
 * Selects the terrain the height, surface, speed and cover queries read. The
 * simulation sets its own map's terrain before every tick and the view sets
 * it when it builds its scene; each runs in its own thread.
 */
export function setActiveTerrain(features: readonly TerrainFeature[]): void {
  activeTerrain = features;
}

export function activeTerrainFeatures(): readonly TerrainFeature[] {
  return activeTerrain;
}

function influence(feature: TerrainFeature, x: number, y: number): number {
  const dx = (x - feature.x) / feature.radiusX;
  const dy = (y - feature.y) / feature.radiusY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance >= 1 ? 0 : 1 - distance;
}

export function terrainHeightAt(x: number, y: number): number {
  const runtime = activeMapRuntime();
  if (runtime) return runtimeHeightAt(runtime, x, y);
  return featureHeightAt(x, y);
}

/**
 * The ground itself, without bridge decks: what the drawn ground sheet
 * follows, so a bridge stands open over the water instead of on a fill.
 */
export function groundHeightAt(x: number, y: number): number {
  const runtime = activeMapRuntime();
  if (runtime) return runtimeGroundAt(runtime, x, y);
  return featureHeightAt(x, y);
}

function featureHeightAt(x: number, y: number): number {
  let height = 0;
  for (const feature of activeTerrain) {
    if (feature.kind === 'ridge') {
      height += feature.height * influence(feature, x, y);
    } else if (feature.kind === 'trench' || feature.kind === 'crater') {
      height -= feature.height * influence(feature, x, y);
    }
  }
  return height;
}

export function terrainSurfaceAt(x: number, y: number): TerrainSurface {
  const runtime = activeMapRuntime();
  if (runtime) return runtimeSurfaceAt(runtime, x, y);
  let surface: TerrainSurface = 'grass';
  for (const feature of activeTerrain) {
    if (influence(feature, x, y) <= 0.05) {
      continue;
    }
    if (feature.kind === 'road') {
      return 'road';
    }
    surface = feature.kind;
  }
  return surface;
}

export function terrainSlopeAt(x: number, y: number): number {
  const dx = (terrainHeightAt(x + 0.5, y) - terrainHeightAt(x - 0.5, y)) / 1;
  const dy = (terrainHeightAt(x, y + 0.5) - terrainHeightAt(x, y - 0.5)) / 1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Cover from a crest between a unit and the threat, on the battle maps. */
export const RIDGE_COVER = 0.25;

const SURFACE_SPEED: Readonly<Record<TerrainSurface, number>> = {
  grass: 1,
  ridge: 0.85,
  trench: 0.6,
  crater: 0.75,
  road: 1.15,
  pasture: 1,
  'dirt-road': 1.15,
  cobbles: 1.1,
  crop: 0.7,
  'tall-grass': 0.9,
  scrub: 0.8,
  // Picking a way through spiny bromeliads: slower than scrub, faster than a ford.
  thorns: 0.55,
  mud: 0.6,
  ford: 0.5,
  'trench-floor': 0.6,
  floor: 1,
  bridge: 1,
  water: 0.4,
  sand: 0.85,
};

/** The surface speed factor alone, before slope. */
export function surfaceSpeed(surface: TerrainSurface): number {
  return SURFACE_SPEED[surface];
}

export function terrainSpeedFactor(x: number, y: number): number {
  const surface = terrainSurfaceAt(x, y);
  const slope = terrainSlopeAt(x, y);
  const factor = (1 - slope * 0.6) * SURFACE_SPEED[surface];
  // A ford is slow however flat its bed: its floor is its own.
  if (surface === 'ford') return Math.min(factor, SURFACE_SPEED.ford);
  return Math.max(0.4, Math.min(1.2, factor));
}

export function terrainCoverAgainst(
  x: number,
  y: number,
  threatX: number,
  threatY: number,
): number {
  const unitHeight = terrainHeightAt(x, y);
  const threatHeight = terrainHeightAt(threatX, threatY);
  let cover = 0;

  if (activeMapRuntime()) {
    // Battle maps: a crest between the unit and the threat is ridge cover,
    // read off the heightfield every 2 m like the sight line.
    const distance = Math.sqrt((threatX - x) ** 2 + (threatY - y) ** 2);
    const steps = Math.max(8, Math.ceil(distance / 2));
    let crest = Number.NEGATIVE_INFINITY;
    for (let index = 1; index < steps; index += 1) {
      const t = index / steps;
      crest = Math.max(crest, terrainHeightAt(x + (threatX - x) * t, y + (threatY - y) * t));
    }
    return crest > unitHeight + 0.35 && crest > threatHeight + 0.2 ? RIDGE_COVER : 0;
  }

  for (const feature of activeTerrain) {
    if (feature.kind === 'trench' || feature.kind === 'crater') {
      if (influence(feature, x, y) > 0) {
        cover = Math.max(cover, feature.cover);
      }
    }
  }

  for (const feature of activeTerrain) {
    if (feature.kind !== 'ridge' || feature.cover <= cover) {
      continue;
    }
    let crest = 0;
    for (let index = 1; index < 24; index += 1) {
      const t = index / 24;
      const height = terrainHeightAt(
        x + (threatX - x) * t,
        y + (threatY - y) * t,
      );
      crest = Math.max(crest, height);
    }
    if (crest > unitHeight + 0.35 && crest > threatHeight + 0.2) {
      cover = feature.cover;
    }
  }

  return cover;
}
