import { afterEach, describe, expect, it } from 'vitest';
import {
  BAIRRO,
  battleMaps,
  createEditableMap,
  insideDeploymentArea,
  MAP_DOCUMENT_VERSION,
  parseMapDocument,
  polygonsOverlap,
  setActiveMap,
  toMapDocument,
  validateDeploymentAreas,
  VILA_MILITAR,
  type BattleMap,
} from '../src';
import { deploymentSlots } from '../src/deploy-roster';
import { band } from '../src/maps/kit';

afterEach(() => setActiveMap(VILA_MILITAR));

describe('deployment areas (add-deployment-phase 1.1)', () => {
  it('old document gets areas: each holds its three points and the two do not overlap', () => {
    const v2 = toMapDocument(createEditableMap({ id: 'old-doc', size: 'medium', name: { en: 'Old', 'pt-BR': 'Velho' } })) as unknown as Record<string, unknown>;
    v2.version = 2;
    const deployment = v2.deployment as Record<string, Record<string, unknown>>;
    delete deployment.column!.area;
    delete deployment.legalist!.area;
    const result = parseMapDocument(JSON.parse(JSON.stringify(v2)) as unknown);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.version).toBe(MAP_DOCUMENT_VERSION);
    const { column, legalist } = result.document.deployment;
    for (const zone of [column, legalist]) {
      expect(zone.area.length).toBeGreaterThanOrEqual(3);
      for (const point of zone.sections) expect(insideDeploymentArea(zone.area, point.x, point.y)).toBe(true);
    }
    expect(polygonsOverlap(column.area, legalist.area)).toBe(false);
  });

  it('a new map starts with default areas that pass the check', () => {
    const doc = toMapDocument(createEditableMap({ id: 'new-doc', size: 'small', name: { en: 'New', 'pt-BR': 'Novo' } }));
    expect(doc.deployment.column.area.length).toBeGreaterThanOrEqual(3);
    expect(polygonsOverlap(doc.deployment.column.area, doc.deployment.legalist.area)).toBe(false);
  });

  it('every hand-written map passes', () => {
    for (const map of battleMaps()) expect(validateDeploymentAreas(map), map.id).toEqual([]);
  });

  it('the content check fails a column area edited to overlap the legalist area, naming the map', () => {
    const map: BattleMap = {
      ...BAIRRO,
      deployment: { ...BAIRRO.deployment, column: { ...BAIRRO.deployment.column, area: band(-150, 150, -100, 150) } },
    };
    const errors = validateDeploymentAreas(map);
    expect(errors).toContain(`${BAIRRO.id}: the column and legalist deployment areas overlap`);
  });

  it('fails a slot outside its area and an area that is mostly unwalkable', () => {
    const slots = deploymentSlots(BAIRRO, 'column');
    const tight: BattleMap = {
      ...BAIRRO,
      deployment: { ...BAIRRO.deployment, column: { ...BAIRRO.deployment.column, area: band(slots[0]!.x - 5, slots[0]!.x + 5, slots[0]!.y - 5, slots[0]!.y + 5) } },
    };
    expect(validateDeploymentAreas(tight).some((error) => error.includes('lies outside its deployment area'))).toBe(true);
    const blocked: BattleMap = {
      ...tight,
      covers: [...BAIRRO.covers, {
          id: 9999,
          kind: 'building',
          x: slots[0]!.x,
          y: slots[0]!.y,
          rotation: 0,
          halfWidth: 8,
          halfDepth: 8,
          height: 5,
          radius: 11.4,
          quality: 1,
          blocksMovement: true,
          blocksSight: true,
        },],
    };
    expect(validateDeploymentAreas(blocked).some((error) => error.includes('% walkable'))).toBe(true);
  });
});
