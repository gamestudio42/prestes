import { describe, expect, it } from 'vitest';
import {
  checkDifficultyTable,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_FACTORS,
  resolveDifficulty,
} from '../src/difficulty';

describe('difficulty table (add-difficulty-levels 1.1)', () => {
  it('lists the three levels in order with Soldado as default', () => {
    expect(DIFFICULTIES).toEqual(['historia', 'soldado', 'oficial']);
    expect(DEFAULT_DIFFICULTY).toBe('soldado');
  });

  it('orders every factor in the player favour and keeps neighbours apart', () => {
    expect(checkDifficultyTable()).toEqual([]);
  });

  it('reports a factor out of order and neighbours that do not differ', () => {
    const broken = { ...DIFFICULTY_FACTORS, historia: { ...DIFFICULTY_FACTORS.soldado, enemyAim: 1.2 } };
    const errors = checkDifficultyTable(broken);
    expect(errors.some((error) => error.startsWith('enemyAim'))).toBe(true);
    const same = { ...DIFFICULTY_FACTORS, historia: DIFFICULTY_FACTORS.soldado };
    expect(checkDifficultyTable(same)).toContain('historia and soldado do not differ');
  });

  it('keeps the Oficial reserve at 60 % and the others full', () => {
    expect(DIFFICULTY_FACTORS.oficial.playerReserve).toBe(0.6);
    expect(DIFFICULTY_FACTORS.soldado.playerReserve).toBe(1);
    expect(DIFFICULTY_FACTORS.historia.playerReserve).toBe(1);
  });

  it('falls back to Soldado for an absent or unknown level', () => {
    expect(resolveDifficulty(undefined)).toBe('soldado');
    expect(resolveDifficulty('impossivel')).toBe('soldado');
    expect(resolveDifficulty('oficial')).toBe('oficial');
  });
});
