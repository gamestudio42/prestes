import { describe, expect, it } from 'vitest';
import type { Frame, UnitSnapshot } from '../../packages/shared/src';
import type { AmbientOutput, LoopHandle } from '../../apps/game/src/audio/ambient-player';
import type { ListeningPoint } from '../../apps/game/src/audio/listening';
import {
  FOOTSTEP_CAP,
  FOOTSTEP_RANGE,
  FootstepPlayer,
  footSurface,
  footstepDensity,
  footstepGroups,
  footstepId,
  paceOf,
  type FootSurface,
} from '../../apps/game/src/audio/footsteps';

// ambient-sound-and-voices 4.1: footsteps by section, ground, pace and number.

type FrameView = Pick<Frame, 'units' | 'seen' | 'fog'>;
const frame = (units: UnitSnapshot[], extra: Partial<FrameView> = {}): FrameView => ({ units, ...extra });

function man(id: number, squadId: number, x: number, y: number, overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return { id, squadId, x, y, faction: 'column', alive: true, dummy: false, stance: 'standing', gait: 'walk', ...overrides } as UnitSnapshot;
}

// A dirt road west of x = 0, a cane field east of it.
const ground = (x: number): FootSurface | 'water' => (x < 0 ? 'road' : 'brush');
const groundAt = (x: number, _y: number) => ground(x);

describe('footSurface and paceOf', () => {
  it('reads the ground under a man as one of the footstep surfaces', () => {
    expect(footSurface('dirt-road', null)).toBe('road');
    expect(footSurface('road', null)).toBe('road');
    expect(footSurface('sand', null)).toBe('dirt');
    expect(footSurface('pasture', null)).toBe('grass');
    expect(footSurface('mud', null)).toBe('mud');
    expect(footSurface('cobbles', null)).toBe('stone');
    expect(footSurface('ridge', null)).toBe('stone');
    expect(footSurface('bridge', null)).toBe('wood');
    expect(footSurface('crop', null)).toBe('brush');
    expect(footSurface('grass', 'cane')).toBe('brush');
    expect(footSurface('ford', null)).toBe('water');
  });

  it('reads the pace from the gait and the stance', () => {
    expect(paceOf({ stance: 'standing', gait: 'walk' })).toBe('walk');
    expect(paceOf({ stance: 'standing', gait: 'slow' })).toBe('walk');
    expect(paceOf({ stance: 'crouched', gait: 'run' })).toBe('run');
    expect(paceOf({ stance: 'standing', gait: 'quick' })).toBe('run');
    expect(paceOf({ stance: 'prone', gait: 'walk' })).toBe('crawl');
  });
});

describe('footstepGroups', () => {
  it('changes a section from the road sound to the crop sound as its men enter the cane', () => {
    const at = (x: number) => footstepGroups(frame(Array.from({ length: 6 }, (_, index) => man(index + 1, 3, x + index * 2, 0))), 'column', groundAt);
    expect(at(-20).map((group) => footstepId(group))).toEqual(['steps-road-many']);
    // Half in: both grounds, each with the men on it.
    const half = at(-6);
    expect(half.map((group) => [group.surface, group.count])).toEqual([['road', 3], ['brush', 3]]);
    expect(at(4).map((group) => footstepId(group))).toEqual(['steps-brush-many']);
  });

  it('leaves out men standing still, the dead, dummies, men in a building and men in water', () => {
    const groups = footstepGroups(
      frame([
        man(1, 1, -5, 0, { gait: undefined }),
        man(2, 1, -5, 0, { alive: false }),
        man(3, 1, -5, 0, { dummy: true }),
        man(4, 1, -5, 0, { garrison: 2 }),
        man(5, 1, 50, 0),
      ]),
      'column',
      (x) => (x > 40 ? 'water' : 'road'),
    );
    expect(groups).toEqual([]);
  });

  it('hears enemy footsteps only while his men are seen, under fog of war', () => {
    const enemy = [man(10, 20, -5, 0, { faction: 'legalist' }), man(11, 21, -5, 5, { faction: 'legalist' })];
    expect(footstepGroups(frame(enemy, { fog: true, seen: { column: [11], legalist: [] } }), 'column', groundAt).map((group) => group.squadId)).toEqual([21]);
    expect(footstepGroups(frame(enemy, { fog: true, seen: { column: [], legalist: [] } }), 'column', groundAt)).toEqual([]);
    expect(footstepGroups(frame(enemy, { fog: false }), 'column', groundAt).length).toBe(2);
  });
});

describe('footstepId and footstepDensity', () => {
  it('plays one man and a section of eleven as different loops, not the first louder', () => {
    expect(footstepId({ surface: 'grass', pace: 'walk', count: 1 })).toBe('steps-grass-one');
    expect(footstepId({ surface: 'grass', pace: 'walk', count: 11 })).toBe('steps-grass-many');
    expect(footstepDensity(11)).toBe(1);
    expect(footstepDensity(1)).toBeLessThan(footstepDensity(11));
  });

  it('plays a few men as the section loop, thinner', () => {
    expect(footstepId({ surface: 'grass', pace: 'walk', count: 3 })).toBe('steps-grass-many');
    expect(footstepDensity(2)).toBeLessThan(footstepDensity(4));
    expect(footstepDensity(4)).toBeLessThan(1);
  });

  it('has a running loop and the crawl loops, dry and wet', () => {
    expect(footstepId({ surface: 'stone', pace: 'run', count: 8 })).toBe('steps-stone-run');
    expect(footstepId({ surface: 'grass', pace: 'crawl', count: 8 })).toBe('crawl-dry');
    expect(footstepId({ surface: 'mud', pace: 'crawl', count: 1 })).toBe('crawl-wet');
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
  live(): string[] {
    return this.loops.filter((entry) => !entry.loop.stopped).map((entry) => entry.id).sort();
  }
}

const ear: ListeningPoint = { x: 0, y: -5, span: 25, right: { x: 1, y: 0 } };

describe('FootstepPlayer', () => {
  it('hands one man walking over to the section loop when ten more join him', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output);
    player.update([{ squadId: 1, surface: 'grass', pace: 'walk', x: 0, y: 0, count: 1 }], ear);
    expect(output.live()).toEqual(['steps-grass-one']);
    player.update([{ squadId: 1, surface: 'grass', pace: 'walk', x: 0, y: 0, count: 11 }], ear);
    expect(output.live()).toEqual(['steps-grass-many']);
  });

  it('adds equipment rattle over a running section', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output);
    player.update([{ squadId: 1, surface: 'road', pace: 'run', x: -3, y: 0, count: 9 }], ear);
    expect(output.live()).toEqual(['rattle', 'steps-road-run']);
    // On the left of the screen, heard on the left.
    expect(output.loops.every((entry) => entry.loop.pan < 0)).toBe(true);
  });

  it('plays only the nearest groups, up to the cap, and nothing beyond range', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output);
    const groups = Array.from({ length: FOOTSTEP_CAP + 4 }, (_, index) => ({ squadId: index + 1, surface: 'grass' as const, pace: 'walk' as const, x: index, y: 0, count: 4 }));
    player.update(groups, ear);
    expect(output.live().length).toBe(FOOTSTEP_CAP);
    expect(player.playing.map((entry) => Number(entry.split(':')[0]))).toEqual(Array.from({ length: FOOTSTEP_CAP }, (_, index) => index + 1).sort());
    player.update([{ squadId: 1, surface: 'grass', pace: 'walk', x: 0, y: FOOTSTEP_RANGE * 4, count: 4 }], ear);
    expect(output.live()).toEqual([]);
  });

  it('starts nothing for a sound not loaded', () => {
    const output = new FakeOutput();
    output.loop = () => null;
    const player = new FootstepPlayer(output);
    expect(() => player.update([{ squadId: 1, surface: 'wood', pace: 'walk', x: 0, y: 0, count: 2 }], ear)).not.toThrow();
    expect(player.playing).toEqual([]);
  });
});
