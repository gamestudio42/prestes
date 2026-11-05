/**
 * Gaits (order-tempo-and-facing): absolute ground speeds in m/s of game time
 * before posture, stance, terrain, cohesion, fatigue, wounds and keeping
 * with the section. 1x is real time, so these are what the player sees.
 */
export type Gait = 'slow' | 'walk' | 'quick' | 'run';

export const GAIT_SPEED: Readonly<Record<Gait, number>> = {
  slow: 1.0,
  walk: 1.5,
  quick: 2.5,
  run: 3.5,
};

/** Fatigue per moving tick, as a multiple of the march rate. */
export const GAIT_FATIGUE: Readonly<Record<Gait, number>> = {
  slow: 1,
  walk: 1,
  quick: 1.3,
  run: 2,
};

/** Posture multiplies the gait. */
export const POSTURE_PACE: Readonly<Record<string, number>> = {
  aggressive: 1.1,
  balanced: 1,
  defensive: 0.8,
  'protect-officer': 1,
};

/** Orders whose gait does not depend on the moment. */
export const ORDER_GAIT: Readonly<Record<string, Gait>> = {
  recon: 'slow',
  move: 'walk',
  defend: 'walk',
  advance: 'walk',
  hold: 'walk',
  rescue: 'walk',
  ambush: 'walk',
  reserve: 'walk',
  disperse: 'walk',
  flank: 'quick',
  regroup: 'quick',
  attack: 'quick',
  pursue: 'quick',
  suppress: 'walk',
  withdraw: 'run',
  flee: 'run',
};

/** A soldier's fitness: his own speed over a rifleman's 2 m/s. */
export const BASE_UNIT_SPEED = 2;

/** Above this fatigue a soldier can only walk, until he falls below WINDED_RECOVER. */
export const WINDED_FATIGUE = 70;
export const WINDED_RECOVER = 50;

/** Speed change per second (m/s²): a soldier eases into his gait and to a stop. */
export const GAIT_ACCELERATION = 3;
