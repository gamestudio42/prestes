import type { Vec2 } from '../protocol';
import { ARMIES } from '../armies';
import { isSectionTypeId, SECTION_TYPES, type SectionTypeId } from '../sections';
import type { LocalizedText } from './types';
import { MAX_EXIT_SECTIONS } from './withdrawal';
import { isGunId, type GunId } from '../artillery';

/**
 * add-battle-events D1: what the map author plans to happen during a battle.
 * Shared by the editor, the map check, the simulation and the view.
 */
export type EventSide = 'column' | 'legalist';

/** A map carries at most this many events. */
export const MAX_BATTLE_EVENTS = 24;
/** An event waits at most this long (s) after its trigger. */
export const MAX_EVENT_DELAY = 600;
/** An event has one to this many actions. */
export const MAX_EVENT_ACTIONS = 4;
/** A "troops enter" action brings one to this many sections. */
export const MAX_ARRIVING_SECTIONS = 6;
/** An entry point lies within this distance (m) of the map edge. */
export const ENTRY_EDGE_DISTANCE = 10;
/** Arriving sections enter this many seconds apart. */
export const ARRIVAL_INTERVAL = 5;
/** The latest a time trigger may be: the longest battle (s). */
export const MAX_TRIGGER_TIME = 30 * 60;
/** A posture lasts at least / at most this long (s) when timed. */
export const POSTURE_SECONDS = { min: 30, max: 20 * 60 } as const;
/** A losses trigger's share (%), in steps of 5. */
export const LOSSES_PERCENT = { min: 10, max: 90, step: 5 } as const;
/** add-artillery-bombardment D1: a bombardment's shells per minute. */
export const BOMBARD_RATE = { min: 1, max: 30 } as const;
/** add-artillery-bombardment D1: how far (m) shells fall from the aim point. */
export const BOMBARD_SPREAD = { min: 5, max: 60 } as const;
/** add-artillery-bombardment D1: how long (s) a timed bombardment lasts. */
export const BOMBARD_SECONDS = { min: 10, max: 10 * 60 } as const;
/** add-artillery-bombardment: at most this many bombardments run at once. */
export const MAX_BOMBARDMENTS = 4;
/** A trigger area has this many corners. */
export const AREA_CORNERS = { min: 3, max: 16 } as const;

export type EventPlace =
  | { id: number; name: string; kind: 'entry'; point: Vec2; facing: Vec2 }
  | { id: number; name: string; kind: 'area'; polygon: Vec2[] };

export type EventTrigger =
  | { kind: 'time'; seconds: number }
  | { kind: 'objective'; objective: number; side: EventSide; change: 'taken' | 'lost' }
  | { kind: 'area'; area: number; side: EventSide }
  | { kind: 'losses'; side: EventSide; percent: number }
  | { kind: 'after'; event: number }
  /** add-historical-commander: the map's field commander is killed or incapacitated. */
  | { kind: 'commander' }
  /** add-withdrawal-exits D4: N column sections got out, or (command) the command section did. */
  | { kind: 'exited'; sections: number; command?: undefined }
  | { kind: 'exited'; command: true; sections?: undefined };

export type ArrivalOrder =
  | { kind: 'move'; to: Vec2 }
  | { kind: 'stay' }
  | { kind: 'objective'; objective: number }
  | { kind: 'commander' };

export type EnemyPosture = 'offensive' | 'fall-back' | 'hold';

/** add-artillery-bombardment D1: an area's middle, or the enemy the firing side knows of. */
export type BombardmentTarget = { kind: 'area'; area: number } | { kind: 'enemy' };

export type EventAction =
  | { kind: 'troops'; side: EventSide; entry: number; sections: SectionTypeId[]; order: ArrivalOrder }
  | { kind: 'posture'; posture: EnemyPosture; area?: number; until: { seconds: number } | { event: number } }
  | { kind: 'card'; title: LocalizedText; text: LocalizedText }
  | {
      kind: 'bombardment';
      /** Whose guns fire. */
      side: EventSide;
      gun: GunId;
      target: BombardmentTarget;
      perMinute: number;
      spread: number;
      until: { seconds: number } | { event: number };
    };

export interface BattleEvent {
  id: number;
  /** The author's label (editor only, never shown to the player). */
  label: string;
  /** Null only while the author is still making the event; never compiled. */
  trigger: EventTrigger | null;
  /** Seconds after the trigger, 0 to MAX_EVENT_DELAY. */
  delay: number;
  actions: EventAction[];
}

/** The side a section type fights on. */
export function sectionSide(type: SectionTypeId): EventSide {
  return ARMIES[SECTION_TYPES[type].army].side;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isPoint = (value: unknown): value is Vec2 => isObject(value) && isNumber(value.x) && isNumber(value.y);
const isSide = (value: unknown): value is EventSide => value === 'column' || value === 'legalist';
const isText = (value: unknown): value is LocalizedText => isObject(value) && isString(value.en) && isString(value['pt-BR']);

export function isEventPlace(value: unknown): value is EventPlace {
  if (!isObject(value) || !isNumber(value.id) || !isString(value.name)) return false;
  if (value.kind === 'entry') return isPoint(value.point) && isPoint(value.facing);
  if (value.kind === 'area') return Array.isArray(value.polygon) && value.polygon.length >= AREA_CORNERS.min && value.polygon.every(isPoint);
  return false;
}

function isTrigger(value: unknown): value is EventTrigger {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case 'time':
      return isNumber(value.seconds);
    case 'objective':
      return isNumber(value.objective) && isSide(value.side) && (value.change === 'taken' || value.change === 'lost');
    case 'area':
      return isNumber(value.area) && isSide(value.side);
    case 'losses':
      return isSide(value.side) && isNumber(value.percent);
    case 'after':
      return isNumber(value.event);
    case 'commander':
      return true;
    case 'exited':
      return value.command === true ? value.sections === undefined : value.command === undefined && isNumber(value.sections);
    default:
      return false;
  }
}

function isOrder(value: unknown): value is ArrivalOrder {
  if (!isObject(value)) return false;
  if (value.kind === 'move') return isPoint(value.to);
  if (value.kind === 'objective') return isNumber(value.objective);
  return value.kind === 'stay' || value.kind === 'commander';
}

function isAction(value: unknown): value is EventAction {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case 'troops':
      return isSide(value.side) && isNumber(value.entry) && Array.isArray(value.sections) && value.sections.every(isString) && isOrder(value.order);
    case 'posture':
      return (
        (value.posture === 'offensive' || value.posture === 'fall-back' || value.posture === 'hold') &&
        (value.area === undefined || isNumber(value.area)) &&
        isObject(value.until) &&
        (isNumber(value.until.seconds) || isNumber(value.until.event))
      );
    case 'card':
      return isText(value.title) && isText(value.text);
    case 'bombardment':
      return (
        isSide(value.side) &&
        isGunId(value.gun) &&
        isObject(value.target) &&
        ((value.target.kind === 'area' && isNumber(value.target.area)) || value.target.kind === 'enemy') &&
        isNumber(value.perMinute) &&
        isNumber(value.spread) &&
        isObject(value.until) &&
        (isNumber(value.until.seconds) || isNumber(value.until.event))
      );
    default:
      return false;
  }
}

/** The document's shape check (references are the map check's job). */
export function isBattleEvent(value: unknown): value is BattleEvent {
  return (
    isObject(value) &&
    isNumber(value.id) &&
    isString(value.label) &&
    (value.trigger === null || isTrigger(value.trigger)) &&
    isNumber(value.delay) &&
    Array.isArray(value.actions) &&
    value.actions.every(isAction)
  );
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const copyPoint = (point: Vec2): Vec2 => ({ x: point.x, y: point.y });

function compileTrigger(trigger: EventTrigger): EventTrigger {
  switch (trigger.kind) {
    case 'time':
      return { kind: 'time', seconds: clamp(Math.round(trigger.seconds), 0, MAX_TRIGGER_TIME) };
    case 'losses': {
      const percent = Math.round(trigger.percent / LOSSES_PERCENT.step) * LOSSES_PERCENT.step;
      return { kind: 'losses', side: trigger.side, percent: clamp(percent, LOSSES_PERCENT.min, LOSSES_PERCENT.max) };
    }
    case 'exited':
      return trigger.command ? { kind: 'exited', command: true } : { kind: 'exited', sections: clamp(Math.round(trigger.sections), 1, MAX_EXIT_SECTIONS) };
    default:
      return { ...trigger };
  }
}

function compileAction(action: EventAction): EventAction | null {
  switch (action.kind) {
    case 'troops': {
      // A section of the other side, or unknown, never reaches the battle (the check reports it).
      const sections = action.sections.filter((id) => isSectionTypeId(id) && sectionSide(id) === action.side).slice(0, MAX_ARRIVING_SECTIONS);
      if (sections.length === 0) return null;
      const order: ArrivalOrder = action.order.kind === 'move' ? { kind: 'move', to: copyPoint(action.order.to) } : { ...action.order };
      return { kind: 'troops', side: action.side, entry: action.entry, sections, order };
    }
    case 'posture': {
      const until = 'event' in action.until ? { event: action.until.event } : { seconds: clamp(Math.round(action.until.seconds), POSTURE_SECONDS.min, POSTURE_SECONDS.max) };
      return { kind: 'posture', posture: action.posture, ...(action.area !== undefined ? { area: action.area } : {}), until };
    }
    case 'card':
      return { kind: 'card', title: { ...action.title }, text: { ...action.text } };
    case 'bombardment': {
      const until = 'event' in action.until ? { event: action.until.event } : { seconds: clamp(Math.round(action.until.seconds), BOMBARD_SECONDS.min, BOMBARD_SECONDS.max) };
      const target: BombardmentTarget = action.target.kind === 'area' ? { kind: 'area', area: action.target.area } : { kind: 'enemy' };
      return {
        kind: 'bombardment',
        side: action.side,
        gun: action.gun,
        target,
        perMinute: clamp(Math.round(action.perMinute), BOMBARD_RATE.min, BOMBARD_RATE.max),
        spread: clamp(Math.round(action.spread), BOMBARD_SPREAD.min, BOMBARD_SPREAD.max),
        until,
      };
    }
  }
}

/**
 * add-battle-events 1.1: the events the battle runs: those with a trigger and
 * at least one action, in id order, values kept in range. Places are copied.
 */
export function compileEvents(events: readonly BattleEvent[] | undefined): BattleEvent[] {
  if (!events) return [];
  return events
    .flatMap((event): BattleEvent[] => {
      if (!event.trigger) return [];
      const actions = event.actions
        .slice(0, MAX_EVENT_ACTIONS)
        .map(compileAction)
        .filter((action): action is EventAction => action !== null);
      if (actions.length === 0) return [];
      return [{ id: event.id, label: event.label, trigger: compileTrigger(event.trigger), delay: clamp(Math.round(event.delay), 0, MAX_EVENT_DELAY), actions }];
    })
    .sort((a, b) => a.id - b.id)
    .slice(0, MAX_BATTLE_EVENTS);
}

export function compileEventPlaces(places: readonly EventPlace[] | undefined): EventPlace[] {
  if (!places) return [];
  return places.map((place) =>
    place.kind === 'entry'
      ? { id: place.id, name: place.name, kind: 'entry', point: copyPoint(place.point), facing: copyPoint(place.facing) }
      : { id: place.id, name: place.name, kind: 'area', polygon: place.polygon.map(copyPoint) },
  );
}
