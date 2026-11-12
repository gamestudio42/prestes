import { describe, expect, it } from 'vitest';
import {
  BUILDING_CAPACITY,
  DECLARED_OPENINGS,
  battleMap,
  buildingOpenings,
  buildingPosition,
  compileMapDocument,
  createEditableMap,
  positionNear,
  positionsFor,
  toMapDocument,
  trenchLineGroups,
  validatePositions,
  type BattleMap,
  type Building,
} from '../src';

// author-game-maps 3.1: the map tests run on the test map (preloaded by the test setup).
const TEST_MAP = 'campo-de-provas';

const house = (overrides: Partial<Building> = {}): Building => ({
  id: 7,
  model: 'casa-terrea',
  x: 10,
  y: 20,
  rotation: 0,
  halfWidth: 4,
  halfDepth: 3,
  height: 3.5,
  ...overrides,
});

describe('positions (garrison-and-assault 1.1)', () => {
  it('capacities follow the spec table', () => {
    expect(BUILDING_CAPACITY['casa-terrea']).toBe(4);
    expect(BUILDING_CAPACITY.venda).toBe(5);
    expect(BUILDING_CAPACITY.armazem).toBe(6);
    expect(BUILDING_CAPACITY.sobrado).toBe(8);
    expect(BUILDING_CAPACITY['casa-sede']).toBe(8);
    expect(BUILDING_CAPACITY.engenho).toBe(8);
    expect(BUILDING_CAPACITY.church).toBe(10);
    expect(BUILDING_CAPACITY.factory).toBe(12);
    expect(buildingPosition(house({ model: 'coreto' }))).toBeNull();
  });

  it('a house: a door at the front and the back, a window port on every wall but none at a door', () => {
    const position = buildingPosition(house())!;
    expect(position.capacity).toBe(4);
    expect(position.cover).toBe(0.6);
    // 8 m long, 6 m deep: three bays a long wall, the middle one the door; two on each short wall.
    expect(position.entrances).toEqual([{ x: 10, y: 24 }, { x: 10, y: 16 }]);
    expect(position.ports).toHaveLength(8);
    for (const port of position.ports) {
      // Each port looks away from the centre.
      expect((port.x - 10) * port.facing.x + (port.y - 20) * port.facing.y).toBeGreaterThan(0);
      expect(port.arcDeg).toBe(120);
    }
  });

  it('the windows are the ports (4.7): none at a door, upper floors raised, the church with side doors', () => {
    for (const building of [house(), house({ model: 'venda', halfWidth: 5 }), house({ model: 'sobrado', halfWidth: 5, halfDepth: 6, height: 8 })]) {
      const openings = buildingOpenings(building);
      expect(buildingPosition(building)!.ports).toHaveLength(openings.windows.length);
      // Houses and businesses: front and back doors, none at the sides.
      expect(openings.doors.map((door) => door.wall)).toEqual(['front', 'back']);
      for (const wall of ['front', 'back', 'left', 'right'] as const) {
        expect(openings.windows.some((window) => window.wall === wall && window.level === 0), `${building.model} ${wall}`).toBe(true);
      }
      for (const window of openings.windows.filter((entry) => entry.level === 0)) {
        for (const door of openings.doors.filter((entry) => entry.wall === window.wall)) {
          expect(Math.abs(window.x - door.x) + Math.abs(window.y - door.y)).toBeGreaterThan(door.width / 2 + 0.2);
        }
      }
    }
    const sobrado = buildingPosition(house({ model: 'sobrado', halfWidth: 5, halfDepth: 6, height: 8 }))!;
    const upper = sobrado.ports.filter((port) => port.level === 1);
    expect(upper.length).toBeGreaterThan(8);
    // The spec's eye at 4.6 m, a standing man's eye 1.6 m above the floor.
    expect(upper[0]!.elevation).toBeCloseTo(3);
    expect(buildingPosition(house())!.ports.every((port) => port.level === undefined && port.elevation === undefined)).toBe(true);
    const church = buildingOpenings({ model: 'church', halfWidth: 7, halfDepth: 9, height: 11 });
    expect(church.doors.map((door) => door.wall)).toEqual(['front', 'left', 'right']);
    expect(church.doors[0]!.width).toBeGreaterThan(2);
  });

  // revise-buildings-and-stone 2.2: a building that declares its openings is garrisoned from them.
  it('a declared building takes its doors and windows from its declaration; the rule stays for the rest', () => {
    const rule = buildingPosition(house())!;
    DECLARED_OPENINGS['casa-terrea'] = {
      doors: [{ wall: 'left', at: 1, width: 1.2 }],
      windows: [
        { wall: 'front', at: -2, level: 0 },
        { wall: 'front', at: 2, level: 0 },
      ],
    };
    try {
      const declared = buildingPosition(house())!;
      // One door, on the left wall 1 m toward the front, the entrance outside it.
      expect(declared.entrances).toHaveLength(1);
      expect(declared.entrances[0]!.x).toBeLessThan(10 - 4);
      expect(declared.entrances[0]!.y).toBeCloseTo(21);
      expect(declared.ports).toHaveLength(2);
      expect(declared.ports.every((port) => port.facing.y === 1)).toBe(true);
      expect(declared.ports.map((port) => Math.round(port.x))).toEqual([8, 12]);
      // Another model is untouched.
      expect(buildingPosition(house({ model: 'venda', halfWidth: 5 }))!.ports.length).toBeGreaterThan(2);
    } finally {
      delete DECLARED_OPENINGS['casa-terrea'];
    }
    expect(buildingPosition(house())).toEqual(rule);
  });

  it('a long building has a back door; the door follows the street face and the rotation', () => {
    const position = buildingPosition(house({ model: 'factory', halfWidth: 12, front: -1, rotation: Math.PI / 2 }))!;
    expect(position.entrances).toHaveLength(2);
    // Rotated a quarter turn, local -y (the street face) lies along world +x.
    expect(position.entrances[0]!.x).toBeCloseTo(14);
    expect(position.entrances[0]!.y).toBeCloseTo(20);
    expect(position.entrances[1]!.x).toBeCloseTo(6);
  });

  it('the test map trench with bays groups into a line; it holds a man per fire-step slot', () => {
    const map = battleMap(TEST_MAP);
    const groups = trenchLineGroups(map.covers);
    // The pieces touching end to end.
    expect(groups.length).toBeGreaterThanOrEqual(1);
    for (const group of groups) expect(group.length).toBeGreaterThanOrEqual(1);
    const lines = positionsFor(map).filter((position) => position.kind === 'trench-line');
    for (const line of lines) {
      expect(line.capacity).toBe(line.ports.length);
      expect(line.entrances.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('an editor fire trench: one man per 1.2 m, entrances at the ends and on the rear side', () => {
    const editable = createEditableMap({ id: 'positions-trench', size: 'medium', name: { en: 'T', 'pt-BR': 'T' } });
    editable.trenches.push({ id: 1, kind: 'fire', depth: 1.2, facing: 'left', bays: false, parapet: 'earth', points: [{ x: 30, y: 0 }, { x: -30, y: 0 }] });
    const map = compileMapDocument(toMapDocument(editable));
    const lines = positionsFor(map).filter((position) => position.kind === 'trench-line');
    expect(lines).toHaveLength(1);
    const line = lines[0]!;
    expect(line.capacity).toBe(50);
    // Two ends, and a way in every 10 m behind the line.
    expect(line.entrances.length).toBeGreaterThanOrEqual(6);
    expect(line.cover).toBe(0.5);
  });

  it('a communication trench holds a man every 2 m', () => {
    const editable = createEditableMap({ id: 'positions-comm', size: 'medium', name: { en: 'T', 'pt-BR': 'T' } });
    editable.trenches.push({ id: 1, kind: 'communication', depth: 1.2, facing: 'left', bays: false, parapet: 'earth', points: [{ x: 20, y: 0 }, { x: -20, y: 0 }] });
    const map = compileMapDocument(toMapDocument(editable));
    const line = positionsFor(map).find((position) => position.kind === 'trench-line')!;
    expect(line.capacity).toBe(20);
  });

  it('the test map: each building but the bandstand is a position', () => {
    const map = battleMap(TEST_MAP);
    const buildings = positionsFor(map).filter((position) => position.kind === 'building');
    expect(buildings.length).toBe(map.buildings.filter((building) => building.model !== 'coreto').length);
    expect(buildings.length).toBeGreaterThanOrEqual(4);
  });

  it('road ditches are not trench lines', () => {
    const editable = createEditableMap({ id: 'positions-ditches', size: 'medium', name: { en: 'D', 'pt-BR': 'D' } });
    editable.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: true, right: true }, points: [{ x: -150, y: 0 }, { x: 150, y: 10 }] });
    const map = compileMapDocument(toMapDocument(editable));
    const ditches = new Set(map.covers.filter((cover) => cover.ditch).map((cover) => cover.id));
    expect(ditches.size).toBeGreaterThan(0);
    for (const line of positionsFor(map).filter((position) => position.kind === 'trench-line')) {
      expect(line.coverIds.some((id) => ditches.has(id))).toBe(false);
    }
  });

  // garrison-and-assault 1.2
  it('the test map: every entrance is on open ground and reachable from both sides', () => {
    expect(validatePositions(battleMap(TEST_MAP))).toEqual([]);
  });

  it('a broken entrance is reported: a house whose door faces into another building', () => {
    const base = battleMap(TEST_MAP);
    const host = base.buildings.find((building) => building.model === 'casa-terrea')!;
    // A wall-sized block right on the house's street door.
    const door = buildingPosition(host)!.entrances[0]!;
    const blocker = { ...base.covers.find((cover) => cover.id === host.id)!, id: 99_000, x: door.x, y: door.y, halfWidth: 3, halfDepth: 3, rotation: 0 };
    const map: BattleMap = { ...base, covers: [...base.covers, blocker] };
    const errors = validatePositions(map);
    expect(errors.some((error) => error.includes(`building ${host.id} entrance 1`) && error.includes('not on open ground'))).toBe(true);
  });

  it('the test map walled yard: its walls are ports facing out, its gate the entrance', () => {
    const yard = positionsFor(battleMap(TEST_MAP)).find((position) => position.kind === 'yard')!;
    expect(yard.capacity).toBe(12);
    expect(yard.cover).toBe(0.4);
    expect(yard.entrances).toHaveLength(1);
    expect(yard.ports.length).toBeGreaterThan(20);
    // No port looks back into the yard.
    expect(yard.ports.every((port) => (port.x - yard.x) * port.facing.x + (port.y - yard.y) * port.facing.y > 0)).toBe(true);
  });

  it('positionNear (4.1): a click on a house picks it; open ground far from any position picks none', () => {
    const map = battleMap(TEST_MAP);
    const positions = positionsFor(map);
    const house = positions.find((position) => position.kind === 'building' && position.capacity === 4)!;
    expect(positionNear(positions, { x: house.x, y: house.y })?.id).toBe(house.id);
    expect(positionNear(positions, house.entrances[0]!)?.id).toBe(house.id);
    expect(positionNear(positions, { x: house.x, y: house.y }, (position) => position.id !== house.id)?.id).not.toBe(house.id);
    expect(positionNear(positions, { x: map.bounds.minX + 1, y: map.bounds.minY + 1 })).toBeNull();
  });
});
