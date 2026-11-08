import type { TerrainSurface } from '../terrain';

/**
 * The ground materials the editor's texture brush paints (add-map-editor).
 * The order is the paint raster's code (index) and the tile's place in the
 * ground atlas (5 columns × 6 rows), so new materials go at the end.
 * Two kinds: detailed tiles (grass blades, cracks, pebbles) and basic ones,
 * near-flat colours for large areas and finishing, so the map stays calm.
 */
export type GroundMaterialId =
  | 'grass'
  | 'dry-grass'
  | 'packed-earth'
  | 'red-earth'
  | 'mud'
  | 'sand'
  | 'gravel'
  | 'stone'
  | 'cobbles'
  | 'quintal-floor'
  | 'leaf-litter'
  | 'field-soil'
  // The biomes the column crossed: the cerrado and the Nordeste caatinga.
  | 'cerrado-red-soil'
  | 'cerrado-grass'
  | 'cerrado-litter'
  | 'caatinga-soil'
  | 'caatinga-dry-grass'
  | 'lajedo'
  | 'pebbles'
  // Basic colours: near-flat tiles for large areas and finishing.
  | 'basic-green'
  | 'basic-dark-green'
  | 'basic-olive'
  | 'basic-straw'
  | 'basic-brown'
  | 'basic-red'
  | 'basic-ochre'
  | 'basic-grey'
  | 'basic-dark-brown'
  | 'basic-pale';

export type GroundMaterialKind = 'basic' | 'detailed';

export interface GroundMaterial {
  id: GroundMaterialId;
  /** The gameplay surface: speed and cover come from it. */
  surface: TerrainSurface;
  /** Locale key of the material's name. */
  nameKey: string;
  /** Mean colour of the tile, for previews and the 2D overview. */
  color: number;
  /** Basic (near-flat colour) or detailed (pixel-art pattern); the palette groups them. */
  kind: GroundMaterialKind;
}

const detailed = (id: GroundMaterialId, surface: TerrainSurface, color: number): GroundMaterial => ({ id, surface, nameKey: `editor.material.${id}`, color, kind: 'detailed' });
const basic = (id: GroundMaterialId, surface: TerrainSurface, color: number): GroundMaterial => ({ id, surface, nameKey: `editor.material.${id}`, color, kind: 'basic' });

export const GROUND_MATERIALS: readonly GroundMaterial[] = [
  detailed('grass', 'grass', 0x6f9a48),
  detailed('dry-grass', 'pasture', 0xa8a057),
  detailed('packed-earth', 'dirt-road', 0x9c7b52),
  detailed('red-earth', 'dirt-road', 0xa35a36),
  detailed('mud', 'mud', 0x5e4a33),
  detailed('sand', 'sand', 0xd2bd88),
  detailed('gravel', 'dirt-road', 0x9a948a),
  detailed('stone', 'ridge', 0x7f7c76),
  detailed('cobbles', 'cobbles', 0x85807a),
  detailed('quintal-floor', 'floor', 0xb08c63),
  detailed('leaf-litter', 'grass', 0x6d5a32),
  detailed('field-soil', 'crop', 0x7a5a3a),
  detailed('cerrado-red-soil', 'dirt-road', 0xb0603a),
  detailed('cerrado-grass', 'pasture', 0xa39a52),
  detailed('cerrado-litter', 'pasture', 0x8a7444),
  detailed('caatinga-soil', 'dirt-road', 0xc2a982),
  detailed('caatinga-dry-grass', 'pasture', 0xb8ad83),
  detailed('lajedo', 'ridge', 0x8f8a80),
  detailed('pebbles', 'sand', 0xa9a092),
  basic('basic-green', 'grass', 0x6a8a4a),
  basic('basic-dark-green', 'grass', 0x4c6a3a),
  basic('basic-olive', 'pasture', 0x8f8a52),
  basic('basic-straw', 'pasture', 0xb5aa7e),
  basic('basic-brown', 'dirt-road', 0x8c6e4c),
  basic('basic-red', 'dirt-road', 0x9e5c3c),
  basic('basic-ochre', 'sand', 0xc2a46e),
  basic('basic-grey', 'ridge', 0x83807a),
  basic('basic-dark-brown', 'mud', 0x5a4632),
  basic('basic-pale', 'sand', 0xd3c6a4),
];

/** The ground atlas: 5 columns × 6 rows of 32 px tiles, in material order. */
export const GROUND_ATLAS = { columns: 5, rows: 6, tile: 32, metresPerTile: 2 } as const;

export const GROUND_MATERIAL_IDS: readonly GroundMaterialId[] = GROUND_MATERIALS.map((material) => material.id);

export function groundMaterialIndex(id: GroundMaterialId): number {
  const index = GROUND_MATERIAL_IDS.indexOf(id);
  if (index < 0) throw new Error(`unknown ground material ${id}`);
  return index;
}

export function groundMaterial(index: number): GroundMaterial {
  return GROUND_MATERIALS[index] ?? GROUND_MATERIALS[0]!;
}
