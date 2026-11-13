import { describe, expect, it } from 'vitest';
import { createEditableMap } from '../../packages/shared/src';
import { defaultTrigger, eventSummary, formatClock, parseClock } from '../../apps/game/src/editor/EventsPanel';

// add-battle-events 4.3: the Events panel's time fields and summaries.
const t = (key: string, values?: Readonly<Record<string, string | number>>) => `${key}${values ? JSON.stringify(values) : ''}`;

describe('events panel', () => {
  it('reads and writes m:ss', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(0)).toBe('0:00');
    expect(parseClock('2:30')).toBe(150);
    expect(parseClock('90')).toBe(90);
    expect(parseClock('1:75')).toBeNull();
    expect(parseClock('abc')).toBeNull();
  });

  it('a new trigger takes the map\'s first matching thing, and the summary names it', () => {
    const map = createEditableMap({ id: 'panel-test', size: 'small', name: { en: 'P', 'pt-BR': 'P' }, baseMaterial: 'dry-grass', palette: 'cerrado' });
    map.eventPlaces = [
      { id: 1, name: 'Entrada 1', kind: 'entry', point: { x: 0, y: -96 }, facing: { x: 0, y: 1 } },
      { id: 2, name: 'Vau', kind: 'area', polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] },
    ];
    const trigger = defaultTrigger('area', map, 1);
    expect(trigger).toEqual({ kind: 'area', area: 2, side: 'column' });
    const summary = eventSummary({ id: 1, label: 'Ponte', trigger, delay: 30, actions: [{ kind: 'posture', posture: 'offensive', until: { seconds: 60 } }] }, map, t);
    expect(summary).toContain('"area":"Vau"');
    expect(summary).toContain('"time":"0:30"');
    expect(summary).toContain('editor.events.action.posture');
  });
});
