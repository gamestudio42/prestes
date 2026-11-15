import { describe, expect, it } from 'vitest';
import {
  compileMapDocument,
  createEditableMap,
  toMapDocument,
  type BattleEvent,
  type BattleMap,
  type Objective,
  type SimEvent,
  type Withdrawal,
} from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { updateOutcome } from '../src/systems/combat';
import type { SimContext } from '../src/systems/context';
import { createScriptedState, updateBattleEvents } from '../src/systems/battle-events';
import { createBattleMemory, turnOnExit } from '../src/systems/enemy-commander';
import type { MutableUnit } from '../src/systems/model';
import { ALL_HELD_TICKS, type ObjectiveState } from '../src/systems/objectives';
import { createWithdrawalState, updateWithdrawal } from '../src/systems/withdrawal';

/**
 * add-withdrawal-exits 2.2, 3.1, 4.1. A medium field (400 m): the column
 * deploys in the south, the legalists in the north; the exit is on the west
 * edge, level with the column, outside its deployment area.
 */
const WEST: Withdrawal['exits'][number] = {
  id: 1,
  name: { en: 'West ford', 'pt-BR': 'Vau oeste' },
  polygon: [{ x: -200, y: 60 }, { x: -182, y: 60 }, { x: -182, y: 140 }, { x: -200, y: 140 }],
};

function fieldWith(requirement: Withdrawal['requirement'], events: BattleEvent[] = []): BattleMap {
  const map = createEditableMap({ id: 'withdrawal-field', size: 'medium', name: { en: 'Out', 'pt-BR': 'Fora' } });
  return compileMapDocument(toMapDocument({ ...map, withdrawal: { exits: [WEST], requirement }, ...(events.length > 0 ? { events, eventPlaces: [] } : {}) }));
}

/** A bare unit for the rules that need no map. */
const man = (id: number, patch: Partial<MutableUnit> = {}) =>
  ({ id, faction: 'column', squadId: 1, alive: true, incapacitated: false, routed: false, dummy: false, x: 0, y: 0, path: [], pathIndex: 0, targetId: null, currentOrder: null, ...patch }) as MutableUnit;

function bareContext(units: MutableUnit[], requirement: Withdrawal['requirement'], extra: Record<string, unknown> = {}) {
  return {
    units,
    orders: [],
    withdrawal: createWithdrawalState({ exits: [WEST], requirement }),
    scenario: 'battle3v3',
    opposition: true,
    outcome: 'playing',
    objectives: [] as ObjectiveState[],
    battle: createBattleMemory(),
    allHeldSince: { column: null, legalist: null } as { column: number | null; legalist: number | null },
    battleStartTick: 0,
    timeLimitTicks: 12000,
    ...extra,
  } as unknown as SimContext;
}

const INSIDE = { x: -190, y: 100 };

describe('withdrawal: leaving the field', () => {
  it('a section walks out: each man leaves on entering, the section is out with the last', () => {
    const units = [man(1, INSIDE), man(2, INSIDE), man(3, { x: 0, y: 100 }), man(9, { faction: 'legalist', squadId: 5, targetId: 1 })];
    const ctx = bareContext(units, { sections: 1, command: false });
    const events: SimEvent[] = [];
    updateWithdrawal(ctx, 10, events);
    expect(events.filter((event) => event.type === 'unit_exited')).toHaveLength(2);
    expect(events.some((event) => event.type === 'section_exited')).toBe(false);
    expect(ctx.units.map((unit) => unit.id)).toEqual([3, 9]);
    // Nobody aims at a man who left.
    expect(ctx.units.find((unit) => unit.id === 9)!.targetId).toBeNull();
    ctx.units[0]!.x = INSIDE.x;
    ctx.units[0]!.y = INSIDE.y;
    updateWithdrawal(ctx, 11, events);
    expect(events.find((event) => event.type === 'section_exited')).toMatchObject({ tick: 11, squadId: 1, exitId: 1, command: false });
    expect(ctx.withdrawal!.exited).toHaveLength(3);
  });

  it('wounded left behind: the section is out when its fit men are, the incapacitated stay', () => {
    const units = [man(1, INSIDE), man(2, INSIDE), man(3, { incapacitated: true })];
    const ctx = bareContext(units, { sections: 1, command: false });
    const events: SimEvent[] = [];
    updateWithdrawal(ctx, 5, events);
    expect(ctx.withdrawal!.out.has(1)).toBe(true);
    expect(ctx.units.map((unit) => unit.id)).toEqual([3]);
  });

  it('routed men do not get out', () => {
    const ctx = bareContext([man(1, { ...INSIDE, routed: true })], { sections: 1, command: false });
    const events: SimEvent[] = [];
    updateWithdrawal(ctx, 5, events);
    expect(events).toHaveLength(0);
    expect(ctx.units).toHaveLength(1);
  });

  it('the command section is known by its limit group', () => {
    const ctx = bareContext([man(1, { ...INSIDE, squadId: 7, sectionType: 'comando' })], { sections: 1, command: true });
    const events: SimEvent[] = [];
    updateWithdrawal(ctx, 5, events);
    expect(events.find((event) => event.type === 'section_exited')).toMatchObject({ squadId: 7, command: true });
  });
});

describe('withdrawal: victory and defeat', () => {
  const legalist = () => man(50, { faction: 'legalist', squadId: 9, x: 0, y: -100 });

  it('requirement met: victory decided by withdrawal, with the men out', () => {
    const ctx = bareContext([man(1, INSIDE), man(2, { squadId: 2 }), legalist()], { sections: 1, command: false });
    const events: SimEvent[] = [];
    updateWithdrawal(ctx, 3, events);
    updateOutcome(ctx, 3, events);
    expect(ctx.outcome).toBe('victory');
    expect(events.find((event) => event.type === 'outcome')).toMatchObject({ decidedBy: 'withdrawal', withdrawal: { menOut: 1, sectionsOut: 1, sections: 2, required: 1 } });
  });

  it('command section required: a rifle section out is not enough', () => {
    const ctx = bareContext([man(1, INSIDE), man(2, { squadId: 2, sectionType: 'comando' }), legalist()], { sections: 1, command: true });
    const events: SimEvent[] = [];
    updateWithdrawal(ctx, 3, events);
    updateOutcome(ctx, 3, events);
    expect(ctx.outcome).toBe('playing');
    const command = ctx.units.find((unit) => unit.id === 2)!;
    command.x = INSIDE.x;
    command.y = INSIDE.y;
    updateWithdrawal(ctx, 4, events);
    updateOutcome(ctx, 4, events);
    expect(ctx.outcome).toBe('victory');
  });

  it('cut off by the clock', () => {
    const ctx = bareContext([man(1), legalist()], { sections: 1, command: false }, { timeLimitTicks: 100 });
    const events: SimEvent[] = [];
    updateOutcome(ctx, 99, events);
    expect(ctx.outcome).toBe('playing');
    updateOutcome(ctx, 100, events);
    expect(events.find((event) => event.type === 'outcome')).toMatchObject({ outcome: 'defeat', decidedBy: 'cut-off' });
  });

  it('last men out short of the requirement: cut off', () => {
    const ctx = bareContext([man(1, INSIDE), man(2, { squadId: 2, alive: false }), legalist()], { sections: 2, command: false });
    const events: SimEvent[] = [];
    updateWithdrawal(ctx, 3, events);
    updateOutcome(ctx, 3, events);
    expect(events.find((event) => event.type === 'outcome')).toMatchObject({ outcome: 'defeat', decidedBy: 'cut-off' });
  });

  it('holding the objectives does not win a breakout', () => {
    const objective = { id: 1, owner: 'column', progress: { column: 0, legalist: 0 }, contested: false, value: 2, name: WEST.name, flag: { x: 0, y: 0 }, area: WEST.polygon } as ObjectiveState;
    const ctx = bareContext([man(1), legalist()], { sections: 1, command: false }, { objectives: [objective] });
    ctx.allHeldSince.column = 1;
    const events: SimEvent[] = [];
    updateOutcome(ctx, ALL_HELD_TICKS + 5, events);
    expect(ctx.outcome).toBe('playing');
  });
});

describe('withdrawal: the exited trigger', () => {
  const card = { kind: 'card' as const, title: { en: 'Out', 'pt-BR': 'Fora' }, text: { en: 'Out', 'pt-BR': 'Fora' } };

  it('the commander crosses, and sections out; men out are not losses', () => {
    const events: BattleEvent[] = [
      { id: 1, label: 'command', trigger: { kind: 'exited', command: true }, delay: 0, actions: [card] },
      { id: 2, label: 'two out', trigger: { kind: 'exited', sections: 2 }, delay: 0, actions: [card] },
      { id: 3, label: 'losses', trigger: { kind: 'losses', side: 'column', percent: 50 }, delay: 0, actions: [card] },
    ];
    const units = [man(1, { ...INSIDE, sectionType: 'comando' }), man(2, { ...INSIDE, squadId: 2 }), man(3, { squadId: 3 }), man(4, { squadId: 3 })];
    const ctx = bareContext(units, { sections: 2, command: false }, { scripted: createScriptedState(events, []) });
    const log: SimEvent[] = [];
    updateWithdrawal(ctx, 1, log);
    updateBattleEvents(ctx, 1, log);
    const fired = log.filter((event) => event.type === 'battle_event_fired').map((event) => (event as { eventId: number }).eventId);
    expect(fired).toEqual([1, 2]);
  });
});

describe('withdrawal: a battle', () => {
  it('a section ordered into the exit gets out and wins the breakout; the replay is the same', () => {
    const play = () => {
      const engine = new SimulationEngine({ seed: 1925, scenario: 'battle3v3', battleMap: fieldWith({ sections: 1, command: false }) });
      const start = engine.tick();
      const squad = start.units.find((unit) => unit.faction === 'column')!.squadId;
      const ids = start.units.filter((unit) => unit.faction === 'column' && unit.squadId === squad).map((unit) => unit.id);
      engine.enqueue({ type: 'move', unitIds: ids, to: { x: -192, y: 100 } });
      const log: SimEvent[] = [];
      let frame = start;
      for (let tick = 0; tick < 3000 && frame.outcome === 'playing'; tick += 1) {
        frame = engine.tick();
        log.push(...frame.events);
      }
      return { frame, log, ids };
    };
    const first = play();
    expect(first.frame.outcome).toBe('victory');
    expect(first.log.find((event) => event.type === 'outcome')).toMatchObject({ decidedBy: 'withdrawal' });
    expect(first.frame.withdrawal).toMatchObject({ sectionsOut: 1, required: 1 });
    expect(first.frame.units.some((unit) => first.ids.includes(unit.id) && unit.alive && !unit.incapacitated && !unit.routed)).toBe(false);
    const second = play();
    expect(second.frame.hash).toBe(first.frame.hash);
  });

  it('a map without a withdrawal has no withdrawal state in its frame', () => {
    const map = createEditableMap({ id: 'plain-field', size: 'medium' });
    const objectives: Objective[] = [];
    const engine = new SimulationEngine({ seed: 1, scenario: 'battle3v3', battleMap: compileMapDocument(toMapDocument({ ...map, objectives })) });
    expect(engine.tick().withdrawal).toBeUndefined();
  });
});

describe('withdrawal: the commander cuts the exit', () => {
  const blockers = (engine: SimulationEngine) => [...engine.battle.plans].filter(([, plan]) => plan === 'block-exit').map(([squadId]) => squadId);

  it('blocks the route at the start, and turns on a column section near the exit', () => {
    const engine = new SimulationEngine({ seed: 7, scenario: 'battle3v3', battleMap: fieldWith({ sections: 3, command: false }), fog: false });
    let frame = engine.tick();
    for (let tick = 0; tick < 300; tick += 1) frame = engine.tick();
    const blocking = blockers(engine);
    expect(blocking).toHaveLength(1);
    const blocker = frame.units.filter((unit) => unit.squadId === blocking[0]);
    expect(blocker.every((unit) => unit.order === 'defend')).toBe(true);
    // A column section walks toward the exit; once seen within 60 m of it, the attackers turn on it.
    const squad = frame.units.find((unit) => unit.faction === 'column')!.squadId;
    const ids = frame.units.filter((unit) => unit.faction === 'column' && unit.squadId === squad).map((unit) => unit.id);
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: -150, y: 100 } });
    let turned = false;
    for (let tick = 0; tick < 1500 && !turned; tick += 1) {
      frame = engine.tick();
      turned = [...engine.battle.exitChase.values()].some((id) => ids.includes(id)) && frame.units.some((unit) => unit.faction === 'legalist' && unit.order === 'attack');
    }
    expect(turned).toBe(true);
  });

  it('an unseen column at the exit is not chased (fog-limited knowledge)', () => {
    const legalist = man(50, { faction: 'legalist', squadId: 9, x: -150, y: 100 });
    const ctx = bareContext([man(1, { ...INSIDE, x: -175 }), legalist], { sections: 1, command: false }, {
      fog: true,
      vision: { seen: { column: new Set<number>(), legalist: new Set<number>() }, lastSeen: { column: new Map(), legalist: new Map() } },
    });
    const plans = new Map([[9, 'attack' as const]]);
    turnOnExit(ctx, new Map([[9, [legalist]]]), plans, 400, []);
    expect(ctx.battle.exitChase.size).toBe(0);
  });

  it('a hold posture keeps the block back until it ends', () => {
    const hold: BattleEvent = { id: 1, label: 'hold', trigger: { kind: 'time', seconds: 0 }, delay: 0, actions: [{ kind: 'posture', posture: 'hold', until: { seconds: 60 } }] };
    const engine = new SimulationEngine({ seed: 7, scenario: 'battle3v3', battleMap: fieldWith({ sections: 3, command: false }, [hold]) });
    for (let tick = 0; tick < 300; tick += 1) engine.tick();
    expect(blockers(engine)).toHaveLength(0);
    for (let tick = 0; tick < 600; tick += 1) engine.tick();
    expect(blockers(engine)).toHaveLength(1);
  });
});
