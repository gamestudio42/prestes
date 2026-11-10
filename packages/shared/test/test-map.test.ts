import { describe, expect, it } from 'vitest';
import { battleMap, loadAuthoredMap, longestCoverGap, positionsFor, type Vec2 } from '../src';

// author-game-maps 2.1: the test map holds every garrison feature and the ford within reach of the column.

const TEST_MAP = 'campo-de-provas';
const near = (point: Vec2, sections: readonly Vec2[]) => Math.min(...sections.map((s) => Math.sqrt((s.x - point.x) ** 2 + (s.y - point.y) ** 2)));

describe('the test map', () => {
  it('garrisons and a ford close at hand: house, sobrado, church tower, trench, walled yard and ford within 150 m of a column section', async () => {
    await loadAuthoredMap(TEST_MAP);
    const map = battleMap(TEST_MAP);
    const sections = map.deployment.column.sections;
    const positions = positionsFor(map);
    const building = (model: string) => positions.find((position) => position.model === model);
    for (const model of ['casa-terrea', 'sobrado', 'church']) {
      const position = building(model);
      expect(position, model).toBeDefined();
      expect(near(position!, sections), model).toBeLessThan(150);
    }
    expect(building('church')!.towerCapacity).toBe(2);
    expect(building('sobrado')!.ports.some((port) => (port.level ?? 0) > 0)).toBe(true);
    const trench = positions.find((position) => position.kind === 'trench-line');
    expect(trench).toBeDefined();
    expect(Math.min(...trench!.ports.map((port) => near(port, sections)))).toBeLessThan(150);
    // The walled yard: high stone walls on three sides near the column.
    const yardWalls = map.covers.filter((cover) => cover.kind !== 'building' && cover.height >= 1.5 && near(cover, sections) < 80);
    expect(yardWalls.length).toBeGreaterThanOrEqual(3);
    const ford = map.water.find((area) => area.kind === 'ford');
    expect(ford).toBeDefined();
    // A river's ford: the middle of its two ends, one on each bank.
    const [a, b] = ford!.ends!;
    const fordCentre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    expect(near(fordCentre, sections)).toBeLessThan(150);
  });

  it('no stretch over 60 m without cover between the deployment areas', async () => {
    await loadAuthoredMap(TEST_MAP);
    const map = battleMap(TEST_MAP);
    const centre = (points: readonly Vec2[]) => ({ x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length });
    expect(longestCoverGap(map, centre(map.deployment.column.sections), centre(map.deployment.legalist.sections)).length).toBeLessThanOrEqual(60);
  });
});
