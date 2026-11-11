import { beforeAll, describe, expect, it } from 'vitest';
import {
  battleMap,
  DEFAULT_BATTLE_MAP,
  DEFAULT_ROSTER,
  deployRoster,
  deploymentSlots,
  loadAuthoredMap,
  sectionOffsets,
  validateMapRosters,
  type BattleMap,
} from '../src';
import { TEST_MAP } from './fixtures/test-map';

// author-game-maps 3.6: on the test map (campo-de-provas) and the hand-written test field.
let PROVING: BattleMap;
beforeAll(async () => {
  await loadAuthoredMap(DEFAULT_BATTLE_MAP);
  PROVING = battleMap(DEFAULT_BATTLE_MAP);
});

describe('roster deployment', () => {
  it('the default roster stands where the 3 vs 3 always has', () => {
    for (const map of [PROVING, TEST_MAP]) {
      for (const side of ['column', 'legalist'] as const) {
        const { sections, errors } = deployRoster(map, side, DEFAULT_ROSTER);
        expect(errors).toEqual([]);
        sections.forEach((section, group) => {
          const centre = map.deployment[side].sections[group]!;
          expect(section.squadId).toBe((side === 'column' ? 1 : 11) + group);
          expect(section.men.map(({ x, y }) => ({ x, y }))).toEqual(
            Array.from({ length: 11 }, (_, index) => ({ x: centre.x + ((index % 6) - 2.5) * 2.8, y: centre.y + Math.floor(index / 6) * 2.8 })),
          );
        });
      }
    }
  });

  it('rear slots stand 14 m behind, between the front ones', () => {
    const [a, b, c] = TEST_MAP.deployment.column.sections;
    const behind = -Math.sign(TEST_MAP.deployment.column.facing.y) * 14;
    expect(deploymentSlots(TEST_MAP, 'column')).toEqual([
      a,
      b,
      c,
      { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 + behind },
      { x: b!.x, y: b!.y + behind },
      { x: (b!.x + c!.x) / 2, y: (b!.y + c!.y) / 2 + behind },
    ]);
  });

  it('zones 10 m from the field edge: the rear slots close up to stay on the field', () => {
    const edge: BattleMap = {
      ...TEST_MAP,
      deployment: {
        column: { ...TEST_MAP.deployment.column, sections: TEST_MAP.deployment.column.sections.map(({ x }) => ({ x, y: 190 })) },
        legalist: { ...TEST_MAP.deployment.legalist, sections: TEST_MAP.deployment.legalist.sections.map(({ x }) => ({ x, y: -190 })) },
      },
    };
    const column = deploymentSlots(edge, 'column').slice(3);
    const legalist = deploymentSlots(edge, 'legalist').slice(3);
    for (const slot of column) expect(slot.y).toBeCloseTo(196.2, 6);
    for (const slot of legalist) expect(slot.y).toBeCloseTo(-199, 6);
  });

  it('a gun crew stands with the gunner in front', () => {
    expect(sectionOffsets('metralhadora', { x: 0, y: -1 })).toEqual([
      { x: 0, y: 0 },
      { x: -2.8, y: 2.8 },
      { x: 0, y: 2.8 },
      { x: 2.8, y: 2.8 },
    ]);
  });

  it('six small sections deploy on every map', () => {
    for (const map of [PROVING, TEST_MAP]) {
      for (const side of ['column', 'legalist'] as const) {
        const roster = { sections: ['comando', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'esquadra-4', 'irregulares'] as const };
        const { sections, errors } = deployRoster(map, side, { sections: [...roster.sections] });
        expect(errors).toEqual([]);
        expect(sections.map((section) => section.squadId)).toEqual(side === 'column' ? [1, 2, 3, 4, 5, 6] : [11, 12, 13, 14, 15, 16]);
      }
    }
  });
});

describe('map rosters', () => {
  it('the test map has valid enemy presets', () => {
    expect(PROVING.enemyForces?.length).toBeGreaterThan(1);
    expect(validateMapRosters(PROVING, { requirePresets: true })).toEqual([]);
  });

  it('a broken preset fails the check', () => {
    const broken: BattleMap = { ...PROVING, enemyForces: [{ sections: ['infantaria-exercito', 'infantaria-exercito', 'brigada-militar', 'chefe-capangas'] }] };
    expect(validateMapRosters(broken)).toEqual(['campo-de-provas: enemy preset 1 is refused (over-men {"men":37,"max":33})']);
    const column: BattleMap = { ...PROVING, enemyForces: [{ sections: ['infantaria-exercito', 'fuzileiros'] }] };
    expect(validateMapRosters(column)).toEqual(['campo-de-provas: enemy preset 1 has fuzileiros, not a section of an enemy army']);
    expect(validateMapRosters({ ...PROVING, enemyForces: [] }, { requirePresets: true })).toEqual(['campo-de-provas: no enemy presets']);
  });

  it('a slot on blocked ground fails the check', () => {
    // Move a column slot into the test field's river (along y = 0).
    const flooded: BattleMap = {
      ...TEST_MAP,
      deployment: { ...TEST_MAP.deployment, column: { ...TEST_MAP.deployment.column, sections: [{ x: -60, y: 0 }, { x: 0, y: 150 }, { x: 40, y: 150 }] } },
    };
    expect(validateMapRosters(flooded).some((error) => error.includes('blocked ground'))).toBe(true);
  });
});
