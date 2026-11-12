import type { CoverKind } from '../protocol';
import type { BuildingModel } from '../world';
import type { GroundMaterialId } from './ground-materials';

/**
 * Everything the map editor places (add-map-editor). Every entry declares
 * its gameplay footprint, so each object changes movement, cover, sight or
 * concealment in the battle; only flat decals are surface-only.
 *
 * - `building`: a building with its building cover.
 * - `solid`: a cover of `cover` kind that blocks movement; its quality comes
 *   from its height and it blocks sight from 1.75 m when 0.5 m wide or more.
 * - `thin`: posts and narrow trunks: block movement, no cover, no sight block.
 * - `foliage`: stamps scrub under its footprint (the concealment rules).
 * - `decal`: paints a ground material under its footprint.
 *
 * A tree is a trunk (`solid` or `thin`) and may add `foliage` with
 * `concealRadius`.
 */
export type ObjectGroup = 'building' | 'stone' | 'tree' | 'post' | 'cover' | 'prop' | 'decal';

export type Footprint =
  | { kind: 'building'; model: BuildingModel }
  | { kind: 'solid'; cover: CoverKind }
  | { kind: 'thin' }
  | { kind: 'foliage' }
  | { kind: 'decal'; material: GroundMaterialId };

export interface CatalogObject {
  id: string;
  group: ObjectGroup;
  nameKey: string;
  /** The model the view draws (a building model, a prop or a placeholder name). */
  model: string;
  halfWidth: number;
  halfDepth: number;
  height: number;
  footprint: Footprint;
  /** Foliage around a trunk that conceals (m); stamps scrub. */
  concealRadius?: number;
  /** Also paints this material under the footprint (lajedo slab). */
  paints?: GroundMaterialId;
  /** biome-trees-and-plants: the biome a tree or plant grows in. */
  biome?: FloraBiome;
  /** The species a form belongs to; the editor shows one tile per species (D5b). */
  species?: string;
  form?: TreeForm;
  /** The model file the view loads it from (`trees-<biome>`), when not the shared environment. */
  modelFile?: string;
  /** A foliage bush's height class: the stances it hides (D4). Waist when unset. */
  bushClass?: BushClass;
  /** Thorns under the footprint slow a man walking through (macambira). */
  thorns?: true;
  /** False: kept out of the editor's lists and the trees tool (the dead and flowering forms wait for the form switch, 4.2). */
  listed?: false;
}

export type FloraBiome = 'mata-atlantica' | 'cerrado' | 'amazonia' | 'caatinga';
export type TreeForm = 'adult' | 'flowering' | 'dead';
/** Knee-high hides only the prone, waist-high the prone and crouched, head-high every stance. */
export type BushClass = 'knee' | 'waist' | 'head';
export const FLORA_BIOMES: readonly FloraBiome[] = ['mata-atlantica', 'cerrado', 'amazonia', 'caatinga'];

const building = (model: BuildingModel, halfWidth: number, halfDepth: number, height: number): CatalogObject => ({
  id: model,
  group: 'building',
  nameKey: `editor.object.${model}`,
  model,
  halfWidth,
  halfDepth,
  height,
  footprint: { kind: 'building', model },
});

const item = (
  id: string,
  group: ObjectGroup,
  halfWidth: number,
  halfDepth: number,
  height: number,
  footprint: Footprint,
  extra: Partial<CatalogObject> = {},
): CatalogObject => ({ id, group, nameKey: `editor.object.${id}`, model: id, halfWidth, halfDepth, height, footprint, ...extra });

const SOLID_STONE: Footprint = { kind: 'solid', cover: 'stone' };
const THIN: Footprint = { kind: 'thin' };
const FOLIAGE: Footprint = { kind: 'foliage' };

interface SpeciesSpec {
  biome: FloraBiome;
  height: number;
  /** Half the trunk's width (m). */
  trunk: number;
  /** A wide trunk is solid: it blocks movement, gives cover and blocks sight (D1). */
  solid?: boolean;
  concealRadius?: number;
  flowering?: boolean;
  /** The adult is an older id (`tree-broad` is the peroba): only the dead form is new here. */
  deadOnly?: boolean;
}

/**
 * biome-trees-and-plants 3.1: a Refloreste species as its forms, each its own
 * model in `trees-<biome>.glb`. The flowering form keeps the adult's
 * footprint; the dead form keeps the trunk and loses the crown's concealment.
 */
function species(name: string, spec: SpeciesSpec): CatalogObject[] {
  const trunk: Footprint = spec.solid ? SOLID_STONE : THIN;
  const base = { biome: spec.biome, species: name, modelFile: `trees-${spec.biome}` };
  const form = (id: string, kind: TreeForm, extra: Partial<CatalogObject> = {}) =>
    item(id, 'tree', spec.trunk, spec.trunk, spec.height, trunk, { ...base, form: kind, ...(kind === 'adult' ? {} : { listed: false as const }), ...extra });
  const conceal = spec.concealRadius ? { concealRadius: spec.concealRadius } : {};
  return [
    ...(spec.deadOnly ? [] : [form(name, 'adult', conceal)]),
    ...(spec.flowering ? [form(`${name}-flowering`, 'flowering', conceal)] : []),
    form(`${name}-dead`, 'dead'),
  ];
}

const BUSH_SIZES: Record<BushClass, { height: number; a: [number, number]; b: [number, number] }> = {
  knee: { height: 0.5, a: [0.55, 0.5], b: [0.8, 0.7] },
  waist: { height: 1, a: [0.9, 0.8], b: [1.2, 1.05] },
  head: { height: 1.8, a: [1.2, 1.1], b: [1.5, 1.35] },
};

/** biome-trees-and-plants 2.6: two bushes of each height class per biome. */
function bushes(biome: FloraBiome): CatalogObject[] {
  return (['knee', 'waist', 'head'] as const).flatMap((size) =>
    (['a', 'b'] as const).map((shape) => {
      const [halfWidth, halfDepth] = BUSH_SIZES[size][shape];
      return item(`bush-${biome}-${size}-${shape}`, 'tree', halfWidth, halfDepth, BUSH_SIZES[size].height, FOLIAGE, {
        biome,
        modelFile: `trees-${biome}`,
        bushClass: size,
      });
    }),
  );
}

const stump = (biome: FloraBiome): CatalogObject =>
  item(`stump-${biome}`, 'tree', 0.25, 0.25, 0.6, { kind: 'solid', cover: 'barrel' }, { biome, modelFile: `trees-${biome}` });

/** A caatinga plant of `trees-caatinga.glb` (target_caatinga.py). */
const caatinga = (id: string, halfWidth: number, halfDepth: number, height: number, footprint: Footprint, extra: Partial<CatalogObject> = {}): CatalogObject =>
  item(id, 'tree', halfWidth, halfDepth, height, footprint, { biome: 'caatinga', species: id, form: 'adult', modelFile: 'trees-caatinga', ...extra });

export const CATALOG_OBJECTS: readonly CatalogObject[] = [
  // Buildings: every model the game draws.
  building('farmhouse', 4.35, 2.85, 4.8),
  building('barn', 5.65, 3.5, 6),
  building('chapel', 3.2, 4.8, 5.2),
  building('casa-sede', 7, 5, 6.5),
  building('colonist-house', 3.6, 3, 4.2),
  building('engenho', 8, 5, 7),
  building('ferry-house', 3.2, 2.6, 3.8),
  building('terraced-house', 3.5, 5, 5),
  building('terraced-house-wide', 5, 5, 5),
  building('sobrado', 5, 6, 8),
  building('factory', 20, 12, 9),
  building('church', 7, 9, 11),
  building('warehouse', 18, 8, 7),
  building('casa-terrea', 4, 5, 4.5),
  building('venda', 5, 6, 5),
  building('armazem', 7, 8, 5.5),
  building('coreto', 3, 3, 4),
  // Stones.
  item('rock-small', 'stone', 0.7, 0.6, 0.6, SOLID_STONE),
  item('boulder', 'stone', 1.2, 1, 1.2, SOLID_STONE),
  item('matacao', 'stone', 2.2, 1.9, 2.2, SOLID_STONE),
  item('outcrop', 'stone', 4, 1.6, 1.8, SOLID_STONE),
  item('lajedo-slab', 'stone', 5, 4, 0.4, SOLID_STONE, { paints: 'lajedo' }),
  item('stone-pile', 'stone', 1.1, 1, 0.9, SOLID_STONE),
  // Trees and plants. Battle scale, no tree over 9 m (biome-trees-and-plants D5c).
  // The older ids are their species' adults, drawn from trees.glb.
  item('tree-broad', 'tree', 0.35, 0.35, 6, SOLID_STONE, { concealRadius: 0, biome: 'mata-atlantica', species: 'peroba', form: 'adult' }),
  item('tree-araucaria', 'tree', 0.3, 0.3, 9, THIN, { biome: 'mata-atlantica', species: 'araucaria', form: 'adult' }),
  item('tree-pine', 'tree', 0.25, 0.25, 9, THIN),
  // 4.5 m (owner 2026-11-12, biome-trees-and-plants: all trees lower beside a soldier, the
  // tallest 9 m; the 2026-11-09 hand check had found 4 m small by the houses).
  item('cerrado-tree', 'tree', 0.2, 0.2, 4.5, THIN, { concealRadius: 1.6, biome: 'cerrado', species: 'pequi', form: 'adult' }),
  item('buriti', 'tree', 0.3, 0.3, 8, THIN, { biome: 'cerrado', species: 'buriti', form: 'adult' }),
  caatinga('juazeiro', 0.35, 0.35, 5, SOLID_STONE, { concealRadius: 2.5 }),
  caatinga('mandacaru', 0.3, 0.3, 4, THIN),
  caatinga('xique-xique', 1.5, 1.5, 1, FOLIAGE),
  caatinga('macambira', 1.2, 1.2, 0.8, FOLIAGE, { thorns: true }),
  item('bush', 'tree', 1.4, 1.4, 1.3, FOLIAGE),
  // Atlantic forest (trees-mata-atlantica.glb).
  ...species('araucaria', { biome: 'mata-atlantica', height: 9, trunk: 0.3, deadOnly: true }),
  ...species('peroba', { biome: 'mata-atlantica', height: 6, trunk: 0.35, solid: true, deadOnly: true }),
  ...species('mulungu', { biome: 'mata-atlantica', height: 6, trunk: 0.25, flowering: true }),
  ...species('jequitiba', { biome: 'mata-atlantica', height: 8.5, trunk: 0.45, solid: true }),
  ...species('manaca', { biome: 'mata-atlantica', height: 4, trunk: 0.15, concealRadius: 1.2, flowering: true }),
  ...species('palmito-jucara', { biome: 'mata-atlantica', height: 6, trunk: 0.15 }),
  ...species('pau-brasil', { biome: 'mata-atlantica', height: 7, trunk: 0.3, flowering: true }),
  stump('mata-atlantica'),
  ...bushes('mata-atlantica'),
  // Cerrado (trees-cerrado.glb): low crooked trees.
  ...species('pequi', { biome: 'cerrado', height: 4.5, trunk: 0.2, deadOnly: true }),
  ...species('buriti', { biome: 'cerrado', height: 8, trunk: 0.3, deadOnly: true }),
  ...species('aroeira', { biome: 'cerrado', height: 5, trunk: 0.2, concealRadius: 1.4 }),
  ...species('barbatimao', { biome: 'cerrado', height: 3, trunk: 0.15, concealRadius: 1.4 }),
  ...species('cagaita', { biome: 'cerrado', height: 3, trunk: 0.15, concealRadius: 1.2 }),
  ...species('ipe', { biome: 'cerrado', height: 6, trunk: 0.25, flowering: true }),
  stump('cerrado'),
  ...bushes('cerrado'),
  // Amazon (trees-amazonia.glb): the widest trunks, buttressed.
  ...species('acai', { biome: 'amazonia', height: 7, trunk: 0.15 }),
  ...species('andiroba', { biome: 'amazonia', height: 8, trunk: 0.4, solid: true }),
  ...species('castanheira', { biome: 'amazonia', height: 8.5, trunk: 0.5, solid: true }),
  ...species('seringueira', { biome: 'amazonia', height: 7.5, trunk: 0.35, solid: true }),
  ...species('sumauma', { biome: 'amazonia', height: 9, trunk: 0.6, solid: true }),
  ...species('tucuma', { biome: 'amazonia', height: 6, trunk: 0.2 }),
  stump('amazonia'),
  ...bushes('amazonia'),
  // Caatinga (trees-caatinga.glb, target_caatinga.py): cacti, thorny trees and the marmeleiro.
  caatinga('facheiro', 0.25, 0.25, 4, THIN),
  caatinga('coroa-de-frade', 0.2, 0.2, 0.4, THIN),
  caatinga('palmatoria', 0.6, 0.3, 2, FOLIAGE),
  caatinga('umbuzeiro', 0.3, 0.3, 4.5, THIN, { concealRadius: 3.5 }),
  caatinga('catingueira', 0.25, 0.25, 4.5, THIN, { concealRadius: 1.5 }),
  caatinga('jurema-preta', 0.2, 0.2, 3.5, THIN, { concealRadius: 2 }),
  ...bushes('caatinga'),
  // Posts.
  item('lamp', 'post', 0.15, 0.15, 3.8, THIN),
  item('telegraph-pole', 'post', 0.15, 0.15, 6, THIN),
  item('flagpole', 'post', 0.1, 0.1, 7, THIN),
  item('hitching-post', 'post', 1.2, 0.1, 1, THIN),
  // Covers.
  item('sandbags', 'cover', 2.8, 0.4, 0.9, { kind: 'solid', cover: 'sandbag' }),
  item('barricade', 'cover', 3, 0.6, 1.2, { kind: 'solid', cover: 'low-wall' }),
  // Props.
  item('cart', 'prop', 1.1, 2, 1.4, { kind: 'solid', cover: 'barrel' }),
  item('well', 'prop', 1, 1, 1, SOLID_STONE),
  item('haystack', 'prop', 1.6, 1.6, 2.2, { kind: 'solid', cover: 'barrel' }),
  item('barrel', 'prop', 0.35, 0.35, 1, { kind: 'solid', cover: 'barrel' }),
  item('crate', 'prop', 0.5, 0.5, 0.8, { kind: 'solid', cover: 'barrel' }),
  item('water-trough', 'prop', 1.5, 0.4, 0.7, SOLID_STONE),
  item('woodpile', 'prop', 1.4, 0.6, 1.1, { kind: 'solid', cover: 'barrel' }),
  item('fallen-log', 'prop', 3, 0.35, 0.6, { kind: 'solid', cover: 'barrel' }),
  // Flat decals.
  item('pebbles', 'decal', 2, 2, 0, { kind: 'decal', material: 'pebbles' }),
  item('leaf-patch', 'decal', 2, 2, 0, { kind: 'decal', material: 'leaf-litter' }),
];

const BY_ID = new Map(CATALOG_OBJECTS.map((entry) => [entry.id, entry]));
const BY_MODEL = new Map(CATALOG_OBJECTS.map((entry) => [entry.model, entry]));

export function catalogObject(id: string): CatalogObject | null {
  return BY_ID.get(id) ?? null;
}

/** What the editor's lists and the trees tool offer. */
export const isListed = (entry: CatalogObject): boolean => entry.listed !== false;

/**
 * biome-trees-and-plants 4.1: the biome model files these placed models
 * need, so a caatinga map never fetches the Atlantic forest's trees.
 */
export function modelFilesOf(models: Iterable<string>): string[] {
  const files = new Set<string>();
  for (const model of models) {
    const file = BY_MODEL.get(model)?.modelFile;
    if (file) files.add(file);
  }
  return [...files].sort();
}

/** Walls and fences, drawn as polylines. */
export type LineKind = 'taipa-wall' | 'stone-wall' | 'brick-wall' | 'wire-fence' | 'board-fence' | 'picket-fence' | 'hedgerow';

export interface LineCatalogEntry {
  kind: LineKind;
  nameKey: string;
  wall: boolean;
  defaultHeight: number;
  /** Half the thickness (m). */
  halfDepth: number;
  /** A hedgerow also conceals (stamps scrub). */
  conceals: boolean;
}

export const LINE_KINDS: readonly LineCatalogEntry[] = [
  { kind: 'taipa-wall', nameKey: 'editor.line.taipa-wall', wall: true, defaultHeight: 1.6, halfDepth: 0.3, conceals: false },
  { kind: 'stone-wall', nameKey: 'editor.line.stone-wall', wall: true, defaultHeight: 1.2, halfDepth: 0.35, conceals: false },
  { kind: 'brick-wall', nameKey: 'editor.line.brick-wall', wall: true, defaultHeight: 2, halfDepth: 0.15, conceals: false },
  { kind: 'wire-fence', nameKey: 'editor.line.wire-fence', wall: false, defaultHeight: 1.2, halfDepth: 0.15, conceals: false },
  { kind: 'board-fence', nameKey: 'editor.line.board-fence', wall: false, defaultHeight: 1.8, halfDepth: 0.1, conceals: false },
  { kind: 'picket-fence', nameKey: 'editor.line.picket-fence', wall: false, defaultHeight: 1, halfDepth: 0.1, conceals: false },
  { kind: 'hedgerow', nameKey: 'editor.line.hedgerow', wall: false, defaultHeight: 1.8, halfDepth: 0.8, conceals: true },
];

export function lineKind(kind: LineKind): LineCatalogEntry {
  const entry = LINE_KINDS.find((line) => line.kind === kind);
  if (!entry) throw new Error(`unknown line kind ${kind}`);
  return entry;
}

/** Cover quality by height, the rule every solid object shares. */
export function solidQuality(height: number): number {
  if (height < 0.9) return 0.3;
  if (height <= 1.2) return 0.4;
  return 0.55;
}

/** Sight blocking: tall enough to hide a standing man and at least 0.5 m across. */
export function solidBlocksSight(height: number, halfWidth: number, halfDepth: number): boolean {
  return height >= 1.75 && Math.min(halfWidth, halfDepth) * 2 >= 0.5;
}
