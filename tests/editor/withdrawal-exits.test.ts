import { describe, expect, it } from 'vitest';
import { createEditableMap, mapSide, validateEditableMap, type EditableMap, type MapProblem } from '../../packages/shared/src';
import { EditorStore } from '../../apps/game/src/editor/store';
import { addExit, deleteExit, deleteExitCorner, exitAt, exitedUsers, insertExitCorner, moveExit, renameExit, setRequirement } from '../../apps/game/src/editor/exits';

// add-withdrawal-exits 6.1, 6.2: the editor's exit edits and the map check.
const blank = () => createEditableMap({ id: 'exits-test', size: 'small', name: { en: 'Exits', 'pt-BR': 'Saídas' }, baseMaterial: 'dry-grass', palette: 'cerrado' });
const name = (id: number) => `Saída ${id}`;
const codes = (map: EditableMap) => validateEditableMap(map).filter((problem: MapProblem) => problem.code.startsWith('exit') || problem.code.startsWith('withdrawal') || problem.code.startsWith('event-exited'));

/** A named exit on the west edge, level with the column's deployment (south). */
function withWestExit(): EditableMap {
  const map = blank();
  const half = mapSide(map.size) / 2;
  addExit(map, { x: -half + 10, y: map.deployment.column.sections[0]!.y }, name);
  renameExit(map, 1, 'en', 'West ford');
  return map;
}

describe('editor exits', () => {
  it('the first exit creates the requirement; exits get the next id; corners move, insert and go', () => {
    const map = blank();
    expect(addExit(map, { x: 0, y: 0 }, name)).toBe(1);
    expect(map.withdrawal?.requirement).toEqual({ sections: 1, command: false });
    expect(addExit(map, { x: 40, y: 0 }, name)).toBe(2);
    moveExit(map, 1, 5, 0, 0);
    expect(map.withdrawal!.exits[0]!.polygon[0]).toEqual({ x: -5, y: -10 });
    moveExit(map, 1, 0, 3);
    expect(map.withdrawal!.exits[0]!.polygon[1]).toEqual({ x: 10, y: -7 });
    insertExitCorner(map, 1, { x: 12, y: 0 });
    expect(map.withdrawal!.exits[0]!.polygon).toHaveLength(5);
    deleteExitCorner(map, 1, 4);
    expect(map.withdrawal!.exits[0]!.polygon).toHaveLength(4);
    expect(exitAt(map, { x: 40, y: 0 }, 2)).toEqual({ id: 2 });
    setRequirement(map, { sections: 2, command: true });
    expect(map.withdrawal!.requirement).toEqual({ sections: 2, command: true });
  });

  it('at most four exits', () => {
    const map = blank();
    for (let index = 0; index < 4; index += 1) addExit(map, { x: index * 30 - 60, y: 0 }, name);
    expect(addExit(map, { x: 90, y: 0 }, name)).toBe(0);
    expect(map.withdrawal!.exits).toHaveLength(4);
  });

  it('deleting the last exit removes the requirement and empties "exited" triggers', () => {
    const map = blank();
    addExit(map, { x: 0, y: 0 }, name);
    map.events = [{ id: 1, label: 'out', trigger: { kind: 'exited', command: true }, delay: 0, actions: [] }];
    expect(exitedUsers(map.events)).toHaveLength(1);
    deleteExit(map, 1);
    expect(map.withdrawal).toBeUndefined();
    expect(map.events[0]!.trigger).toBeNull();
  });

  it('undo takes back an added exit in one step', () => {
    const store = new EditorStore(blank());
    store.editVector((draft) => {
      addExit(draft, { x: 0, y: 0 }, name);
    });
    expect(store.map.withdrawal?.exits).toHaveLength(1);
    store.undo();
    expect(store.map.withdrawal).toBeUndefined();
  });
});

describe('exit checks', () => {
  it('a named, reachable exit on the edge raises nothing', () => {
    expect(codes(withWestExit())).toEqual([]);
  });

  it('an exit inside the column deployment, off the edge, unnamed', () => {
    const map = blank();
    addExit(map, map.deployment.column.sections[1]!, () => '');
    const found = codes(map).map((problem) => problem.code);
    expect(found).toContain('exit-in-deployment');
    expect(found).toContain('exit-off-edge');
    expect(found).toContain('exit-name-missing');
    const inside = codes(map).find((problem) => problem.code === 'exit-in-deployment')!;
    expect(inside.target).toEqual({ kind: 'exit', id: 1 });
  });

  it('an exit in deep water is not walkable', () => {
    const map = withWestExit();
    const exit = map.withdrawal!.exits[0]!;
    map.ponds = [{ id: 1, kind: 'deep', polygon: exit.polygon.map((p) => ({ x: p.x + Math.sign(p.x - exit.polygon[0]!.x - 1) * 4, y: p.y + Math.sign(p.y - exit.polygon[0]!.y - 1) * 4 })) }];
    expect(codes(map).map((problem) => problem.code)).toContain('exit-not-walkable');
  });

  it('the requirement within the fixed force, and its command section', () => {
    const map = withWestExit();
    map.columnForce = { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] };
    setRequirement(map, { sections: 4, command: true });
    const found = codes(map);
    expect(found.find((problem) => problem.code === 'withdrawal-requirement-range')?.target).toEqual({ kind: 'map-properties', id: 'withdrawal' });
    expect(found.map((problem) => problem.code)).toContain('withdrawal-no-command');
    delete map.columnForce;
    setRequirement(map, { sections: 1, command: true });
    expect(codes(map).find((problem) => problem.code === 'withdrawal-command-unsure')?.severity).toBe('warning');
  });

  it('an "exited" trigger needs exits and no more sections than the column fields', () => {
    const map = blank();
    map.events = [{ id: 1, label: 'out', trigger: { kind: 'exited', sections: 2 }, delay: 0, actions: [{ kind: 'card', title: { en: 'a', 'pt-BR': 'a' }, text: { en: 'a', 'pt-BR': 'a' } }] }];
    expect(codes(map).map((problem) => problem.code)).toContain('event-exited-no-exits');
    const withExit = withWestExit();
    withExit.columnForce = { sections: ['fuzileiros'] };
    withExit.events = map.events;
    expect(codes(withExit).map((problem) => problem.code)).toContain('event-exited-too-many');
  });
});
