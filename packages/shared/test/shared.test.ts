import { describe, expect, it } from 'vitest';
import { ClientMirror } from '../src/mirror';
import type { Command, Frame } from '../src/protocol';

const frame = (tick: number, x: number): Frame => ({
  tick,
  hash: `hash-${tick}`,
  events: [],
  orders: [],
  covers: [],
  outcome: 'playing',
  units: [
    {
      id: 1,
      x,
      y: 0,
      facingX: 0,
      facingY: -1,
      kind: 'infantry',
      faction: 'column',
      stance: 'standing',
      squadId: 1,
      hp: 100,
      weaponId: 'mauser-7mm',
      magazine: 5,
      reserve: 15,
      morale: 100,
      alive: true,
      suppressed: false,
      suppression: 0,
      cohesion: 100,
      fatigue: 0,
      formation: 'line',
      soldierState: 'idle',
      incapacitated: false,
      rescueTargetId: null,
      rescueProgress: 0,
      reconContacts: 0,
      rescueQueueLength: 0,
      wound: 'none',
      state: 'steady',
      routed: false,
      dummy: false,
      cover: 0,
      order: null,
      targetId: null,
    },
  ],
});

describe('protocol serialization', () => {
  it('round-trips commands and frames through JSON', () => {
    const command: Command = { type: 'move', unitIds: [1, 2], to: { x: 3, y: 4 } };
    expect(JSON.parse(JSON.stringify(command))).toEqual(command);
    const value = frame(2, 5);
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });
});

describe('ClientMirror', () => {
  it('starts empty and only changes when a frame is applied', () => {
    const mirror = new ClientMirror();
    expect(mirror.current).toBeNull();
    expect(mirror.previous).toBeNull();
    expect('enqueue' in mirror).toBe(false);

    const first = frame(1, 0);
    mirror.apply(first);
    expect(mirror.current).toEqual(first);
    expect(mirror.previous).toBeNull();

    const second = frame(2, 10);
    mirror.apply(second);
    expect(mirror.current).toEqual(second);
    expect(mirror.previous).toEqual(first);
  });

  it('interpolates positions between the last two frames', () => {
    const mirror = new ClientMirror();
    mirror.apply(frame(1, 0));
    mirror.apply(frame(2, 10));
    const interpolated = mirror.interpolate(0.5);
    expect(interpolated?.tick).toBe(2);
    expect(interpolated?.units[0]?.x).toBe(5);
  });

  it('clamps interpolation and handles a missing previous frame', () => {
    const mirror = new ClientMirror();
    mirror.apply(frame(1, 4));
    expect(mirror.interpolate(2)?.units[0]?.x).toBe(4);
    expect(mirror.interpolate(-2)?.units[0]?.x).toBe(4);
  });
});















