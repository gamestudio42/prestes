import { describe, expect, it } from 'vitest';
import { difficultyFailure, judgeLevels, type LevelResult } from '../../tools/check-difficulty';

/** Twenty battles whose casualties sum to `column` against `legalist`, `wins` of them won. */
const battles = (column: number, legalist: number, wins = 10) =>
  Array.from({ length: 20 }, (_, index) => ({
    outcome: index < wins ? 'victory' : index % 2 === 0 ? 'defeat' : 'draw',
    casualties: { column: index === 0 ? column : 0, legalist: index === 0 ? legalist : 0 },
  }));

const results = (historia: number, soldado: number, oficial: number, wins = 10): LevelResult[] => [
  { difficulty: 'historia', battles: battles(historia * 100, 100, wins) },
  { difficulty: 'soldado', battles: battles(soldado * 100, 100, wins) },
  { difficulty: 'oficial', battles: battles(oficial * 100, 100, wins) },
];

describe('difficulty check bands (add-difficulty-levels 4.2)', () => {
  it('Levels within their bands: the exchanges rise and the check passes', () => {
    const verdicts = judgeLevels(results(0.7, 1, 1.35));
    expect(verdicts.map((verdict) => verdict.ok)).toEqual([true, true, true]);
    expect(difficultyFailure(verdicts)).toBeNull();
  });

  it('A level drifts: Oficial at 1.05 fails and is named with its exchange', () => {
    const failure = difficultyFailure(judgeLevels(results(0.7, 0.95, 1.05)));
    expect(failure).toContain('oficial exchange 1.05');
    expect(failure).not.toContain('historia');
  });

  it('fails when the exchanges do not rise, even within the bands', () => {
    const failure = difficultyFailure(judgeLevels(results(0.7, 1.15, 0.9)));
    expect(failure).toContain('oficial');
  });

  it('Win rate is information: no wins at all does not fail the check', () => {
    const verdicts = judgeLevels(results(0.7, 1, 1.35, 0));
    expect(verdicts.every((verdict) => verdict.wins === 0)).toBe(true);
    expect(difficultyFailure(verdicts)).toBeNull();
  });
});
