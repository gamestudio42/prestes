import { describe, expect, it } from 'vitest';
import { FogView } from '@prestes/shared';
import { duel } from './garrison-duel';

/**
 * garrison-and-assault 3.3: a legalist garrison in a house and a column
 * section, seen through the column's fog view. `far`: the section stands
 * 130 m out (sight reaches 120 m); else 60 m out with its backs to the
 * house, so the garrison's first shots come unseen.
 */
function hiddenHouse(seed: number, holdFire: boolean, far: boolean) {
  const t = duel(seed, { insideFaction: 'legalist' });
  for (const unit of t.inside) unit.holdFire = holdFire;
  for (const unit of t.open) {
    if (far) {
      const scale = 130 / 60;
      unit.x = t.house.x + (unit.x - t.house.x) * scale;
      unit.y = t.house.y + (unit.y - t.house.y) * scale;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
    } else {
      unit.facingX = -unit.facingX;
      unit.facingY = -unit.facingY;
    }
    unit.holdFire = true;
  }
  return { ...t, view: new FogView('column') };
}

describe('garrison: under fog of war (garrison-and-assault 3.3)', { timeout: 60_000 }, () => {
  it('hidden garrison: a legalist garrison holding fire in a house the column has not seen shows no marker', () => {
    const { engine, view, house } = hiddenHouse(3, true, true);
    for (let tick = 0; tick < 100; tick += 1) {
      const frame = engine.runTicks(1, { hash: false });
      expect(frame.garrisons?.find((entry) => entry.positionId === house.id)?.known).toBeUndefined();
      expect(view.apply(frame).garrisons?.some((entry) => entry.positionId === house.id) ?? false).toBe(false);
    }
  });

  it('revealed by fire: once it fires unseen, the house shows a legalist marker with "?" strength', () => {
    const { engine, view, house } = hiddenHouse(3, false, false);
    let revealed = false;
    for (let tick = 0; tick < 600 && !revealed; tick += 1) {
      const frame = engine.runTicks(1, { hash: false });
      if (!frame.events.some((event) => event.type === 'unseen_fire' && event.side === 'legalist')) continue;
      const shown = view.apply(frame).garrisons?.find((entry) => entry.positionId === house.id);
      expect(shown).toMatchObject({ side: 'legalist', strengthUnknown: true, unitIds: [] });
      revealed = true;
    }
    expect(revealed).toBe(true);
  });

  it('a man seen at a port counts the garrison: the marker shows its men', () => {
    const t = duel(3, { insideFaction: 'legalist' });
    for (const unit of [...t.inside, ...t.open]) unit.holdFire = true;
    const view = new FogView('column');
    let counted = false;
    for (let tick = 0; tick < 100 && !counted; tick += 1) {
      const frame = t.engine.runTicks(1, { hash: false });
      const shown = view.apply(frame).garrisons?.find((entry) => entry.positionId === t.house.id);
      if (shown?.unitIds.length === 4 && !shown.strengthUnknown) counted = true;
    }
    expect(counted).toBe(true);
  });
});
