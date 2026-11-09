import type { CoverPoint, Vec2 } from '../protocol';
import type { TerrainFeature, TerrainSurface } from '../terrain';
import type { Building } from '../world';
import type { Roster } from '../sections';
import type { TrenchLineDef } from './trench-lines';

/** The hand-written maps. */
export type BuiltinBattleMapId = 'vila-militar' | 'fazenda' | 'serra-rio' | 'bairro';

/** A battle map id: a hand-written map's, or an authored map document's (add-map-editor). */
export type BattleMapId = string;

export const BATTLE_MAP_IDS: readonly BuiltinBattleMapId[] = ['vila-militar', 'fazenda', 'serra-rio', 'bairro'];

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
  /**
   * add-deployment-phase D3: where the side may deploy. It holds the
   * section points and does not overlap the other side's.
   */
  area: Polygon;
}

/** Text in both shipped languages (authored maps carry their own names). */
export interface LocalizedText {
  en: string;
  'pt-BR': string;
}

/**
 * A stored heightfield (add-map-editor): whole centimetres every 2 m, row by
 * row from the map's north-west corner. The bake starts from it, then adds
 * the shapes.
 */
export interface HeightGrid {
  columns: number;
  rows: number;
  centimetres: Int16Array;
}

/** View data for an authored wall or fence (the covers carry the gameplay). */
export interface MapLine {
  kind: string;
  points: readonly Vec2[];
  height: number;
}

export interface BattleMap {
  id: BattleMapId;
  nameKey: string;
  descriptionKey: string;
  /** Authored maps: the name and description themselves, instead of locale keys. */
  text?: { name: LocalizedText; description: LocalizedText };
  /** The compendium entry that describes the map's setting. */
  codexKey: string;
  setting: {
    label: 'training-ground' | 'historical-setting-fictional-place' | 'reconstructed-historical-place';
    sourceNote: string;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Features keep the ellipse terrain; a field is baked to a 2 m heightfield. */
  height:
    | { kind: 'features'; features: readonly TerrainFeature[] }
    | { kind: 'field'; shapes: readonly HeightShape[]; grid?: HeightGrid };
  /**
   * Authored maps: 1 m grids of surface (SURFACES index) and vegetation
   * (0 none, else VEGETATION_KINDS index + 1), used instead of the
   * `surfaces` and `vegetation` areas. Water and bridges still apply over them.
   */
  raster?: {
    surfaces: Uint8Array;
    vegetation: Uint8Array;
    /**
     * refine-map-editor 7.3: cells whose vegetation is an object's
     * concealment (a bush, a cactus, the shade round a tree), set only where
     * nothing was painted. They conceal like scrub; the view draws the
     * object there, not scrub plants.
     */
    objectCover?: Uint8Array;
  };
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
  /** refine-battle-maps 5.1: how `fences` are drawn: posts and wire (default) or boards. */
  fenceStyle?: 'wire' | 'boards';
  /**
   * refine-battle-maps: enclosed yards (the Bairro's quintais), places a
   * searching side looks into when it knows an enemy went near them.
   */
  yards?: readonly Polygon[];
  /** Authored maps: walls and fences by kind, for the view. */
  lines?: readonly MapLine[];
  /**
   * refine-map-editor D6: trench lines, for the view (their covers, height
   * shapes and floor are already in `covers`, `height` and the surfaces).
   */
  trenches?: readonly TrenchLineDef[];
  /** Authored maps: the painted ground (GROUND_MATERIALS index per 1 m cell), for the view. */
  paint?: Uint8Array;
  /** The view's ground colour family. */
  palette: 'temperate' | 'cerrado' | 'caatinga' | 'urban';
  /**
   * pre-battle-roster 2.3: the legalist forces the engine draws from when the
   * player brings a roster (built-in maps). Absent: the default roster.
   */
  enemyForces?: readonly Roster[];
}
