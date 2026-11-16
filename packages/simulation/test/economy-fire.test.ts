import { describe, expect, it } from 'vitest';
import { WEAPONS, type SectionTypeId, type SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { ECONOMY_RANGE_SHARE } from '../src/systems/combat';
import { openField } from './open-field';

/**
 * add-difficulty-levels 2.1: economical fire. A Column section faces a
 * legalist section `gap` metres north on open ground; the legalists hold
 * their fire unless asked, so only the Column's rounds are counted.
 */
function duel(type: SectionTypeId, gap: number, seed = 1922) {
  const engine = new SimulationEngine({
    seed,
    scenario: 'battle3v3',
    battleMap: openField('large'),
    fog: false,
    rosters: { column: { sections: [type] }, legalist: { sections: ['infantaria-exercito'] } },
  });
  const place = (faction: 'column' | 'legalist', y: number, facingY: number) => {
    engine.units
      .filter((unit) => unit.faction === faction)
      .forEach((unit, index) => {
        unit.x = -80 + index * 2.5;
        unit.y = y;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        unit.facingX = 0;
        unit.facingY = facingY;
      });
  };
  place('column', 40, -1);
  place('legalist', 40 - gap, 1);
  for (const unit of engine.units) if (unit.faction === 'legalist') unit.holdFire = true;
  const column = engine.units.filter((unit) => unit.faction === 'column');
  const ids = new Set(column.map((unit) => unit.id));
  const events: SimEvent[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) events.push(...engine.tick().events);
  };
  const shots = () => events.filter((event): event is Extract<SimEvent, { type: 'shot' }> => event.type === 'shot' && ids.has(event.source));
  const setMode = (mode: 'free' | 'economy') => engine.enqueue({ type: 'fire_control', unitIds: [...ids], mode });
  const moveEnemy = (y: number) => {
    for (const unit of engine.units) {
      if (unit.faction !== 'legalist') continue;
      unit.y = y;
      unit.targetY = y;
    }
  };
  return { engine, column, run, shots, setMode, moveEnemy };
}

describe('economical fire (add-difficulty-levels 2.1)', () => {
  it('opens only within 60 % of the weapon’s range: a Mauser section holds at 90 m and fires at 70 m', () => {
    expect(ECONOMY_RANGE_SHARE * WEAPONS['mauser-7mm'].range).toBe(72);
    const t = duel('esquadra-4', 90);
    t.setMode('economy');
    t.run(150);
    expect(t.shots()).toHaveLength(0);
    t.moveEnemy(40 - 70);
    t.run(150);
    expect(t.shots().length).toBeGreaterThan(0);
  });

  it('spends less: over 60 s an economical section fires fewer rounds than a free one', () => {
    const rounds = (mode: 'free' | 'economy') => {
      const t = duel('esquadra-4', 50);
      t.setMode(mode);
      t.run(600);
      return t.shots().length;
    };
    const free = rounds('free');
    const economy = rounds('economy');
    expect(free).toBeGreaterThan(0);
    expect(economy).toBeLessThan(free);
  });

  it('Short bursts: an automatic rifle with bursts of 3 to 5 fires 3 or fewer at a time', () => {
    const t = duel('fuzil-metralhador', 50);
    t.setMode('economy');
    t.run(600);
    const gunner = t.column.find((unit) => unit.weaponId === 'fuzil-automatico-7mm')!;
    const ticks = t.shots().filter((shot) => shot.source === gunner.id).map((shot) => shot.tick);
    expect(ticks.length).toBeGreaterThan(3);
    // Rounds of one burst follow `gapTicks` (2) apart; a longer gap starts the next burst.
    let burst = 1;
    let longest = 1;
    for (let index = 1; index < ticks.length; index += 1) {
      burst = ticks[index]! - ticks[index - 1]! <= WEAPONS['fuzil-automatico-7mm'].burst!.gapTicks ? burst + 1 : 1;
      longest = Math.max(longest, burst);
    }
    expect(longest).toBeLessThanOrEqual(3);
  });

  it('is shown as economy in the frame and cleared by another fire control', () => {
    const t = duel('esquadra-4', 90);
    t.setMode('economy');
    t.run(1);
    expect(t.engine.frame().units.filter((unit) => unit.faction === 'column').every((unit) => unit.fireControl === 'economy')).toBe(true);
    t.setMode('free');
    t.run(1);
    expect(t.column.some((unit) => unit.economyFire)).toBe(false);
  });

  it('Economical fire is deterministic: the same battle twice gives the same hash every tick', () => {
    const run = () => {
      const t = duel('esquadra-5', 60, 7);
      t.setMode('economy');
      const hashes: string[] = [];
      for (let index = 0; index < 200; index += 1) hashes.push(t.engine.tick().hash);
      return hashes;
    };
    expect(run()).toEqual(run());
  });
});
