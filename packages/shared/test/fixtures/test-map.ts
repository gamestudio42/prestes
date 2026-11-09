import { band } from '../../src/maps/kit';
import type { BattleMap } from '../../src/maps/types';

/**
 * A 400 m test field (add-battle-maps): a river along y = 0 crossed by a ford
 * (x = -120), a bridge (x = 0) and a ferry (x = 120); a hill north-east; a
 * canefield, a cornfield, tall grass and scrub south of the river.
 */
export const TEST_MAP: BattleMap = {
  id: 'fazenda',
  nameKey: 'map.test.name',
  descriptionKey: 'map.test.description',
  codexKey: 'codex.map.test',
  setting: { label: 'historical-setting-fictional-place', sourceNote: 'test' },
  bounds: { minX: -200, minY: -200, maxX: 200, maxY: 200 },
  height: {
    kind: 'field',
    shapes: [
      { kind: 'hill', x: 60, y: -110, radiusX: 40, radiusY: 30, height: 14 },
      { kind: 'channel', points: [{ x: -220, y: 0 }, { x: 220, y: 0 }], width: 16, bank: 6, depth: 2.5 },
      // A low fold: 1.4 m, enough to hide a prone man, not a standing one.
      { kind: 'ridge', points: [{ x: -30, y: 170 }, { x: 30, y: 170 }], width: 8, height: 1.4 },
    ],
  },
  baseSurface: 'pasture',
  surfaces: [{ surface: 'dirt-road', strip: { points: [{ x: 0, y: 200 }, { x: 0, y: -200 }], width: 4 } }],
  water: [
    { kind: 'deep', strip: { points: [{ x: -220, y: 0 }, { x: 220, y: 0 }], width: 16 } },
    {
      kind: 'ford',
      polygon: [{ x: -126, y: -9 }, { x: -114, y: -9 }, { x: -114, y: 9 }, { x: -126, y: 9 }],
      ends: [{ x: -120, y: 12 }, { x: -120, y: -12 }],
    },
  ],
  waterLevel: -1.2,
  bridges: [{ id: 1, x: 0, y: 0, rotation: 0, halfWidth: 2, halfDepth: 12, deckHeight: 1.6 }],
  ferries: [{ id: 1, landingA: { x: 120, y: 12 }, landingB: { x: 120, y: -12 } }],
  vegetation: [
    { kind: 'cane', polygon: [{ x: -80, y: 40 }, { x: -40, y: 40 }, { x: -40, y: 80 }, { x: -80, y: 80 }] },
    { kind: 'corn', polygon: [{ x: 40, y: 40 }, { x: 80, y: 40 }, { x: 80, y: 80 }, { x: 40, y: 80 }] },
    { kind: 'tall-grass', polygon: [{ x: -80, y: 120 }, { x: -40, y: 120 }, { x: -40, y: 160 }, { x: -80, y: 160 }] },
    { kind: 'scrub', polygon: [{ x: 40, y: 120 }, { x: 80, y: 120 }, { x: 80, y: 160 }, { x: 40, y: 160 }] },
  ],
  buildings: [],
  covers: [],
  sightObstacles: [],
  deployment: {
    column: { sections: [{ x: -44, y: 100 }, { x: 0, y: 100 }, { x: 44, y: 100 }], facing: { x: 0, y: -1 }, area: band(-190, 190, 65, 190) },
    legalist: { sections: [{ x: -44, y: -90 }, { x: 0, y: -90 }, { x: 44, y: -90 }], facing: { x: 0, y: 1 }, area: band(-190, 190, -65, -190) },
  },
  props: [],
  fences: [],
  palette: 'temperate',
};
