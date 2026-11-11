import { describe, expect, it } from 'vitest';
import { unitValues, type BattleRosters, type SectionTypeId } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import type { MutableUnit } from '../src/systems/model';
import { openField } from './open-field';

/**
 * faction-armies 3.1-3.2: armies fight with their own numbers. The column
 * stands at y = 40 facing north, the legalist side `gap` metres north.
 */
function field(rosters: BattleRosters, gap = 60, seed = 1922) {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: openField('large'), rosters });
  const place = (faction: 'column' | 'legalist', y: number, facingY: number) => {
    engine.units
      .filter((unit) => unit.faction === faction)
      .forEach((unit, index) => {
        unit.x = -80 + index * 2.5;
        unit.y = y + (index % 2) * 0.5;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        unit.facingX = 0;
        unit.facingY = facingY;
      });
  };
  place('column', 40, -1);
  place('legalist', 40 - gap, 1);
  const side = (faction: 'column' | 'legalist') => engine.units.filter((unit) => unit.faction === faction);
  const run = (ticks: number) => {
    const hashes: string[] = [];
    for (let index = 0; index < ticks; index += 1) hashes.push(engine.tick().hash);
    return hashes;
  };
  return { engine, side, run };
}

const moraleLost = (units: readonly MutableUnit[], start: number) => units.reduce((sum, unit) => sum + (start - unit.morale), 0);

describe('armies fight differently (3.1)', () => {
  it('a rostered man starts with his army values and ammunition', () => {
    const t = field({ column: { sections: ['veteranos-gauchos', 'irregulares'] }, legalist: { sections: ['infantaria-exercito', 'jaguncos'] } });
    const bySection = (type: SectionTypeId) => t.engine.units.find((unit) => unit.sectionType === type)!;
    expect(bySection('infantaria-exercito')).toMatchObject({ morale: 85, cohesion: 90 });
    expect(bySection('jaguncos')).toMatchObject({ morale: 95, cohesion: 65 });
    expect(bySection('veteranos-gauchos')).toMatchObject({ morale: 100, cohesion: 100 });
    // The potreada carries three quarters of the issue in reserve, the jagunços 85 per cent.
    expect(bySection('irregulares').reserve).toBe(27);
    expect(bySection('jaguncos').reserve).toBe(31);
  });

  it('the same men under the same fire lose morale at their army rate', () => {
    // One battle of regulars, one of the same men as volunteers: same places, weapons and seed.
    const lost = (as: SectionTypeId) => {
      const t = field({ column: { sections: ['fuzileiros'] }, legalist: { sections: ['brigada-militar'] } });
      for (const unit of t.side('legalist')) {
        unit.sectionType = as;
        unit.morale = 100;
        unit.holdFire = true;
      }
      t.run(150);
      return moraleLost(t.side('legalist'), 100);
    };
    const regulars = lost('brigada-militar');
    const volunteers = lost('voluntarios');
    expect(regulars).toBeGreaterThan(0);
    expect(volunteers).toBeGreaterThan(regulars * 1.15);
    expect(unitValues({ sectionType: 'voluntarios' }).moraleLoss).toBeGreaterThan(unitValues({ sectionType: 'brigada-militar' }).moraleLoss);
  });

  it('a battle of all three armies is deterministic', () => {
    const rosters: BattleRosters = {
      column: { sections: ['comando', 'fuzileiros', 'irregulares'] },
      legalist: { sections: ['comando-companhia', 'infantaria-exercito', 'jaguncos', 'cangaceiros'] },
    };
    const a = field(rosters, 80, 7).run(300);
    const b = field(rosters, 80, 7).run(300);
    expect(a).toEqual(b);
  });
});

describe('command aura by army (3.2)', () => {
  /** A fit officer of `command` stands beside a section of jagunços; their morale after 100 ticks out of contact. */
  const steadied = (command: SectionTypeId) => {
    const t = field({ column: { sections: ['fuzileiros'] }, legalist: { sections: [command, 'jaguncos'] } }, 300);
    const officer = t.side('legalist').find((unit) => unit.kind === 'officer')!;
    const jaguncos = t.side('legalist').filter((unit) => unit.sectionType === 'jaguncos');
    for (const unit of jaguncos) {
      unit.morale = 50;
      unit.x = officer.x + 4;
      unit.y = officer.y;
    }
    t.run(100);
    return jaguncos.reduce((sum, unit) => sum + unit.morale, 0) / jaguncos.length;
  };

  it('a legalist officer does not steady a jagunço section; a chief does', () => {
    const officer = steadied('comando-companhia');
    const chief = steadied('chefe-capangas');
    expect(chief).toBeGreaterThan(officer + 10);
  });
});
