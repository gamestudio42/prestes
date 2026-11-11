import { describe, expect, it } from 'vitest';
import { ARMIES, ARMY_IDS, ENEMY_ARMY_IDS, armyOf, armyOfUnit, fightingValues, SECTION_TYPE_IDS, validateArmies } from '../src';

describe('army registry', () => {
  it('armies are complete', () => {
    expect(ARMY_IDS).toEqual(['coluna', 'legalista', 'patriotico']);
    expect(validateArmies()).toEqual([]);
    expect(ARMIES.coluna.side).toBe('column');
    expect(ENEMY_ARMY_IDS).toEqual(['legalista', 'patriotico']);
    for (const id of ARMY_IDS) {
      expect(ARMIES[id].nameKey).toBe(`army.${id}.name`);
      expect(ARMIES[id].uniform).toBe(id);
    }
  });

  it('every section type has one army', () => {
    for (const id of SECTION_TYPE_IDS) expect(ARMY_IDS).toContain(armyOf(id));
    expect(armyOf('fuzileiros')).toBe('coluna');
    expect(armyOf('brigada-militar')).toBe('legalista');
    expect(armyOf('cangaceiros')).toBe('patriotico');
  });

  it("a man's army comes from his section, else from his side", () => {
    expect(armyOfUnit({ faction: 'legalist', sectionType: 'jaguncos' })).toBe('patriotico');
    expect(armyOfUnit({ faction: 'column' })).toBe('coluna');
    expect(armyOfUnit({ faction: 'legalist' })).toBe('legalista');
    expect(armyOfUnit({ faction: 'target' })).toBeUndefined();
  });

  it('a type adjusts its army values', () => {
    expect(fightingValues('fuzileiros')).toEqual(ARMIES.coluna.values);
    expect(fightingValues('infantaria-exercito').moraleLoss).toBeGreaterThan(fightingValues('fuzileiros').moraleLoss);
    expect(fightingValues('jaguncos').coverResistance).toBeGreaterThan(1);
    expect(fightingValues(undefined, 'patriotico')).toEqual(ARMIES.patriotico.values);
  });
});
