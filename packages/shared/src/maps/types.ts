import type { CoverPoint, Vec2 } from '../protocol';
import type { TerrainFeature, TerrainSurface } from '../terrain';
import type { Building } from '../world';

export type BattleMapId = 'vila-militar' | 'fazenda' | 'serra-rio' | 'bairro';

export const BATTLE_MAP_IDS: readonly BattleMapId[] = ['vila-militar', 'fazenda', 'serra-rio', 'bairro'];

export type VegetationKind = 'cane' | 'corn' | 'scrub' | 'tall-grass';

/** A closed polygon, in map coordinates (x east, y south). */
export type Polygon = readonly Vec2[];

/** A strip along a polyline, `width` metres wide. */
export interface Strip {
  points: readonly Vec2[];
  width: number;
}

/**
 * The shapes a heightfield is authored from (add-battle-maps). They are
 * summed in list order; a `cut` and a `channel` lower the ground, the rest
 * raise it. Falloffs are smooth so the field has no cliffs unless asked.
 */
export type HeightShape =
  | { kind: 'hill'; x: number; y: number; radiusX: number; radiusY: number; height: number }
  | { kind: 'ridge'; points: readonly Vec2[]; width: number; height: number }
  | { kind: 'channel'; points: readonly Vec2[]; width: number; bank: number; depth: number }
  | { kind: 'embankment'; points: readonly Vec2[]; width: number; slope: number; height: number }
  | { kind: 'cut'; x: number; y: number; halfWidth: number; halfDepth: number; rotation?: number; depth: number };

export interface SurfaceArea {
  surface: TerrainSurface;
  polygon?: Polygon;
  strip?: Strip;
}

export interface VegetationArea {
  kind: VegetationKind;
  polygon: Polygon;
}

/** Water: deep is impassable; a ford is walkable, slow, with no prone and no cover. */
export interface WaterArea {
  kind: 'deep' | 'ford';
  polygon?: Polygon;
  strip?: Strip;
  /** A ford's two ends, on each bank: paths over the river are routed through them. */
  ends?: readonly [Vec2, Vec2];
}

/** A bridge deck: walkable over deep water. */
export interface Bridge {
  id: number;
  x: number;
  y: number;
  rotation: number;
  halfWidth: number;
  halfDepth: number;
  deckHeight: number;
}

/** A cable ferry between two landings (one on each bank). */
export interface FerryCrossing {
  id: number;
  landingA: Vec2;
  landingB: Vec2;
}

/** View-only furniture: no simulation effect. */
export interface PropPlacement {
  model: string;
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
}

/** A side's three section start centres and the way it faces. */
export interface DeploymentZone {
  sections: readonly Vec2[];
  facing: Vec2;
}

export interface BattleMap {
  id: BattleMapId;
  nameKey: string;
  descriptionKey: string;
  /** The compendium entry that describes the map's setting. */
  codexKey: string;
  setting: {
    label: 'training-ground' | 'historical-setting-fictional-place';
    sourceNote: string;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Features keep the ellipse terrain; a field is baked to a 2 m heightfield. */
  height: { kind: 'features'; features: readonly TerrainFeature[] } | { kind: 'field'; shapes: readonly HeightShape[] };
  /** Ground under everything else (field maps). */
  baseSurface: TerrainSurface;
  /** Later areas win. */
  surfaces: readonly SurfaceArea[];
  water: readonly WaterArea[];
  /** Height of the water surface (view; also the ford floor sits under it). */
  waterLevel: number;
  bridges: readonly Bridge[];
  ferries: readonly FerryCrossing[];
  vegetation: readonly VegetationArea[];
  buildings: readonly Building[];
  covers: readonly CoverPoint[];
  sightObstacles: readonly { id: number; x: number; y: number; halfWidth: number; halfDepth: number; height: number }[];
  deployment: { column: DeploymentZone; legalist: DeploymentZone };
  props: readonly PropPlacement[];
  /** View only: wire and post fences, as polylines. */
  fences: readonly (readonly Vec2[])[];
  /** The view's ground colour family. */
  palette: 'temperate' | 'cerrado' | 'urban';
}
