import { sectionRoutes as sharedSectionRoutes } from '@prestes/shared';
import type { Vec2 } from '@prestes/shared';
import type { MutableUnit } from './model';
import type { SimContext } from './context';

export { routeFor } from '@prestes/shared';

/** The section routes of `@prestes/shared` (route-around-wire D5) on the context's covers. */
export function sectionRoutes(
  ctx: SimContext,
  units: readonly MutableUnit[],
  destinations: readonly Vec2[],
): (Vec2[] | null)[] {
  return sharedSectionRoutes(ctx.covers, units, destinations);
}
