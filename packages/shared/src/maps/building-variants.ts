import type { BuildingModel } from '../world';

/**
 * revise-buildings-and-stone 3.5 (D3): a building's look. A variant swaps
 * swatches of the environment atlas on the building's model (the wall wash,
 * the roof) and nothing else: the footprint, doors, windows, capacity and
 * cover are the model's, so the battle never reads it. A building with no
 * variant is drawn as modelled.
 */
export type BuildingVariant = 'whitewash' | 'ochre' | 'blue' | 'rose' | 'adobe' | 'zinc';

export const BUILDING_VARIANTS: readonly BuildingVariant[] = ['whitewash', 'ochre', 'blue', 'rose', 'adobe', 'zinc'];

/** The plastered wall washes a wall variant repaints. */
const WALLS = ['plaster', 'plaster.worn', 'wash.ochre', 'wash.blue', 'wash.rose'] as const;
const walls = (to: string): Record<string, string> => Object.fromEntries(WALLS.filter((swatch) => swatch !== to).map((swatch) => [swatch, to]));

/** Atlas swatch to swatch, per variant. */
export const VARIANT_SWATCHES: Readonly<Record<BuildingVariant, Readonly<Record<string, string>>>> = {
  whitewash: walls('plaster'),
  ochre: walls('wash.ochre'),
  blue: walls('wash.blue'),
  rose: walls('wash.rose'),
  // Bare adobe under a run-down roof: the plaster gone, the tiles old.
  adobe: { ...walls('adobe'), tile: 'tile.old' },
  zinc: { tile: 'zinc', 'tile.old': 'zinc' },
};

/** Buildings with no plastered wall to repaint: board, brick, daub, or open. */
const BARE_WALLS: ReadonlySet<BuildingModel> = new Set([
  'barn',
  'factory',
  'depot',
  'water-tank',
  'market-shed',
  'coreto',
  'wattle-house',
  'training-house',
]);

/** Buildings with no tiled roof to turn to zinc: thatch, zinc already, or none. */
const UNTILED_ROOFS: ReadonlySet<BuildingModel> = new Set([
  'armazem',
  'warehouse',
  'depot',
  'ferry-house',
  'wattle-house',
  'rancho',
  'coreto',
  'water-tank',
  'training-house',
]);

/** The variants a building can be given, in the editor's order. */
export function buildingVariants(model: BuildingModel): BuildingVariant[] {
  return BUILDING_VARIANTS.filter((variant) => (variant === 'zinc' ? !UNTILED_ROOFS.has(model) : !BARE_WALLS.has(model)));
}

export function isBuildingVariant(model: BuildingModel, value: unknown): value is BuildingVariant {
  return typeof value === 'string' && buildingVariants(model).includes(value as BuildingVariant);
}
