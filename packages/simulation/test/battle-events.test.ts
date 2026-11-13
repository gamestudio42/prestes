import { describe, expect, it } from 'vitest';
import {
  compileMapDocument,
  createEditableMap,
  objectiveCircle,
  toMapDocument,
  type BattleEvent,
  type BattleMap,
  type EventAction,
  type EventPlace,
  type Objective,
  type SimEvent,
} from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { createScriptedState, updateBattleEvents } from '../src/systems/battle-events';
import type { SimContext } from '../src/systems/context';
import { createBattleMemory } from '../src/systems/enemy-commander';
import type { MutableUnit } from '../src/systems/model';

/**
 * add-battle-events 2.2-2.6. A medium open field (400 m): the column deploys
 * in the south, the legalists in the north. The legalist entry point is on
 * the north edge, the column's on the south edge; the bridge objective is in
 * the middle and the "morro" area in the north-west.
 */
const NORTH: EventPlace = { id: 1, name: 'estrada norte', kind: 'entry', point: { x: 60, y: -196 }, facing: { x: 0, y: 1 } };
const SOUTH: EventPlace = { id: 2, name: 'estrada sul', kind: 'entry', point: { x: -60, y: 196 }, facing: { x: 0, y: -1 } };
const MORRO: EventPlace = { id: 3, name: 'morro', kind: 'area', polygon: [{ x: -120, y: -150 }, { x: -80, y: -150 }, { x: -80, y: -110 }, { x: -120, y: -110 }] };
const BRIDGE: Objective = { id: 1, name: { en: 'Bridge', 'pt-BR': 'Ponte' }, area: objectiveCircle({ x: 0, y: 0 }, 15), flag: { x: 0, y: 0 }, value: 2, owner: 'neutral' };
const CARD: EventAction = { kind: 'card', title: { en: 'They come', 'pt-BR': 'Eles vêm' }, text: { en: 'Text', 'pt-BR': 'Texto' } };
const event = (id: number, patch: Partial<BattleEvent> = {}): BattleEvent => ({ id, label: `e${id}`, trigger: { kind: 'time', seconds: 1800 }, delay: 0, actions: [CARD], ...patch });

function fieldWith(events: BattleEvent[], objectives: Objective[] = [BRIDGE]): BattleMap {
  const map = createEditableMap({ id: 'events-field', size: 'medium', name: { en: 'Events', 'pt-BR': 'Eventos' } });
  return compileMapDocument(toMapDocument({ ...map, objectives, events, eventPlaces: [NORTH, SOUTH, MORRO] }));
}

const fired = (events: readonly SimEvent[]) => events.filter((entry): entry is Extract<SimEvent, { type: 'battle_event_fired' }> => entry.type === 'battle_event_fired');

/** An engine on the field, run tick by tick, collecting every event. */
function battle(events: BattleEvent[], options: { seed?: number; playtest?: boolean } = {}) {
  const engine = new SimulationEngine({ seed: options.seed ?? 1925, scenario: 'battle3v3', battleMap: fieldWith(events), playtest: options.playtest === true });
  const log: SimEvent[] = [];
  const hashes: string[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) {
      const frame = engine.tick();
      log.push(...frame.events);
      hashes.push(frame.hash);
    }
  };
  return { engine, log, hashes, run };
}

/** A bare context for the trigger rules, without the rest of the simulation. */
function triggerContext(events: BattleEvent[], units: Partial<MutableUnit>[] = []) {
  const ctx = {
    scripted: createScriptedState(events, [NORTH, SOUTH, MORRO]),
    units: units.map((unit, index) => ({ id: index + 1, alive: true, incapacitated: false, routed: false, dummy: false, x: 0, y: 150, ...unit }) as MutableUnit),
    objectives: [{ id: 1, owner: 'neutral', progress: { column: 0, legalist: 0 }, contested: false, value: 2, name: BRIDGE.name, flag: BRIDGE.flag, area: BRIDGE.area }],
    battleStartTick: 0,
    battle: createBattleMemory(),
  };
  const log: SimEvent[] = [];
  const step = (tick: number, extra: SimEvent[] = []) => {
    const events: SimEvent[] = [...extra];
    updateBattleEvents(ctx as unknown as SimContext, tick, events);
    log.push(...events);
  };
  return { ctx, log, step };
}

describe('battle events: triggers', () => {
  it('a map without events carries no event state', () => {
    const engine = new SimulationEngine({ seed: 1, scenario: 'battle3v3', battleMap: fieldWith([]) });
    expect(engine.scripted).toBeUndefined();
    expect(engine.frame().battleEvents).toBeUndefined();
  });

  it('delay: triggered at 5 s with 3 s of delay, the actions run at 8 s and not before', () => {
    const { log, step } = triggerContext([event(1, { trigger: { kind: 'time', seconds: 5 }, delay: 3 })]);
    for (let tick = 1; tick <= 79; tick += 1) step(tick);
    expect(fired(log)).toEqual([]);
    step(80);
    expect(fired(log)).toMatchObject([{ tick: 80, eventId: 1, cards: [{ title: { 'pt-BR': 'Eles vêm' } }] }]);
  });

  it('fires once: leaving and re-entering the area does not fire it again', () => {
    const { ctx, log, step } = triggerContext([event(1, { trigger: { kind: 'area', area: 3, side: 'column' } })], [{ faction: 'column' }]);
    const man = ctx.units[0]!;
    const at = (x: number, y: number) => Object.assign(man, { x, y });
    at(-100, -130);
    step(1);
    at(0, 150);
    step(2);
    at(-100, -130);
    step(3);
    expect(fired(log).map((entry) => entry.tick)).toEqual([1]);
  });

  it('area entered by an unfit man does not count', () => {
    const { log, step } = triggerContext([event(1, { trigger: { kind: 'area', area: 3, side: 'column' } })], [{ faction: 'column', x: -100, y: -130, routed: true }]);
    step(1);
    expect(fired(log)).toEqual([]);
  });

  it('objective taken and lost', () => {
    const { ctx, log, step } = triggerContext([
      event(1, { trigger: { kind: 'objective', objective: 1, side: 'legalist', change: 'taken' } }),
      event(2, { trigger: { kind: 'objective', objective: 1, side: 'legalist', change: 'lost' } }),
    ]);
    step(1);
    ctx.objectives[0]!.owner = 'legalist';
    step(2, [{ type: 'objective_taken', tick: 2, id: 1, side: 'legalist' }]);
    expect(fired(log).map((entry) => entry.eventId)).toEqual([1]);
    step(3);
    // The owner was the legalists' when the column took it: they lost it.
    ctx.objectives[0]!.owner = 'column';
    step(4, [{ type: 'objective_taken', tick: 4, id: 1, side: 'column' }]);
    expect(fired(log).map((entry) => [entry.eventId, entry.tick])).toEqual([[1, 2], [2, 4]]);
  });

  it('losses count reinforcements: 20 of 40 fielded is 50 %', () => {
    const units: Partial<MutableUnit>[] = Array.from({ length: 30 }, () => ({ faction: 'legalist' as const }));
    const { ctx, log, step } = triggerContext([event(1, { trigger: { kind: 'losses', side: 'legalist', percent: 50 } })], units);
    step(1);
    // Ten more arrive (an event's troops add to the side's fielded men).
    ctx.scripted.fielded!.legalist += 10;
    for (let index = 0; index < 10; index += 1) ctx.units.push({ ...ctx.units[0]!, id: 100 + index });
    ctx.units.slice(0, 19).forEach((unit) => (unit.alive = false));
    step(2);
    expect(fired(log)).toEqual([]);
    ctx.units[19]!.incapacitated = true;
    step(3);
    expect(fired(log).map((entry) => entry.tick)).toEqual([3]);
  });

  it('chain: B after A with 600 s fires 600 s after A', () => {
    const { log, step } = triggerContext([event(1, { trigger: { kind: 'time', seconds: 240 } }), event(2, { trigger: { kind: 'after', event: 1 }, delay: 600 })]);
    for (let tick = 1; tick <= 8400; tick += 1) step(tick);
    expect(fired(log).map((entry) => [entry.eventId, entry.tick])).toEqual([[1, 2400], [2, 8400]]);
  });

  it('not during deployment: time 0:00 fires on the first tick after the phase ends', () => {
    const engine = new SimulationEngine({ seed: 3, scenario: 'battle3v3', battleMap: fieldWith([event(1, { trigger: { kind: 'time', seconds: 0 } })]), deployment: true });
    expect(fired(engine.runTicks(5).events)).toEqual([]);
    engine.enqueue({ type: 'start_battle' });
    engine.runTicks(1);
    const frame = engine.tick();
    expect(fired(frame.events)).toMatchObject([{ eventId: 1, tick: engine.battleStartTick + 1 }]);
  });
});

describe('battle events: troops enter', () => {
  const troops = (side: 'column' | 'legalist', sections: string[], order: Extract<EventAction, { kind: 'troops' }>['order'], entry = side === 'column' ? 2 : 1): EventAction =>
    ({ kind: 'troops', side, entry, sections, order }) as EventAction;

  it('two patriotic battalion sections enter 5 s apart and go for the bridge, then the commander uses them', () => {
    const { engine, run } = battle([event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [troops('legalist', ['voluntarios', 'voluntarios'], { kind: 'objective', objective: 1 })] })]);
    const before = new Set(engine.units.map((unit) => unit.squadId));
    run(10);
    const firstSquads = [...new Set(engine.units.map((unit) => unit.squadId))].filter((id) => !before.has(id));
    expect(firstSquads).toHaveLength(1);
    const first = engine.units.filter((unit) => unit.squadId === firstSquads[0]);
    expect(first.every((unit) => unit.faction === 'legalist' && unit.sectionType === 'voluntarios')).toBe(true);
    expect(first.every((unit) => unit.y > -200 && unit.y < -150)).toBe(true);
    expect(first[0]!.currentOrder).toBe('advance');
    expect(engine.battle.plans.get(firstSquads[0]!)).toBe('arriving');
    run(49);
    expect(new Set(engine.units.map((unit) => unit.squadId)).size).toBe(before.size + 1);
    run(1);
    expect(new Set(engine.units.map((unit) => unit.squadId)).size).toBe(before.size + 2);
  });

  it('a column section enters, walks to its point and takes orders like the others', () => {
    const { engine, run } = battle([event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [troops('column', ['fuzileiros'], { kind: 'move', to: { x: -60, y: 150 } })] })]);
    const before = new Set(engine.units.map((unit) => unit.squadId));
    run(10);
    const squad = [...new Set(engine.units.map((unit) => unit.squadId))].find((id) => !before.has(id))!;
    const men = engine.units.filter((unit) => unit.squadId === squad);
    expect(men).toHaveLength(11);
    expect(men.every((unit) => unit.faction === 'column')).toBe(true);
    run(400);
    const centre = men.reduce((sum, unit) => sum + unit.y, 0) / men.length;
    expect(centre).toBeLessThan(165);
    const seq = engine.enqueue({ type: 'move', unitIds: men.map((unit) => unit.id), to: { x: -60, y: 120 } });
    const frame = engine.tick();
    expect(frame.events.some((entry) => entry.type === 'command_rejected' && entry.seq === seq)).toBe(false);
  });

  it('an arrival nobody in the column sees is not shown to the player', () => {
    const { engine, run } = battle([event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [troops('legalist', ['infantaria-exercito'], { kind: 'commander' })] })]);
    const before = new Set(engine.units.map((unit) => unit.id));
    run(10);
    const arrived = engine.units.filter((unit) => !before.has(unit.id)).map((unit) => unit.id);
    expect(arrived.length).toBeGreaterThan(0);
    const seenByColumn = new Set(engine.frame().seen.column);
    expect(arrived.some((id) => seenByColumn.has(id))).toBe(false);
  });

  it('arrivals take unit ids in the order they appear', () => {
    const { engine, run } = battle([event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [troops('legalist', ['infantaria-exercito', 'brigada-militar'], { kind: 'commander' })] })]);
    const next = engine.nextUnitId;
    run(70);
    const arrived = engine.units.filter((unit) => unit.id >= next);
    expect(arrived.map((unit) => unit.id)).toEqual(arrived.map((_, index) => next + index));
    expect(arrived.slice(0, 11).every((unit) => unit.sectionType === 'infantaria-exercito')).toBe(true);
    expect(arrived.slice(11).every((unit) => unit.sectionType === 'brigada-militar')).toBe(true);
  });
});
