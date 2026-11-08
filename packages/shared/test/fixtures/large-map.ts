import type { BattleMap } from '../../src/maps/types';
import { boundsForSize } from '../../src/maps/sizes';

/**
 * A flat 640 m test field (add-map-editor size spike): pasture with a few
 * low hills, deployment zones as far apart as on the Fazenda.
 */
export const LARGE_TEST_MAP: BattleMap = {
  id: 'large-test',
  nameKey: 'map.test.name',
  descriptionKey: 'map.test.description',
  codexKey: 'codex.map.test',
  setting: { label: 'historical-setting-fictional-place', sourceNote: 'test' },
  bounds: boundsForSize('large'),
  height: {
    kind: 'field',
    shapes: [
      { kind: 'hill', x: 160, y: -200, radiusX: 60, radiusY: 40, height: 12 },
      { kind: 'hill', x: -220, y: 180, radiusX: 50, radiusY: 50, height: 9 },
      { kind: 'ridge', points: [{ x: -80, y: 20 }, { x: 80, y: 0 }], width: 10, height: 1.4 },
    ],
  },
  baseSurface: 'pasture',
  surfaces: [{ surface: 'dirt-road', strip: { points: [{ x: 0, y: 320 }, { x: 0, y: -320 }], width: 4 } }],
  water: [],
  waterLevel: -1.2,
  bridges: [],
  ferries: [],
  vegetation: [],
  buildings: [],
  covers: [],
  sightObstacles: [],
  deployment: {
    column: { sections: [{ x: -44, y: 95 }, { x: 0, y: 95 }, { x: 44, y: 95 }], facing: { x: 0, y: -1 } },
    legalist: { sections: [{ x: -44, y: -95 }, { x: 0, y: -95 }, { x: 44, y: -95 }], facing: { x: 0, y: 1 } },
  },
  props: [],
  fences: [],
  palette: 'temperate',
};
