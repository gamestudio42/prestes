import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildingOpenings,
  buildingTower,
  CATALOG_OBJECTS,
  windowHeight,
  windowMiddleHeight,
  type BuildingModel,
  type BuildingTower,
  type BuildingWall,
  type CatalogObject,
} from '../packages/shared/src';

/**
 * revise-buildings-and-stone 2.1 (D1): the battle's doors, windows, upper
 * floors and towers of every catalog building, in the building's own frame
 * with its street face toward local +y, as JSON for the art build
 * (`art-src/blender/target_buildings.py` cuts them from it), so a model and
 * the battle never keep two copies of the openings.
 *
 *   pnpm exec tsx tools/export-openings.ts [out.json]
 */

export interface ExportedOpening {
  wall: BuildingWall;
  /** Local point on the wall's face (m): x along the width, y along the depth. */
  x: number;
  y: number;
  outX: number;
  outY: number;
  width: number;
  height: number;
  /** Height of the opening's sill above the ground (m); 0 for a door. */
  sill: number;
  level: number;
}

export interface ExportedBuilding {
  model: BuildingModel;
  halfWidth: number;
  halfDepth: number;
  height: number;
  /** Height of the walls (m); the roof starts there. */
  wall: number;
  storey: number;
  storeys: number;
  upper: 'storey' | 'loft' | null;
  doors: ExportedOpening[];
  windows: ExportedOpening[];
  tower: BuildingTower | null;
}

const WINDOW_WIDTH = 0.8;
const round = (value: number) => Math.round(value * 1000) / 1000;

export function exportBuilding(entry: CatalogObject): ExportedBuilding {
  const model = entry.model as BuildingModel;
  const building = { model, halfWidth: entry.halfWidth, halfDepth: entry.halfDepth, height: entry.height, front: 1 as const };
  const openings = buildingOpenings(building);
  return {
    model,
    halfWidth: entry.halfWidth,
    halfDepth: entry.halfDepth,
    height: entry.height,
    wall: round(openings.wall),
    storey: round(openings.storey),
    storeys: openings.storeys,
    upper: openings.storeys > 1 ? 'storey' : openings.windows.some((window) => window.level > 0) ? 'loft' : null,
    doors: openings.doors.map((door) => ({
      wall: door.wall,
      x: round(door.x),
      y: round(door.y),
      outX: door.outX,
      outY: door.outY,
      width: door.width,
      height: round(door.height),
      sill: 0,
      level: 0,
    })),
    windows: openings.windows.map((window) => {
      const height = windowHeight(openings, window, model);
      return {
        wall: window.wall,
        x: round(window.x),
        y: round(window.y),
        outX: window.outX,
        outY: window.outY,
        width: WINDOW_WIDTH,
        height: round(height),
        sill: round(windowMiddleHeight(openings, window, model) - height / 2),
        level: window.level,
      };
    }),
    tower: buildingTower(building),
  };
}

/** Every catalog building, in catalog order. */
export function exportOpenings(catalog: readonly CatalogObject[] = CATALOG_OBJECTS): ExportedBuilding[] {
  return catalog.filter((entry) => entry.group === 'building').map(exportBuilding);
}

export const OPENINGS_JSON = fileURLToPath(new URL('../art-src/blender/openings.json', import.meta.url));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] ?? OPENINGS_JSON);
  mkdirSync(dirname(out), { recursive: true });
  const buildings = exportOpenings();
  writeFileSync(out, `${JSON.stringify(buildings, null, 2)}\n`);
  console.log(`${buildings.length} buildings' openings written to ${out}`);
}
