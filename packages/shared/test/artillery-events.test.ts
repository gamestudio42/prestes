import { describe, expect, it } from 'vitest';
import {
  BOMBARD_RATE,
  BOMBARD_SECONDS,
  BOMBARD_SPREAD,
  compileEvents,
  coverSlots,
  createEditableMap,
  GUNS,
  isBattleEvent,
  validateEditableMap,
  type BattleEvent,
  type CoverPoint,
  type EventAction,
  type EventPlace,
} from '../src';

// add-artillery-bombardment 1.1 to 1.4: the bombardment action, the gun table, its checks and the crater's slots.
const base = createEditableMap({ id: 'artillery-check', size: 'small', name: { en: 'Test', 'pt-BR': 'Teste' } });
const AREA: EventPlace = { id: 2, name: 'Mooca', kind: 'area', polygon: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 0, y: 10 }] };
const shelling = (patch: Partial<Extract<EventAction, { kind: 'bombardment' }>> = {}): EventAction => ({
  kind: 'bombardment',
  side: 'legalist',
  gun: 'field-75',
  target: { kind: 'area', area: 2 },
  perMinute: 6,
  spread: 25,
  until: { seconds: 120 },
  ...patch,
});
const event = (id: number, actions: EventAction[]): BattleEvent => ({ id, label: `e${id}`, trigger: { kind: 'time', seconds: 60 }, delay: 0, actions });

function problems(events: BattleEvent[], places: EventPlace[] = [AREA], map = base) {
  return validateEditableMap({ ...map, events, eventPlaces: places }).filter((problem) => problem.code.startsWith('event') || problem.code.startsWith('bombard'));
}

describe('gun table', () => {
  it('pins the spec values', () => {
    expect(GUNS['field-75']).toMatchObject({ lethal: 5, wound: 15, suppress: 30 });
    expect(GUNS['howitzer-105']).toMatchObject({ lethal: 7, wound: 22, suppress: 40 });
  });
});

describe('bombardment action', () => {
  it('passes the shape check and fails when malformed', () => {
    expect(isBattleEvent(event(1, [shelling()]))).toBe(true);
    expect(isBattleEvent(event(1, [shelling({ target: { kind: 'enemy' } })]))).toBe(true);
    expect(isBattleEvent(event(1, [{ ...shelling(), gun: 'mortar' } as never]))).toBe(false);
    expect(isBattleEvent(event(1, [{ ...shelling(), target: { kind: 'area' } } as never]))).toBe(false);
    expect(isBattleEvent(event(1, [{ ...shelling(), until: {} } as never]))).toBe(false);
  });

  it('is clamped into range when compiled', () => {
    const [low] = compileEvents([event(1, [shelling({ perMinute: 0.2, spread: 1, until: { seconds: 2 } })])]);
    expect(low!.actions[0]).toMatchObject({ perMinute: BOMBARD_RATE.min, spread: BOMBARD_SPREAD.min, until: { seconds: BOMBARD_SECONDS.min } });
    const [high] = compileEvents([event(1, [shelling({ perMinute: 99, spread: 500, until: { seconds: 9999 } })])]);
    expect(high!.actions[0]).toMatchObject({ perMinute: BOMBARD_RATE.max, spread: BOMBARD_SPREAD.max, until: { seconds: BOMBARD_SECONDS.max } });
    const [until] = compileEvents([event(1, [shelling({ until: { event: 4 } })])]);
    expect(until!.actions[0]).toMatchObject({ until: { event: 4 } });
  });
});

describe('bombardment checks', () => {
  it('a well-formed bombardment passes', () => {
    expect(problems([event(1, [shelling()]), event(2, [shelling({ target: { kind: 'enemy' }, until: { event: 1 } })])])).toEqual([]);
  });

  it('reports a missing target area or "until" event, and lasting until itself', () => {
    expect(problems([event(1, [shelling()])], []).map((problem) => problem.code)).toEqual(['event-unknown-place']);
    expect(problems([event(1, [shelling({ until: { event: 9 } })])]).map((problem) => problem.code)).toEqual(['event-unknown-event']);
    expect(problems([event(1, [shelling({ until: { event: 1 } })])]).map((problem) => problem.code)).toEqual(['event-unknown-event']);
  });

  it('reports values out of range', () => {
    const found = problems([event(1, [shelling({ perMinute: 40, spread: 2, until: { seconds: 5 } })])]);
    expect(found.map((problem) => [problem.code, problem.params.field])).toEqual([
      ['bombard-out-of-range', 'rate'],
      ['bombard-out-of-range', 'spread'],
      ['bombard-out-of-range', 'duration'],
    ]);
    expect(found[0]!.target).toEqual({ kind: 'event', id: 1 });
  });

  it('warns when the guns fire on their own deployment area', () => {
    const own = base.deployment.legalist.area;
    const middle = { x: own.reduce((sum, point) => sum + point.x, 0) / own.length, y: own.reduce((sum, point) => sum + point.y, 0) / own.length };
    const there: EventPlace = { ...AREA, polygon: [{ x: middle.x - 5, y: middle.y - 5 }, { x: middle.x + 5, y: middle.y - 5 }, { x: middle.x, y: middle.y + 10 }] };
    const found = problems([event(1, [shelling()])], [there]);
    expect(found.map((problem) => [problem.code, problem.severity])).toEqual([['bombard-own-lines', 'warning']]);
    // The Column's guns on the same spot are firing on the enemy.
    expect(problems([event(1, [shelling({ side: 'column' })])], [there])).toEqual([]);
  });
});

describe('crater slots', () => {
  it('a crater holds two men, covered on every side', () => {
    const crater: CoverPoint = { id: 3, kind: 'crater', x: 10, y: 4, halfWidth: 1.5, halfDepth: 1.5, height: 0.5, radius: 1.5, quality: 0.35, blocksMovement: false, blocksSight: false };
    const slots = coverSlots(crater);
    expect(slots).toHaveLength(2);
    expect(slots.every((slot) => slot.guard === null && slot.stance === 'crouched')).toBe(true);
  });
});
