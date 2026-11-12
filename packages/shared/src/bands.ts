import { PINNED_SUPPRESSION, SUPPRESSION_THRESHOLD } from './morale';

/**
 * troop-thumbnails-and-panel 3.3: the named bands of a section's condition,
 * read by the troop panel's gauges and, where the simulation acts on them,
 * by the simulation too, so the two cannot drift apart. Morale's bands are
 * the simulation's morale states (`moraleStateFor`).
 */

/** The simulation counts a man "in cover" from here (stance, rallying, flanking spots). */
export const IN_COVER = 0.25;
/** Good cover: half the fire stopped (a man prone in a trench, at a loophole). */
export const GOOD_COVER = 0.5;

export type CoverBand = 'none' | 'light' | 'good';

export function coverBand(cover: number): CoverBand {
  if (cover >= GOOD_COVER) return 'good';
  if (cover >= IN_COVER) return 'light';
  return 'none';
}

export type SuppressionBand = 'calm' | 'under-fire' | 'pinned-down';

/** The simulation's own lines: suppressed from SUPPRESSION_THRESHOLD, pinned from PINNED_SUPPRESSION. */
export function suppressionBand(suppression: number): SuppressionBand {
  if (suppression >= PINNED_SUPPRESSION) return 'pinned-down';
  if (suppression >= SUPPRESSION_THRESHOLD) return 'under-fire';
  return 'calm';
}

/**
 * The simulation has no cohesion threshold: a man's cohesion tends to
 * 100 - (d - 3) x 10 for d metres to his nearest mate. The bands are read
 * from that rule: close within 6 m (70 and up), loose to 9 m, then scattered.
 */
export const COHESION_CLOSE = 70;
export const COHESION_LOOSE = 40;

export type CohesionBand = 'close' | 'loose' | 'scattered';

export function cohesionBand(cohesion: number): CohesionBand {
  if (cohesion >= COHESION_CLOSE) return 'close';
  if (cohesion >= COHESION_LOOSE) return 'loose';
  return 'scattered';
}
