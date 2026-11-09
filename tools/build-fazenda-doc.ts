import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  catalogObject,
  compileMapDocument,
  createEditableMap,
  FAZENDA,
  groundMaterialIndex,
  HEIGHT_SPACING,
  heightNodes,
  mapSide,
  pointInPolygon,
  setActiveMap,
  terrainHeightAt,
  toMapDocument,
  validateEditableMap,
  VEGETATION_KINDS,
  VILA_MILITAR,
  type DocLine,
  type DocObject,
  type EditableMap,
  type GroundMaterialId,
} from '../packages/shared/src';
import { AUTHORED_DIR, writeIndex } from './check-maps';

/**
 * add-map-editor, task 7.1: re-creates the hand-written Fazenda as a map
 * document with nothing but what the editor makes (height grid, paint,
 * vegetation, roads, walls and fences, catalog objects, deployment), the
 * proof that the document pipeline carries a real battlefield. Filed as a
 * campaign map so the skirmish page keeps offering the hand-written Fazenda;
 * no mission uses it. `pnpm map:fazenda-doc` rewrites it.
 *
 * What the catalog has no piece for is drawn with the nearest one: the
 * coffee rows are hedgerows (the same 1.6 m see-through cover band), the
 * communication trenches are left out (no line kind for them yet).
 */

export const ID = 'fazenda-doc';

export function buildFazendaDocument(): EditableMap {
  const map = createEditableMap({ id: ID, size: 'medium', baseMaterial: 'dry-grass', palette: 'temperate', use: 'campaign' });
  map.name = { en: 'Fazenda (editor proof)', 'pt-BR': 'Fazenda (prova do editor)' };
  map.description = {
    en: 'The Fazenda re-created in the map editor: two trench lines across pasture, cane on the west flank, corn under the casa-sede.',
    'pt-BR': 'A Fazenda refeita no editor de mapas: duas linhas de trincheira no pasto, cana no flanco oeste, milho sob a casa-sede.',
  };
  map.setting = { label: FAZENDA.setting.label, sourceNote: FAZENDA.setting.sourceNote };

  // Heights: the hand-written field sampled on the 2 m grid (roads are drawn as roads, below).
  setActiveMap(FAZENDA);
  const nodes = heightNodes(map.size);
  const half = mapSide(map.size) / 2;
  for (let row = 0; row < nodes; row += 1) {
    for (let column = 0; column < nodes; column += 1) {
      map.heights[row * nodes + column] = Math.round(terrainHeightAt(column * HEIGHT_SPACING - half, row * HEIGHT_SPACING - half) * 100);
    }
  }
  setActiveMap(VILA_MILITAR);

  // Paint and vegetation, cell by cell, from the hand-written areas.
  const side = mapSide(map.size);
  const surfaceMaterial: Partial<Record<string, GroundMaterialId>> = { crop: 'field-soil', mud: 'mud' };
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const px = x - half + 0.5;
      const py = y - half + 0.5;
      for (const area of FAZENDA.surfaces) {
        const material = surfaceMaterial[area.surface];
        if (material && area.polygon && pointInPolygon(px, py, area.polygon)) map.paint[y * side + x] = groundMaterialIndex(material);
      }
      for (const area of FAZENDA.vegetation) {
        if (pointInPolygon(px, py, area.polygon)) map.vegetation[y * side + x] = VEGETATION_KINDS.indexOf(area.kind) + 1;
      }
    }
  }

  // Roads: the dirt tracks, with the main one's ditch on its east side.
  map.roads = FAZENDA.surfaces
    .filter((area) => area.surface === 'dirt-road' && area.strip)
    .map((area, index) => ({
      id: index + 1,
      type: 'dirt-road',
      width: area.strip!.width,
      ditches: { left: false, right: index === 0 },
      points: area.strip!.points.map((point) => ({ ...point })),
    }));

  // Walls, fences and the coffee rows.
  const lines: DocLine[] = [];
  for (const cover of FAZENDA.covers) {
    if (cover.kind !== 'low-wall') continue;
    const cos = Math.cos(cover.rotation ?? 0);
    const sin = Math.sin(cover.rotation ?? 0);
    lines.push({
      id: lines.length + 1,
      kind: 'stone-wall',
      height: cover.height,
      points: [
        { x: cover.x - cos * cover.halfWidth, y: cover.y - sin * cover.halfWidth },
        { x: cover.x + cos * cover.halfWidth, y: cover.y + sin * cover.halfWidth },
      ],
    });
  }
  for (const fence of FAZENDA.fences ?? []) lines.push({ id: lines.length + 1, kind: 'wire-fence', height: 1.2, points: fence.map((point) => ({ ...point })) });
  const coffee = FAZENDA.props.filter((prop) => prop.model === 'coffee-row');
  // Coffee rows: one hedgerow per row segment of the hand-written grove (props 12 m apart on a line).
  const rows = new Map<number, { minX: number; maxX: number; y: number }[]>();
  for (const prop of coffee) {
    const key = Math.round(prop.y);
    const list = rows.get(key) ?? [];
    const run = list.find((entry) => prop.x >= entry.minX - 13 && prop.x <= entry.maxX + 13);
    if (run) {
      run.minX = Math.min(run.minX, prop.x);
      run.maxX = Math.max(run.maxX, prop.x);
    } else list.push({ minX: prop.x, maxX: prop.x, y: prop.y });
    rows.set(key, list);
  }
  for (const list of rows.values()) {
    for (const run of list) lines.push({ id: lines.length + 1, kind: 'hedgerow', height: 1.6, points: [{ x: run.minX - 6, y: run.y }, { x: run.maxX + 6, y: run.y }] });
  }
  map.lines = lines;

  // Objects: buildings, trees and props.
  const objects: DocObject[] = [];
  const add = (type: string, x: number, y: number, rotation = 0, scale?: number): void => {
    if (!catalogObject(type)) throw new Error(`no catalog object ${type}`);
    objects.push({ id: objects.length + 1, type, x, y, rotation, ...(scale && scale !== 1 ? { scale } : {}) });
  };
  for (const building of FAZENDA.buildings) add(building.model, building.x, building.y, building.rotation);
  for (const prop of FAZENDA.props) {
    if (prop.model === 'coffee-row') continue;
    add(prop.model, prop.x, prop.y, prop.rotation ?? 0, prop.scale);
  }
  map.objects = objects;

  // Trench lines (refine-map-editor 2.6): the Fazenda's own, through the same builder.
  map.trenches = (FAZENDA.trenches ?? []).map((line) => ({ ...line, points: line.points.map((point) => ({ ...point })) }));

  map.deployment = {
    column: {
      sections: FAZENDA.deployment.column.sections.map((point) => ({ ...point })),
      facing: { ...FAZENDA.deployment.column.facing },
      area: FAZENDA.deployment.column.area.map((point) => ({ ...point })),
    },
    legalist: {
      sections: FAZENDA.deployment.legalist.sections.map((point) => ({ ...point })),
      facing: { ...FAZENDA.deployment.legalist.facing },
      area: FAZENDA.deployment.legalist.area.map((point) => ({ ...point })),
    },
  };
  return map;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const map = buildFazendaDocument();
  const problems = validateEditableMap(map);
  setActiveMap(VILA_MILITAR);
  const errors = problems.filter((problem) => problem.severity === 'error');
  for (const problem of problems) console.log(`${problem.severity} ${problem.code} ${JSON.stringify(problem.params)}`);
  if (errors.length > 0) process.exit(1);
  compileMapDocument(map);
  const path = resolve(AUTHORED_DIR, `${ID}.map.json`);
  writeFileSync(path, `${JSON.stringify(toMapDocument(map), null, 1)}\n`);
  writeIndex();
  console.log(`Wrote ${path}`);
}
