/**
 * The three battle map sizes (add-map-editor): square, centred on the
 * origin, side in metres.
 */
export type MapSize = 'small' | 'medium' | 'large';

export const MAP_SIZES: readonly MapSize[] = ['small', 'medium', 'large'];

export const MAP_SIZE_METRES: Readonly<Record<MapSize, number>> = {
  small: 240,
  medium: 400,
  large: 640,
};

export function boundsForSize(size: MapSize): { minX: number; minY: number; maxX: number; maxY: number } {
  const half = MAP_SIZE_METRES[size] / 2;
  return { minX: -half, minY: -half, maxX: half, maxY: half };
}

/** The size whose side matches `side` metres, or null. */
export function sizeOfSide(side: number): MapSize | null {
  return MAP_SIZES.find((size) => MAP_SIZE_METRES[size] === side) ?? null;
}
