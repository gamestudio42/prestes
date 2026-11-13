import { describe, expect, it } from 'vitest';
import { createEditableMap, mapSide, objectiveCircle, validateEditableMap, type BattleEvent, type EventAction, type EventPlace, type Objective } from '../src';

// add-battle-events 1.3: the map check's event rules.
const base = createEditableMap({ id: 'events-check', size: 'small', name: { en: 'Test', 'pt-BR': 'Teste' } });
const half = mapSide(base.size) / 2;
const ENTRY: EventPlace = { id: 1, name: 'estrada', kind: 'entry', point: { x: 0, y: -half + 4 }, facing: { x: 0, y: 1 } };
const AREA: EventPlace = { id: 2, name: 'morro', kind: 'area', polygon: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 0, y: 10 }] };
const BRIDGE: Objective = { id: 1, name: { en: 'Bridge', 'pt-BR': 'Ponte' }, area: objectiveCircle({ x: 0, y: 0 }, 12), flag: { x: 0, y: 0 }, value: 2, owner: 'neutral' };
const card: EventAction = { kind: 'card', title: { en: 'T', 'pt-BR': 'T' }, text: { en: 'X', 'pt-BR': 'X' } };
const event = (id: number, patch: Partial<BattleEvent> = {}): BattleEvent => ({ id, label: `e${id}`, trigger: { kind: 'time', seconds: 60 }, delay: 0, actions: [card], ...patch });

function eventProblems(events: BattleEvent[], places: EventPlace[] = [ENTRY, AREA]) {
  return validateEditableMap({ ...base, objectives: [BRIDGE], events, eventPlaces: places }).filter(
    (problem) => problem.code.startsWith('event') || problem.code.startsWith('entry'),
  );
}
const codes = (events: BattleEvent[], places?: EventPlace[]) => eventProblems(events, places).map((problem) => problem.code);

describe('event checks', () => {
  it('a well-formed set of events passes', () => {
    expect(
      codes([
        event(1, { actions: [{ kind: 'troops', side: 'legalist', entry: 1, sections: ['infantaria-exercito'], order: { kind: 'objective', objective: 1 } }] }),
        event(2, { trigger: { kind: 'after', event: 1 }, actions: [{ kind: 'posture', posture: 'fall-back', area: 2, until: { event: 1 } }] }),
        event(3, { trigger: { kind: 'area', area: 2, side: 'column' }, actions: [{ kind: 'troops', side: 'column', entry: 1, sections: ['fuzileiros'], order: { kind: 'move', to: { x: 0, y: -20 } } }] }),
      ]),
    ).toEqual([]);
  });

  it('reports missing references', () => {
    expect(codes([event(1, { trigger: { kind: 'objective', objective: 9, side: 'column', change: 'taken' } })])).toEqual(['event-unknown-objective']);
    expect(codes([event(1, { trigger: { kind: 'area', area: 1, side: 'column' } })])).toEqual(['event-unknown-place']);
    expect(codes([event(1, { trigger: { kind: 'after', event: 7 } })])).toContain('event-unknown-event');
    expect(codes([event(1, { actions: [{ kind: 'posture', posture: 'hold', until: { event: 7 } }] })])).toEqual(['event-unknown-event']);
  });

  it('reports a section of the wrong side or unknown', () => {
    const troops = (sections: string[]): BattleEvent => event(1, { actions: [{ kind: 'troops', side: 'legalist', entry: 1, sections: sections as never, order: { kind: 'commander' } }] });
    expect(codes([troops(['fuzileiros'])])).toEqual(['event-wrong-side-section']);
    expect(codes([troops(['nobody'])])).toEqual(['event-unknown-section']);
    expect(codes([troops([])])).toEqual(['event-no-sections']);
  });

  it('reports an entry point off the edge', () => {
    const inside: EventPlace = { ...ENTRY, point: { x: 0, y: -half + 25 } };
    const problems = eventProblems([], [inside]);
    expect(problems.map((problem) => problem.code)).toEqual(['entry-off-edge']);
    expect(problems[0]!.target).toEqual({ kind: 'event-place', id: 1 });
  });

  it('reports a card missing a language', () => {
    expect(codes([event(1, { actions: [{ ...card, text: { en: 'X', 'pt-BR': ' ' } } as EventAction] })])).toEqual(['event-card-missing']);
  });

  it('reports a loop naming both events and selects the first', () => {
    const problems = eventProblems([event(1, { trigger: { kind: 'after', event: 2 } }), event(2, { trigger: { kind: 'after', event: 1 } })]);
    const loop = problems.find((problem) => problem.code === 'event-loop')!;
    expect(loop.params.events).toBe('e1 → e2');
    expect(loop.target).toEqual({ kind: 'event', id: 1 });
  });

  it('reports a time past 30 minutes, no trigger, no action and too many events', () => {
    expect(codes([event(1, { trigger: { kind: 'time', seconds: 31 * 60 } })])).toEqual(['event-time-too-late']);
    expect(codes([event(1, { trigger: null })])).toEqual(['event-no-trigger']);
    expect(codes([event(1, { actions: [] })])).toEqual(['event-no-action']);
    expect(codes(Array.from({ length: 25 }, (_, index) => event(index + 1)))).toEqual(['event-too-many']);
  });

  it('warns down a chain that follows an event that can never fire', () => {
    const problems = eventProblems([event(1, { actions: [] }), event(2, { trigger: { kind: 'after', event: 1 } }), event(3, { trigger: { kind: 'after', event: 2 } })]);
    expect(problems.filter((problem) => problem.code === 'event-never-fires').map((problem) => [problem.severity, problem.target?.id])).toEqual([
      ['warning', 2],
      ['warning', 3],
    ]);
  });
});
