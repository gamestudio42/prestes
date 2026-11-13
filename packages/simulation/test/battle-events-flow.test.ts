import { describe, expect, it } from 'vitest';
import { compileMapDocument, createEditableMap, objectiveCircle, toMapDocument, type BattleEvent, type BattleMap, type EventAction, type EventPlace, type Objective, type SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import type { MutableUnit } from '../src/systems/model';

/**
 * add-battle-events 2.4-2.6: the enemy posture, firing by hand in the
 * playtest, and a whole scripted battle run twice. A medium open field: the
 * column in the south, the legalists in the north; the bridge in the middle
 * starts as the legalists' (value 2); "morro" lies in the north-west.
 */
const NORTH: EventPlace = { id: 1, name: 'estrada norte', kind: 'entry', point: { x: 60, y: -196 }, facing: { x: 0, y: 1 } };
const MORRO: EventPlace = { id: 3, name: 'morro', kind: 'area', polygon: [{ x: -120, y: -150 }, { x: -80, y: -150 }, { x: -80, y: -110 }, { x: -120, y: -110 }] };
const MORRO_CENTRE = { x: -100, y: -130 };
const BRIDGE: Objective = { id: 1, name: { en: 'Bridge', 'pt-BR': 'Ponte' }, area: objectiveCircle({ x: 0, y: -40 }, 15), flag: { x: 0, y: -40 }, value: 2, owner: 'legalist' };
const CARD: EventAction = { kind: 'card', title: { en: 'T', 'pt-BR': 'T' }, text: { en: 'X', 'pt-BR': 'X' } };
const event = (id: number, patch: Partial<BattleEvent> = {}): BattleEvent => ({ id, label: `e${id}`, trigger: { kind: 'time', seconds: 1800 }, delay: 0, actions: [CARD], ...patch });
const posture = (kind: 'offensive' | 'fall-back' | 'hold', until: { seconds: number } | { event: number }, area?: number): EventAction =>
  ({ kind: 'posture', posture: kind, until, ...(area !== undefined ? { area } : {}) }) as EventAction;

function fieldWith(events: BattleEvent[]): BattleMap {
  const map = createEditableMap({ id: 'events-flow', size: 'medium', name: { en: 'Events', 'pt-BR': 'Eventos' } });
  return compileMapDocument(toMapDocument({ ...map, objectives: [BRIDGE], events, eventPlaces: [NORTH, MORRO] }));
}

function battle(events: BattleEvent[], options: { seed?: number; playtest?: boolean } = {}) {
  const engine = new SimulationEngine({ seed: options.seed ?? 1926, scenario: 'battle3v3', battleMap: fieldWith(events), playtest: options.playtest === true });
  const log: SimEvent[] = [];
  const hashes: string[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) {
      const frame = engine.tick();
      log.push(...frame.events);
      hashes.push(frame.hash);
    }
  };
  const legalistSquads = () => {
    const squads = new Map<number, MutableUnit[]>();
    for (const unit of engine.units) {
      if (unit.faction !== 'legalist' || !unit.alive || unit.routed || unit.incapacitated) continue;
      squads.set(unit.squadId, [...(squads.get(unit.squadId) ?? []), unit]);
    }
    return squads;
  };
  return { engine, log, hashes, run, legalistSquads };
}

const centre = (men: readonly MutableUnit[]) => ({ x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length, y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length });
const goal = (men: readonly MutableUnit[]) => {
  const ends = men.map((unit) => unit.path[unit.path.length - 1] ?? { x: unit.targetX, y: unit.targetY });
  return { x: ends.reduce((sum, point) => sum + point.x, 0) / ends.length, y: ends.reduce((sum, point) => sum + point.y, 0) / ends.length };
};
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

describe('battle events: enemy posture', () => {
  it('a general offensive sends every section, and when it ends the commander guards its objective again', () => {
    const { engine, run, legalistSquads } = battle([event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [posture('offensive', { seconds: 30 })] })]);
    run(25);
    const squads = [...legalistSquads().keys()];
    expect(squads.length).toBe(3);
    expect(squads.every((id) => engine.battle.plans.get(id) === 'attack')).toBe(true);
    expect(engine.battle.objectiveGuards.size).toBe(0);
    run(300);
    expect(engine.scripted!.posture).toBeNull();
    expect(engine.battle.objectiveGuards.size).toBe(1);
  });

  it('fall back to an area until an event, then the normal plan resumes', () => {
    const { engine, run, legalistSquads } = battle([
      event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [posture('fall-back', { event: 2 }, 3)] }),
      event(2, { trigger: { kind: 'time', seconds: 60 } }),
    ]);
    run(25);
    for (const men of legalistSquads().values()) {
      expect(distance(goal(men), MORRO_CENTRE)).toBeLessThan(30);
      expect(men[0]!.currentOrder).toBe('defend');
    }
    expect(engine.scripted!.posture?.posture).toBe('fall-back');
    run(580);
    expect(engine.scripted!.posture).toBeNull();
  });

  it('routed men keep routing under a general offensive', () => {
    const { engine, run, legalistSquads } = battle([event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [posture('offensive', { seconds: 60 })] })]);
    run(5);
    const [routedSquad] = [...legalistSquads().keys()];
    const routed = engine.units.filter((unit) => unit.squadId === routedSquad);
    for (const unit of routed) Object.assign(unit, { routed: true, state: 'routed', currentOrder: 'flee' });
    run(30);
    expect(routed.every((unit) => unit.routed && unit.currentOrder !== 'advance')).toBe(true);
    expect(engine.battle.plans.get(routedSquad!)).not.toBe('attack');
  });

  it('a hold posture keeps the commander from retaking until it ends, then a section goes', () => {
    const { engine, run, legalistSquads } = battle([event(1, { trigger: { kind: 'time', seconds: 1 }, actions: [posture('hold', { seconds: 30 })] })]);
    run(20);
    // The column takes the bridge while the legalists hold.
    engine.objectives[0]!.owner = 'column';
    run(290);
    const advancing = () => [...legalistSquads().values()].filter((men) => men[0]!.currentOrder === 'advance' && distance(goal(men), BRIDGE.flag) < 20);
    expect(advancing()).toHaveLength(0);
    run(600);
    expect(engine.scripted!.posture).toBeNull();
    expect(advancing().length + [...legalistSquads().values()].filter((men) => distance(centre(men), BRIDGE.flag) < 20).length).toBeGreaterThan(0);
  });
});

describe('battle events: fire now', () => {
  it('in the playtest, an event fires at once and the frame shows its state', () => {
    const { engine, log, run } = battle([event(1, { delay: 300 }), event(2, { trigger: { kind: 'after', event: 1 }, delay: 10 })], { playtest: true });
    run(10);
    expect(engine.frame().battleEvents).toEqual([
      { id: 1, label: 'e1', state: 'waiting' },
      { id: 2, label: 'e2', state: 'waiting' },
    ]);
    engine.enqueue({ type: 'fire_battle_event', eventId: 1 });
    run(1);
    expect(log.filter((entry) => entry.type === 'battle_event_fired')).toMatchObject([{ eventId: 1, tick: 11 }]);
    expect(engine.frame().battleEvents).toEqual([
      { id: 1, label: 'e1', state: 'fired', firedAt: 11 },
      { id: 2, label: 'e2', state: 'triggered' },
    ]);
    run(100);
    expect(log.filter((entry) => entry.type === 'battle_event_fired').map((entry) => (entry as { eventId: number }).eventId)).toEqual([1, 2]);
  });

  it('outside the playtest the command is refused and nothing fires', () => {
    const { engine, log, run } = battle([event(1)]);
    const seq = engine.enqueue({ type: 'fire_battle_event', eventId: 1 });
    run(2);
    expect(log).toContainEqual(expect.objectContaining({ type: 'command_rejected', seq, reason: 'playtest_only' }));
    expect(log.some((entry) => entry.type === 'battle_event_fired')).toBe(false);
    expect(engine.frame().battleEvents).toBeUndefined();
  });
});

describe('battle events: determinism', () => {
  it('a scripted battle run twice gives the same events on the same ticks and the same hash on every tick', () => {
    const script = [
      event(1, { trigger: { kind: 'time', seconds: 5 }, actions: [{ kind: 'troops', side: 'legalist', entry: 1, sections: ['infantaria-exercito', 'voluntarios'], order: { kind: 'objective', objective: 1 } }] }),
      event(2, { trigger: { kind: 'objective', objective: 1, side: 'legalist', change: 'lost' }, actions: [posture('offensive', { seconds: 60 })] }),
      event(3, { trigger: { kind: 'after', event: 1 }, delay: 20, actions: [posture('hold', { seconds: 30 }), CARD] }),
      event(4, { trigger: { kind: 'losses', side: 'legalist', percent: 10 } }),
    ];
    const first = battle(script);
    const second = battle(script);
    first.run(700);
    second.run(700);
    const firedOf = (log: SimEvent[]) => log.filter((entry) => entry.type === 'battle_event_fired');
    expect(firedOf(first.log).length).toBeGreaterThanOrEqual(2);
    expect(firedOf(second.log)).toEqual(firedOf(first.log));
    expect(second.hashes).toEqual(first.hashes);
  });
});
