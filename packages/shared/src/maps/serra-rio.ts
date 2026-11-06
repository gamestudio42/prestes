import type { CoverPoint, Vec2 } from '../protocol';
import { buildingCover, type Building } from '../world';
import { box, fenceCovers, rock, zone } from './kit';
import type { BattleMap, PropPlacement } from './types';

/**
 * Serra e Rio (add-battle-maps): highland river country of Goiás and Minas
 * Gerais, 1925-1926. Historical setting, fictional place. A river too deep
 * to wade crosses the map between the two sides; it is crossed only at a
 * ford (west), a wooden bridge (centre) and a cable ferry (east). Two hill
 * masses overlook it; capim, cerrado scrub and buriti palms line the banks.
 *
 * North (negative y) is the legalist bank, south the column's.
 */

/** The river's course, west to east. */
const RIVER: Vec2[] = [
  { x: -220, y: -10 },
  { x: -140, y: 8 },
  { x: -60, y: -6 },
  { x: 20, y: 10 },
  { x: 100, y: -4 },
  { x: 160, y: 6 },
  { x: 220, y: -8 },
];
const RIVER_WIDTH = 18;

const BUILDINGS: Building[] = [
  { id: 701, model: 'ferry-house', x: 142, y: 28, rotation: 0.1, halfWidth: 3.2, halfDepth: 2.6, height: 3.8 },
  { id: 702, model: 'farmhouse', x: -160, y: 150, rotation: -0.3, halfWidth: 4.35, halfDepth: 2.85, height: 4.8 },
  { id: 703, model: 'colonist-house', x: 70, y: -150, rotation: 0.2, halfWidth: 3.6, halfDepth: 3, height: 4.2 },
];

/** Rocks on the slopes and on each side's bank line. */
const ROCKS: CoverPoint[] = [
  // Outcrops on the hill masses: tall, they block sight.
  rock(720, -96, -118, 4, 3, 2.6),
  rock(721, -70, -132, 3, 2.5, 2.2),
  rock(722, -120, -100, 3.5, 2, 2.0),
  rock(723, 104, 116, 4, 3, 2.6),
  rock(724, 132, 132, 3, 3, 2.2),
  rock(725, 84, 136, 3, 2, 2.0),
  // The legalist line: low rocks and boulders a little forward of each section.
  ...[-44, 0, 44].flatMap((x, index): CoverPoint[] => [
    rock(730 + index * 4, x - 8, -84, 2.2, 1, 1.1),
    rock(731 + index * 4, x, -83, 2.6, 1, 1.0),
    rock(732 + index * 4, x + 8, -84, 2.2, 1, 1.1),
  ]),
  // The column's: the same on the south bank's rise.
  ...[-44, 0, 44].flatMap((x, index): CoverPoint[] => [
    rock(750 + index * 4, x - 8, 84, 2.2, 1, 1.1),
    rock(751 + index * 4, x, 83, 2.6, 1, 1.0),
    rock(752 + index * 4, x + 8, 84, 2.2, 1, 1.1),
  ]),
  // Banks at the crossings.
  rock(770, -138, -18, 2.4, 1.2, 1.2),
  rock(771, -162, 26, 2.4, 1.2, 1.2),
  rock(772, 8, -10, 2, 1, 1.1),
  rock(773, 32, 30, 2, 1, 1.1),
];

/** Buriti palms along both banks, every 22 m, kept off the crossings. */
const BURITI: PropPlacement[] = [];
for (let x = -196; x <= 196; x += 22) {
  const crossing = Math.abs(x + 150) < 14 || Math.abs(x - 20) < 12 || Math.abs(x - 130) < 14;
  if (crossing) continue;
  const y = riverY(x);
  BURITI.push({ model: 'buriti', x, y: y - 16 - (Math.abs(x) % 7), scale: 0.9 + (Math.abs(x) % 5) * 0.06 });
  BURITI.push({ model: 'buriti', x: x + 9, y: y + 16 + (Math.abs(x) % 5), scale: 0.85 + (Math.abs(x) % 3) * 0.08 });
}

function riverY(x: number): number {
  for (let index = 1; index < RIVER.length; index += 1) {
    const a = RIVER[index - 1]!;
    const b = RIVER[index]!;
    if (x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return 0;
}

const CERRADO_TREES: PropPlacement[] = [
  [150, 50],
  [176, 70],
  [120, 74],
  [-170, -50],
  [-140, -66],
  [-186, -36],
  [-10, 140],
  [20, 156],
  [-30, -150],
  [10, -170],
  [180, -60],
  [-60, 60],
].map(([x, y]): PropPlacement => ({ model: 'cerrado-tree', x: x!, y: y!, scale: 1 }));

export const SERRA_RIO: BattleMap = {
  id: 'serra-rio',
  nameKey: 'map.serraRio.name',
  descriptionKey: 'map.serraRio.description',
  codexKey: 'map-serra-rio',
  setting: {
    label: 'historical-setting-fictional-place',
    sourceNote:
      'The Verdinho Bridge at Mineiros, Goiás, June 1925: a burned bridge, a waded river and a ford cut into the banks (macaulay-1974, pp. 122-124); ferries and boats on the southern rivers (pp. 74, 93).',
  },
  bounds: { minX: -200, minY: -200, maxX: 200, maxY: 200 },
  height: {
    kind: 'field',
    shapes: [
      // The two hill masses: the legalist one north-west, the column's south-east.
      { kind: 'hill', x: -90, y: -125, radiusX: 75, radiusY: 50, height: 18 },
      { kind: 'ridge', points: [{ x: -170, y: -150 }, { x: -60, y: -170 }, { x: 20, y: -160 }], width: 40, height: 8 },
      { kind: 'hill', x: 110, y: 125, radiusX: 75, radiusY: 55, height: 16 },
      { kind: 'ridge', points: [{ x: 40, y: 175 }, { x: 140, y: 170 }, { x: 200, y: 150 }], width: 40, height: 7 },
      // Knolls on each bank that hide a section.
      { kind: 'hill', x: -10, y: -55, radiusX: 26, radiusY: 18, height: 5 },
      { kind: 'hill', x: 70, y: 60, radiusX: 28, radiusY: 18, height: 5 },
      { kind: 'hill', x: -110, y: 70, radiusX: 30, radiusY: 22, height: 4 },
      // The river valley.
      { kind: 'channel', points: RIVER, width: RIVER_WIDTH, bank: 10, depth: 3 },
    ],
  },
  baseSurface: 'grass',
  surfaces: [
    { surface: 'dirt-road', strip: { points: [{ x: 20, y: 200 }, { x: 24, y: 100 }, { x: 20, y: 24 }], width: 3.5 } },
    { surface: 'dirt-road', strip: { points: [{ x: 20, y: -4 }, { x: 14, y: -100 }, { x: 22, y: -200 }], width: 3.5 } },
    { surface: 'dirt-road', strip: { points: [{ x: -150, y: 24 }, { x: -120, y: 100 }, { x: -60, y: 200 }], width: 3 } },
    { surface: 'dirt-road', strip: { points: [{ x: -150, y: -14 }, { x: -110, y: -60 }, { x: -60, y: -90 }], width: 3 } },
    { surface: 'mud', strip: { points: RIVER, width: RIVER_WIDTH + 6 } },
  ],
  water: [
    { kind: 'deep', strip: { points: RIVER, width: RIVER_WIDTH } },
    // The ford: a gravel bar across the river.
    {
      kind: 'ford',
      polygon: box(-157, -8, -143, 20),
      ends: [
        { x: -150, y: 24 },
        { x: -150, y: -12 },
      ],
    },
  ],
  waterLevel: -1.4,
  bridges: [{ id: 1, x: 20, y: 10, rotation: 0, halfWidth: 2.2, halfDepth: 15, deckHeight: 2.4 }],
  ferries: [{ id: 1, landingA: { x: 130, y: 17 }, landingB: { x: 130, y: -15 } }],
  vegetation: [
    // Capim: wide patches on both banks.
    { kind: 'tall-grass', polygon: box(-200, 30, -130, 120) },
    { kind: 'tall-grass', polygon: box(-60, 36, 10, 76) },
    { kind: 'tall-grass', polygon: box(-40, -170, 40, -110) },
    { kind: 'tall-grass', polygon: box(60, -120, 180, -40) },
    { kind: 'tall-grass', polygon: box(150, 20, 200, 60) },
    // Cerrado scrub.
    { kind: 'scrub', polygon: box(100, 30, 150, 88) },
    { kind: 'scrub', polygon: box(-200, -80, -120, -26) },
    { kind: 'scrub', polygon: box(-30, 120, 30, 170) },
    { kind: 'scrub', polygon: box(-110, -60, -60, -24) },
  ],
  buildings: BUILDINGS,
  covers: [
    ...ROCKS,
    // The outcrops drawn as props are hard obstacles too.
    rock(780, -60, -110, 2.6, 2.2, 2),
    rock(781, 150, 110, 2.4, 2, 2),
    rock(782, 180, -150, 3, 2.6, 2.4),
    rock(783, -180, 170, 2.8, 2.4, 2.2),
    ...BUILDINGS.map(buildingCover),
    ...fenceCovers(790, [[{ x: -176, y: 140 }, { x: -140, y: 140 }, { x: -140, y: 160 }]]),
  ],
  sightObstacles: [],
  deployment: {
    column: zone([-44, 0, 44], 96, -1),
    legalist: zone([-44, 0, 44], -96, 1),
  },
  props: [
    ...BURITI,
    ...CERRADO_TREES,
    { model: 'rock', x: -60, y: -110, scale: 1.2 },
    { model: 'rock', x: 150, y: 110, scale: 1.1 },
    { model: 'rock', x: 180, y: -150, scale: 1.4 },
    { model: 'rock', x: -180, y: 170, scale: 1.3 },
  ],
  fences: [[{ x: -176, y: 140 }, { x: -140, y: 140 }, { x: -140, y: 160 }]],
  palette: 'cerrado',
};
