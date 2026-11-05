import { describe, expect, it } from 'vitest';
import { FogView, GHOST_TICKS, type Frame, type UnitSnapshot } from '../src';

// fog-of-war: what the player is shown of the enemy.
function unit(id: number, faction: 'column' | 'legalist', patch: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return {
    id,
    faction,
    x: id,
    y: faction === 'column' ? 50 : -50,
    facingX: 0,
    facingY: faction === 'column' ? -1 : 1,
    alive: true,
    incapacitated: false,
    routed: false,
    ...patch,
  } as UnitSnapshot;
}

function frame(tick: number, units: UnitSnapshot[], seenByColumn: number[], events: Frame['events'] = []): Frame {
  return {
    tick,
    units,
    orders: [],
    covers: [],
    events,
    outcome: 'playing',
    hash: '',
    fog: true,
    seen: { column: seenByColumn, legalist: [] },
  };
}

describe('the player\'s view under fog of war', () => {
  it('shows his own soldiers and only the enemies his side sees', () => {
    const view = new FogView('column');
    const out = view.apply(frame(1, [unit(1, 'column'), unit(40, 'legalist'), unit(41, 'legalist')], [40]));
    expect(out.units.map((entry) => entry.id)).toEqual([1, 40]);
  });

  it('leaves a ghost where an enemy dropped out of sight, for 5 s', () => {
    const view = new FogView('column');
    view.apply(frame(1, [unit(1, 'column'), unit(40, 'legalist', { x: 7, y: -30 })], [40]));
    const hidden = view.apply(frame(2, [unit(1, 'column'), unit(40, 'legalist', { x: 9, y: -40 })], []));
    expect(hidden.units.map((entry) => entry.id)).toEqual([1]);
    expect(hidden.ghosts).toEqual([expect.objectContaining({ id: 40, x: 7, y: -30 })]);
    const later = view.apply(frame(2 + GHOST_TICKS + 1, [unit(1, 'column'), unit(40, 'legalist')], []));
    expect(later.ghosts).toEqual([]);
  });

  it('keeps showing an enemy seen fallen', () => {
    const view = new FogView('column');
    view.apply(frame(1, [unit(1, 'column'), unit(40, 'legalist', { alive: false })], [40]));
    const out = view.apply(frame(2, [unit(1, 'column'), unit(40, 'legalist', { alive: false })], []));
    expect(out.units.map((entry) => entry.id)).toContain(40);
  });

  it('starts an unseen enemy\'s shot at its "?" marker and names no shooter', () => {
    const view = new FogView('column');
    const out = view.apply(
      frame(5, [unit(1, 'column'), unit(40, 'legalist')], [], [
        { type: 'shot', tick: 5, source: 40, target: 1, x: 40, y: -50, x2: 1, y2: 50, hit: false },
        { type: 'unseen_fire', tick: 5, side: 'legalist', target: 1, x: 44, y: -47, radius: 11 },
      ]),
    );
    const shot = out.events.find((event) => event.type === 'shot');
    expect(shot).toMatchObject({ source: -1, x: 44, y: -47 });
    expect(out.markers).toEqual([expect.objectContaining({ x: 44, y: -47, radius: 11 })]);
  });

  it('leaves the player\'s own shots alone', () => {
    const view = new FogView('column');
    const own = { type: 'shot' as const, tick: 5, source: 1, target: 40, x: 1, y: 50, x2: 40, y2: -50, hit: false };
    const out = view.apply(
      frame(5, [unit(1, 'column'), unit(40, 'legalist')], [], [
        own,
        { type: 'unseen_fire', tick: 5, side: 'column', target: 40, x: 3, y: 52, radius: 11 },
      ]),
    );
    expect(out.events.find((event) => event.type === 'shot')).toEqual(own);
    expect(out.markers).toEqual([]);
  });

  it('lifts when the battle ends', () => {
    const view = new FogView('column');
    const ended = { ...frame(9, [unit(1, 'column'), unit(40, 'legalist', { alive: false })], []), outcome: 'victory' as const };
    expect(view.apply(ended).units).toHaveLength(2);
  });

  it('shows everything when off', () => {
    const view = new FogView('column');
    view.enabled = false;
    const out = view.apply(frame(1, [unit(1, 'column'), unit(40, 'legalist')], []));
    expect(out.units).toHaveLength(2);
  });
});
