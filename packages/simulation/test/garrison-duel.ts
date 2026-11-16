import { PRE_LEVEL_FACTORS } from './fixtures/pre-levels';
import { expect } from 'vitest';
import { buildingCover, type BattleMap, type Building } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { openField } from './open-field';
import { enter } from '../src/systems/garrison';
import type { MutableUnit } from '../src/systems/model';

/**
 * garrison-and-assault 3.1: a house on open ground, four men of the column
 * inside, four legalists in the open 60 m in front of it. Everyone else is
 * put far away with his fire held.
 */
const DEFAULT_HOUSE: Building = { id: 9001, model: 'casa-terrea', x: 0, y: 0, rotation: 0, halfWidth: 5, halfDepth: 4, height: 4 };

export function duelMap(house: Building): BattleMap {
  const base = openField();
  return { ...base, id: 'garrison-duel', buildings: [house], covers: [buildingCover(house)], sightObstacles: [], yards: [], garrisonYards: [] };
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

export function duel(
  seed: number,
  options: { garrisonPinned?: boolean; openCount?: number; atDoor?: number; insideFaction?: 'column' | 'legalist'; house?: Building } = {},
) {
  const HOUSE = options.house ?? DEFAULT_HOUSE;
  const map = duelMap(HOUSE);
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, battleMap: map, factors: PRE_LEVEL_FACTORS });
  const column = engine.units.filter((unit) => unit.faction === 'column');
  const legalist = engine.units.filter((unit) => unit.faction === 'legalist');
  const legalistInside = options.insideFaction === 'legalist';
  const inside = (legalistInside ? legalist : column).slice(0, 4);
  const openCount = options.openCount ?? 4;
  const open = (legalistInside ? column : legalist).slice(0, openCount);
  // The rest of both forces are out of this battle.
  const keep = new Set([...inside, ...open].map((unit) => unit.id));
  for (let index = engine.units.length - 1; index >= 0; index -= 1) if (!keep.has(engine.units[index]!.id)) engine.units.splice(index, 1);
  // The open section stands 60 m out toward the legalists' area, where the
  // garrison looks before it has seen anyone.
  const outside = map.deployment[legalistInside ? 'column' : 'legalist'];
  const area = outside.area.length > 0 ? outside.area : outside.sections;
  const toward = { x: area.reduce((sum, p) => sum + p.x, 0) / area.length - HOUSE.x, y: area.reduce((sum, p) => sum + p.y, 0) / area.length - HOUSE.y };
  const length = Math.sqrt(toward.x ** 2 + toward.y ** 2);
  const out = { x: toward.x / length, y: toward.y / length };
  for (const [index, unit] of open.entries()) {
    const side = -6 + index * 4;
    park(unit, HOUSE.x + out.x * 60 - out.y * side, HOUSE.y + out.y * 60 + out.x * side);
    unit.facingX = -out.x;
    unit.facingY = -out.y;
  }
  const house = engine.positions.find((position) => position.id === HOUSE.id)!;
  if (options.atDoor !== undefined) {
    // In a line `atDoor` m out from the front door, facing it.
    const door = house.entrances[0]!;
    const dx = door.x - HOUSE.x;
    const dy = door.y - HOUSE.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const away = { x: dx / length, y: dy / length };
    for (const [index, unit] of open.entries()) {
      const side = (index - (open.length - 1) / 2) * 2;
      park(unit, door.x + away.x * options.atDoor - away.y * side, door.y + away.y * options.atDoor + away.x * side);
      unit.facingX = -away.x;
      unit.facingY = -away.y;
    }
  }
  for (const unit of inside) {
    park(unit, house.entrances[0]!.x, house.entrances[0]!.y);
    expect(enter(engine, unit, house, 0, [])).toBe(true);
  }
  if (options.garrisonPinned) for (const unit of inside) unit.suppression = 100;
  return { engine, inside, open, house, out };
}

