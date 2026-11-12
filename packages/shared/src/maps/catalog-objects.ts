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
}

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
  // Trees and plants (cerrado, mata, caatinga). Battle scale, no tree over 9 m (biome-trees-and-plants D5c).
  item('tree-broad', 'tree', 0.35, 0.35, 6, { kind: 'solid', cover: 'stone' }, { concealRadius: 0 }),
  item('tree-araucaria', 'tree', 0.3, 0.3, 9, THIN),
  item('tree-pine', 'tree', 0.25, 0.25, 9, THIN),
  // 4.5 m (owner 2026-11-12, biome-trees-and-plants: all trees lower beside a soldier, the
  // tallest 9 m; the 2026-11-09 hand check had found 4 m small by the houses).
  item('cerrado-tree', 'tree', 0.2, 0.2, 4.5, THIN, { concealRadius: 1.6 }),
  item('buriti', 'tree', 0.3, 0.3, 8, THIN),
  item('juazeiro', 'tree', 0.35, 0.35, 6, { kind: 'solid', cover: 'stone' }, { concealRadius: 2.5 }),
  item('mandacaru', 'tree', 0.3, 0.3, 4, THIN),
  item('xique-xique', 'tree', 1.5, 1.5, 1.1, { kind: 'foliage' }),
  item('macambira', 'tree', 1.2, 1.2, 0.8, { kind: 'foliage' }),
  item('bush', 'tree', 1.4, 1.4, 1.3, { kind: 'foliage' }),
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

export function catalogObject(id: string): CatalogObject | null {
  return BY_ID.get(id) ?? null;
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
