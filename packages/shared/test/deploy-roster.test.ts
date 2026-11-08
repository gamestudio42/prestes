import { describe, expect, it } from 'vitest';
import {
  BAIRRO,
  battleMaps,
  DEFAULT_ROSTER,
  deployRoster,
  deploymentSlots,
  FAZENDA,
  sectionOffsets,
  SERRA_RIO,
  validateMapRosters,
  VILA_MILITAR,
  type BattleMap,
} from '../src';

describe('roster deployment', () => {
  it('the default roster stands where the 3 vs 3 always has', () => {
    for (const map of [VILA_MILITAR, FAZENDA, SERRA_RIO, BAIRRO]) {
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
    const [a, b, c] = FAZENDA.deployment.column.sections;
    const behind = -Math.sign(FAZENDA.deployment.column.facing.y) * 14;
    expect(deploymentSlots(FAZENDA, 'column')).toEqual([
      a,
      b,
      c,
      { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 + behind },
      { x: b!.x, y: b!.y + behind },
      { x: (b!.x + c!.x) / 2, y: (b!.y + c!.y) / 2 + behind },
    ]);
  });

  it('on the Vila Militar the rear slots close up to stay on the field', () => {
    const column = deploymentSlots(VILA_MILITAR, 'column').slice(3);
    const legalist = deploymentSlots(VILA_MILITAR, 'legalist').slice(3);
    for (const slot of column) expect(slot.y).toBeCloseTo(96.2, 6);
    for (const slot of legalist) expect(slot.y).toBeCloseTo(-99, 6);
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
    for (const map of battleMaps()) {
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
  it('every built-in map has valid enemy presets', () => {
    for (const map of [VILA_MILITAR, FAZENDA, SERRA_RIO, BAIRRO]) {
      expect(map.enemyForces?.length).toBeGreaterThan(1);
      expect(validateMapRosters(map, { requirePresets: true })).toEqual([]);
    }
  });

  it('a broken preset fails the check', () => {
    const broken: BattleMap = { ...FAZENDA, enemyForces: [{ sections: ['fuzileiros', 'fuzileiros', 'fuzileiros', 'esquadra-4'] }] };
    expect(validateMapRosters(broken)).toEqual(['fazenda: enemy preset 1 is refused (over-men {"men":37,"max":33})']);
    expect(validateMapRosters({ ...FAZENDA, enemyForces: [] }, { requirePresets: true })).toEqual(['fazenda: no enemy presets']);
  });

  it('a slot on blocked ground fails the check', () => {
    // Move the column's zone into the Serra e Rio's river.
    const flooded: BattleMap = {
      ...SERRA_RIO,
      deployment: { ...SERRA_RIO.deployment, column: { ...SERRA_RIO.deployment.column, sections: [{ x: 100, y: -4 },{ x: 0, y: 150 }, { x: 40, y: 150 }] } },
    };
    expect(validateMapRosters(flooded).some((error) => error.includes('blocked ground'))).toBe(true);
  });
});
