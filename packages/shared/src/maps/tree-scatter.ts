import type { Vec2 } from '../protocol';
import { CATALOG_OBJECTS, catalogObject } from './catalog-objects';
import { mapSide, type DocObject, type EditableMap } from './document';
import { distanceToPolyline } from './geometry';
import { growableCell } from './growth-mask';

/**
 * refine-map-editor D7: the trees tool's scatter brush. A stroke scatters
 * trees by Poisson disc (dart throwing against every tree already standing
 * or placed in the stroke), drawing species from the chosen biome's mix.
 * Trees keep TREE_CLEARANCE from building and object footprints and never
 * stand in water or on roads. The seed comes from the map id and the stroke
 * number, so the same strokes give the same trees.
 */

export const TREE_BIOMES = ['atlantic-edge', 'cerrado', 'caatinga', 'pasture'] as const;
export type TreeBiome = (typeof TREE_BIOMES)[number];

export const TREE_DENSITIES = ['sparse', 'medium', 'dense'] as const;
export type TreeDensity = (typeof TREE_DENSITIES)[number];

/** The least distance between two trees at each density (m). */
export const TREE_SPACING: Record<TreeDensity, number> = { sparse: 9, medium: 5, dense: 3 };

/** The least distance from a tree to a footprint, and between trees at any density (m). */
export const TREE_CLEARANCE = 2;

/** The species of each biome, by weight (catalog tree ids). */
export const BIOME_MIX: Record<TreeBiome, readonly { type: string; weight: number }[]> = {
  'atlantic-edge': [
    { type: 'tree-broad', weight: 5 },
    { type: 'tree-araucaria', weight: 3 },
    { type: 'bush', weight: 2 },
  ],
  cerrado: [
    { type: 'cerrado-tree', weight: 6 },
    { type: 'buriti', weight: 1 },
    { type: 'bush', weight: 3 },
  ],
  caatinga: [
    { type: 'juazeiro', weight: 2 },
    { type: 'mandacaru', weight: 3 },
    { type: 'xique-xique', weight: 3 },
    { type: 'macambira', weight: 2 },
  ],
  pasture: [
    { type: 'tree-broad', weight: 7 },
    { type: 'cerrado-tree', weight: 3 },
  ],
};

/** The catalog's tree group: the species the tool offers one by one. */
export function treeSpecies(): string[] {
  return CATALOG_OBJECTS.filter((entry) => entry.group === 'tree').map((entry) => entry.id);
}

export function isTreeObject(object: Pick<DocObject, 'type'>): boolean {
  return catalogObject(object.type)?.group === 'tree';
}

/** A stroke's seed from the map id and the stroke number (FNV-1a). */
export function treeStrokeSeed(mapId: string, stroke: number): number {
  let hash = 2166136261;
  for (const char of `${mapId}#${stroke}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32: a small seeded generator in 0..1. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from a point to an object's footprint rectangle (0 inside). */
function footprintDistance(object: DocObject, x: number, y: number): number {
  const entry = catalogObject(object.type);
  if (!entry) return Number.POSITIVE_INFINITY;
  const scale = object.scale ?? 1;
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  const dx = x - object.x;
  const dy = y - object.y;
  const across = Math.abs(dx * cos + dy * sin) - entry.halfWidth * scale;
  const along = Math.abs(-dx * sin + dy * cos) - entry.halfDepth * scale;
  return Math.hypot(Math.max(0, across), Math.max(0, along));
}

export interface TreeScatterOptions {
  radius: number;
  biome: TreeBiome;
  density: TreeDensity;
  seed: number;
  /**
   * The species the author chose for the stroke (catalog tree ids). A species
   * of the biome keeps the biome's weight, any other weighs 1. Absent or
   * empty: the biome's mix.
   */
  species?: readonly string[];
}

/** The weighted mix a stroke draws from: the chosen species, or the biome's. */
export function scatterMix(biome: TreeBiome, species?: readonly string[]): readonly { type: string; weight: number }[] {
  const base = BIOME_MIX[biome];
  if (!species || species.length === 0) return base;
  return species.map((type) => ({ type, weight: base.find((entry) => entry.type === type)?.weight ?? 1 }));
}

/** A tree placed by a stroke, before it gets its object id. */
export type ScatteredTree = Omit<DocObject, 'id'>;

/** One stroke of the scatter brush: call `dab` along the stroke; `trees` holds what it placed. */
export class TreeScatter {
  readonly trees: ScatteredTree[] = [];
  private readonly random: () => number;
  private readonly spacing: number;
  private readonly standing: Vec2[];
  private readonly footprints: DocObject[];
  private readonly mix: readonly { type: string; weight: number }[];
  private readonly total: number;

  constructor(
    private readonly map: EditableMap,
    private readonly options: TreeScatterOptions,
  ) {
    this.random = generator(options.seed);
    this.spacing = Math.max(TREE_CLEARANCE, TREE_SPACING[options.density]);
    this.standing = map.objects.filter(isTreeObject).map((object) => ({ x: object.x, y: object.y }));
    this.footprints = map.objects.filter((object) => !isTreeObject(object));
    this.mix = scatterMix(options.biome, options.species);
    this.total = this.mix.reduce((sum, entry) => sum + entry.weight, 0);
  }

  /** Whether a tree may stand at a point (water, roads, footprints and other trees). */
  fits(x: number, y: number): boolean {
    const half = mapSide(this.map.size) / 2 - 1;
    if (Math.abs(x) > half || Math.abs(y) > half) return false;
    if (!growableCell(this.map, x, y)) return false;
    for (const road of this.map.roads) if (distanceToPolyline(x, y, road.points) <= road.width / 2 + 0.5) return false;
    for (const object of this.footprints) if (footprintDistance(object, x, y) < TREE_CLEARANCE) return false;
    for (const tree of this.standing) if (Math.hypot(tree.x - x, tree.y - y) < this.spacing) return false;
    return true;
  }

  /** Scatters trees in the brush circle at (x, y); returns the trees this dab placed. */
  dab(x: number, y: number): ScatteredTree[] {
    const radius = Math.max(0.5, this.options.radius);
    const area = Math.PI * radius * radius;
    const tries = Math.min(240, Math.max(4, Math.ceil((area / (this.spacing * this.spacing)) * 3)));
    const placed: ScatteredTree[] = [];
    for (let attempt = 0; attempt < tries; attempt += 1) {
      const angle = this.random() * Math.PI * 2;
      const reach = Math.sqrt(this.random()) * radius;
      const px = Math.round((x + Math.cos(angle) * reach) * 10) / 10;
      const py = Math.round((y + Math.sin(angle) * reach) * 10) / 10;
      const pick = this.random() * this.total;
      const rotation = Math.round(this.random() * 360) * (Math.PI / 180);
      const scale = Math.round((0.85 + this.random() * 0.3) * 20) / 20;
      if (!this.fits(px, py)) continue;
      let sum = 0;
      const type = this.mix.find((entry) => (sum += entry.weight) > pick)?.type ?? this.mix[0]!.type;
      const tree: ScatteredTree = { type, x: px, y: py, rotation, ...(scale !== 1 ? { scale } : {}) };
      this.standing.push({ x: px, y: py });
      this.trees.push(tree);
      placed.push(tree);
    }
    return placed;
  }
}

/** The ids of the trees standing within `radius` of a point (the eraser). */
export function treesUnder(map: EditableMap, x: number, y: number, radius: number): number[] {
  return map.objects.filter((object) => isTreeObject(object) && Math.hypot(object.x - x, object.y - y) <= radius).map((object) => object.id);
}
