import type { FogExtras, Vec2 } from '@prestes/shared';

/** A click this close to a "?" marker picks it, however small its ring (m). */
export const MARKER_PICK_MIN = 3;
/** A click this close to a ghost picks it (m). */
export const GHOST_PICK = 1.5;

/**
 * scrub-concealment-and-area-fire: the suspected contact a click picks for
 * Area fire: a "?" marker whose ring holds the point, or a ghost under it,
 * the nearest first. Null when the click is on neither.
 */
export function pickSuspectedContact(view: FogExtras | null | undefined, point: Vec2): Vec2 | null {
  let best: Vec2 | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const consider = (x: number, y: number, reach: number) => {
    const distance = (x - point.x) ** 2 + (y - point.y) ** 2;
    if (distance > reach * reach || distance >= bestDistance) return;
    best = { x, y };
    bestDistance = distance;
  };
  for (const marker of view?.markers ?? []) consider(marker.x, marker.y, Math.max(MARKER_PICK_MIN, marker.radius));
  for (const ghost of view?.ghosts ?? []) consider(ghost.x, ghost.y, GHOST_PICK);
  return best;
}

/** Whether the view shows any suspected contact to fire at. */
export function hasSuspectedContact(view: FogExtras | null | undefined): boolean {
  return (view?.markers?.length ?? 0) > 0 || (view?.ghosts?.length ?? 0) > 0;
}
