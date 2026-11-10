import { describe, expect, it } from 'vitest';
import type { UnitSnapshot, WeaponId } from '../../packages/shared/src';
import { gunStateLabel, mainWeapon, weaponLines } from '../../apps/game/src/ui/hud/weaponLines';

// pre-battle-roster 5.2: the weapon card's lines for a mixed section.

const man = (id: number, weaponId: WeaponId, magazine: number, reserve: number, gunSet?: boolean) =>
  ({ id, weaponId, magazine, reserve, ...(gunSet !== undefined ? { gunSet } : {}) }) as UnitSnapshot;

describe('weapon lines', () => {
  it('groups an Esquadra de 5 by weapon, in the order its men stand', () => {
    const lines = weaponLines([man(5, 'fuzil-automatico-7mm', 20, 100), man(1, 'mauser-7mm', 5, 15), man(2, 'mauser-7mm', 3, 15)]);
    expect(lines).toEqual([
      { weaponId: 'mauser-7mm', men: 2, magazine: 8, total: 38 },
      { weaponId: 'fuzil-automatico-7mm', men: 1, magazine: 20, total: 120 },
    ]);
    expect(mainWeapon(lines)?.weaponId).toBe('mauser-7mm');
  });

  it('carries the gun state of a machine gunner', () => {
    const lines = weaponLines([man(1, 'metralhadora-7mm', 250, 0, false), man(2, 'mauser-7mm', 5, 15)]);
    expect(lines[0]).toMatchObject({ weaponId: 'metralhadora-7mm', gunSet: false });
    expect(lines[1]?.gunSet).toBeUndefined();
    // The crew's card is named after its gun, though three loaders carry rifles.
    expect(mainWeapon([...lines, { weaponId: 'mauser-7mm', men: 3, magazine: 15, total: 60 }])?.weaponId).toBe('metralhadora-7mm');
    expect(mainWeapon([])).toBeNull();
  });

  it('labels the gun moving, setting up with its seconds left, and set (machine-gun-fire-feedback 3.2)', () => {
    const gunner = (gunState: 'moving' | 'setting' | 'set', gunSetupLeft: number) =>
      ({ id: 1, weaponId: 'metralhadora-7mm', magazine: 250, reserve: 0, gunSet: gunState === 'set', gunState, gunSetupLeft }) as UnitSnapshot;
    expect(gunStateLabel(weaponLines([gunner('moving', 40)])[0]!)).toMatchObject({ key: 'hud.gunMoving', tone: 'moving' });
    expect(gunStateLabel(weaponLines([gunner('setting', 20)])[0]!)).toEqual({ key: 'hud.gunSettingLeft', seconds: 2, tone: 'setting' });
    expect(gunStateLabel(weaponLines([gunner('setting', 3)])[0]!).seconds).toBe(1);
    expect(gunStateLabel(weaponLines([gunner('set', 0)])[0]!)).toMatchObject({ key: 'hud.gunReady', tone: 'ready' });
  });
});
