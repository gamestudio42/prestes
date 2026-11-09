import { describe, expect, it } from 'vitest';
import { FAZENDA } from '../../packages/shared/src';
import { battleRosters, defaultSetup, parseSetup, setupReady, withMap } from '../../apps/game/src/ui/menu/setupState';

// pre-battle-roster 5.5, 5.6: the setup screen's saved choices and what they field.

describe('skirmish setup state', () => {
  it('falls back to the default for missing or broken saved data', () => {
    expect(parseSetup(null)).toEqual(defaultSetup());
    expect(parseSetup('not json')).toEqual(defaultSetup());
    expect(parseSetup(JSON.stringify({ map: 'atlantis', roster: { sections: ['lanceiros'] } }))).toEqual(defaultSetup());
    // A refused roster (two machine guns) is not offered again.
    expect(parseSetup(JSON.stringify({ map: 'fazenda', roster: { sections: ['metralhadora', 'metralhadora'] } })).roster).toEqual(defaultSetup().roster);
  });

  it('keeps a valid saved setup', () => {
    const saved = { map: 'fazenda', roster: { sections: ['comando', 'metralhadora'] }, enemy: { kind: 'preset', index: 2 } };
    expect(parseSetup(JSON.stringify(saved))).toEqual(saved);
    const built = { map: 'bairro', roster: { sections: ['irregulares'] }, enemy: { kind: 'built', roster: { sections: ['fuzileiros'] } } };
    expect(parseSetup(JSON.stringify(built))).toEqual(built);
    // A preset index the map does not have falls back to "Sorteado".
    expect(parseSetup(JSON.stringify({ ...saved, enemy: { kind: 'preset', index: 9 } })).enemy).toEqual({ kind: 'drawn' });
  });

  it('fields the enemy the setup chose', () => {
    const base = { ...defaultSetup(), map: 'fazenda' };
    expect(battleRosters(base)).toEqual({ column: base.roster });
    expect(battleRosters({ ...base, enemy: { kind: 'preset', index: 2 } }).legalist).toEqual(FAZENDA.enemyForces![2]);
    expect(battleRosters({ ...base, enemy: { kind: 'built', roster: { sections: ['esquadra-4'] } } }).legalist).toEqual({ sections: ['esquadra-4'] });
  });

  it('a new map resets a chosen preset and keeps a built enemy', () => {
    const preset = { ...defaultSetup(), map: 'fazenda', enemy: { kind: 'preset' as const, index: 1 } };
    expect(withMap(preset, 'bairro').enemy).toEqual({ kind: 'drawn' });
    const built = { ...preset, enemy: { kind: 'built' as const, roster: { sections: ['fuzileiros' as const] } } };
    expect(withMap(built, 'bairro').enemy).toEqual(built.enemy);
  });

  it('cannot start with an empty force or an empty built enemy', () => {
    expect(setupReady(defaultSetup())).toBe(true);
    expect(setupReady({ ...defaultSetup(), roster: { sections: [] } })).toBe(false);
    expect(setupReady({ ...defaultSetup(), enemy: { kind: 'built', roster: { sections: [] } } })).toBe(false);
  });
});
