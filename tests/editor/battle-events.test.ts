import { describe, expect, it } from 'vitest';
import { createEditableMap, mapSide, type BattleEvent } from '../../packages/shared/src';
import { EditorStore } from '../../apps/game/src/editor/store';
import {
  addEntryPoint,
  addEvent,
  addTriggerArea,
  deleteEvent,
  duplicateEvent,
  ENTRY_INSET,
  eventDependents,
  movePlace,
  moveEvent,
  placeUsers,
  snapEntry,
} from '../../apps/game/src/editor/events';

// add-battle-events 4.1: the editor's event edits.
const blank = () => createEditableMap({ id: 'events-test', size: 'small', name: { en: 'Events', 'pt-BR': 'Eventos' }, baseMaterial: 'dry-grass', palette: 'cerrado' });
const name = (id: number) => `P${id}`;

describe('editor battle events', () => {
  it('an entry point snaps to the nearest edge, inside it, facing inward', () => {
    const map = blank();
    const half = mapSide(map.size) / 2;
    expect(snapEntry(map, { x: 10.4, y: -half + 20 })).toEqual({ point: { x: 10, y: -half + ENTRY_INSET }, facing: { x: 0, y: 1 } });
    expect(snapEntry(map, { x: half - 3, y: 5 })).toEqual({ point: { x: half - ENTRY_INSET, y: 5 }, facing: { x: -1, y: 0 } });
    // Along the edge it stays off the corner.
    expect(snapEntry(map, { x: -half - 50, y: half + 50 }).point.y).toBe(half - ENTRY_INSET);
  });

  it('places get the next id; an entry slides along its edge; an area moves one corner or whole', () => {
    const map = blank();
    const half = mapSide(map.size) / 2;
    expect(addEntryPoint(map, { x: 0, y: half }, name)).toBe(1);
    expect(addTriggerArea(map, { x: 0, y: 0 }, name)).toBe(2);
    movePlace(map, 1, 30, -10);
    const entry = map.eventPlaces![0]!;
    expect(entry.kind === 'entry' && entry.point).toEqual({ x: 30, y: half - ENTRY_INSET });
    movePlace(map, 2, 5, 0, 0);
    const area = map.eventPlaces![1]!;
    expect(area.kind === 'area' && area.polygon.map((p) => p.x)).toEqual([-10, 15, 15, -15]);
    expect(map.eventPlaces![1]!.name).toBe('P2');
  });

  it('moving an event renumbers the list and the references follow', () => {
    const map = blank();
    addEvent(map, (id) => `E${id}`);
    addEvent(map, (id) => `E${id}`);
    addEvent(map, (id) => `E${id}`);
    map.events = map.events!.map((event): BattleEvent =>
      event.id === 3 ? { ...event, trigger: { kind: 'after', event: 1 }, actions: [{ kind: 'posture', posture: 'offensive', until: { event: 2 } }] } : event,
    );
    moveEvent(map, 1, 1);
    expect(map.events!.map((event) => event.label)).toEqual(['E2', 'E1', 'E3']);
    expect(map.events!.map((event) => event.id)).toEqual([1, 2, 3]);
    const third = map.events![2]!;
    expect(third.trigger).toEqual({ kind: 'after', event: 2 });
    expect(third.actions[0]).toMatchObject({ until: { event: 1 } });
    // The first cannot go further up.
    moveEvent(map, 1, -1);
    expect(map.events!.map((event) => event.label)).toEqual(['E2', 'E1', 'E3']);
  });

  it('deleting a referenced event empties the "after" trigger that named it', () => {
    const map = blank();
    addEvent(map, (id) => `E${id}`);
    addEvent(map, (id) => `E${id}`);
    map.events = map.events!.map((event): BattleEvent => (event.id === 2 ? { ...event, trigger: { kind: 'after', event: 1 } } : event));
    expect(eventDependents(map.events!, 1).map((event) => event.id)).toEqual([2]);
    deleteEvent(map, 1);
    expect(map.events!).toHaveLength(1);
    expect(map.events![0]!.trigger).toBeNull();
  });

  it('duplicating copies the event under a new id, and place users are found', () => {
    const map = blank();
    addEvent(map, (id) => `E${id}`);
    map.events = [{ ...map.events![0]!, trigger: { kind: 'area', side: 'column', area: 4 }, actions: [{ kind: 'troops', side: 'legalist', entry: 7, sections: ['infantaria-exercito'], order: { kind: 'stay' } }] }];
    expect(duplicateEvent(map, 1, (label) => `${label} (copy)`)).toBe(2);
    expect(map.events![1]!.label).toBe('E1 (copy)');
    expect(placeUsers(map.events!, 4).map((event) => event.id)).toEqual([1, 2]);
    expect(placeUsers(map.events!, 7)).toHaveLength(2);
    expect(placeUsers(map.events!, 9)).toHaveLength(0);
  });

  it('undo takes back an added event in one step', () => {
    const store = new EditorStore(blank());
    store.editVector((draft) => {
      addEvent(draft, (id) => `E${id}`);
    });
    expect(store.map.events).toHaveLength(1);
    store.undo();
    expect(store.map.events ?? []).toHaveLength(0);
  });
});
