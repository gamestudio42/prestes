import { describe, expect, it } from 'vitest';
import {
  canAdd,
  DEFAULT_ROSTER,
  SECTION_TYPE_IDS,
  SECTION_TYPES,
  validateRoster,
  validateSectionTypes,
  WEAPONS,
  type SectionTypeId,
} from '../src';

describe('section catalog', () => {
  it('catalog is complete', () => {
    expect(SECTION_TYPE_IDS).toEqual(['comando', 'esquadra-4', 'esquadra-5', 'fuzileiros', 'fuzil-metralhador', 'metralhadora', 'irregulares']);
    expect(validateSectionTypes(SECTION_TYPES, Object.keys(WEAPONS))).toEqual([]);
    const men = Object.fromEntries(SECTION_TYPE_IDS.map((id) => [id, SECTION_TYPES[id].men.length]));
    expect(men).toEqual({ comando: 4, 'esquadra-4': 4, 'esquadra-5': 5, fuzileiros: 11, 'fuzil-metralhador': 3, metralhadora: 4, irregulares: 5 });
    expect(SECTION_TYPES.comando.men[0]).toEqual({ role: 'officer', weapon: 'revolver' });
    expect(SECTION_TYPES.metralhadora.men[0]?.weapon).toBe('metralhadora-7mm');
    expect(SECTION_TYPES.metralhadora.speedFactor).toBe(0.85);
    expect(SECTION_TYPES.irregulares.speedFactor).toBe(1.1);
    expect(SECTION_TYPES.irregulares.men[0]?.sidearm).toBe('revolver');
    for (const id of SECTION_TYPE_IDS) expect(SECTION_TYPES[id].sides).toEqual(['column', 'legalist']);
  });

  it('flags a broken type', () => {
    const broken = { ...SECTION_TYPES, fuzileiros: { ...SECTION_TYPES.fuzileiros, men: [{ role: 'rifleman' as const, weapon: 'lance' as never }] } };
    expect(validateSectionTypes(broken, Object.keys(WEAPONS))).toEqual(['section type fuzileiros carries an unknown weapon: lance']);
  });
});

const roster = (...sections: SectionTypeId[]) => ({ sections });

describe('roster rules', () => {
  it('the default roster is three rifle sections and valid', () => {
    expect(DEFAULT_ROSTER.sections).toEqual(['fuzileiros', 'fuzileiros', 'fuzileiros']);
    expect(validateRoster(DEFAULT_ROSTER)).toEqual({ ok: true, men: 33, sections: 3, refusals: [] });
  });

  it('an empty roster is refused', () => {
    expect(validateRoster(roster()).refusals).toEqual([{ code: 'empty', values: {} }]);
  });

  it('30 men + rifle section is refused', () => {
    const thirty = roster('fuzileiros', 'fuzileiros', 'esquadra-4', 'esquadra-4');
    expect(validateRoster(thirty).men).toBe(30);
    expect(canAdd(thirty, 'fuzileiros')).toEqual({ code: 'over-men', values: { men: 41, max: 33 } });
    expect(canAdd(thirty, 'fuzil-metralhador')).toBeNull();
  });

  it('a seventh section is refused', () => {
    const six = roster('comando', 'esquadra-4', 'esquadra-4', 'esquadra-4', 'esquadra-4', 'esquadra-4');
    expect(validateRoster(six).ok).toBe(true);
    expect(canAdd(six, 'esquadra-4')).toEqual({ code: 'over-sections', values: { sections: 7, max: 6 } });
  });

  it('a second command and a second machine gun are refused', () => {
    expect(canAdd(roster('comando'), 'comando')).toEqual({ code: 'limit', values: { type: 'comando', max: 1 } });
    expect(canAdd(roster('metralhadora'), 'metralhadora')).toEqual({ code: 'limit', values: { type: 'metralhadora', max: 1 } });
  });

  it('third automatic rifle is refused', () => {
    const two = roster('esquadra-5', 'fuzil-metralhador');
    expect(validateRoster(two).ok).toBe(true);
    expect(canAdd(two, 'esquadra-5')).toEqual({ code: 'limit', values: { type: 'automatic-rifle', max: 2 } });
    expect(canAdd(roster('fuzil-metralhador', 'fuzil-metralhador'), 'fuzil-metralhador')).toEqual({ code: 'limit', values: { type: 'automatic-rifle', max: 2 } });
  });
});
