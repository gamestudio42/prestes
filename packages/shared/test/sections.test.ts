import { describe, expect, it } from 'vitest';
import {
  canAdd,
  DEFAULT_ROSTER,
  defaultRoster,
  LEGALIST_SUCCESSORS,
  migrateEnemyPreset,
  migrateRoster,
  rosterArmies,
  SECTION_TYPE_IDS,
  SECTION_TYPES,
  validateRoster,
  validateSectionTypes,
  WEAPONS,
  type SectionTypeId,
} from '../src';

describe('section catalog', () => {
  it('catalog is complete', () => {
    expect(SECTION_TYPE_IDS).toHaveLength(19);
    expect(validateSectionTypes(SECTION_TYPES, Object.keys(WEAPONS))).toEqual([]);
    const men = Object.fromEntries(SECTION_TYPE_IDS.map((id) => [id, SECTION_TYPES[id].men.length]));
    expect(men).toEqual({
      comando: 4,
      fuzileiros: 11,
      'esquadra-4': 4,
      'esquadra-5': 5,
      'fuzil-metralhador': 3,
      metralhadora: 4,
      irregulares: 5,
      'veteranos-gauchos': 8,
      'comando-companhia': 4,
      'infantaria-exercito': 11,
      'brigada-militar': 11,
      provisorios: 8,
      'metralhadora-legalista': 4,
      'fuzil-metralhador-legalista': 3,
      'chefe-capangas': 4,
      jaguncos: 6,
      'jaguncos-mauser': 6,
      voluntarios: 10,
      cangaceiros: 6,
    });
    expect(SECTION_TYPES.comando.men[0]).toEqual({ role: 'officer', weapon: 'revolver' });
    expect(SECTION_TYPES.metralhadora.men[0]?.weapon).toBe('metralhadora-7mm');
    expect(SECTION_TYPES.metralhadora.speedFactor).toBe(0.85);
    expect(SECTION_TYPES.irregulares.speedFactor).toBe(1.1);
    expect(SECTION_TYPES.irregulares.men[0]?.sidearm).toBe('revolver');
    const byArmy = (army: string) => SECTION_TYPE_IDS.filter((id) => SECTION_TYPES[id].army === army);
    expect(byArmy('coluna')).toEqual(['comando', 'fuzileiros', 'esquadra-4', 'esquadra-5', 'fuzil-metralhador', 'metralhadora', 'irregulares', 'veteranos-gauchos']);
    expect(byArmy('legalista')).toHaveLength(6);
    expect(byArmy('patriotico')).toHaveLength(5);
    expect(SECTION_TYPES['chefe-capangas'].men[0]).toEqual({ role: 'officer', weapon: 'winchester-44', sidearm: 'revolver' });
    expect(SECTION_TYPES.cangaceiros.men.every((man) => man.weapon === 'mauser-7mm' && man.sidearm === 'revolver')).toBe(true);
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
    expect(canAdd(roster('comando'), 'comando')).toEqual({ code: 'limit', values: { type: 'command', max: 1 } });
    expect(canAdd(roster('metralhadora'), 'metralhadora')).toEqual({ code: 'limit', values: { type: 'machine-gun', max: 1 } });
    // In a mixed preset the limits hold across the armies.
    expect(canAdd(roster('comando-companhia'), 'chefe-capangas')).toEqual({ code: 'limit', values: { type: 'command', max: 1 } });
    expect(canAdd(roster('metralhadora-legalista'), 'metralhadora-legalista')).toEqual({ code: 'limit', values: { type: 'machine-gun', max: 1 } });
  });

  // scale-forces-by-map-size 1.1: the limits grow with the map.
  it('44 men are refused on a small map and accepted on a medium one', () => {
    const four = roster('fuzileiros', 'fuzileiros', 'fuzileiros', 'fuzileiros');
    expect(validateRoster(four).refusals).toEqual([{ code: 'over-men', values: { men: 44, max: 33 } }]);
    expect(validateRoster(four, 'coluna', 'small').ok).toBe(false);
    expect(validateRoster(four, 'coluna', 'medium')).toEqual({ ok: true, men: 44, sections: 4, refusals: [] });
    expect(canAdd(roster('fuzileiros', 'fuzileiros', 'esquadra-4', 'esquadra-4'), 'fuzileiros', 'coluna', 'medium')).toBeNull();
  });

  it('a medium map takes two machine guns and twelve sections, a large one sixteen', () => {
    expect(canAdd(roster('metralhadora'), 'metralhadora', 'coluna', 'medium')).toBeNull();
    expect(canAdd(roster('metralhadora', 'metralhadora'), 'metralhadora', 'coluna', 'medium')).toEqual({ code: 'limit', values: { type: 'machine-gun', max: 2 } });
    expect(canAdd(roster('metralhadora', 'metralhadora'), 'metralhadora', 'coluna', 'large')).toBeNull();
    const twelve = roster(...Array.from({ length: 12 }, () => 'esquadra-4' as const));
    expect(validateRoster(twelve, 'coluna', 'medium').ok).toBe(true);
    expect(canAdd(twelve, 'esquadra-4', 'coluna', 'medium')).toEqual({ code: 'over-sections', values: { sections: 13, max: 12 } });
    expect(canAdd(twelve, 'esquadra-4', 'coluna', 'large')).toBeNull();
    expect(canAdd(roster('fuzil-metralhador', 'fuzil-metralhador', 'fuzil-metralhador'), 'esquadra-5', 'coluna', 'medium')).toBeNull();
  });

  it('one command section on every size', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      expect(canAdd(roster('comando'), 'comando', 'coluna', size)).toEqual({ code: 'limit', values: { type: 'command', max: 1 } });
    }
  });

  it('the patriotic automatic rifles count toward the limit of two', () => {
    expect(SECTION_TYPES['jaguncos-mauser'].men.filter((man) => man.weapon === 'fuzil-automatico-7mm')).toHaveLength(1);
    expect(canAdd(roster('jaguncos-mauser', 'jaguncos-mauser'), 'jaguncos-mauser', 'patriotico')).toEqual({ code: 'limit', values: { type: 'automatic-rifle', max: 2 } });
  });

  it('a second section of cangaceiros is refused', () => {
    expect(canAdd(roster('cangaceiros'), 'cangaceiros', 'patriotico')).toEqual({ code: 'limit', values: { type: 'cangaceiros', max: 1 } });
  });

  it('the roster lists one army: a foreign section is refused', () => {
    expect(validateRoster(roster('infantaria-exercito', 'jaguncos'), 'legalista').refusals).toEqual([
      { code: 'foreign', values: { type: 'jaguncos', army: 'patriotico' } },
    ]);
    expect(canAdd(roster('infantaria-exercito'), 'fuzileiros', 'legalista')).toEqual({ code: 'foreign', values: { type: 'fuzileiros', army: 'coluna' } });
    expect(canAdd(roster('fuzileiros'), 'fuzileiros', 'coluna')).toBeNull();
    // Without an army (a map preset) the two enemy armies mix.
    expect(validateRoster(roster('infantaria-exercito', 'jaguncos')).ok).toBe(true);
    expect(rosterArmies(roster('jaguncos', 'infantaria-exercito'))).toEqual(['legalista', 'patriotico']);
  });

  it('each army has a default roster of three rifle sections', () => {
    expect(defaultRoster('coluna')).toEqual(DEFAULT_ROSTER);
    expect(defaultRoster('legalista').sections).toEqual(['infantaria-exercito', 'infantaria-exercito', 'infantaria-exercito']);
    for (const army of ['coluna', 'legalista', 'patriotico'] as const) expect(validateRoster(defaultRoster(army), army).ok).toBe(true);
  });

  it('third automatic rifle is refused', () => {
    const two = roster('esquadra-5', 'fuzil-metralhador');
    expect(validateRoster(two).ok).toBe(true);
    expect(canAdd(two, 'esquadra-5')).toEqual({ code: 'limit', values: { type: 'automatic-rifle', max: 2 } });
    expect(canAdd(roster('fuzil-metralhador', 'fuzil-metralhador'), 'fuzil-metralhador')).toEqual({ code: 'limit', values: { type: 'automatic-rifle', max: 2 } });
  });
});

describe('successor table', () => {
  const OLD_IDS = ['comando', 'esquadra-4', 'esquadra-5', 'fuzileiros', 'fuzil-metralhador', 'metralhadora', 'irregulares'];

  it('maps every old id onto a legalist section', () => {
    expect(Object.keys(LEGALIST_SUCCESSORS).sort()).toEqual([...OLD_IDS].sort());
    for (const id of OLD_IDS) {
      const successor = LEGALIST_SUCCESSORS[id]!;
      expect(SECTION_TYPES[successor].army).toBe('legalista');
    }
    expect(LEGALIST_SUCCESSORS.fuzileiros).toBe('infantaria-exercito');
    expect(LEGALIST_SUCCESSORS.metralhadora).toBe('metralhadora-legalista');
  });

  it('an old enemy preset becomes legalist; a new one is kept', () => {
    expect(migrateEnemyPreset(OLD_IDS)).toEqual({
      roster: { sections: OLD_IDS.map((id) => LEGALIST_SUCCESSORS[id]) },
      changed: true,
    });
    expect(migrateEnemyPreset(['jaguncos', 'brigada-militar'])).toEqual({ roster: { sections: ['jaguncos', 'brigada-militar'] }, changed: false });
    expect(migrateEnemyPreset(['lanceiros']).roster.sections).toEqual(['infantaria-exercito']);
  });

  it('a stored roster keeps its army; an unknown id becomes the rifle section', () => {
    expect(migrateRoster(['fuzileiros', 'irregulares'], 'coluna')).toEqual({ roster: { sections: ['fuzileiros', 'irregulares'] }, changed: false });
    expect(migrateRoster(['lanceiros'], 'coluna')).toEqual({ roster: { sections: ['fuzileiros'] }, changed: true });
    expect(migrateRoster(['fuzileiros', 'irregulares'], 'legalista').roster.sections).toEqual(['infantaria-exercito', 'provisorios']);
    expect(migrateRoster(['fuzileiros'], 'patriotico').roster.sections).toEqual(['voluntarios']);
  });
});
