import type { CoverPoint, Vec2 } from '../protocol';
import { buildingCover, type Building } from '../world';
import { barricade, box, clutter, wallLines, fenceCovers, lowWall, propRow, railLine, zone } from './kit';
import type { BattleMap, PropPlacement, SurfaceArea, VegetationArea } from './types';

/**
 * Bairro (add-battle-maps): a working-class quarter on the edge of São Paulo
 * in July 1924. Historical setting, fictional place; no civilians are on the
 * map. A Brazilian street plan: a main street of vendas and an armazém runs
 * north-south through a praça with its matriz; the cross streets are lined
 * with small one-storey houses on narrow lots, each on the street line with a
 * side passage and a long quintal behind, closed by brick walls or fences.
 * No one climbs a wall or a fence: quintais are entered by the side passages.
 * A factory and a rail embankment close the north and east; barricades close
 * the streets in front of each side's start.
 *
 * North (negative y) is the legalist side, south the column's.
 */

const EDGE = 160;
const MAIN_STREET = 14;
const STREET = 12;
const SIDE_STREETS = [-100, 100];
const CROSS_STREETS = [-90, -36, 36, 90];
/** The praça, astride the main street. */
const SQUARE = { minX: -40, maxX: 40, minY: -30, maxY: 30 };

/** A house lot's frontage, the house's width and depth. */
const LOT = 8;
const HOUSE_WIDTH = 6;
const HOUSE_DEPTH = 7;
/**
 * refine-battle-maps: the walls between quintais start this far (m) behind
 * the houses. Two neighbours' side passages meet in one gap between their
 * houses; a wall flush with the houses split that gap and, with the
 * pathfinder's clearance, shut both passages. Behind the houses the passage
 * opens on a strip from which both quintais are entered.
 */
const YARD_GATE = 2.5;

let nextId = 801;
const id = () => nextId++;

const BUILDINGS: Building[] = [];
const COVERS: CoverPoint[] = [];
const FENCES: Vec2[][] = [];
const YARDS: VegetationArea[] = [];
/** Every quintal, for the searching side (refine-battle-maps). */
const QUINTAIS: Vec2[][] = [];

/**
 * One face of a block: lots side by side along a street at `streetY`, each
 * LOT m wide, running `depth` m back toward the block's middle (`inward` +1
 * south, -1 north).
 */
function houseRow(fromX: number, toX: number, streetY: number, depth: number, inward: 1 | -1, seed: number): void {
  const count = Math.floor((toX - fromX) / LOT);
  if (count <= 0) return;
  const start = fromX + (toX - fromX - count * LOT) / 2;
  const backY = streetY + inward * depth;
  const wallFrom = streetY + inward * (HOUSE_DEPTH + 0.4);
  const dividerFrom = wallFrom + inward * YARD_GATE;
  const dividerLength = Math.abs(backY - dividerFrom);
  for (let lot = 0; lot < count; lot += 1) {
    const left = start + lot * LOT;
    // The house on the street line, its 2 m side passage alternating sides.
    const passageLeft = (lot + seed) % 2 === 0;
    BUILDINGS.push({
      id: id(),
      model: 'casa-terrea',
      x: passageLeft ? left + LOT - HOUSE_WIDTH / 2 - 0.3 : left + HOUSE_WIDTH / 2 + 0.3,
      y: streetY + inward * (HOUSE_DEPTH / 2 + 0.4),
      rotation: 0,
      halfWidth: HOUSE_WIDTH / 2,
      halfDepth: HOUSE_DEPTH / 2,
      height: 4 + ((lot * 7 + seed) % 3) * 0.3,
      front: inward === 1 ? -1 : 1,
    });
    QUINTAIS.push([...box(left, Math.min(wallFrom, backY), left + LOT, Math.max(wallFrom, backY))]);
    // The wall or fence between this quintal and the last.
    if (lot > 0) {
      if ((lot + seed) % 3 === 0) {
        FENCES.push([{ x: left, y: dividerFrom }, { x: left, y: backY }]);
      } else {
        COVERS.push(lowWall(id(), left, (dividerFrom + backY) / 2, dividerLength / 2, Math.PI / 2, 1.8));
      }
    }
    // Some quintais are let go to tall grass, or planted with corn.
    const kind = (lot * 5 + seed * 3) % 7;
    if (kind === 0 || kind === 3) {
      const near = streetY + inward * (HOUSE_DEPTH + 2);
      const far = backY - inward * 1.5;
      YARDS.push({
        kind: kind === 0 ? 'tall-grass' : 'corn',
        polygon: box(left + 1, Math.min(near, far), left + LOT - 1, Math.max(near, far)),
      });
    }
  }
  // The row's end walls and the back wall where the quintais meet.
  for (const x of [start, start + count * LOT]) {
    COVERS.push(lowWall(id(), x, (dividerFrom + backY) / 2, dividerLength / 2, Math.PI / 2, 1.8));
  }
  for (let x = start; x < start + count * LOT - 0.1; x += 12) {
    const to = Math.min(x + 12, start + count * LOT);
    COVERS.push(lowWall(id(), (x + to) / 2, backY, (to - x) / 2, 0, 1.8));
  }
}

/** Vendas, an armazém and a sobrado fronting the main street, a walled yard behind. */
function shopRow(streetEdge: number, fromY: number, toY: number, outward: 1 | -1, seed: number): void {
  const frontage = 9;
  const depth = 10;
  const count = Math.floor((toY - fromY) / frontage);
  const start = fromY + (toY - fromY - count * frontage) / 2;
  for (let shop = 0; shop < count; shop += 1) {
    const kind = (shop + seed) % 5;
    BUILDINGS.push({
      id: id(),
      model: kind === 0 ? 'armazem' : kind === 3 ? 'sobrado' : 'venda',
      x: streetEdge + outward * (depth / 2 + 0.4),
      y: start + shop * frontage + frontage / 2,
      // The long side (local x) faces the main street.
      rotation: Math.PI / 2,
      halfWidth: frontage / 2 - 0.4,
      halfDepth: depth / 2,
      height: kind === 3 ? 7.5 : 5,
      front: outward,
    });
  }
  const backX = streetEdge + outward * (depth + 7);
  for (let y = start; y < start + count * frontage - 0.1; y += 12) {
    const to = Math.min(y + 12, start + count * frontage);
    COVERS.push(lowWall(id(), backX, (y + to) / 2, (to - y) / 2, Math.PI / 2, 1.8));
  }
}

/** Block rows between the cross streets: [north edge, south edge]. */
const ROWS: Array<[number, number]> = [
  [-90 + STREET / 2, -36 - STREET / 2],
  [-36 + STREET / 2, 36 - STREET / 2],
  [36 + STREET / 2, 90 - STREET / 2],
];
const SHOP_DEPTH = 18;

let seed = 0;
for (const [north, south] of ROWS) {
  const depth = (south - north) / 2;
  const praçaRow = north < 0 && south > 0;
  for (const side of [-1, 1] as const) {
    const mainEdge = side * (MAIN_STREET / 2);
    const sideEdge = side * (100 - STREET / 2);
    if (!praçaRow) shopRow(mainEdge, north + 1, south - 1, side, seed);
    // Houses from past the shops (or the praça) out to the side street.
    const inner = praçaRow ? side * (SQUARE.maxX + 6) : mainEdge + side * (SHOP_DEPTH + 1);
    const [from, to] = side === 1 ? [inner, sideEdge] : [sideEdge, inner];
    houseRow(from, to, north, depth, 1, seed);
    houseRow(from, to, south, depth, -1, seed + 1);
    seed += 2;
  }
}

// Beyond the side streets: houses on the cross streets west; the factory east.
for (const [north, south] of [ROWS[0]!, ROWS[2]!]) {
  const depth = (south - north) / 2;
  houseRow(-EDGE + 4, -100 - STREET / 2, north, depth, 1, seed);
  houseRow(-EDGE + 4, -100 - STREET / 2, south, depth, -1, seed + 1);
  houseRow(100 + STREET / 2, EDGE - 4, north, depth, 1, seed + 2);
  seed += 3;
}

// The praça: the matriz on its north side and a coreto.
BUILDINGS.push({ id: id(), model: 'church', x: 0, y: -19, rotation: 0, halfWidth: 7, halfDepth: 9, height: 11 });
BUILDINGS.push({ id: id(), model: 'coreto', x: 0, y: 14, rotation: 0, halfWidth: 3, halfDepth: 3, height: 4 });

// The factory and its walled yard east of the praça row; warehouses by the railway.
BUILDINGS.push({ id: id(), model: 'factory', x: 134, y: -6, rotation: Math.PI / 2, halfWidth: 20, halfDepth: 12, height: 9 });
COVERS.push(
  lowWall(id(), 114, -6, 22, Math.PI / 2, 2.2),
  lowWall(id(), 134, -29, 10, 0, 2.2),
  lowWall(id(), 134, 17, 10, 0, 2.2),
);
BUILDINGS.push(
  { id: id(), model: 'warehouse', x: -90, y: -140, rotation: 0, halfWidth: 18, halfDepth: 8, height: 7 },
  { id: id(), model: 'warehouse', x: 60, y: -142, rotation: 0, halfWidth: 22, halfDepth: 8, height: 7 },
);

// Barricades across part of each north-south street, a little forward of each side's start.
for (const x of [0, -100, 100]) {
  COVERS.push(barricade(id(), x - 1.5, -79, 4));
  COVERS.push(barricade(id(), x + 1.5, 79, 4));
}

const SURFACES: SurfaceArea[] = [
  ...SIDE_STREETS.map((x): SurfaceArea => ({ surface: 'dirt-road', strip: { points: [{ x, y: -EDGE }, { x, y: EDGE }], width: STREET } })),
  ...CROSS_STREETS.map((y): SurfaceArea => ({ surface: 'dirt-road', strip: { points: [{ x: -EDGE, y }, { x: EDGE, y }], width: STREET } })),
  { surface: 'cobbles', strip: { points: [{ x: 0, y: -EDGE }, { x: 0, y: EDGE }], width: MAIN_STREET } },
  { surface: 'cobbles', polygon: box(SQUARE.minX, SQUARE.minY, SQUARE.maxX, SQUARE.maxY) },
  { surface: 'dirt-road', strip: { points: [{ x: -EDGE, y: -118 }, { x: EDGE, y: -118 }], width: 8 } },
];

/**
 * refine-battle-maps 5.7: the praça was 70 m of open cobbles astride the
 * lanes either side of the main street. A cart on its west side; on the
 * east, a venda's delivery of barrels and crates.
 */
const PRACA = clutter(5000, [
  { model: 'cart', x: -21, y: 2, rotation: 0.2 },
  { model: 'barrel', x: 18.6, y: -3 },
  { model: 'barrel', x: 19.5, y: -2.2 },
  { model: 'crate', x: 20.6, y: -3.6 },
  { model: 'crate', x: 21.3, y: -2.4, rotation: 0.3 },
]);

const PROPS: PropPlacement[] = [
  ...PRACA.props,
  ...propRow('lamp', [{ x: 8, y: -150 }, { x: 8, y: 150 }], 24),
  ...propRow('lamp', [{ x: -8, y: -150 }, { x: -8, y: 150 }], 24),
  // The tram up the main street, the railway on its embankment.
  ...railLine([{ x: 0, y: -EDGE }, { x: 0, y: EDGE }]),
  ...railLine([{ x: -EDGE, y: -119.5 }, { x: EDGE, y: -119.5 }]),
  ...railLine([{ x: -EDGE, y: -116.5 }, { x: EDGE, y: -116.5 }]),
  // Trees of the praça.
  ...propRow('tree-broad', [{ x: -34, y: -26 }, { x: -34, y: 26 }], 13, 0.9),
  ...propRow('tree-broad', [{ x: 34, y: -26 }, { x: 34, y: 26 }], 13, 0.9),
];

export const BAIRRO: BattleMap = {
  id: 'bairro',
  nameKey: 'map.bairro.name',
  descriptionKey: 'map.bairro.description',
  codexKey: 'map-bairro',
  setting: {
    label: 'historical-setting-fictional-place',
    sourceNote:
      'The São Paulo revolt of July 1924, a front separate from the column (macaulay-1974, ch. I, pp. 4-6); artillery of both sides caused civilian casualties and the loyalist bombardment from 12 July drove thousands of refugees from the city (pp. 10, 15).',
  },
  bounds: { minX: -EDGE, minY: -EDGE, maxX: EDGE, maxY: EDGE },
  height: {
    kind: 'field',
    shapes: [
      { kind: 'embankment', points: [{ x: -EDGE - 10, y: -118 }, { x: EDGE + 10, y: -118 }], width: 6, slope: 6, height: 3 },
      { kind: 'hill', x: 0, y: -160, radiusX: 260, radiusY: 140, height: 2.5 },
    ],
  },
  baseSurface: 'grass',
  surfaces: SURFACES,
  water: [],
  waterLevel: 0,
  bridges: [],
  ferries: [],
  vegetation: [
    ...YARDS,
    { kind: 'tall-grass', polygon: box(-EDGE, 100, -110, EDGE) },
    { kind: 'tall-grass', polygon: box(110, 100, EDGE, EDGE) },
  ],
  buildings: BUILDINGS,
  // refine-battle-maps 5.1: the walls are plastered, drawn by the map layer.
  covers: [...COVERS.map((cover) => (cover.kind === 'low-wall' ? { ...cover, drawnBy: 'map' as const } : cover)), ...PRACA.covers, ...fenceCovers(4000, FENCES), ...BUILDINGS.map(buildingCover)],
  sightObstacles: [],
  deployment: {
    column: zone([-60, 0, 60], 90, -1),
    legalist: zone([-60, 0, 60], -92, 1),
  },
  props: PROPS,
  fences: FENCES,
  fenceStyle: 'boards',
  lines: wallLines(COVERS.filter((cover) => cover.kind === 'low-wall'), 'brick-wall'),
  yards: QUINTAIS,
  palette: 'urban',
  // pre-battle-roster 2.3: the enemy's forces, one drawn per battle when the player brings a roster.
  enemyForces: [
    { sections: ['comando', 'esquadra-5', 'esquadra-5', 'esquadra-4', 'esquadra-4', 'esquadra-4'] },
    { sections: ['fuzileiros', 'metralhadora', 'esquadra-4', 'esquadra-4', 'irregulares'] },
    { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] },
  ],
};
