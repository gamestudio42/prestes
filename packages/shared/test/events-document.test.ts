import { describe, expect, it } from 'vitest';
import { MAP_DOCUMENT_VERSION, compileMapDocument, createEditableMap, parseMapDocument, toMapDocument, type BattleEvent, type EventPlace } from '../src';

// add-battle-events 1.1, 1.2: events and their places in the map document (version 9).
const PLACES: EventPlace[] = [
  { id: 1, name: 'estrada norte', kind: 'entry', point: { x: 0, y: -95 }, facing: { x: 0, y: 1 } },
  { id: 2, name: 'morro', kind: 'area', polygon: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 0, y: 10 }] },
];
const card = { kind: 'card' as const, title: { en: 'They come', 'pt-BR': 'Eles vêm' }, text: { en: 'Text', 'pt-BR': 'Texto' } };
const EVENTS: BattleEvent[] = [
  { id: 1, label: 'time', trigger: { kind: 'time', seconds: 300 }, delay: 30, actions: [{ kind: 'troops', side: 'legalist', entry: 1, sections: ['infantaria-exercito'], order: { kind: 'objective', objective: 1 } }] },
  { id: 2, label: 'objective', trigger: { kind: 'objective', objective: 1, side: 'column', change: 'taken' }, delay: 0, actions: [{ kind: 'posture', posture: 'offensive', until: { seconds: 300 } }] },
  { id: 3, label: 'area', trigger: { kind: 'area', area: 2, side: 'column' }, delay: 0, actions: [card] },
  { id: 4, label: 'losses', trigger: { kind: 'losses', side: 'legalist', percent: 50 }, delay: 0, actions: [{ kind: 'posture', posture: 'fall-back', area: 2, until: { event: 5 } }] },
  { id: 5, label: 'after', trigger: { kind: 'after', event: 4 }, delay: 600, actions: [{ kind: 'troops', side: 'column', entry: 1, sections: ['fuzileiros'], order: { kind: 'move', to: { x: 0, y: 0 } } }] },
];

function documentWith(events?: BattleEvent[], places?: EventPlace[]) {
  const map = createEditableMap({ id: 'events-doc', size: 'small', name: { en: 'Test', 'pt-BR': 'Teste' } });
  return toMapDocument({ ...map, ...(events ? { events } : {}), ...(places ? { eventPlaces: places } : {}) });
}

describe('events in the map document', () => {
  it('a version 8 file opens with no events and saves as the current version', () => {
    const parsed = parseMapDocument({ ...documentWith(), version: 8 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.version).toBe(MAP_DOCUMENT_VERSION);
    expect(parsed.document.events).toBeUndefined();
    const compiled = compileMapDocument(parsed.document);
    expect(compiled.events).toBeUndefined();
    expect(compiled.eventPlaces).toBeUndefined();
  });

  it('round-trips events and places in order and ids', () => {
    const parsed = parseMapDocument(JSON.parse(JSON.stringify(documentWith(EVENTS, PLACES))));
    if (!parsed.ok) throw new Error(parsed.detail);
    expect(parsed.document.events).toEqual(EVENTS);
    expect(parsed.document.eventPlaces).toEqual(PLACES);
  });

  it('refuses a malformed event or place', () => {
    expect(parseMapDocument(documentWith([{ ...EVENTS[1]!, trigger: { kind: 'never' } as never }]))).toMatchObject({ ok: false, detail: 'events' });
    expect(parseMapDocument(documentWith(undefined, [{ ...PLACES[1]!, polygon: [{ x: 0, y: 0 }] } as EventPlace]))).toMatchObject({ ok: false, detail: 'eventPlaces' });
  });
});

describe('compiling events', () => {
  const compile = (events: BattleEvent[]) => {
    const parsed = parseMapDocument(documentWith(events, PLACES));
    if (!parsed.ok) throw new Error(parsed.detail);
    return compileMapDocument(parsed.document);
  };

  it('compiles every trigger and action kind with their places', () => {
    const compiled = compile(EVENTS.filter((event) => event.id !== 1));
    expect(compiled.events!.map((event) => event.trigger!.kind)).toEqual(['objective', 'area', 'losses', 'after']);
    expect(compiled.events!.flatMap((event) => event.actions.map((action) => action.kind))).toEqual(['posture', 'card', 'posture', 'troops']);
    expect(compiled.eventPlaces).toEqual(PLACES);
  });

  it('drops events with no trigger, no action, or only sections of the wrong side', () => {
    const compiled = compile([
      { id: 7, label: 'unfinished', trigger: null, delay: 0, actions: [card] },
      { id: 8, label: 'empty', trigger: { kind: 'time', seconds: 0 }, delay: 0, actions: [] },
      { id: 9, label: 'wrong side', trigger: { kind: 'time', seconds: 0 }, delay: 0, actions: [{ kind: 'troops', side: 'legalist', entry: 1, sections: ['fuzileiros'], order: { kind: 'stay' } }] },
      { id: 3, label: 'kept', trigger: { kind: 'time', seconds: 0 }, delay: 0, actions: [card] },
    ]);
    expect(compiled.events!.map((event) => event.id)).toEqual([3]);
  });

  it('keeps values in range and sorts by id', () => {
    const compiled = compile([
      { id: 2, label: 'b', trigger: { kind: 'losses', side: 'column', percent: 97 }, delay: 5000, actions: [{ kind: 'posture', posture: 'hold', until: { seconds: 2 } }] },
      { id: 1, label: 'a', trigger: { kind: 'time', seconds: 99999 }, delay: -3, actions: [card] },
    ]);
    const [first, second] = compiled.events!;
    expect(first).toMatchObject({ id: 1, delay: 0, trigger: { seconds: 1800 } });
    expect(second).toMatchObject({ id: 2, delay: 600, trigger: { percent: 90 }, actions: [{ until: { seconds: 30 } }] });
  });
});
