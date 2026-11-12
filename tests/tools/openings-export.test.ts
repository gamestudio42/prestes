import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildingOpenings, buildingTower, catalogObject, windowHeight, windowMiddleHeight, type BuildingModel } from '../../packages/shared/src';
import { exportBuilding, exportOpenings, OPENINGS_JSON } from '../../tools/export-openings';

// revise-buildings-and-stone 2.1: the art build reads the battle's openings.

describe('openings export', () => {
  it('a farmhouse, a sobrado and the church carry exactly the battle openings', () => {
    for (const id of ['farmhouse', 'sobrado', 'church'] as const) {
      const entry = catalogObject(id)!;
      const building = { model: id as BuildingModel, halfWidth: entry.halfWidth, halfDepth: entry.halfDepth, height: entry.height, front: 1 as const };
      const battle = buildingOpenings(building);
      const exported = exportBuilding(entry);
      expect(exported.doors.map(({ wall, x, y }) => [wall, x, y])).toEqual(battle.doors.map(({ wall, x, y }) => [wall, expect.closeTo(x, 3), expect.closeTo(y, 3)]));
      expect(exported.windows).toHaveLength(battle.windows.length);
      for (const [index, window] of battle.windows.entries()) {
        const out = exported.windows[index]!;
        expect([out.wall, out.level]).toEqual([window.wall, window.level]);
        expect(out.x).toBeCloseTo(window.x, 3);
        expect(out.y).toBeCloseTo(window.y, 3);
        const height = windowHeight(battle, window, id);
        expect(out.sill + out.height / 2).toBeCloseTo(windowMiddleHeight(battle, window, id), 3);
        expect(out.height).toBeCloseTo(height, 3);
      }
      expect(exported.tower).toEqual(buildingTower(building));
    }
    expect(exportBuilding(catalogObject('sobrado')!).upper).toBe('storey');
    expect(exportBuilding(catalogObject('engenho')!).upper).toBe('loft');
    expect(exportBuilding(catalogObject('farmhouse')!).upper).toBeNull();
  });

  it('the committed openings file is the current export (run tools/export-openings.ts)', () => {
    expect(JSON.parse(readFileSync(OPENINGS_JSON, 'utf8'))).toEqual(exportOpenings());
  });
});
