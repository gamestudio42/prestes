import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEAPON_ID,
  WEAPONS,
  getWeapon,
  reloadMagazine,
  totalRounds,
  trainingLoad,
  validateWeapons,
  type WeaponId,
  type WeaponProfile,
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

// pre-battle-roster 1.1 and 1.2: the period weapon set.
describe('period weapons', () => {
  const ids: WeaponId[] = ['mauser-7mm', 'fuzil-automatico-7mm', 'metralhadora-7mm', 'winchester-44', 'revolver'];

  it('every profile is complete', () => {
    expect(Object.keys(WEAPONS).sort()).toEqual([...ids].sort());
    expect(validateWeapons()).toEqual([]);
    for (const id of ids) {
      const weapon = WEAPONS[id];
      expect(weapon.historicalStats).toBe('abstracted');
      expect(weapon.sourceRefs).toContain('macaulay-1974');
      expect(weapon.nameKey).toBe(`weapon.${id}.name`);
    }
    expect(WEAPONS['fuzil-automatico-7mm'].fire).toBe('burst');
    expect(WEAPONS['metralhadora-7mm'].fire).toBe('belt');
    expect(WEAPONS['metralhadora-7mm'].setupTicks).toBe(40);
    expect(WEAPONS['metralhadora-7mm'].crew).toBe(4);
    expect(WEAPONS.revolver.range).toBeLessThan(WEAPONS['winchester-44'].range);
  });

  it('the Mauser profile is unchanged', () => {
    const { fire, nameKey, shortNameKey, descriptionKey, ...rest } = WEAPONS['mauser-7mm'];
    expect(fire).toBe('aimed');
    expect([nameKey, shortNameKey, descriptionKey].every(Boolean)).toBe(true);
    expect(rest).toEqual({
      id: 'mauser-7mm', kind: 'bolt-rifle', caliber: '7 mm Mauser', magazine: 5, reserve: 15,
      fireIntervalTicks: 12, aimedIntervalTicks: [30, 50], reactionTicks: [5, 25], reloadTicks: 30,
      range: 120, accuracy: 0.55, damageMin: 35, damageMax: 55, suppression: 1,
      historicalIdentity: 'documented', historicalStats: 'abstracted', sourceRefs: ['macaulay-1974'],
    });
  });

  it('flags a burst weapon without its burst and a gun without its crew', () => {
    const broken: WeaponProfile = { ...WEAPONS['metralhadora-7mm'], burst: undefined, crew: undefined };
    const errors = validateWeapons({ broken });
    expect(errors.some((error) => error.includes('without a burst'))).toBe(true);
    expect(errors.some((error) => error.includes('set-up or crew'))).toBe(true);
  });

  it('issues each weapon its training load', () => {
    expect(trainingLoad('mauser-7mm')).toEqual({ magazine: 5, reserve: 45 });
    expect(trainingLoad('fuzil-automatico-7mm')).toEqual({ magazine: 20, reserve: 100 });
    expect(trainingLoad('metralhadora-7mm')).toEqual({ magazine: 250, reserve: 0, pool: 750 });
    expect(trainingLoad('winchester-44')).toEqual({ magazine: 9, reserve: 36 });
    expect(trainingLoad('revolver')).toEqual({ magazine: 6, reserve: 18 });
  });
});
