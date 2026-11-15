/**
 * add-artillery-bombardment: the guns a bombardment can call down. One table
 * for the simulation (damage, suppression), the editor (the spread ring is
 * drawn with the spread itself) and the view (burst size).
 *
 * Historical note: the government brought 75 mm field guns and 105 mm
 * howitzers against the rebels in 1924 and 1925 (docs/history/WEAPONS.md,
 * Macaulay pp. 85, 93). The radii are game values at section scale, not
 * ballistic data.
 */
export type GunId = 'field-75' | 'howitzer-105';

export interface GunProfile {
  /** Inside this distance (m) a hit is heavy and likely. */
  lethal: number;
  /** Beyond this distance (m) a burst cannot wound. */
  wound: number;
  /** Beyond this distance (m) a burst does not suppress or shake morale. */
  suppress: number;
  /** The view's burst scale (1 for the field gun). */
  burstScale: number;
}

export const GUN_IDS: readonly GunId[] = ['field-75', 'howitzer-105'];

export const GUNS: Readonly<Record<GunId, GunProfile>> = {
  'field-75': { lethal: 5, wound: 15, suppress: 30, burstScale: 1 },
  'howitzer-105': { lethal: 7, wound: 22, suppress: 40, burstScale: 1.4 },
};

export const isGunId = (value: unknown): value is GunId => value === 'field-75' || value === 'howitzer-105';

/** Seconds (ticks) between a shell's announcement and its landing. */
export const SHELL_FLIGHT_TICKS = 20;
