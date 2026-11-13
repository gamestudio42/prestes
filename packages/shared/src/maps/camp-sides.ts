import { catalogObject } from './catalog-objects';

/**
 * revise-buildings-and-stone 5.2 (D11): the camp is the Column's and the
 * government's. A camp object is drawn as the Column had it unless it is set
 * to the government's side, where the sources show a difference: issue
 * canvas against the Column's worn and patched tents and ponchos, painted
 * issue ammunition boxes against requisitioned ones. The side is drawing
 * only (a swatch swap, like a building's look); the battle never reads it.
 */
export type CampSide = 'column' | 'legalist';

export const CAMP_SIDES: readonly CampSide[] = ['column', 'legalist'];

/** The camp objects drawn per side. */
export const SIDED_CAMP: readonly string[] = ['ridge-tent', 'bell-tent', 'poncho-lean-to', 'ammo-boxes', 'supply-cart'];

/** The government's swatches over the Column's. */
export const CAMP_SIDE_SWATCHES: Readonly<Record<string, string>> = {
  'canvas.worn': 'canvas.army',
  crate: 'crate.army',
};

/** The government's side on a sided camp object; the Column's is unset. */
export function isCampSide(type: string, value: unknown): value is 'legalist' {
  return SIDED_CAMP.includes(type) && catalogObject(type)?.group === 'camp' && value === 'legalist';
}
