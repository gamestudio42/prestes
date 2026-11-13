import { NodeIO, type Document } from '@gltf-transform/core';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BuildingWall } from '../packages/shared/src';
import type { ExportedBuilding } from './export-openings';

/**
 * revise-buildings-and-stone 2.3: a building's model agrees with its battle
 * data. The art build marks every opening and every wall's two ends with an
 * empty in the building's frame:
 *
 *   <model>.door.<wall>.<n>            at the door's middle on the wall face
 *   <model>.window.<wall>.<level>.<n>  at the window's middle on the wall face
 *   <model>.wall.<wall>.a / .b         at the two ends of the wall's face
 *
 * Positions are read on the ground plane (glTF x, z), where z is local +y
 * (the street face), the frame `tools/export-openings.ts` writes. A model
 * with no markers is not checked here (the coded boxes until 3.6).
 */

export const MODEL_TOLERANCE = 0.2;

export interface ModelMarker {
  kind: 'door' | 'window';
  wall: BuildingWall;
  level: number;
  x: number;
  y: number;
}

export interface ModelWall {
  wall: BuildingWall;
  a: { x: number; y: number };
  b: { x: number; y: number };
}

export interface BuildingModelMarks {
  markers: ModelMarker[];
  walls: ModelWall[];
}

const WALLS: readonly BuildingWall[] = ['front', 'back', 'left', 'right'];

/** The corners of a wall's face in the building frame, street face +y. */
function wallEnds(building: ExportedBuilding, wall: BuildingWall): [{ x: number; y: number }, { x: number; y: number }] {
  const { halfWidth: w, halfDepth: d } = building;
  switch (wall) {
    case 'front':
      return [{ x: -w, y: d }, { x: w, y: d }];
    case 'back':
      return [{ x: -w, y: -d }, { x: w, y: -d }];
    case 'left':
      return [{ x: -w, y: -d }, { x: -w, y: d }];
    case 'right':
      return [{ x: w, y: -d }, { x: w, y: d }];
  }
}

const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) <= MODEL_TOLERANCE;

/** What is wrong between a building's battle data and its model's marks, one line each. */
export function buildingModelProblems(building: ExportedBuilding, marks: BuildingModelMarks): string[] {
  const problems: string[] = [];
  const name = building.model;
  for (const kind of ['door', 'window'] as const) {
    const expected = (kind === 'door' ? building.doors : building.windows).map((opening) => ({ ...opening, matched: false }));
    for (const marker of marks.markers.filter((entry) => entry.kind === kind)) {
      const match = expected.find((opening) => !opening.matched && opening.wall === marker.wall && opening.level === marker.level && near(opening, marker));
      if (match) match.matched = true;
      else problems.push(`${name}: the model has a ${kind} on the ${marker.wall} wall (level ${marker.level}) the battle does not`);
    }
    for (const opening of expected.filter((entry) => !entry.matched)) {
      problems.push(`${name}: the battle's ${kind} on the ${opening.wall} wall (level ${opening.level}) is not on the model`);
    }
  }
  for (const wall of WALLS) {
    const drawn = marks.walls.find((entry) => entry.wall === wall);
    if (!drawn) {
      problems.push(`${name}: the ${wall} wall is not marked on the model`);
      continue;
    }
    const [a, b] = wallEnds(building, wall);
    const fits = (near(drawn.a, a) && near(drawn.b, b)) || (near(drawn.a, b) && near(drawn.b, a));
    if (!fits) problems.push(`${name}: the ${wall} wall is off the footprint by more than ${MODEL_TOLERANCE} m`);
  }
  return problems;
}

const MARKER = /^(?<model>[a-z0-9-]+)\.(?:(?<kind>door|window)\.(?<wall>front|back|left|right)(?:\.(?<level>\d+))?\.\d+|wall\.(?<side>front|back|left|right)\.(?<end>[ab]))$/;

/** The marks of every building in a model file, by model name. */
export function readBuildingMarks(document: Document): Map<string, BuildingModelMarks> {
  const marks = new Map<string, BuildingModelMarks>();
  const ends = new Map<string, Partial<Record<'a' | 'b', { x: number; y: number }>>>();
  const of = (model: string) => {
    let entry = marks.get(model);
    if (!entry) marks.set(model, (entry = { markers: [], walls: [] }));
    return entry;
  };
  for (const node of document.getRoot().listNodes()) {
    const found = MARKER.exec(node.getName());
    if (!found?.groups) continue;
    const [x, , z] = node.getWorldTranslation();
    const at = { x: x!, y: z! };
    const { model, kind, wall, level, side, end } = found.groups;
    if (kind) of(model!).markers.push({ kind: kind as 'door' | 'window', wall: wall as BuildingWall, level: Number(level ?? 0), ...at });
    else {
      const key = `${model}.${side}`;
      ends.set(key, { ...ends.get(key), [end!]: at });
    }
  }
  for (const [key, pair] of ends) {
    const [model, wall] = key.split('.') as [string, BuildingWall];
    if (pair.a && pair.b) of(model).walls.push({ wall, a: pair.a, b: pair.b });
  }
  return marks;
}

/** Checks every marked building of a model file against the exported battle data. */
export async function buildingFileProblems(file: string, buildings: readonly ExportedBuilding[]): Promise<string[]> {
  // revise-buildings-and-stone 6.1: the game's buildings come split by group
  // (buildings-rural.glb and so on) beside where the one file stood.
  const files = existsSync(file) ? [file] : readdirSync(dirname(file)).filter((name) => /^buildings-[a-z]+\.glb$/.test(name)).map((name) => join(dirname(file), name));
  if (files.length === 0) return [`${file}: no building model files`];
  const marks = new Map<string, BuildingModelMarks>();
  for (const part of files) for (const [model, entry] of readBuildingMarks(await new NodeIO().read(part))) marks.set(model, entry);
  const problems: string[] = [];
  for (const [model, entry] of marks) {
    const building = buildings.find((candidate) => candidate.model === model);
    if (!building) problems.push(`${model}: marked in the model but not a catalog building`);
    else problems.push(...buildingModelProblems(building, entry));
  }
  return problems;
}
