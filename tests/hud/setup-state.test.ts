import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { battleMap, canAdd, DEFAULT_BATTLE_MAP, DEFAULT_TIME_LIMIT, loadAuthoredMap, registerBattleMap, unregisterBattleMap, validateRoster } from '../../packages/shared/src';
import { TEST_MAP } from '../../packages/shared/test/fixtures/test-map';
import { battleRosters, builtEnemy, defaultSetup, parseSetup, saveSetup, setupReady, withMap } from '../../apps/game/src/ui/menu/setupState';

// pre-battle-roster 5.5, 5.6: the setup screen's saved choices and what they field.
// author-game-maps 3.6: on the test map (with presets) and the test field (registered, no presets).
const PROVING = DEFAULT_BATTLE_MAP;
const FIELD = TEST_MAP.id;
beforeAll(async () => {
  await loadAuthoredMap(PROVING);
  registerBattleMap(TEST_MAP);
});
afterAll(() => unregisterBattleMap(FIELD));
/** The test field cut to a small map's 240 m. */
const SMALL = { ...TEST_MAP, id: 'test-small' as typeof TEST_MAP.id, bounds: { minX: -120, minY: -120, maxX: 120, maxY: 120 } };

describe('skirmish setup state', () => {
  it('falls back to the default for missing or broken saved data', () => {
    expect(parseSetup(null)).toEqual(defaultSetup());
    expect(parseSetup('not json')).toEqual(defaultSetup());
    // An unknown id is replaced by the army's rifle section and the screen says so (faction-armies 4.3).
    expect(parseSetup(JSON.stringify({ map: 'atlantis', roster: { sections: ['lanceiros'] } }))).toEqual({ ...defaultSetup(), roster: { sections: ['fuzileiros'] }, migrated: true });
    // A roster no map size takes (two command sections) is not offered again.
    expect(parseSetup(JSON.stringify({ map: PROVING, roster: { sections: ['comando', 'comando'] } })).roster).toEqual(defaultSetup().roster);
  });

  // scale-forces-by-map-size 3.1: a roster is judged by its map's size.
  it('a roster over a small map is kept and waits; a medium map starts it', () => {
    registerBattleMap(SMALL);
    try {
      const four = { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros', 'fuzileiros'] as const };
      const medium = parseSetup(JSON.stringify({ map: PROVING, roster: four }));
      expect(medium.roster).toEqual(four);
      expect(setupReady(medium)).toBe(true);
      const small = withMap(medium, SMALL.id);
      expect(small.roster).toEqual(four);
      expect(setupReady(small)).toBe(false);
      expect(parseSetup(JSON.stringify({ map: SMALL.id, roster: four })).roster).toEqual(four);
    } finally {
      unregisterBattleMap(SMALL.id);
    }
  });

  it('keeps a valid saved setup', () => {
    const saved = { map: PROVING, roster: { sections: ['comando', 'metralhadora'] }, enemy: { kind: 'preset', index: 2 }, timeLimit: 18000, difficulty: 'oficial' };
    expect(parseSetup(JSON.stringify(saved))).toEqual(saved);
    const built = { map: FIELD, roster: { sections: ['irregulares'] }, enemy: { kind: 'built', army: 'legalista', roster: { sections: ['infantaria-exercito'] } }, timeLimit: DEFAULT_TIME_LIMIT, difficulty: 'historia' };
    expect(parseSetup(JSON.stringify(built))).toEqual(built);
    // A preset index the map does not have falls back to "Sorteado".
    expect(parseSetup(JSON.stringify({ ...saved, enemy: { kind: 'preset', index: 9 } })).enemy).toEqual({ kind: 'drawn' });
    // add-map-objectives 3.3: only a game time limit is kept.
    expect(parseSetup(JSON.stringify({ ...saved, timeLimit: 5 })).timeLimit).toBe(DEFAULT_TIME_LIMIT);
  });

  it('add-difficulty-levels 3.1: Level remembered; Older saved setup offers Soldado and keeps the rest', () => {
    const saved = { map: PROVING, roster: { sections: ['comando', 'metralhadora'] }, enemy: { kind: 'drawn' }, timeLimit: 18000 };
    const older = parseSetup(JSON.stringify(saved));
    expect(older).toEqual({ ...saved, difficulty: 'soldado' });
    expect(parseSetup(JSON.stringify({ ...saved, difficulty: 'impossivel' })).difficulty).toBe('soldado');
    expect(defaultSetup().difficulty).toBe('soldado');
    const store = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) } });
    try {
      saveSetup({ ...older, difficulty: 'historia' });
      expect(parseSetup([...store.values()][0]!).difficulty).toBe('historia');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fields the enemy the setup chose', () => {
    const base = { ...defaultSetup(), map: PROVING };
    expect(battleRosters(base)).toEqual({ column: base.roster });
    expect(battleRosters({ ...base, enemy: { kind: 'preset', index: 2 } }).legalist).toEqual(battleMap(PROVING).enemyForces![2]);
    expect(battleRosters({ ...base, enemy: { kind: 'built', army: 'legalista', roster: { sections: ['fuzil-metralhador-legalista'] } } }).legalist).toEqual({ sections: ['fuzil-metralhador-legalista'] });
  });

  it('a new map resets a chosen preset and keeps a built enemy', () => {
    const preset = { ...defaultSetup(), map: PROVING, enemy: { kind: 'preset' as const, index: 1 } };
    expect(withMap(preset, FIELD).enemy).toEqual({ kind: 'drawn' });
    const built = { ...preset, enemy: { kind: 'built' as const, army: 'legalista' as const, roster: { sections: ['infantaria-exercito' as const] } } };
    expect(withMap(built, FIELD).enemy).toEqual(built.enemy);
  });

  it('cannot start with an empty force or an empty built enemy', () => {
    expect(setupReady(defaultSetup())).toBe(true);
    expect(setupReady({ ...defaultSetup(), roster: { sections: [] } })).toBe(false);
    expect(setupReady({ ...defaultSetup(), enemy: { kind: 'built', army: 'legalista', roster: { sections: [] } } })).toBe(false);
  });

  // faction-armies 4.3: stored rosters from before the armies are migrated.
  it('migrates an old stored setup', () => {
    const old = { roster: { sections: ['fuzileiros', 'irregulares'] }, enemy: { kind: 'built', roster: { sections: ['fuzileiros', 'metralhadora'] } } };
    const setup = parseSetup(JSON.stringify(old));
    expect(setup.roster).toEqual({ sections: ['fuzileiros', 'irregulares'] });
    expect(setup.enemy).toEqual({ kind: 'built', army: 'legalista', roster: { sections: ['infantaria-exercito', 'metralhadora-legalista'] } });
    const unknown = parseSetup(JSON.stringify({ roster: { sections: ['fuzileiros', 'lanceiros'] } }));
    expect(unknown.migrated).toBe(true);
  });

  it('does not save the migration flag', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) },
    });
    try {
      saveSetup({ ...defaultSetup(), migrated: true });
      const saved = [...store.values()][0] ?? '';
      expect(saved).not.toBe('');
      expect(JSON.parse(saved)).not.toHaveProperty('migrated');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('a built patriotic enemy refuses a legalist type', () => {
    const enemy = builtEnemy('patriotico');
    expect(enemy.kind === 'built' && enemy.army).toBe('patriotico');
    if (enemy.kind !== 'built') return;
    expect(validateRoster(enemy.roster, 'patriotico').refusals).toEqual([]);
    expect(canAdd(enemy.roster, 'infantaria-exercito', 'patriotico')).toMatchObject({ code: 'foreign' });
    expect(canAdd({ sections: [] }, 'jaguncos', 'patriotico')).toBeNull();
  });

  it('defaults to three rifle sections', () => {
    expect(defaultSetup().roster).toEqual({ sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] });
  });
});
