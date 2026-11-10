import { describe, expect, it } from 'vitest';
import { buildingCover, type BattleMap, type Building, type CoverPoint } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { openField } from './open-field';
import { enter } from '../src/systems/garrison';
import type { MutableUnit } from '../src/systems/model';

/**
 * garrison-and-assault 4.0: post filling. A building faces +y on open
 * ground; an enemy stands or crouches out in front, with or without a 1.8 m
 * quintal wall between. The men going in take the posts that see him: up
 * when the wall hides him from the ground floor, down when it does not.
 */
function wall(y: number): CoverPoint {
  return { id: 9302, kind: 'low-wall', x: 0, y, halfWidth: 16, halfDepth: 0.25, height: 1.8, radius: 16, quality: 0.6, blocksMovement: true, blocksSight: true };
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

function setup(building: Building, options: { wallAt?: number; enemyAt: number; crouched: boolean; men: number }) {
  const base = openField();
  const covers = [buildingCover(building), ...(options.wallAt === undefined ? [] : [wall(options.wallAt)])];
  const map: BattleMap = { ...base, id: 'garrison-posts', buildings: [building], covers, sightObstacles: [], yards: [], garrisonYards: [] };
  const engine = new SimulationEngine({ seed: 3, scenario: 'battle3v3', sandbox: true, battleMap: map });
  const men = engine.units.filter((unit) => unit.faction === 'column').slice(0, options.men);
  const enemy = engine.units.find((unit) => unit.faction === 'legalist')!;
  const keep = new Set([...men, enemy].map((unit) => unit.id));
  for (let index = engine.units.length - 1; index >= 0; index -= 1) if (!keep.has(engine.units[index]!.id)) engine.units.splice(index, 1);
  park(enemy, 0, options.enemyAt);
  enemy.stance = options.crouched ? 'crouched' : 'standing';
  enemy.holdFire = true;
  for (const unit of men) unit.holdFire = true;
  // His side saw him get there (or sees him now): the men know where he is.
  engine.vision.lastSeen.column.set(enemy.id, { x: enemy.x, y: enemy.y, tick: 0 });
  const position = engine.positions.find((entry) => entry.id === building.id)!;
  for (const unit of men) {
    park(unit, position.entrances[0]!.x, position.entrances[0]!.y);
    expect(enter(engine, unit, position, 0, [])).toBe(true);
  }
  return { engine, men, position };
}

const SOBRADO: Building = { id: 9301, model: 'sobrado', x: 0, y: 0, rotation: 0, halfWidth: 5, halfDepth: 6, height: 7.5 };
const CHURCH: Building = { id: 9303, model: 'church', x: 0, y: 0, rotation: 0, halfWidth: 7, halfDepth: 9, height: 11 };

describe('post filling (garrison-and-assault 4.0)', () => {
  it('the enemy behind a quintal wall: the men take the upper windows that see him before any ground window', () => {
    const { men, position } = setup(SOBRADO, { wallAt: 26, enemyAt: 36, crouched: true, men: 4 });
    for (const man of men) {
      const port = position.ports[man.port!]!;
      expect(port.level, `man ${man.id}`).toBe(1);
      expect(port.facing.y).toBeGreaterThan(0.9);
    }
  });

  it('the enemy in the open: the ground windows facing him fill first', () => {
    const { men, position } = setup(SOBRADO, { enemyAt: 36, crouched: false, men: 2 });
    for (const man of men) {
      const port = position.ports[man.port!]!;
      expect(port.level, `man ${man.id}`).toBeUndefined();
      expect(port.facing.y).toBeGreaterThan(0.9);
    }
  });

  it('the matriz with the enemy behind a wall: the first two go up the tower, the rest to the windows', () => {
    const { men, position } = setup(CHURCH, { wallAt: 38, enemyAt: 50, crouched: true, men: 4 });
    const ports = men.map((man) => position.ports[man.port!]!);
    expect(ports[0]!.tower).toBe(true);
    expect(ports[1]!.tower).toBe(true);
    expect(ports.slice(2).some((port) => port.tower)).toBe(false);
  });

  it('a man re-picks his post when the enemy goes behind the wall', () => {
    const { engine, men, position } = setup(SOBRADO, { wallAt: 26, enemyAt: 20, crouched: false, men: 1 });
    const man = men[0]!;
    expect(position.ports[man.port!]!.level).toBeUndefined();
    const enemy = engine.units.find((unit) => unit.faction === 'legalist')!;
    park(enemy, 0, 36);
    enemy.stance = 'crouched';
    engine.vision.lastSeen.column.set(enemy.id, { x: enemy.x, y: enemy.y, tick: engine.tickCount });
    engine.runTicks(20, { hash: false });
    expect(position.ports[man.port!]!.level).toBe(1);
  });
});
