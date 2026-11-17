import { beforeAll, describe, expect, it } from 'vitest';
import {
  battleMap,
  DEFAULT_BATTLE_MAP,
  DEFAULT_ROSTER,
  deployRoster,
  deploymentSlots,
  loadAuthoredMap,
  pointInPolygon,
  sectionOffsets,
  sectionSquadId,
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

// scale-forces-by-map-size 2.1, 2.2: the larger rosters of medium maps.
describe('large roster deployment', () => {
  const twelve = { sections: ['comando', 'metralhadora', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'esquadra-4', 'irregulares', 'fuzileiros', 'esquadra-4', 'esquadra-5', 'irregulares', 'esquadra-4'] as const };

  it('the first six places do not move when more are asked for', () => {
    for (const side of ['column', 'legalist'] as const) {
      const base = deploymentSlots(PROVING, side);
      expect(deploymentSlots(PROVING, side, 12).slice(0, base.length)).toEqual(base);
      expect(deploymentSlots(PROVING, side, 12)).toHaveLength(12);
    }
  });

  it('twelve sections stand on walkable ground inside the area on the test map (medium)', () => {
    for (const side of ['column', 'legalist'] as const) {
      const { sections, errors } = deployRoster(PROVING, side, { sections: [...twelve.sections] });
      expect(errors).toEqual([]);
      expect(sections).toHaveLength(12);
      const area = PROVING.deployment[side].area;
      for (const man of sections.flatMap((section) => section.men)) expect(pointInPolygon(man.x, man.y, area), `${side} (${man.x}, ${man.y})`).toBe(true);
      const slots = deploymentSlots(PROVING, side, 12);
      for (let i = 0; i < slots.length; i += 1) {
        for (let j = i + 1; j < slots.length; j += 1) {
          expect(Math.hypot(slots[i]!.x - slots[j]!.x, slots[i]!.y - slots[j]!.y)).toBeGreaterThanOrEqual(i < 6 && j < 6 ? 0 : 12);
        }
      }
    }
  });

  it('twelve sections a side and the arrivals keep distinct troop ids', () => {
    const column = deployRoster(PROVING, 'column', { sections: [...twelve.sections] }).sections.map((section) => section.squadId);
    const legalist = Array.from({ length: 12 }, (_, index) => sectionSquadId('legalist', index));
    expect(column).toEqual([1, 2, 3, 4, 5, 6, 101, 102, 103, 104, 105, 106]);
    expect(legalist).toEqual([11, 12, 13, 14, 15, 16, 151, 152, 153, 154, 155, 156]);
    // Event arrivals take ids from 20 on.
    const arrivals = [20, 21];
    expect(new Set([...column, ...legalist, ...arrivals]).size).toBe(26);
  });

  it('a small map deploys no more than six', () => {
    const { sections } = deployRoster(TEST_SMALL(), 'column', { sections: [...twelve.sections] });
    expect(sections).toHaveLength(6);
  });
});

/** The hand-written test field cut to a small map's 240 m. */
function TEST_SMALL(): BattleMap {
  return { ...TEST_MAP, id: 'test-small' as BattleMap['id'], bounds: { minX: -120, minY: -120, maxX: 120, maxY: 120 } };
}

describe('map rosters', () => {
  it('the test map has valid enemy presets', () => {
    expect(PROVING.enemyForces?.length).toBeGreaterThan(1);
    expect(validateMapRosters(PROVING, { requirePresets: true })).toEqual([]);
  });

  it('a broken preset fails the check', () => {
    const broken: BattleMap = { ...PROVING, enemyForces: [{ sections: ['infantaria-exercito', 'infantaria-exercito', 'brigada-militar', 'chefe-capangas'] }] };
    // The test map is medium: 37 men fit its limits, 70 do not; on a small map 37 are refused.
    expect(validateMapRosters(broken)).toEqual([]);
    const crowded: BattleMap = { ...PROVING, enemyForces: [{ sections: Array.from({ length: 7 }, () => 'infantaria-exercito' as const) }] };
    expect(validateMapRosters(crowded)).toEqual(['campo-de-provas: enemy preset 1 is refused (over-men {"men":77,"max":66})']);
    const small: BattleMap = { ...TEST_SMALL(), enemyForces: broken.enemyForces };
    expect(validateMapRosters(small)).toContain('test-small: enemy preset 1 is refused (over-men {"men":37,"max":33})');
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
