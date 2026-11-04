export type TerrainKind = 'ridge' | 'trench' | 'crater' | 'road';
export type TerrainSurface = 'grass' | 'ridge' | 'trench' | 'crater' | 'road';

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

const SURFACE_SPEED: Readonly<Record<TerrainSurface, number>> = {
  grass: 1,
  ridge: 0.85,
  trench: 0.6,
  crater: 0.75,
  road: 1.15,
};

export function terrainSpeedFactor(x: number, y: number): number {
  const surface = terrainSurfaceAt(x, y);
  const slope = terrainSlopeAt(x, y);
  const factor = (1 - slope * 0.6) * SURFACE_SPEED[surface];
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
