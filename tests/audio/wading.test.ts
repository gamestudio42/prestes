import { describe, expect, it } from 'vitest';
import type { Frame, UnitSnapshot } from '../../packages/shared/src';
import type { AmbientOutput, LoopHandle } from '../../apps/game/src/audio/ambient-player';
import type { ListeningPoint } from '../../apps/game/src/audio/listening';
import { WADING_CAP, WADING_ID, WADING_RANGE, WadingPlayer, wadingDensity, wadingGroups } from '../../apps/game/src/audio/wading';

// ambient-sound-and-voices 3.4: men wading, from a mirror frame.

// A ford across x 0 to 10 (shallow water); dry ground elsewhere.
const inFord = (x: number): boolean => x >= 0 && x <= 10;
const shallow = (x: number, _y: number): boolean => inFord(x);

function unit(id: number, squadId: number, x: number, y: number, overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return { id, squadId, x, y, faction: 'column', alive: true, dummy: false, gait: 'walk', ...overrides } as UnitSnapshot;
}

type FrameView = Pick<Frame, 'units' | 'seen' | 'fog'>;
const frame = (units: UnitSnapshot[], extra: Partial<FrameView> = {}): FrameView => ({ units, ...extra });

describe('wadingGroups', () => {
  it('groups by section the men standing in the ford, at their average place', () => {
    const groups = wadingGroups(
      frame([unit(1, 7, 2, 0), unit(2, 7, 4, 2), unit(3, 7, 20, 0), unit(4, 8, 30, 0)]),
      'column',
      shallow,
    );
    expect(groups).toEqual([{ squadId: 7, x: 3, y: 1, count: 2 }]);
  });

  it('leaves out the dead, the dummies and men inside a building', () => {
    const groups = wadingGroups(
      frame([unit(1, 7, 2, 0, { alive: false }), unit(2, 7, 2, 0, { dummy: true }), unit(3, 7, 2, 0, { garrison: 4 })]),
      'column',
      shallow,
    );
    expect(groups).toEqual([]);
  });

  it('hears the enemy only while seen, under fog of war', () => {
    const enemy = [unit(10, 20, 5, 0, { faction: 'legalist' }), unit(11, 21, 5, 5, { faction: 'legalist' })];
    expect(wadingGroups(frame(enemy, { fog: true, seen: { column: [11], legalist: [] } }), 'column', shallow).map((group) => group.squadId)).toEqual([21]);
    expect(wadingGroups(frame(enemy, { fog: false }), 'column', shallow).length).toBe(2);
  });
});

class FakeLoop implements LoopHandle {
  gain = 0;
  pan = 0;
  stopped = false;
  setGain(gain: number): void {
    this.gain = gain;
  }
  setPan(pan: number): void {
    this.pan = pan;
  }
  stop(): void {
    this.stopped = true;
  }
}

class FakeOutput implements AmbientOutput {
  loops: { id: string; loop: FakeLoop }[] = [];
  loop(id: string): LoopHandle | null {
    const loop = new FakeLoop();
    this.loops.push({ id, loop });
    return loop;
  }
  has(): boolean {
    return true;
  }
  shot(): void {}
  live(): FakeLoop[] {
    return this.loops.filter((entry) => entry.id === WADING_ID && !entry.loop.stopped).map((entry) => entry.loop);
  }
}

const ear: ListeningPoint = { x: 5, y: -10, span: 25, right: { x: 1, y: 0 } };

describe('WadingPlayer', () => {
  it('is heard while a section crosses the ford near the ear, and stops when its men leave the water', () => {
    const output = new FakeOutput();
    const player = new WadingPlayer(output);
    const crossing = (offset: number) =>
      wadingGroups(frame(Array.from({ length: 11 }, (_, index) => unit(index + 1, 7, offset + (index % 4), index))), 'column', shallow);
    const heardAt: boolean[] = [];
    // The section walks from x -20 (dry) through the ford to x 30 (dry).
    for (let offset = -20; offset <= 30; offset += 2) {
      player.update(crossing(offset), ear);
      heardAt.push(output.live().length > 0);
    }
    expect(heardAt[0]).toBe(false);
    expect(heardAt.some(Boolean)).toBe(true);
    expect(heardAt.at(-1)).toBe(false);
    // Heard over one unbroken stretch: from the first man in the water to the last man out.
    const first = heardAt.indexOf(true);
    const last = heardAt.lastIndexOf(true);
    expect(heardAt.slice(first, last + 1).every(Boolean)).toBe(true);
    expect(output.loops.every((entry) => entry.loop.stopped)).toBe(true);
  });

  it('is fuller for a section than for one man, and silent beyond its range', () => {
    expect(wadingDensity(11)).toBeGreaterThan(wadingDensity(1));
    expect(wadingDensity(11)).toBeLessThanOrEqual(1);
    const output = new FakeOutput();
    const player = new WadingPlayer(output);
    player.update([{ squadId: 1, x: 5, y: 0, count: 1 }], ear);
    const one = output.live()[0]!.gain;
    player.update([{ squadId: 1, x: 5, y: 0, count: 11 }], ear);
    expect(output.live()[0]!.gain).toBeGreaterThan(one);
    player.update([{ squadId: 1, x: 5, y: WADING_RANGE * 3, count: 11 }], ear);
    expect(output.live()).toEqual([]);
  });

  it('hears at most the nearest sections, panned to their side', () => {
    const output = new FakeOutput();
    const player = new WadingPlayer(output);
    const groups = Array.from({ length: WADING_CAP + 2 }, (_, index) => ({ squadId: index + 1, x: 2 - index * 3, y: -10, count: 4 }));
    player.update(groups, ear);
    expect(player.playing).toEqual(groups.slice(0, WADING_CAP).map((group) => group.squadId));
    expect(output.live()[0]!.pan).toBeLessThan(0);
  });
});
