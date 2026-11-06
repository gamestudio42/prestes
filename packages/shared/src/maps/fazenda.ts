import type { CoverPoint } from '../protocol';
import { buildingCover, type Building } from '../world';
import { box, communicationTrench, fenceCovers, lowWall, propRow, trenchLine, zone } from './kit';
import type { Vec2 } from '../protocol';
import type { BattleMap, PropPlacement } from './types';

/**
 * Fazenda (add-battle-maps): a coffee and sugarcane fazenda of the São Paulo
 * and Paraná interior, 1924-1925. Historical setting, fictional place: the
 * layout is original. Two opposed trench lines cross open pasture; a
 * canefield on the west flank runs almost to the legalist line, a cornfield
 * on the east lies under the casa-sede's knoll.
 *
 * North (negative y) is the legalist side, south the column's.
 */

const BUILDINGS: Building[] = [
  // The casa-sede on its knoll, with the barn and the chapel of the colony.
  { id: 401, model: 'casa-sede', x: 140, y: 2, rotation: 0.05, halfWidth: 7, halfDepth: 5, height: 6.5 },
  { id: 402, model: 'barn', x: 112, y: 52, rotation: -0.12, halfWidth: 5.65, halfDepth: 3.5, height: 6 },
  { id: 403, model: 'chapel', x: 176, y: 96, rotation: 0.08, halfWidth: 3.2, halfDepth: 4.8, height: 5.2 },
  // The colonists' row.
  ...[0, 1, 2, 3, 4].map((index): Building => ({
    id: 404 + index,
    model: 'colonist-house',
    x: 146 + index * 10,
    y: 66,
    rotation: 0,
    halfWidth: 3.6,
    halfDepth: 3,
    height: 4.2,
  })),
  // The engenho by the cane, and its storehouse.
  { id: 410, model: 'engenho', x: -152, y: 76, rotation: -0.06, halfWidth: 8, halfDepth: 5, height: 7 },
  { id: 411, model: 'colonist-house', x: -176, y: 98, rotation: 0.1, halfWidth: 3.6, halfDepth: 3, height: 4.2 },
  // A tenant's farmhouse behind the legalist line.
  { id: 412, model: 'farmhouse', x: -60, y: -150, rotation: 0.2, halfWidth: 4.35, halfDepth: 2.85, height: 4.8 },
];

const LINES: CoverPoint[] = [
  ...[-44, 0, 44].flatMap((x, index) => trenchLine(600 + index * 10, x, -80, 1)),
  ...[-44, 0, 44].flatMap((x, index) => trenchLine(630 + index * 10, x, 80, -1)),
  // Communication trenches back to each side's rear.
  communicationTrench(660, { x: 0, y: -82 }, { x: 0, y: -122 }),
  communicationTrench(661, { x: -44, y: -82 }, { x: -60, y: -118 }),
  communicationTrench(662, { x: 0, y: 82 }, { x: 0, y: 122 }),
  communicationTrench(663, { x: 44, y: 82 }, { x: 60, y: 118 }),
  // The corral's stone wall and the casa-sede's yard wall.
  lowWall(670, 160, -36, 10),
  lowWall(671, 160, -56, 10),
  lowWall(672, 120, 14, 8, Math.PI / 2, 1.1),
];

/** Coffee rows 4 m apart, each broken by a carreador (a cart track) across the grove. */
const COFFEE_ROWS: Vec2[][] = [];
for (let row = 0; row < 7; row += 1) {
  const west = -180 + row * 4;
  const east = -186 + row * 4;
  COFFEE_ROWS.push(
    [{ x: -190, y: west }, { x: -154, y: west }],
    [{ x: -146, y: west }, { x: -110, y: west }],
    [{ x: 80, y: east }, { x: 126, y: east }],
    [{ x: 134, y: east }, { x: 180, y: east }],
  );
}
const COFFEE: PropPlacement[] = COFFEE_ROWS.flatMap((line) => propRow('coffee-row', line, 12));

/** Wire and rail fences, with porteiras (gates) left open in each. */
const FENCES: Vec2[][] = [
  [{ x: 28, y: 190 }, { x: 27, y: 150 }],
  [{ x: 27, y: 144 }, { x: 26, y: 110 }],
  [{ x: 12, y: 190 }, { x: 11, y: 150 }],
  [{ x: 11, y: 144 }, { x: 10, y: 110 }],
  [{ x: 156, y: -32 }, { x: 170, y: -32 }, { x: 170, y: -60 }, { x: 150, y: -60 }],
  [{ x: 60, y: 160 }, { x: 120, y: 160 }],
  [{ x: 128, y: 160 }, { x: 190, y: 160 }],
  [{ x: -190, y: 130 }, { x: -130, y: 130 }],
  [{ x: -122, y: 130 }, { x: -60, y: 130 }],
  [{ x: 40, y: -130 }, { x: 110, y: -130 }],
  [{ x: 118, y: -130 }, { x: 190, y: -130 }],
];

const TREES: PropPlacement[] = [
  // Shade trees round the casa-sede and the colony; araucaria on the rises.
  ...[
    [126, -12, 1.2],
    [154, -14, 1.1],
    [128, 22, 1.0],
    [140, 82, 1.15],
    [198, 70, 1.0],
    [-138, 60, 1.1],
    [-170, 60, 1.2],
    [-40, -160, 1.0],
    [-80, -140, 1.1],
  ].map(([x, y, scale]): PropPlacement => ({ model: 'tree-broad', x: x!, y: y!, scale: scale! })),
  ...[
    [-118, 20, 1.2],
    [-100, 40, 1.3],
    [-90, 8, 1.1],
    [190, -100, 1.25],
    [-190, -60, 1.3],
    [30, 170, 1.2],
  ].map(([x, y, scale]): PropPlacement => ({ model: 'tree-araucaria', x: x!, y: y!, scale: scale! })),
];

export const FAZENDA: BattleMap = {
  id: 'fazenda',
  nameKey: 'map.fazenda.name',
  descriptionKey: 'map.fazenda.description',
  codexKey: 'map-fazenda',
  setting: {
    label: 'historical-setting-fictional-place',
    sourceNote:
      'The Paraná front of 1924-1925 was held from dug-in lines (macaulay-1974, ch. III, pp. 71, 82, 85); coffee and cane fazendas of the São Paulo interior (historical note).',
  },
  bounds: { minX: -200, minY: -200, maxX: 200, maxY: 200 },
  height: {
    kind: 'field',
    shapes: [
      // The casa-sede's knoll, a western rise behind the cane and a low swell to the north.
      { kind: 'hill', x: 140, y: 0, radiusX: 60, radiusY: 55, height: 5 },
      { kind: 'hill', x: -170, y: 40, radiusX: 50, radiusY: 70, height: 4 },
      { kind: 'hill', x: 0, y: -170, radiusX: 120, radiusY: 40, height: 3 },
      // A shallow swale between the lines.
      { kind: 'channel', points: [{ x: -200, y: 6 }, { x: -60, y: -4 }, { x: 60, y: 8 }, { x: 200, y: -2 }], width: 6, bank: 24, depth: 1.2 },
    ],
  },
  baseSurface: 'pasture',
  surfaces: [
    { surface: 'crop', polygon: box(-120, -62, -56, 50) },
    { surface: 'crop', polygon: box(64, -40, 124, 28) },
    { surface: 'dirt-road', strip: { points: [{ x: 22, y: 200 }, { x: 18, y: 100 }, { x: 24, y: 0 }, { x: 18, y: -100 }, { x: 22, y: -200 }], width: 4 } },
    { surface: 'dirt-road', strip: { points: [{ x: 24, y: 0 }, { x: 80, y: 6 }, { x: 132, y: 4 }], width: 3.5 } },
    { surface: 'dirt-road', strip: { points: [{ x: 18, y: 100 }, { x: -60, y: 92 }, { x: -140, y: 84 }], width: 3.5 } },
    { surface: 'mud', polygon: box(152, -54, 168, -38) },
  ],
  water: [],
  waterLevel: 0,
  bridges: [],
  ferries: [],
  vegetation: [
    // The canefield runs from the column's side to within 18 m of the west legalist bays.
    { kind: 'cane', polygon: box(-120, -62, -56, 50) },
    { kind: 'corn', polygon: box(64, -40, 124, 28) },
    // Rough grass along the swale and fence lines.
    { kind: 'tall-grass', polygon: box(-40, -16, 0, 14) },
    { kind: 'tall-grass', polygon: box(150, 110, 200, 160) },
    { kind: 'scrub', polygon: box(-200, -110, -160, -40) },
  ],
  buildings: BUILDINGS,
  covers: [
    ...LINES,
    ...BUILDINGS.map(buildingCover),
    ...fenceCovers(680, FENCES),
    ...fenceCovers(720, COFFEE_ROWS, 1.6),
  ],
  sightObstacles: [],
  deployment: {
    column: zone([-44, 0, 44], 92, -1),
    legalist: zone([-44, 0, 44], -94, 1),
  },
  props: [
    ...COFFEE,
    ...TREES,
    { model: 'cart', x: -136, y: 88, rotation: 0.4 },
    { model: 'haystack', x: 100, y: 64 },
    { model: 'haystack', x: 104, y: 68, scale: 0.8 },
    { model: 'well', x: 168, y: 80 },
  ],
  fences: FENCES,
  palette: 'temperate',
};
