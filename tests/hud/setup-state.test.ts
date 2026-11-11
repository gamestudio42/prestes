import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { battleMap, DEFAULT_BATTLE_MAP, DEFAULT_TIME_LIMIT, loadAuthoredMap, registerBattleMap, unregisterBattleMap } from '../../packages/shared/src';
import { TEST_MAP } from '../../packages/shared/test/fixtures/test-map';
import { battleRosters, defaultSetup, parseSetup, setupReady, withMap } from '../../apps/game/src/ui/menu/setupState';

// pre-battle-roster 5.5, 5.6: the setup screen's saved choices and what they field.
// author-game-maps 3.6: on the test map (with presets) and the test field (registered, no presets).
const PROVING = DEFAULT_BATTLE_MAP;
const FIELD = TEST_MAP.id;
beforeAll(async () => {
  await loadAuthoredMap(PROVING);
  registerBattleMap(TEST_MAP);
});
afterAll(() => unregisterBattleMap(FIELD));

describe('skirmish setup state', () => {
  it('falls back to the default for missing or broken saved data', () => {
    expect(parseSetup(null)).toEqual(defaultSetup());
    expect(parseSetup('not json')).toEqual(defaultSetup());
    expect(parseSetup(JSON.stringify({ map: 'atlantis', roster: { sections: ['lanceiros'] } }))).toEqual(defaultSetup());
    // A refused roster (two machine guns) is not offered again.
    expect(parseSetup(JSON.stringify({ map: PROVING, roster: { sections: ['metralhadora', 'metralhadora'] } })).roster).toEqual(defaultSetup().roster);
  });

  it('keeps a valid saved setup', () => {
    const saved = { map: PROVING, roster: { sections: ['comando', 'metralhadora'] }, enemy: { kind: 'preset', index: 2 }, timeLimit: 18000 };
    expect(parseSetup(JSON.stringify(saved))).toEqual(saved);
    const built = { map: FIELD, roster: { sections: ['irregulares'] }, enemy: { kind: 'built', roster: { sections: ['fuzileiros'] } }, timeLimit: DEFAULT_TIME_LIMIT };
    expect(parseSetup(JSON.stringify(built))).toEqual(built);
    // A preset index the map does not have falls back to "Sorteado".
    expect(parseSetup(JSON.stringify({ ...saved, enemy: { kind: 'preset', index: 9 } })).enemy).toEqual({ kind: 'drawn' });
    // add-map-objectives 3.3: only a game time limit is kept.
    expect(parseSetup(JSON.stringify({ ...saved, timeLimit: 5 })).timeLimit).toBe(DEFAULT_TIME_LIMIT);
  });

  it('fields the enemy the setup chose', () => {
    const base = { ...defaultSetup(), map: PROVING };
    expect(battleRosters(base)).toEqual({ column: base.roster });
    expect(battleRosters({ ...base, enemy: { kind: 'preset', index: 2 } }).legalist).toEqual(battleMap(PROVING).enemyForces![2]);
    expect(battleRosters({ ...base, enemy: { kind: 'built', roster: { sections: ['esquadra-4'] } } }).legalist).toEqual({ sections: ['esquadra-4'] });
  });

  it('a new map resets a chosen preset and keeps a built enemy', () => {
    const preset = { ...defaultSetup(), map: PROVING, enemy: { kind: 'preset' as const, index: 1 } };
    expect(withMap(preset, FIELD).enemy).toEqual({ kind: 'drawn' });
    const built = { ...preset, enemy: { kind: 'built' as const, roster: { sections: ['fuzileiros' as const] } } };
    expect(withMap(built, FIELD).enemy).toEqual(built.enemy);
  });

  it('cannot start with an empty force or an empty built enemy', () => {
    expect(setupReady(defaultSetup())).toBe(true);
    expect(setupReady({ ...defaultSetup(), roster: { sections: [] } })).toBe(false);
    expect(setupReady({ ...defaultSetup(), enemy: { kind: 'built', roster: { sections: [] } } })).toBe(false);
  });
});
