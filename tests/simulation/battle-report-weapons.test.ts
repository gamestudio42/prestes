import { describe, expect, it } from 'vitest';
import { battleMap } from '../../packages/shared/src';
import { GUN_SET_BAND, MIXED_PLAYER, battleReport } from '../../tools/battle-report';

// machine-gun-fire-feedback 1.1 and 2.4 (battle-lab "Battle feel report"):
// the report counts each side's fire by weapon and the share of the time the
// machine gun had an enemy in sight and reach during which it was set.
describe('battle report by weapon', () => {
  it('a roster without a gun reports no gun share', async () => {
    const report = await battleReport(1922, 90);
    expect(report.gunSetShare.column).toBeUndefined();
    expect(report.weapons.column['metralhadora-7mm']).toBeUndefined();
  }, 120_000);

  for (const [map, force] of [['vila-militar', 0], ['fazenda', 1], ['bairro', 1]] as const) {
    it(`${map}, enemy ${String.fromCharCode(65 + force)}: the gun is listed and set while it has a target`, async () => {
      const enemy = battleMap(map).enemyForces![force]!;
      const report = await battleReport(1922, 900, map, { column: MIXED_PLAYER, legalist: enemy });
      const gun = report.weapons.column['metralhadora-7mm'];
      expect(gun, JSON.stringify(report.weapons)).toBeDefined();
      expect(gun!.rounds).toBeGreaterThanOrEqual(gun!.bursts);
      expect(gun!.hits).toBeLessThanOrEqual(gun!.rounds);
      // garrison-and-assault (user, 2026-11-09): on the Bairro the battle stalls on the enemy
      // garrison and the gun finds fewer targets; the burst count waits for add-map-objectives 4.1.
      if (map !== 'bairro') expect(gun!.bursts).toBeGreaterThanOrEqual(10);
      // Aimed fire: one burst per round.
      const rifles = report.weapons.column['mauser-7mm']!;
      expect(rifles.bursts).toBe(rifles.rounds);
      expect(report.gunSetShare.column).toBeGreaterThanOrEqual(GUN_SET_BAND);
    }, 300_000);
  }
});
