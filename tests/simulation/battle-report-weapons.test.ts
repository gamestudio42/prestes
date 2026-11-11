import { describe, expect, it } from 'vitest';
import { battleMap, DEFAULT_BATTLE_MAP, loadAuthoredMap } from '../../packages/shared/src';
import { GUN_SET_BAND, MIXED_PLAYER, battleReport } from '../../tools/battle-report';

// machine-gun-fire-feedback 1.1 and 2.4 (battle-lab "Battle feel report"):
// the report counts each side's fire by weapon and the share of the time the
// machine gun had an enemy in sight and reach during which it was set.
/** author-game-maps 3.3: a battle this long (s) or longer is held to the gun's bands. */
const LONG_BATTLE_SECONDS = 600;
/**
 * author-game-maps 3.6 follow-up (user, 2026-11-10): since the bounds keep a
 * man's room, presets A and C end in a 900 s stand-off where the gun has few
 * enemies in sight (5-7 bursts, set 0.71-0.75 of its targeted time). Its burst
 * and set bands wait for objectives to move the column (add-map-objectives 4.1).
 */
const STAND_OFF_UNTIL_OBJECTIVES = new Set([0, 2]);

describe('battle report by weapon', () => {
  it('a roster without a gun reports no gun share', async () => {
    const report = await battleReport(1922, 90);
    expect(report.gunSetShare.column).toBeUndefined();
    expect(report.weapons.column['metralhadora-7mm']).toBeUndefined();
  }, 120_000);

  // author-game-maps 3.3: the test map's three enemy presets.
  for (const force of [0, 1, 2]) {
    const map = DEFAULT_BATTLE_MAP;
    it(`${map}, enemy ${String.fromCharCode(65 + force)}: the gun is listed and set while it has a target`, async () => {
      await loadAuthoredMap(map);
      const enemy = battleMap(map).enemyForces![force]!;
      const report = await battleReport(1922, 900, map, { column: MIXED_PLAYER, legalist: enemy });
      // author-game-maps 3.6 follow-up (orders plan against seen enemies only):
      // preset B is won at 579 s before the gun ever has an enemy in sight and
      // reach. A gun that never had a target is not held to fire.
      if (report.gunSetShare.column === undefined) {
        expect(report.outcome, JSON.stringify(report)).not.toBe('none');
        return;
      }
      const gun = report.weapons.column['metralhadora-7mm'];
      expect(gun, JSON.stringify(report.weapons)).toBeDefined();
      expect(gun!.rounds).toBeGreaterThanOrEqual(gun!.bursts);
      expect(gun!.hits).toBeLessThanOrEqual(gun!.rounds);
      // author-game-maps 3.3 (user, 2026-11-10): the fire bands hold only in a
      // battle that lasts; a battle decided early gives the gun too few targets.
      const long = report.seconds >= LONG_BATTLE_SECONDS && !STAND_OFF_UNTIL_OBJECTIVES.has(force);
      if (long) expect(gun!.bursts).toBeGreaterThanOrEqual(10);
      // Aimed fire: one burst per round.
      const rifles = report.weapons.column['mauser-7mm']!;
      expect(rifles.bursts).toBe(rifles.rounds);
      if (long) expect(report.gunSetShare.column).toBeGreaterThanOrEqual(GUN_SET_BAND);
    }, 300_000);
  }
});
