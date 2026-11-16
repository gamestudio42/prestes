/**
 * add-difficulty-levels D1: the three levels and the one table where they
 * differ. Every factor multiplies (or, for the counterattack ratio, replaces)
 * a constant of the simulation whose value before this change is the 1.0
 * baseline.
 */
export type Difficulty = 'historia' | 'soldado' | 'oficial';

export const DIFFICULTIES: readonly Difficulty[] = ['historia', 'soldado', 'oficial'];

export const DEFAULT_DIFFICULTY: Difficulty = 'soldado';

export interface DifficultyFactors {
  /** × the hit chance of the enemy side's shots (aimed and area). */
  readonly enemyAim: number;
  /** × the enemy commander's review interval (higher is slower). */
  readonly commanderThinkEvery: number;
  /** The fit-soldier ratio at which the enemy commander counterattacks. */
  readonly commanderAdvantage: number;
  /** × the force the commander sends to retake a lost objective; 0 never retakes. */
  readonly commanderRetake: number;
  /** × how long before the end the commander's last-minutes push starts (higher is earlier). */
  readonly commanderLastMinutes: number;
  /** × every morale loss of the player's side. */
  readonly playerMoraleLoss: number;
  /** × the rally rates of the player's side. */
  readonly playerRally: number;
  /** × the player's side's reserve, after the section type's own factor. */
  readonly playerReserve: number;
}

export const DIFFICULTY_FACTORS: Readonly<Record<Difficulty, DifficultyFactors>> = {
  // add-difficulty-levels 4.3: tuned on the casualty exchange (design D6).
  historia: {
    enemyAim: 0.6,
    commanderThinkEvery: 2,
    commanderAdvantage: 2,
    commanderRetake: 0,
    commanderLastMinutes: 0.5,
    playerMoraleLoss: 0.6,
    playerRally: 1.6,
    playerReserve: 1,
  },
  soldado: {
    enemyAim: 0.95,
    commanderThinkEvery: 1.2,
    commanderAdvantage: 1.55,
    commanderRetake: 1,
    commanderLastMinutes: 1,
    playerMoraleLoss: 1,
    playerRally: 1,
    playerReserve: 1,
  },
  oficial: {
    enemyAim: 1.3,
    commanderThinkEvery: 0.5,
    commanderAdvantage: 1.1,
    commanderRetake: 1.5,
    commanderLastMinutes: 1.5,
    playerMoraleLoss: 1.3,
    playerRally: 0.6,
    playerReserve: 0.6,
  },
};

/**
 * For each factor, whether a higher value favours the player. Used by the
 * ordering check: História at least as favourable as Soldado, Soldado at
 * least as favourable as Oficial.
 */
export const FACTOR_FAVOURS_PLAYER_WHEN_HIGHER: Readonly<Record<keyof DifficultyFactors, boolean>> = {
  enemyAim: false,
  commanderThinkEvery: true,
  commanderAdvantage: true,
  commanderRetake: false,
  commanderLastMinutes: false,
  playerMoraleLoss: false,
  playerRally: true,
  playerReserve: true,
};

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}

/** The level a battle is fought at: the given one, or Soldado. */
export function resolveDifficulty(value: unknown): Difficulty {
  return isDifficulty(value) ? value : DEFAULT_DIFFICULTY;
}

/** Problems with the table's ordering (empty when sound). */
export function checkDifficultyTable(table: Readonly<Record<Difficulty, DifficultyFactors>> = DIFFICULTY_FACTORS): string[] {
  const errors: string[] = [];
  const keys = Object.keys(FACTOR_FAVOURS_PLAYER_WHEN_HIGHER) as (keyof DifficultyFactors)[];
  for (let i = 0; i + 1 < DIFFICULTIES.length; i++) {
    const easier = table[DIFFICULTIES[i]!];
    const harder = table[DIFFICULTIES[i + 1]!];
    let differs = false;
    for (const key of keys) {
      const higher = FACTOR_FAVOURS_PLAYER_WHEN_HIGHER[key];
      const ok = higher ? easier[key] >= harder[key] : easier[key] <= harder[key];
      if (!ok) errors.push(`${key}: ${DIFFICULTIES[i]} is less favourable than ${DIFFICULTIES[i + 1]}`);
      if (easier[key] !== harder[key]) differs = true;
    }
    if (!differs) errors.push(`${DIFFICULTIES[i]} and ${DIFFICULTIES[i + 1]} do not differ`);
  }
  return errors;
}
