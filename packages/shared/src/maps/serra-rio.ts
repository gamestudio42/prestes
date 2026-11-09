import type { CoverPoint, Vec2 } from '../protocol';
import { buildingCover, type Building } from '../world';
import { box, clutter, fenceCovers, rock, stripPolygon, trenchRun, zone, band } from './kit';
import type { BattleMap, PropPlacement, Strip } from './types';

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

/**
 * refine-battle-maps 5.7: the slopes down to the river were open for up to
 * 190 m. Fallen trees and boulders on both banks, a matacão on the legalist
 * knoll's flank, and a gully cut down the north slope toward the river
 * (a channel in the ground, with a trench's cover along its floor).
 */
const GULLY: Vec2[] = [
  { x: -62, y: -72 },
  { x: -50, y: -46 },
  { x: -44, y: -22 },
];
const BANKS = clutter(900, [
  { model: 'fallen-log', x: -42, y: 30, rotation: 0.3 },
  { model: 'boulder', x: -17, y: 27 },
  { model: 'fallen-log', x: -2, y: 33, rotation: -0.25 },
  { model: 'boulder', x: 13, y: 36 },
  { model: 'fallen-log', x: -22, y: -27, rotation: 0.2 },
  { model: 'matacao', x: 3, y: -38 },
  { model: 'fallen-log', x: 26, y: -28, rotation: 0.15 },
  { model: 'boulder', x: 42, y: -34 },
]);

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

/**
 * refine-battle-maps 5.11: veredas, wet grassy hollows running down to the
 * river with buriti in them: one on the column's bank west of the bridge
 * road, one on the legalist bank toward the ferry.
 */
const VEREDAS: Strip[] = [
  { points: [{ x: -26, y: 8 }, { x: -22, y: 40 }, { x: -34, y: 78 }], width: 20 },
  { points: [{ x: 108, y: -2 }, { x: 118, y: -50 }, { x: 146, y: -96 }], width: 20 },
];
/** How far the capim reaches from each bank's water edge (m). */
const BANK_CAPIM = 24;

for (const vereda of VEREDAS) {
  for (let index = 1; index < vereda.points.length; index += 1) {
    const a = vereda.points[index - 1]!;
    const b = vereda.points[index]!;
    for (const t of [0.35, 0.8]) {
      const side = index % 2 === 0 ? 1 : -1;
      BURITI.push({ model: 'buriti', x: a.x + (b.x - a.x) * t + side * 5, y: a.y + (b.y - a.y) * t, scale: 0.9 + t * 0.1 });
    }
  }
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
      // refine-battle-maps 5.7: a gully down the north slope.
      { kind: 'channel', points: GULLY, width: 2.5, bank: 4, depth: 1.1 },
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
    // Capim (5.11): along both banks for the river's length (it does not
    // grow in the water or on the bridge) and up the two veredas.
    { kind: 'tall-grass', polygon: stripPolygon({ points: RIVER, width: RIVER_WIDTH + 2 * BANK_CAPIM }) },
    ...VEREDAS.map((strip) => ({ kind: 'tall-grass' as const, polygon: stripPolygon(strip) })),
    // Cerrado scrub.
    { kind: 'scrub', polygon: box(100, 30, 150, 88) },
    { kind: 'scrub', polygon: box(-200, -80, -120, -26) },
    { kind: 'scrub', polygon: box(-30, 120, 30, 170) },
    { kind: 'scrub', polygon: box(-110, -60, -60, -24) },
  ],
  buildings: BUILDINGS,
  covers: [
    ...ROCKS,
    ...BANKS.covers,
    // Its floor, in pieces that each shelter their length (ids 910 to 919).
    ...trenchRun(910, GULLY, 1.25),
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
    // add-deployment-phase 1.1: fronts 65 m from the centre line, 130 m apart (out of rifle range).
    column: zone([-44, 0, 44], 96, -1, band(-190, 190, 65, 190)),
    legalist: zone([-44, 0, 44], -96, 1, band(-190, 190, -65, -190)),
  },
  props: [
    ...BURITI,
    ...BANKS.props,
    ...CERRADO_TREES,
    { model: 'rock', x: -60, y: -110, scale: 1.2 },
    { model: 'rock', x: 150, y: 110, scale: 1.1 },
    { model: 'rock', x: 180, y: -150, scale: 1.4 },
    { model: 'rock', x: -180, y: 170, scale: 1.3 },
  ],
  fences: [[{ x: -176, y: 140 }, { x: -140, y: 140 }, { x: -140, y: 160 }]],
  palette: 'cerrado',
  // pre-battle-roster 2.3: the enemy's forces, one drawn per battle when the player brings a roster.
  enemyForces: [
    { sections: ['metralhadora', 'fuzil-metralhador', 'fuzileiros', 'fuzileiros', 'esquadra-4'] },
    { sections: ['irregulares', 'irregulares', 'irregulares', 'fuzileiros', 'esquadra-4'] },
    { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] },
  ],
};
