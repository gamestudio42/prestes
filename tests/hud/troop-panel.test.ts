import { describe, expect, it } from 'vitest';
import type { SectionTypeId, UnitSnapshot, WeaponId } from '../../packages/shared/src';
import { conditionOf, figureLook, orderSoldiers, soldierPlaces, troopHeader } from '../../apps/game/src/ui/hud/troopPanel';

// troop-thumbnails-and-panel 3.1-3.2: the troop panel's header, figures and order.

const man = (id: number, over: Partial<UnitSnapshot> = {}, squadId = 1, sectionType: SectionTypeId = 'fuzileiros', weaponId: WeaponId = 'mauser-7mm') =>
  ({
    id,
    squadId,
    sectionType,
    army: 'coluna',
    kind: 'infantry',
    weaponId,
    alive: true,
    incapacitated: false,
    routed: false,
    dummy: false,
    wound: 'none',
    hp: 100,
    state: 'steady',
    cover: 0,
    morale: 80,
    magazine: 5,
    reserve: 45,
    ...over,
  }) as UnitSnapshot;

const defend = { kind: 'defend' } as unknown as UnitSnapshot['order'];

describe('troop panel header (3.1)', () => {
  it('one section: its type, army, order and nine fit, one wounded, one down', () => {
    const units = [
      ...Array.from({ length: 9 }, (_, at) => man(at + 1)),
      man(10, { wound: 'light', hp: 60 }),
      man(11, { incapacitated: true, wound: 'severe', hp: 10 }),
    ];
    expect(troopHeader(units, defend)).toEqual({ sections: 1, squadId: 1, sectionType: 'fuzileiros', army: 'coluna', order: defend, fit: 9, wounded: 1, down: 1 });
  });

  it('three sections: their count and the totals of the three', () => {
    const units = [man(1), man(2, { alive: false }), man(3, {}, 2, 'esquadra-4'), man(4, { wound: 'moderate' }, 3, 'metralhadora', 'metralhadora-7mm')];
    const header = troopHeader(units, null);
    expect(header).toMatchObject({ sections: 3, fit: 2, wounded: 1, down: 1 });
    // Several sections have no single type or army.
    expect(header.sectionType).toBeUndefined();
    expect(header.army).toBeUndefined();
  });

  it('a dead man and a man down both count as down', () => {
    expect(conditionOf(man(1, { alive: false }))).toBe('down');
    expect(conditionOf(man(1, { incapacitated: true }))).toBe('down');
    expect(conditionOf(man(1, { wound: 'light' }))).toBe('wounded');
  });
});

describe('soldier figures (3.2)', () => {
  it('cover in the helmet: prone in a trench is good cover, the open none, inside a position inside', () => {
    expect(figureLook(man(1, { cover: 0.6, stance: 'prone' }), 50).cover).toBe('good');
    expect(figureLook(man(2), 50).cover).toBe('none');
    expect(figureLook(man(3, { cover: 0.2 }), 50).cover).toBe('light');
    expect(figureLook(man(4, { garrison: 7 }), 50).cover).toBe('inside');
  });

  it('health in the body', () => {
    expect(figureLook(man(1), 50).health).toBe('fit');
    expect(figureLook(man(1, { wound: 'light' }), 50).health).toBe('wounded');
    expect(figureLook(man(1, { wound: 'severe' }), 50).health).toBe('badly');
    expect(figureLook(man(1, { incapacitated: true }), 50).health).toBe('down');
    expect(figureLook(man(1, { alive: false }), 50).health).toBe('dead');
  });

  it('the clip: half a load shows about half, none is empty and marked', () => {
    const full = man(1);
    const load = full.magazine + full.reserve;
    const half = figureLook(man(1, { magazine: 0, reserve: Math.round(load / 2) }), load);
    expect(half.rounds).toBeGreaterThanOrEqual(2);
    expect(half.rounds).toBeLessThanOrEqual(3);
    expect(half.empty).toBe(false);
    const none = figureLook(man(2, { magazine: 0, reserve: 0 }), load);
    expect(none).toMatchObject({ rounds: 0, empty: true });
    // One round left still shows a cartridge.
    expect(figureLook(man(3, { magazine: 1, reserve: 0 }), load).rounds).toBe(1);
  });

  it('pinned and routed marks', () => {
    expect(figureLook(man(1, { state: 'pinned' }), 50).mark).toBe('pinned');
    expect(figureLook(man(1, { routed: true }), 50).mark).toBe('routed');
    expect(figureLook(man(1, { state: 'routed' }), 50).mark).toBe('routed');
    expect(figureLook(man(1), 50).mark).toBeNull();
    expect(figureLook(man(1, { alive: false, state: 'pinned' }), 50).mark).toBeNull();
  });

  it("roles follow the type's men; the officer leads, else the first man", () => {
    const command = [man(21, { kind: 'officer' }, 4, 'comando', 'revolver'), man(22, {}, 4, 'comando'), man(23, {}, 4, 'comando')];
    const places = soldierPlaces(command);
    expect(places.get(21)).toEqual({ role: 'officer', leader: true });
    expect(places.get(22)).toEqual({ role: 'bugler', leader: false });
    const gun = [man(32, {}, 5, 'metralhadora'), man(31, {}, 5, 'metralhadora', 'metralhadora-7mm')];
    expect(soldierPlaces(gun).get(31)).toEqual({ role: 'gunner', leader: true });
    expect(soldierPlaces(gun).get(32)).toEqual({ role: 'loader', leader: false });
  });

  it('leader first, casualties last', () => {
    const units = [man(5, { alive: false }), man(3), man(2, { kind: 'officer' }), man(4, { incapacitated: true }), man(6, { routed: true }), man(1, {}, 1)];
    expect(orderSoldiers(units).map((unit) => unit.id)).toEqual([2, 1, 3, 4, 5, 6]);
    // A fallen leader goes with the casualties.
    expect(orderSoldiers([man(1, { kind: 'officer', alive: false }), man(2)]).map((unit) => unit.id)).toEqual([2, 1]);
  });
});
