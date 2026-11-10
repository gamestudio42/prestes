import { describe, expect, it } from 'vitest';
import { buildingCover, type BattleMap, type Building, type CoverPoint } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { openField } from './open-field';
import { enter } from '../src/systems/garrison';
import type { MutableUnit } from '../src/systems/model';
import { visible } from '../src/systems/combat';
import { sees } from '../src/systems/vision';

/**
 * garrison-and-assault 1.5: the matriz's tower. A church on open ground, its
 * façade (and tower) facing +y; a quintal wall 1.8 m high 30 m in front of
 * the tower and a legalist crouched 12 m behind it.
 */
const CHURCH: Building = { id: 9101, model: 'church', x: 0, y: 0, rotation: 0, halfWidth: 7, halfDepth: 9, height: 11 };
const WALL: CoverPoint = {
  id: 9102,
  kind: 'low-wall',
  x: 0,
  y: 38,
  halfWidth: 14,
  halfDepth: 0.25,
  height: 1.8,
  radius: 14,
  quality: 0.6,
  blocksMovement: true,
  blocksSight: true,
};

function churchMap(): BattleMap {
  const base = openField();
  return { ...base, id: 'garrison-tower', buildings: [CHURCH], covers: [buildingCover(CHURCH), WALL], sightObstacles: [], yards: [], garrisonYards: [] };
}

function park(unit: MutableUnit, x: number, y: number): void {
  unit.x = x;
  unit.y = y;
  unit.targetX = x;
  unit.targetY = y;
  unit.path = [];
  unit.pathIndex = 0;
  unit.currentOrder = 'hold';
  unit.holdPosition = true;
}

function setup(insideCount: number, keepCount = insideCount) {
  const engine = new SimulationEngine({ seed: 5, scenario: 'battle3v3', sandbox: true, battleMap: churchMap() });
  const kept = engine.units.filter((unit) => unit.faction === 'column').slice(0, keepCount);
  const column = kept.slice(0, insideCount);
  const enemy = engine.units.find((unit) => unit.faction === 'legalist')!;
  const keep = new Set([...kept, enemy].map((unit) => unit.id));
  for (let index = engine.units.length - 1; index >= 0; index -= 1) if (!keep.has(engine.units[index]!.id)) engine.units.splice(index, 1);
  park(enemy, 0, 50);
  enemy.stance = 'crouched';
  enemy.holdFire = true;
  enemy.facingX = 0;
  enemy.facingY = -1;
  // The column saw him get behind the wall (4.0: posts are picked by what they see).
  engine.vision.lastSeen.column.set(enemy.id, { x: enemy.x, y: enemy.y, tick: 0 });
  const church = engine.positions.find((position) => position.id === CHURCH.id)!;
  for (const unit of column) {
    park(unit, church.entrances[0]!.x, church.entrances[0]!.y);
    expect(enter(engine, unit, church, 0, [])).toBe(true);
    unit.facingX = 0;
    unit.facingY = 1;
  }
  return { engine, column, enemy, church };
}

describe('the matriz tower (garrison-and-assault 1.5)', () => {
  it('two tower posts at the eye of 9 m, the rest of the church as before', () => {
    const { church } = setup(1);
    const tower = church.ports.filter((port) => port.tower);
    expect(tower).toHaveLength(2);
    for (const port of tower) expect(port.elevation! + 1.6).toBeCloseTo(9);
    expect(church.towerCapacity).toBe(2);
  });

  it('over the walls from the tower: a rifleman in the tower sees and can fire at a man crouched behind a 1.8 m quintal wall', () => {
    const { engine, column, enemy, church } = setup(1);
    const man = column[0]!;
    // 4.0: the wall hides the man from the ground floor, so he goes up the tower.
    engine.runTicks(1, { hash: false });
    expect(church.ports[man.port!]!.tower).toBe(true);
    expect(man.inTower).toBe(CHURCH.id);
    expect(man.elevation).toBeCloseTo(7.4);
    man.facingX = 0;
    man.facingY = 1;
    expect(sees(engine, man, enemy)).toBe(true);
    expect(visible(engine, man, enemy)).toBe(true);
    // And he is seen from the quintal in turn, the church's own walls not hiding him.
    expect(sees(engine, enemy, man)).toBe(true);
    // At a front window he would be behind the wall's line like anyone on the ground.
    const window = church.ports.filter((port) => !port.tower && port.facing.y > 0.9).sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0]!;
    man.x = window.x;
    man.y = window.y;
    delete man.elevation;
    delete man.inTower;
    expect(sees(engine, man, enemy)).toBe(false);
  });

  it('at most two in the tower: a full church of 10 keeps no more than two men in its tower', () => {
    const { engine, column } = setup(10);
    let most = 0;
    for (let tick = 0; tick < 60; tick += 1) {
      engine.runTicks(1, { hash: false });
      most = Math.max(most, column.filter((unit) => unit.inTower !== undefined).length);
    }
    expect(most).toBe(2);
    expect(column.every((unit) => unit.garrison === CHURCH.id)).toBe(true);
  });

  it('a third man finds no room in the tower even with a tower post free', () => {
    const { engine, church } = setup(0, 3);
    const tower = church.ports.filter((port) => port.tower);
    // A church whose only posts are three in the tower.
    const narrow = { ...church, id: CHURCH.id, capacity: 3, ports: [...tower, { ...tower[0]! }] };
    const men = engine.units.filter((unit) => unit.faction === 'column').slice(0, 3);
    expect(men).toHaveLength(3);
    for (const man of men) park(man, church.entrances[0]!.x, church.entrances[0]!.y);
    expect(enter(engine, men[0]!, narrow, 0, [])).toBe(true);
    expect(enter(engine, men[1]!, narrow, 0, [])).toBe(true);
    expect(enter(engine, men[2]!, narrow, 0, [])).toBe(false);
  });
});
