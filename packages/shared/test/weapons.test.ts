import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEAPON_ID,
  WEAPONS,
  getWeapon,
  reloadMagazine,
  totalRounds,
  validateWeapons,
} from '../src/weapons';

describe('weapon catalog', () => {
  it('defines a complete Mauser profile', () => {
    const weapon = WEAPONS[DEFAULT_WEAPON_ID];
    expect(weapon.id).toBe('mauser-7mm');
    expect(weapon.magazine).toBe(5);
    expect(weapon.reserve).toBe(15);
    expect(weapon.range).toBe(120);
    expect(weapon.historicalIdentity).toBe('documented');
    expect(weapon.historicalStats).toBe('abstracted');
    expect(weapon.sourceRefs).toContain('macaulay-1974');
    expect(validateWeapons()).toEqual([]);
  });

  it('resolves known weapons and rejects unknown ids', () => {
    expect(getWeapon('mauser-7mm')?.caliber).toBe('7 mm Mauser');
    expect(getWeapon('unknown-rifle')).toBeNull();
  });

  it('reloads a full magazine, a partial reserve and an empty reserve', () => {
    const weapon = WEAPONS[DEFAULT_WEAPON_ID];
    expect(reloadMagazine(weapon, 0, 15)).toEqual({ magazine: 5, reserve: 10 });
    expect(reloadMagazine(weapon, 3, 2)).toEqual({ magazine: 5, reserve: 0 });
    expect(reloadMagazine(weapon, 0, 0)).toEqual({ magazine: 0, reserve: 0 });
  });

  it('counts magazine and reserve together', () => {
    expect(totalRounds({ magazine: 5, reserve: 15 })).toBe(20);
  });
});

