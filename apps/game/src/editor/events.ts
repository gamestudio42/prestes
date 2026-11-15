import { ENTRY_EDGE_DISTANCE, mapSide, type BattleEvent, type EditableMap, type EventPlace, type Vec2 } from '@prestes/shared';

/**
 * add-battle-events 4.1: the editor's event edits, kept apart from the view
 * so they can be tested: entry points snapped to the edge, new places and
 * events, renumbering and the references that follow it, and who uses what.
 */

/** An entry point stands this far inside the edge (m), well within ENTRY_EDGE_DISTANCE. */
export const ENTRY_INSET = 4;
/** A new trigger area is a square this many metres across. */
export const NEW_AREA_SIZE = 30;

/** The point on the nearest edge (ENTRY_INSET inside it, rounded to the metre) and the inward facing. */
export function snapEntry(map: EditableMap, point: Vec2): { point: Vec2; facing: Vec2 } {
  const half = mapSide(map.size) / 2;
  const inner = half - ENTRY_INSET;
  const clamp = (value: number) => Math.max(-inner, Math.min(inner, Math.round(value)));
  const gaps = [
    { edge: 'north', gap: half + point.y },
    { edge: 'south', gap: half - point.y },
    { edge: 'west', gap: half + point.x },
    { edge: 'east', gap: half - point.x },
  ].sort((a, b) => a.gap - b.gap);
  switch (gaps[0]!.edge) {
    case 'north':
      return { point: { x: clamp(point.x), y: -inner }, facing: { x: 0, y: 1 } };
    case 'south':
      return { point: { x: clamp(point.x), y: inner }, facing: { x: 0, y: -1 } };
    case 'west':
      return { point: { x: -inner, y: clamp(point.y) }, facing: { x: 1, y: 0 } };
    default:
      return { point: { x: inner, y: clamp(point.y) }, facing: { x: -1, y: 0 } };
  }
}

void ENTRY_EDGE_DISTANCE;

function nextId(list: readonly { id: number }[]): number {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

/** Adds an entry point snapped to the edge; returns its id. */
export function addEntryPoint(draft: EditableMap, at: Vec2, name: (id: number) => string): number {
  const places = [...(draft.eventPlaces ?? [])];
  const id = nextId(places);
  places.push({ id, name: name(id), kind: 'entry', ...snapEntry(draft, at) });
  draft.eventPlaces = places;
  return id;
}

/** Adds a square trigger area centred on a point; returns its id. */
export function addTriggerArea(draft: EditableMap, at: Vec2, name: (id: number) => string): number {
  const places = [...(draft.eventPlaces ?? [])];
  const id = nextId(places);
  const h = NEW_AREA_SIZE / 2;
  const x = Math.round(at.x);
  const y = Math.round(at.y);
  places.push({ id, name: name(id), kind: 'area', polygon: [{ x: x - h, y: y - h }, { x: x + h, y: y - h }, { x: x + h, y: y + h }, { x: x - h, y: y + h }] });
  draft.eventPlaces = places;
  return id;
}

/** Moves a place (or one corner of an area) by dx, dy; an entry point snaps back to the edge. */
export function movePlace(draft: EditableMap, id: number, dx: number, dy: number, corner?: number, round: (value: number) => number = Math.round): void {
  draft.eventPlaces = (draft.eventPlaces ?? []).map((place): EventPlace => {
    if (place.id !== id) return place;
    if (place.kind === 'entry') return { ...place, ...snapEntry(draft, { x: place.point.x + dx, y: place.point.y + dy }) };
    return { ...place, polygon: place.polygon.map((point, index) => (corner === undefined || corner === index ? { x: round(point.x + dx), y: round(point.y + dy) } : point)) };
  });
}

/** A new event: a time trigger at 1:00, no delay, no action yet. */
export function newEvent(id: number, label: string): BattleEvent {
  return { id, label, trigger: { kind: 'time', seconds: 60 }, delay: 0, actions: [] };
}

export function addEvent(draft: EditableMap, label: (id: number) => string): number {
  const events = [...(draft.events ?? [])];
  const id = nextId(events);
  events.push(newEvent(id, label(id)));
  draft.events = events;
  return id;
}

/** A copy of an event at the end of the list, named "(copy)". */
export function duplicateEvent(draft: EditableMap, id: number, label: (source: string) => string): number | null {
  const events = [...(draft.events ?? [])];
  const source = events.find((event) => event.id === id);
  if (!source) return null;
  const copy = { ...(JSON.parse(JSON.stringify(source)) as BattleEvent), id: nextId(events), label: label(source.label) };
  events.push(copy);
  draft.events = events;
  return copy.id;
}

/** The events whose trigger, posture or bombardment names an event. */
export function eventDependents(events: readonly BattleEvent[], id: number): BattleEvent[] {
  return events.filter(
    (event) =>
      event.id !== id &&
      ((event.trigger?.kind === 'after' && event.trigger.event === id) ||
        event.actions.some((action) => (action.kind === 'posture' || action.kind === 'bombardment') && 'event' in action.until && action.until.event === id)),
  );
}

/** The events that use a place (trigger area, entry, fall-back area, bombardment target). */
export function placeUsers(events: readonly BattleEvent[], placeId: number): BattleEvent[] {
  return events.filter(
    (event) =>
      (event.trigger?.kind === 'area' && event.trigger.area === placeId) ||
      event.actions.some(
        (action) =>
          (action.kind === 'troops' && action.entry === placeId) ||
          (action.kind === 'posture' && action.area === placeId) ||
          (action.kind === 'bombardment' && action.target.kind === 'area' && action.target.area === placeId),
      ),
  );
}

/** Deletes an event; an "after" trigger that named it is left empty (the check reports it). */
export function deleteEvent(draft: EditableMap, id: number): void {
  draft.events = (draft.events ?? [])
    .filter((event) => event.id !== id)
    .map((event) => (event.trigger?.kind === 'after' && event.trigger.event === id ? { ...event, trigger: null } : event));
}

/** Deletes a place; events that used it keep the reference (the check reports it). */
export function deletePlace(draft: EditableMap, id: number): void {
  draft.eventPlaces = (draft.eventPlaces ?? []).filter((place) => place.id !== id);
}

/** Moves an event one step up or down; ids are renumbered 1..n in the new order and references follow. */
export function moveEvent(draft: EditableMap, id: number, step: -1 | 1): void {
  const events = [...(draft.events ?? [])];
  const index = events.findIndex((event) => event.id === id);
  const target = index + step;
  if (index < 0 || target < 0 || target >= events.length) return;
  [events[index], events[target]] = [events[target]!, events[index]!];
  draft.events = renumberEvents(events);
}

/** Ids 1..n in list order, with every "after" trigger and "until event" rewritten to the new ids. */
export function renumberEvents(events: readonly BattleEvent[]): BattleEvent[] {
  const ids = new Map(events.map((event, index) => [event.id, index + 1]));
  const map = (id: number) => ids.get(id) ?? id;
  return events.map((event, index) => ({
    ...event,
    id: index + 1,
    trigger: event.trigger?.kind === 'after' ? { kind: 'after', event: map(event.trigger.event) } : event.trigger,
    actions: event.actions.map((action) =>
      (action.kind === 'posture' || action.kind === 'bombardment') && 'event' in action.until ? { ...action, until: { event: map(action.until.event) } } : action,
    ),
  }));
}

/** Replaces one event (the panel's form edits). */
export function updateEvent(draft: EditableMap, event: BattleEvent): void {
  draft.events = (draft.events ?? []).map((entry) => (entry.id === event.id ? event : entry));
}

export function renamePlace(draft: EditableMap, id: number, name: string): void {
  draft.eventPlaces = (draft.eventPlaces ?? []).map((place) => (place.id === id ? { ...place, name } : place));
}
