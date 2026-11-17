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

/**
 * scale-forces-by-map-size: the size a map's bounds hold, the smallest size
 * at least as wide as the map's longer side (a hand-written map need not be
 * square). Its force limits are that size's.
 */
export function sizeOfBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }): MapSize {
  const side = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  return MAP_SIZES.find((size) => MAP_SIZE_METRES[size] >= side - 0.5) ?? 'large';
}
