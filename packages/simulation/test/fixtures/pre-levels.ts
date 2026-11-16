import type { DifficultyFactors } from '@prestes/shared';

/**
 * add-difficulty-levels 4.4: the balance before the levels (every factor at
 * its 1.0 baseline, the 1.4 counterattack ratio). Tests of emergent behaviour
 * that were tuned to it pin it here instead of following a level's tuning.
 */
export const PRE_LEVEL_FACTORS: DifficultyFactors = {
  enemyAim: 1,
  commanderThinkEvery: 1,
  commanderAdvantage: 1.4,
  commanderRetake: 1,
  commanderLastMinutes: 1,
  playerMoraleLoss: 1,
  playerRally: 1,
  playerReserve: 1,
};
