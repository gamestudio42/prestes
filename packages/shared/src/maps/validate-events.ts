import type { Vec2 } from '../protocol';
import { findPath } from '../pathfinding';
import { isSectionTypeId } from '../sections';
import { isPointBlockedByCovers } from '../world';
import type { EditableMap } from './document';
import {
  BOMBARD_RATE,
  BOMBARD_SECONDS,
  BOMBARD_SPREAD,
  ENTRY_EDGE_DISTANCE,
  MAX_BATTLE_EVENTS,
  MAX_TRIGGER_TIME,
  sectionSide,
  type BattleEvent,
  type EventPlace,
} from './events';
import { pointInPolygon } from './geometry';
import { isDeepWater } from './runtime';
import type { BattleMap } from './types';

/** add-battle-events 1.3: the problems the event checks report (locale `editor.problem.<code>`). */
export type EventProblemCode =
  | 'event-too-many'
  | 'event-no-trigger'
  | 'event-no-action'
  | 'event-time-too-late'
  | 'event-unknown-place'
  | 'event-unknown-objective'
  | 'event-unknown-event'
  | 'event-unknown-section'
  | 'event-wrong-side-section'
  | 'event-no-sections'
  | 'event-card-missing'
  | 'event-loop'
  | 'event-never-fires'
  | 'entry-off-edge'
  | 'entry-not-walkable'
  | 'event-move-unreachable'
  | 'bombard-out-of-range'
  | 'bombard-own-lines';

export interface EventProblem {
  code: EventProblemCode;
  severity: 'error' | 'warning';
  params: Record<string, string | number>;
  at?: Vec2;
  target?: { kind: 'event' | 'event-place'; id: number };
}

/** add-artillery-bombardment: an area bombardment's aim point, its corners' mean. */
export function polygonMiddle(polygon: readonly Vec2[]): Vec2 {
  if (polygon.length === 0) return { x: 0, y: 0 };
  return {
    x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
    y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
  };
}

function walkable(point: Vec2, map: BattleMap): boolean {
  return !isDeepWater(point.x, point.y) && !isPointBlockedByCovers(point.x, point.y, map.covers, 0);
}

/** The `after` edges that close a loop, as the events in it (each loop once, from its lowest id). */
function loops(events: readonly BattleEvent[]): number[][] {
  const follows = new Map<number, number>();
  for (const event of events) if (event.trigger?.kind === 'after') follows.set(event.id, event.trigger.event);
  const found: number[][] = [];
  const seen = new Set<number>();
  for (const event of events) {
    const path: number[] = [];
    let at: number | undefined = event.id;
    while (at !== undefined && !path.includes(at) && !seen.has(at)) {
      path.push(at);
      at = follows.get(at);
    }
    if (at !== undefined && path.includes(at)) {
      const loop = path.slice(path.indexOf(at));
      found.push(loop);
    }
    for (const id of path) seen.add(id);
  }
  return found;
}

/**
 * add-battle-events 1.3: references to places, objectives, events and section
 * types; entry points on the edge and walkable; move points reachable from
 * their entry; cards in both languages; no `after` loops; time triggers within
 * the longest battle; at least one action; at most 24 events; and a warning
 * for an event that follows one that can never fire.
 */
export function checkEvents(map: EditableMap, compiled: BattleMap): EventProblem[] {
  const problems: EventProblem[] = [];
  const events = map.events ?? [];
  const places = new Map<number, EventPlace>((map.eventPlaces ?? []).map((place) => [place.id, place]));
  const objectives = new Set((map.objectives ?? []).map((objective) => objective.id));
  const ids = new Set(events.map((event) => event.id));
  const half = Math.min(compiled.bounds.maxX - compiled.bounds.minX, compiled.bounds.maxY - compiled.bounds.minY) / 2;

  if (events.length > MAX_BATTLE_EVENTS) problems.push({ code: 'event-too-many', severity: 'error', params: { count: events.length, max: MAX_BATTLE_EVENTS } });

  for (const place of places.values()) {
    if (place.kind !== 'entry') continue;
    const target = { kind: 'event-place' as const, id: place.id };
    const { x, y } = place.point;
    const fromEdge = half - Math.max(Math.abs(x), Math.abs(y));
    if (fromEdge < 0 || fromEdge > ENTRY_EDGE_DISTANCE) problems.push({ code: 'entry-off-edge', severity: 'error', params: { name: place.name, metres: ENTRY_EDGE_DISTANCE }, at: place.point, target });
    if (!walkable(place.point, compiled)) problems.push({ code: 'entry-not-walkable', severity: 'error', params: { name: place.name }, at: place.point, target });
  }

  for (const event of events) {
    const target = { kind: 'event' as const, id: event.id };
    const name = event.label || String(event.id);
    const report = (code: EventProblemCode, params: Record<string, string | number> = {}, at?: Vec2, severity: 'error' | 'warning' = 'error') =>
      problems.push({ code, severity, params: { event: name, ...params }, ...(at ? { at } : {}), target });
    const place = (id: number, kind: EventPlace['kind']): EventPlace | null => {
      const found = places.get(id);
      if (found?.kind === kind) return found;
      report('event-unknown-place', { place: id });
      return null;
    };
    const objective = (id: number) => {
      if (!objectives.has(id)) report('event-unknown-objective', { objective: id });
    };
    const other = (id: number) => {
      if (!ids.has(id) || id === event.id) report('event-unknown-event', { other: id });
    };

    const trigger = event.trigger;
    if (!trigger) report('event-no-trigger');
    else if (trigger.kind === 'time' && trigger.seconds > MAX_TRIGGER_TIME) report('event-time-too-late', { minutes: MAX_TRIGGER_TIME / 60 });
    else if (trigger.kind === 'objective') objective(trigger.objective);
    else if (trigger.kind === 'area') place(trigger.area, 'area');
    else if (trigger.kind === 'after') other(trigger.event);
    if (event.actions.length === 0) report('event-no-action');

    for (const action of event.actions) {
      if (action.kind === 'troops') {
        const entry = place(action.entry, 'entry');
        if (action.sections.length === 0) report('event-no-sections');
        for (const section of action.sections) {
          if (!isSectionTypeId(section)) report('event-unknown-section', { section });
          else if (sectionSide(section) !== action.side) report('event-wrong-side-section', { section, side: action.side });
        }
        if (action.order.kind === 'objective') objective(action.order.objective);
        if (action.order.kind === 'move' && entry?.kind === 'entry') {
          const to = action.order.to;
          if (!walkable(to, compiled) || findPath(entry.point, to, compiled.covers).length === 0) report('event-move-unreachable', { place: entry.name }, to);
        }
      } else if (action.kind === 'posture') {
        if (action.area !== undefined) place(action.area, 'area');
        if ('event' in action.until) other(action.until.event);
      } else if (action.kind === 'bombardment') {
        // add-artillery-bombardment 1.3: the target area, the "until" event, the ranges, and one's own lines.
        const area = action.target.kind === 'area' ? place(action.target.area, 'area') : null;
        if ('event' in action.until) other(action.until.event);
        const outside = (value: number, range: { min: number; max: number }) => !Number.isFinite(value) || value < range.min || value > range.max;
        if (outside(action.perMinute, BOMBARD_RATE)) report('bombard-out-of-range', { field: 'rate', min: BOMBARD_RATE.min, max: BOMBARD_RATE.max });
        if (outside(action.spread, BOMBARD_SPREAD)) report('bombard-out-of-range', { field: 'spread', min: BOMBARD_SPREAD.min, max: BOMBARD_SPREAD.max });
        if ('seconds' in action.until && outside(action.until.seconds, BOMBARD_SECONDS)) report('bombard-out-of-range', { field: 'duration', min: BOMBARD_SECONDS.min, max: BOMBARD_SECONDS.max });
        if (area?.kind === 'area') {
          const aim = polygonMiddle(area.polygon);
          const own = compiled.deployment[action.side]?.area;
          if (own && own.length >= 3 && pointInPolygon(aim.x, aim.y, own)) report('bombard-own-lines', { place: area.name }, aim, 'warning');
        }
      } else {
        for (const language of ['pt-BR', 'en'] as const) {
          if (!action.title[language].trim() || !action.text[language].trim()) report('event-card-missing', { language });
        }
      }
    }
  }

  const looped = new Set<number>();
  for (const loop of loops(events)) {
    loop.forEach((id) => looped.add(id));
    const first = Math.min(...loop);
    const label = (id: number) => events.find((event) => event.id === id)?.label || String(id);
    problems.push({ code: 'event-loop', severity: 'error', params: { events: loop.map(label).join(' → ') }, target: { kind: 'event', id: first } });
  }

  // An event that can never fire: no trigger, no action, in a loop, or after one of those (followed down the chain).
  const byId = new Map(events.map((event) => [event.id, event]));
  const dead = new Set(events.filter((event) => !event.trigger || event.actions.length === 0 || looped.has(event.id)).map((event) => event.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const event of events) {
      if (dead.has(event.id) || event.trigger?.kind !== 'after') continue;
      if (dead.has(event.trigger.event) || !byId.has(event.trigger.event)) {
        dead.add(event.id);
        grew = true;
        problems.push({ code: 'event-never-fires', severity: 'warning', params: { event: event.label || String(event.id) }, target: { kind: 'event', id: event.id } });
      }
    }
  }
  return problems;
}
