import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  objectiveCircle,
  type Objective,
  boundsForSize,
  createEditableMap,
  defaultDeploymentArea,
  heightNodes,
  HEIGHT_SPACING,
  toMapDocument,
  type EditableMap,
  type Vec2,
} from '../packages/shared/src';
import { AUTHORED_DIR, writeIndex } from './check-maps';

/**
 * author-game-maps 2.1: builds the test map `campo-de-provas` (a map
 * document, `use: 'test'`) from code, so its layout is reviewable and can be
 * rebuilt on purpose. After that it is an ordinary document: the editor opens
 * and saves it like any map. Run: `npx tsx tools/make-test-map.ts`.
 *
 * Layout (medium map, ±200 m; +y is south): the column deploys in the south
 * (y +95), the legalists in the north (y −75).
 * - by the column: a lane, a casa-térrea and a sobrado, a walled yard;
 * - the middle: two stone walls, a stream with a ford and a plank bridge,
 *   rocks and logs by its banks, a picket fence;
 * - toward the legalists: the church with its tower on a small rise (the
 *   praça), a farmhouse, and a fire trench and sandbag rows
 *   13–20 m before the legalists' points (their defensive line);
 * - open ground left by the ford and beside the praça for objectives.
 * Every garrison feature and the ford lie within 150 m of a column section.
 */

export const TEST_MAP_ID = 'campo-de-provas';

export function buildTestMap(): EditableMap {
  const map = createEditableMap({
    id: TEST_MAP_ID,
    size: 'medium',
    use: 'test',
    baseMaterial: 'dry-grass',
    palette: 'temperate',
    name: { en: 'Proving ground (test map)', 'pt-BR': 'Campo de provas (mapa de teste)' },
  });
  map.description = {
    en: 'Test map: houses, a sobrado, the church tower, a trench, a walled yard and a ford within reach.',
    'pt-BR': 'Mapa de teste: casas, sobrado, torre da igreja, trincheira, pátio murado e vau ao alcance.',
  };
  map.setting = { label: 'training-ground', sourceNote: 'Test ground for the game systems; not a historical place.' };
  map.light = { time: 15, bearing: 250 };
  // The enemy's forces when the player brings a roster: one drawn per battle.
  map.enemyForces = [
    // Three rifle sections first: the seeded draw of the e2e and the reports fields them (33 men, as before).
    { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] },
    { sections: ['comando', 'metralhadora', 'fuzileiros', 'fuzileiros'] },
    { sections: ['irregulares', 'irregulares', 'fuzileiros', 'esquadra-5', 'esquadra-4'] },
  ];

  // add-map-objectives 1.4 (design.md table): the crossings in the middle,
  // the church (highest value) on the legalist bank, so the column must cross.
  const objective = (id: number, pt: string, en: string, x: number, y: number, radius: number, value: number, owner: Objective['owner']): Objective => ({
    id,
    name: { en, 'pt-BR': pt },
    area: objectiveCircle({ x, y }, radius),
    flag: { x, y },
    value,
    owner,
  });
  map.objectives = [
    objective(1, 'Ponte', 'Bridge', 60, 7, 16, 2, 'neutral'),
    objective(2, 'Vau', 'Ford', -56, 4, 16, 2, 'neutral'),
    objective(3, 'Igreja', 'Church', 70, -40, 18, 3, 'legalist'),
    objective(4, 'Trincheira', 'Trench', -45, -55, 18, 1, 'legalist'),
    objective(5, 'Casario', 'Houses', -30, 60, 20, 1, 'column'),
  ];

  // Relief: the praça on a 2 m rise, a low ridge on the east flank.
  const bounds = boundsForSize(map.size);
  const nodes = heightNodes(map.size);
  const hill = (cx: number, cy: number, radius: number, height: number) => {
    for (let row = 0; row < nodes; row += 1) {
      for (let col = 0; col < nodes; col += 1) {
        const x = bounds.minX + col * HEIGHT_SPACING;
        const y = bounds.minY + row * HEIGHT_SPACING;
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / radius;
        if (d >= 1) continue;
        const rise = height * 0.5 * (1 + Math.cos(Math.PI * d));
        map.heights[row * nodes + col] = Math.round(map.heights[row * nodes + col]! + rise * 100);
      }
    }
  };
  hill(70, -40, 38, 2);
  hill(165, -10, 45, 6);
  hill(-170, 60, 40, 4);

  let id = 1;
  const object = (type: string, x: number, y: number, rotation = 0) => map.objects.push({ id: id++, type, x, y, rotation });
  const line = (kind: EditableMap['lines'][number]['kind'], height: number, points: Vec2[]) => map.lines.push({ id: id++, kind, height, points });

  // By the column.
  map.roads.push({ id: id++, type: 'dirt-road', width: 5, ditches: { left: false, right: false }, points: [{ x: -150, y: 72 }, { x: 80, y: 72 }] });
  object('casa-terrea', -45, 60, Math.PI);
  object('sobrado', -18, 60, Math.PI);
  // The walled yard, open on its lane side.
  line('stone-wall', 1.6, [{ x: 18, y: 66 }, { x: 18, y: 46 }, { x: 48, y: 46 }, { x: 48, y: 66 }]);
  line('stone-wall', 1.6, [{ x: 18, y: 66 }, { x: 28, y: 66 }]);
  line('stone-wall', 1.6, [{ x: 38, y: 66 }, { x: 48, y: 66 }]);
  object('well', 33, 56);

  // The middle: walls, the stream, its crossings and banks.
  object('woodpile', 2, 68, 0);
  line('stone-wall', 1.2, [{ x: -150, y: 32 }, { x: -62, y: 32 }]);
  line('stone-wall', 1.2, [{ x: -38, y: 32 }, { x: 20, y: 32 }]);
  line('stone-wall', 1.2, [{ x: 26, y: 32 }, { x: 90, y: 32 }]);
  line('stone-wall', 1.2, [{ x: 96, y: 32 }, { x: 150, y: 32 }]);
  map.rivers.push({ id: id++, width: 8, points: [{ x: -200, y: 6 }, { x: -72, y: 4 }, { x: -40, y: 4 }, { x: 200, y: 8 }], kinds: ['deep', 'ford', 'deep'] });
  map.bridges.push({ id: id++, x: 60, y: 7, rotation: 0, halfWidth: 2, halfDepth: 9, deckHeight: 1.6 });
  object('matacao', -95, 16, 0.4);
  object('fallen-log', 2, 15, 0.1);
  object('matacao', 6, -6, 1.1);
  object('fallen-log', 100, -5, -0.2);
  // Rocks and logs on the far bank: cover every 60 m or less along the attack lanes.
  object('fallen-log', -40, -10, 0.2);
  object('matacao', -20, -12, 0.7);
  object('fallen-log', 22, -10, -0.1);
  object('matacao', 42, -12, 0.3);
  object('bush', -120, -8);
  object('bush', 130, 18);
  // Lines have 6 m gates every 60 m or so: a wall or fence across the whole
  // field would send every route round its ends (and the route search with it).
  for (const [from, to] of [[-130, -70], [-64, -10], [-4, 50], [56, 130]] as const) line('picket-fence', 1.1, [{ x: from, y: -20 }, { x: to, y: -20 }]);

  // Toward the legalists: the praça and its church, the farmhouse, the trench.
  object('church', 70, -40, 0);
  object('farmhouse', -95, -52, 0.1);
  object('haystack', -112, -40);
  map.trenches.push({ id: id++, kind: 'fire', depth: 1.2, facing: 'right', bays: true, parapet: 'earth', points: [{ x: -72, y: -55 }, { x: -18, y: -55 }] });
  // The legalists' line: sandbag rows 13 m before their centre and right sections.
  for (const centre of [0, 44]) for (let x = centre - 14; x <= centre + 14; x += 2.8) object('sandbags', Math.round(x * 10) / 10, -62, 0);
  object('cart', 4, -92, 0.6);
  object('cart', 90, -60, 0.6);

  // Deployment: three section points a side, 170 m apart; the legalists'
  // trench and sandbag rows lie 13–20 m before their points (their defensive line).
  const column = [-44, 0, 44].map((x) => ({ x, y: 95 }));
  const legalist = [-44, 0, 44].map((x) => ({ x, y: -75 }));
  map.deployment = {
    column: { sections: column, facing: { x: 0, y: -1 }, area: defaultDeploymentArea(bounds, column, legalist) },
    legalist: { sections: legalist, facing: { x: 0, y: 1 }, area: defaultDeploymentArea(bounds, legalist, column) },
  };
  return map;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve(AUTHORED_DIR, `${TEST_MAP_ID}.map.json`);
  writeFileSync(path, `${JSON.stringify(toMapDocument(buildTestMap()), null, 1)}\n`);
  writeIndex();
  console.log(`Test map written: ${path}`);
}
