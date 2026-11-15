import {
  ARRIVAL_INTERVAL,
  isDeepWater,
  isPointBlockedByCovers,
  pointInPolygon,
  SECTION_TYPES,
  type ArrivalOrder,
  type BattleEvent,
  type BattleEventState,
  type EnemyPosture,
  type EventAction,
  type EventPlace,
  type EventSide,
  type LocalizedText,
  type SectionTypeId,
  type SimEvent,
  type Vec2,
} from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import { applyCommand } from './commands';
import { spawnSection, type SectionSlot } from './spawning';

/**
 * add-battle-events D3: the map's planned events, run inside the simulation
 * on the fixed tick, after objectives and casualties, in ascending event id.
 */

const TICKS_PER_SECOND = 10;
/** Metres between the men of an arriving section, in file. */
const FILE_SPACING = 1.6;
/** The first man of an arriving section stands this far inside the entry point. */
const FILE_START = 1;

interface PendingArrival {
  tick: number;
  side: EventSide;
  section: SectionTypeId;
  entry: number;
  order: ArrivalOrder;
}

export interface ActivePosture {
  posture: EnemyPosture;
  area?: number;
  /** The tick it ends, or the event whose firing ends it. */
  endsAt?: number;
  untilEvent?: number;
  /** Squads already given the posture's order (fall back and hold order once). */
  ordered: number[];
}

export interface ScriptedState {
  readonly events: readonly BattleEvent[];
  readonly places: ReadonlyMap<number, EventPlace>;
  /** The tick each event's trigger was met, by event id. */
  readonly triggered: Map<number, number>;
  /** The tick each event fired, by event id. */
  readonly fired: Map<number, number>;
  /** Men each side has fielded: its men at the battle's start, then each arrival. */
  fielded: { column: number; legalist: number } | null;
  /** Each objective's owner as last seen, to tell which side lost it. */
  readonly owners: Map<number, 'neutral' | EventSide>;
  readonly arrivals: PendingArrival[];
  posture: ActivePosture | null;
  /** Legalist squads that arrived by an event and are still on their first order. */
  readonly arriving: Map<number, ArrivalOrder>;
  /** Events the playtest fired by hand this tick (consumed by the next update). */
  pendingNow?: number[];
}

export function createScriptedState(events: readonly BattleEvent[] | undefined, places: readonly EventPlace[] | undefined): ScriptedState {
  return {
    events: events ?? [],
    places: new Map((places ?? []).map((place) => [place.id, place])),
    triggered: new Map(),
    fired: new Map(),
    fielded: null,
    owners: new Map(),
    arrivals: [],
    posture: null,
    arriving: new Map(),
  };
}

const fit = (unit: MutableUnit): boolean => unit.alive && !unit.incapacitated && !unit.routed && !unit.dummy;
const ofSide = (unit: MutableUnit, side: EventSide): boolean => unit.faction === side && !unit.dummy && unit.role === undefined;

function triggerMet(ctx: SimContext, state: ScriptedState, event: BattleEvent, tick: number, taken: readonly Extract<SimEvent, { type: 'objective_taken' }>[]): boolean {
  const trigger = event.trigger;
  if (!trigger) return false;
  switch (trigger.kind) {
    case 'time':
      return tick - ctx.battleStartTick >= trigger.seconds * TICKS_PER_SECOND;
    case 'objective':
      return taken.some((entry) =>
        entry.id === trigger.objective && (trigger.change === 'taken' ? entry.side === trigger.side : entry.side !== trigger.side && state.owners.get(entry.id) === trigger.side),
      );
    case 'area': {
      const place = state.places.get(trigger.area);
      if (place?.kind !== 'area') return false;
      return ctx.units.some((unit) => unit.faction === trigger.side && fit(unit) && pointInPolygon(unit.x, unit.y, place.polygon));
    }
    case 'losses': {
      const fielded = state.fielded?.[trigger.side] ?? 0;
      if (fielded === 0) return false;
      const lost = ctx.units.filter((unit) => ofSide(unit, trigger.side) && !fit(unit)).length;
      return lost * 100 >= fielded * trigger.percent;
    }
    case 'after':
      return state.fired.has(trigger.event);
    case 'commander':
      // add-historical-commander D5: the field commander is killed or incapacitated.
      return ctx.units.some((unit) => unit.figure && (!unit.alive || unit.incapacitated));
  }
}

/** The places in file inward from an entry point, skipping blocked or wet spots, one per man. */
function fileSlots(ctx: SimContext, entry: Extract<EventPlace, { kind: 'entry' }>, men: number): SectionSlot[] {
  const length = Math.sqrt(entry.facing.x ** 2 + entry.facing.y ** 2) || 1;
  const facing = { x: entry.facing.x / length, y: entry.facing.y / length };
  const bounds = ctx.battleMap?.bounds;
  const slots: SectionSlot[] = [];
  for (let step = 0; slots.length < men && step < men + 40; step += 1) {
    const distance = FILE_START + step * FILE_SPACING;
    const x = Math.round((entry.point.x + facing.x * distance) * 100) / 100;
    const y = Math.round((entry.point.y + facing.y * distance) * 100) / 100;
    if (bounds && (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY)) continue;
    if (isDeepWater(x, y) || isPointBlockedByCovers(x, y, ctx.covers, 0.8)) continue;
    slots.push({ x, y, index: slots.length });
  }
  return slots;
}

function command(ctx: SimContext, tick: number, events: SimEvent[], issued: Parameters<typeof applyCommand>[1]['command']): void {
  applyCommand(ctx, { seq: -1, tick, command: issued }, tick, events);
}

function arrive(ctx: SimContext, state: ScriptedState, arrival: PendingArrival, tick: number, events: SimEvent[]): void {
  const entry = state.places.get(arrival.entry);
  if (entry?.kind !== 'entry') return;
  const length = Math.sqrt(entry.facing.x ** 2 + entry.facing.y ** 2) || 1;
  const facing = { x: entry.facing.x / length, y: entry.facing.y / length };
  const slots = fileSlots(ctx, entry, SECTION_TYPES[arrival.section].men.length);
  if (slots.length === 0) return;
  const firstId = ctx.nextUnitId;
  const squadId = spawnSection(ctx, { faction: arrival.side, section: arrival.section, slots, facing, holdPosition: false, holdFire: false });
  const unitIds = ctx.units.filter((unit) => unit.id >= firstId && unit.squadId === squadId).map((unit) => unit.id);
  if (state.fielded) state.fielded[arrival.side] += unitIds.length;
  const order = arrival.order;
  const objectiveFlag = (id: number): Vec2 | null => ctx.objectives.find((objective) => objective.id === id)?.flag ?? null;
  if (arrival.side === 'column') {
    if (order.kind === 'move') command(ctx, tick, events, { type: 'move', unitIds, to: { ...order.to } });
    return;
  }
  // The enemy commander leaves the arrival on its first order until it arrives or meets the enemy.
  const to = order.kind === 'move' ? order.to : order.kind === 'objective' ? objectiveFlag(order.objective) : null;
  if (to) {
    command(ctx, tick, events, { type: 'order', order: 'advance', unitIds, to: { x: to.x, y: to.y } });
    state.arriving.set(squadId, order);
    ctx.battle.plans.set(squadId, 'arriving');
  } else {
    ctx.battle.plans.set(squadId, 'hold');
  }
}

function setPosture(ctx: SimContext, state: ScriptedState, action: Extract<EventAction, { kind: 'posture' }>, tick: number): void {
  state.posture = {
    posture: action.posture,
    ...(action.area !== undefined ? { area: action.area } : {}),
    ...('event' in action.until ? { untilEvent: action.until.event } : { endsAt: tick + action.until.seconds * TICKS_PER_SECOND }),
    ordered: [],
  };
  // The posture moves the guards: they are guards no more.
  for (const squadId of ctx.battle.objectiveGuards.keys()) {
    if (ctx.battle.plans.get(squadId) === 'hold-objective') ctx.battle.plans.set(squadId, 'hold');
  }
  ctx.battle.objectiveGuards.clear();
}

function fire(ctx: SimContext, state: ScriptedState, event: BattleEvent, tick: number, events: SimEvent[]): void {
  state.fired.set(event.id, tick);
  const cards: Array<{ title: LocalizedText; text: LocalizedText }> = [];
  for (const action of event.actions) {
    if (action.kind === 'troops') {
      action.sections.forEach((section, index) => {
        state.arrivals.push({ tick: tick + index * ARRIVAL_INTERVAL * TICKS_PER_SECOND, side: action.side, section, entry: action.entry, order: action.order });
      });
    } else if (action.kind === 'posture') {
      setPosture(ctx, state, action, tick);
    } else {
      cards.push({ title: { ...action.title }, text: { ...action.text } });
    }
  }
  events.push({ type: 'battle_event_fired', tick, eventId: event.id, ...(cards.length > 0 ? { cards } : {}) });
}

function endPosture(ctx: SimContext, state: ScriptedState, tick: number): void {
  const posture = state.posture;
  if (!posture) return;
  const over = (posture.endsAt !== undefined && tick >= posture.endsAt) || (posture.untilEvent !== undefined && state.fired.has(posture.untilEvent));
  if (!over) return;
  state.posture = null;
  // The sections the offensive sent go back into the commander's pool, so it plans them again (guards first).
  if (posture.posture === 'offensive') {
    for (const squadId of posture.ordered) if (ctx.battle.plans.get(squadId) === 'attack') ctx.battle.plans.set(squadId, 'hold');
  }
  // An objective lost while the posture held is still to retake: the commander's clock for it starts now.
  if (ctx.battle.retake) ctx.battle.retake = { ...ctx.battle.retake, tick };
}

/** add-battle-events 2.5: fire an event now, its delay skipped (the editor's playtest only). */
export function fireBattleEventNow(ctx: SimContext, eventId: number, tick: number): boolean {
  const state = ctx.scripted;
  const event = state?.events.find((entry) => entry.id === eventId);
  if (!state || !event || state.fired.has(eventId)) return false;
  state.triggered.set(eventId, tick);
  state.pendingNow = [...(state.pendingNow ?? []), eventId];
  return true;
}

export function updateBattleEvents(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const state = ctx.scripted;
  if (!state || state.events.length === 0) return;
  if (!state.fielded) {
    state.fielded = {
      column: ctx.units.filter((unit) => ofSide(unit, 'column')).length,
      legalist: ctx.units.filter((unit) => ofSide(unit, 'legalist')).length,
    };
    for (const objective of ctx.objectives) state.owners.set(objective.id, objective.owner);
  }
  const taken = events.filter((event): event is Extract<SimEvent, { type: 'objective_taken' }> => event.type === 'objective_taken' && event.tick === tick);
  const now = new Set(state.pendingNow ?? []);
  state.pendingNow = [];
  for (const event of state.events) {
    if (state.fired.has(event.id)) continue;
    if (!state.triggered.has(event.id) && triggerMet(ctx, state, event, tick, taken)) state.triggered.set(event.id, tick);
    const triggeredAt = state.triggered.get(event.id);
    if (triggeredAt === undefined) continue;
    if (now.has(event.id) || tick >= triggeredAt + event.delay * TICKS_PER_SECOND) fire(ctx, state, event, tick, events);
  }
  for (const objective of ctx.objectives) state.owners.set(objective.id, objective.owner);
  // Arrivals due now, in the order they were queued.
  const due = state.arrivals.filter((arrival) => arrival.tick <= tick);
  if (due.length > 0) {
    state.arrivals.splice(0, state.arrivals.length, ...state.arrivals.filter((arrival) => arrival.tick > tick));
    for (const arrival of due) arrive(ctx, state, arrival, tick, events);
  }
  endPosture(ctx, state, tick);
}

/** An arriving legalist section is done with its first order once it stops or meets the enemy. */
export function arrivalSettled(state: ScriptedState | undefined, squadId: number, section: readonly MutableUnit[]): boolean {
  if (!state?.arriving.has(squadId)) return true;
  const stopped = section.every((unit) => unit.path.length === 0);
  const engaged = section.some((unit) => unit.targetId !== null);
  if (stopped || engaged) {
    state.arriving.delete(squadId);
    return true;
  }
  return false;
}

/** add-battle-events D3: the events' state the engine hashes (maps with events only). */
export function scriptedHashState(state: ScriptedState): unknown {
  return {
    triggered: [...state.triggered],
    fired: [...state.fired],
    fielded: state.fielded,
    arrivals: state.arrivals,
    posture: state.posture,
    arriving: [...state.arriving.keys()],
  };
}

/** add-battle-events 2.5: each event's state for the editor's playtest panel. */
export function scriptedSnapshot(ctx: SimContext): BattleEventState[] {
  const state = ctx.scripted;
  if (!state) return [];
  return state.events.map((event) => {
    const fired = state.fired.get(event.id);
    const triggered = state.triggered.get(event.id);
    return {
      id: event.id,
      label: event.label,
      state: fired !== undefined ? 'fired' : triggered !== undefined ? 'triggered' : 'waiting',
      ...(fired !== undefined ? { firedAt: fired - ctx.battleStartTick } : {}),
    };
  });
}

/** The point a fall-back goes to: the named area's middle, else the side's own deployment area's. */
export function fallBackPoint(ctx: SimContext, posture: ActivePosture): Vec2 | null {
  const place = posture.area !== undefined ? ctx.scripted?.places.get(posture.area) : undefined;
  const polygon = place?.kind === 'area' ? place.polygon : ctx.battleMap?.deployment.legalist.area;
  if (!polygon || polygon.length === 0) return null;
  const centre = {
    x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
    y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
  };
  return centre;
}
