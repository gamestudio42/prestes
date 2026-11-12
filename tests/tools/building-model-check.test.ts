import { Document } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { catalogObject } from '../../packages/shared/src';
import { buildingModelProblems, readBuildingMarks, type BuildingModelMarks } from '../../tools/building-model-check';
import { exportBuilding } from '../../tools/export-openings';

// revise-buildings-and-stone 2.3: the model check against the battle's openings and footprint.

const farmhouse = exportBuilding(catalogObject('farmhouse')!);

/** The marks a faithful model of this building would carry. */
function faithful(): BuildingModelMarks {
  const { halfWidth: w, halfDepth: d } = farmhouse;
  return {
    markers: [
      ...farmhouse.doors.map((door) => ({ kind: 'door' as const, wall: door.wall, level: door.level, x: door.x, y: door.y })),
      ...farmhouse.windows.map((window) => ({ kind: 'window' as const, wall: window.wall, level: window.level, x: window.x + 0.05, y: window.y })),
    ],
    walls: [
      { wall: 'front', a: { x: -w, y: d }, b: { x: w, y: d } },
      { wall: 'back', a: { x: w, y: -d }, b: { x: -w, y: -d } },
      { wall: 'left', a: { x: -w, y: -d }, b: { x: -w, y: d } },
      { wall: 'right', a: { x: w, y: -d }, b: { x: w, y: d + 0.1 } },
    ],
  };
}

describe('building model check', () => {
  it('a model that agrees with the battle (within 0.2 m) passes', () => {
    expect(buildingModelProblems(farmhouse, faithful())).toEqual([]);
  });

  it('a missing window, an extra door and a wall off its footprint each fail, naming the building and wall', () => {
    const marks = faithful();
    const front = marks.markers.findIndex((marker) => marker.kind === 'window' && marker.wall === 'front');
    marks.markers.splice(front, 1);
    marks.markers.push({ kind: 'door', wall: 'left', level: 0, x: -farmhouse.halfWidth, y: 0 });
    marks.walls[3] = { wall: 'right', a: { x: farmhouse.halfWidth + 0.5, y: -farmhouse.halfDepth }, b: { x: farmhouse.halfWidth + 0.5, y: farmhouse.halfDepth } };
    expect(buildingModelProblems(farmhouse, marks)).toEqual([
      'farmhouse: the model has a door on the left wall (level 0) the battle does not',
      "farmhouse: the battle's window on the front wall (level 0) is not on the model",
      'farmhouse: the right wall is off the footprint by more than 0.2 m',
    ]);
  });

  it('reads the marks from a model file: opening empties and wall ends on the ground plane', () => {
    const document = new Document();
    const scene = document.createScene();
    const empty = (name: string, x: number, z: number) => scene.addChild(document.createNode(name).setTranslation([x, 1.2, z]));
    empty('farmhouse.door.front.0', 0, 2.85);
    empty('farmhouse.window.left.1.0', -4.35, 0.5);
    empty('farmhouse.wall.front.a', -4.35, 2.85);
    empty('farmhouse.wall.front.b', 4.35, 2.85);
    empty('farmhouse-roof', 0, 0);
    const marks = readBuildingMarks(document).get('farmhouse')!;
    expect(marks.markers).toEqual([
      { kind: 'door', wall: 'front', level: 0, x: 0, y: 2.85 },
      { kind: 'window', wall: 'left', level: 1, x: -4.35, y: 0.5 },
    ]);
    expect(marks.walls).toEqual([{ wall: 'front', a: { x: -4.35, y: 2.85 }, b: { x: 4.35, y: 2.85 } }]);
    expect(readBuildingMarks(document).size).toBe(1);
  });
});
