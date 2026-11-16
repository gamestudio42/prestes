import { describe, expect, it } from 'vitest';
import type { Frame, UnitSnapshot } from '../../packages/shared/src';
import type { LoopHandle } from '../../apps/game/src/audio/ambient-player';
import type { ListeningPoint } from '../../apps/game/src/audio/listening';
import {
  FOOTSTEP_CAP,
  FOOTSTEP_RANGE,
  FootstepPlayer,
  GaitClock,
  MAX_CADENCE_RATE,
  MAX_STREAMS,
  STEP_INTERVAL,
  STEP_JITTER,
  STEP_LOOKAHEAD,
  StepCadence,
  footSurface,
  footstepDensity,
  footstepGroups,
  footstepSource,
  paceOf,
  stepGrains,
  type FootSurface,
  type FootstepGroup,
  type FootstepOutput,
  type StepGrain,
} from '../../apps/game/src/audio/footsteps';

// ambient-sound-and-voices 4.1: footsteps by section, ground, pace and number,
// played step by step at the gait's cadence (the owner, 2026-11-15).

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
    expect(at(-20).map((group) => footstepSource(group))).toEqual(['steps-road-one']);
    // Half in: both grounds, each with the men on it.
    const half = at(-6);
    expect(half.map((group) => [group.surface, group.count])).toEqual([['road', 3], ['brush', 3]]);
    expect(at(4).map((group) => footstepSource(group))).toEqual(['steps-brush-one']);
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

describe('footstepSource and footstepDensity', () => {
  it('cuts walking and running from one man on that ground, crawling from the crawl takes', () => {
    expect(footstepSource({ surface: 'grass', pace: 'walk' })).toBe('steps-grass-one');
    expect(footstepSource({ surface: 'stone', pace: 'run' })).toBe('steps-stone-one');
    expect(footstepSource({ surface: 'grass', pace: 'crawl' })).toBe('crawl-dry');
    expect(footstepSource({ surface: 'mud', pace: 'crawl' })).toBe('crawl-wet');
  });

  it('plays a few men thinner than a section, and one man below both', () => {
    expect(footstepDensity(11)).toBe(1);
    expect(footstepDensity(1)).toBeLessThan(footstepDensity(11));
    expect(footstepDensity(2)).toBeLessThan(footstepDensity(4));
    expect(footstepDensity(4)).toBeLessThan(1);
  });
});

describe('stepGrains', () => {
  it('finds each step of a take by its onset, heel and toe as one', () => {
    const rate = 8000;
    const data = new Float32Array(rate * 3);
    // A step every 0.6 s from 0.2 s, each a heel and, 60 ms later, a toe.
    for (const at of [0.2, 0.8, 1.4, 2.0, 2.6]) {
      for (const hit of [at, at + 0.06]) {
        for (let index = 0; index < rate * 0.03; index += 1) data[Math.round(hit * rate) + index] = Math.sin(index) * 0.8;
      }
    }
    const grains = stepGrains(data, rate);
    expect(grains.length).toBe(5);
    grains.forEach((grain, index) => {
      expect(grain.offset).toBeCloseTo(0.2 + index * 0.6 - 0.015, 1);
      expect(grain.duration).toBeLessThanOrEqual(0.32);
    });
  });

  it('finds nothing in silence', () => {
    expect(stepGrains(new Float32Array(8000), 8000)).toEqual([]);
  });
});

/** A repeatable random for the cadence's jitter. */
function seeded(seed = 7): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const gaps = (times: number[]): number[] => times.slice(1).map((time, index) => time - times[index]!);

describe('StepCadence', () => {
  it('steps evenly at the interval, a little early or late, each step once', () => {
    const cadence = new StepCadence(seeded());
    const steps: number[] = [];
    for (let now = 0; now < 20; now += 0.25) steps.push(...cadence.due(now, now + STEP_LOOKAHEAD, 0.55));
    expect(new Set(steps).size).toBe(steps.length);
    for (const gap of gaps(steps)) {
      expect(gap).toBeGreaterThanOrEqual(0.55 * (1 - STEP_JITTER) - 1e-9);
      expect(gap).toBeLessThanOrEqual(0.55 * (1 + STEP_JITTER) + 1e-9);
    }
    expect(steps.length).toBeGreaterThan(20 / 0.55 - 3);
  });

  it('does not catch up after the clock ran on unasked: no burst after a pause or a hidden tab', () => {
    const cadence = new StepCadence(seeded());
    for (let now = 0; now < 3; now += 0.25) cadence.due(now, now + STEP_LOOKAHEAD, 0.55);
    // Eight seconds with no update, then the slow clock again.
    const after = cadence.due(11, 11 + STEP_LOOKAHEAD, 0.55);
    expect(after.length).toBeLessThanOrEqual(1);
    expect(after.every((time) => time >= 11)).toBe(true);
  });

  it('takes a quicker cadence at once, without a gap or a pile of steps', () => {
    const cadence = new StepCadence(seeded());
    const steps: number[] = [];
    for (let now = 0; now < 5; now += 0.25) steps.push(...cadence.due(now, now + STEP_LOOKAHEAD, 0.85));
    for (let now = 5; now < 10; now += 0.25) steps.push(...cadence.due(now, now + STEP_LOOKAHEAD, 0.34));
    for (const gap of gaps(steps)) {
      expect(gap).toBeGreaterThan(0.34 * (1 - STEP_JITTER) - 1e-9);
      expect(gap).toBeLessThan(0.85 * (1 + STEP_JITTER) + 1e-9);
    }
  });
});

describe('GaitClock', () => {
  it('reads the pace the men move at from the ticks over a second, and 0 while paused', () => {
    const clock = new GaitClock();
    let tick = 0;
    let now = 0;
    const rates: number[] = [];
    // Normal speed, the frames arriving unevenly: two ticks in 0.3 s is not half speed.
    for (const [ticks, seconds] of [[0, 0], [2, 0.3], [3, 0.2], [2, 0.3], [3, 0.2], [2, 0.3], [3, 0.2], [2, 0.3], [3, 0.2]] as const) {
      tick += ticks;
      now += seconds;
      rates.push(clock.update(tick, now));
    }
    for (const rate of rates) expect(rate).toBeCloseTo(1, 1);
    // Paused: the tick stands still.
    expect(clock.update(tick, now + 0.25)).toBeCloseTo(1, 1);
    expect(clock.update(tick, now + 0.5)).toBe(0);
    now += 4;
    expect(clock.update(tick, now)).toBe(0);
    // Resumed at 4×: the pause is not measured; the new speed is heard within a second or so.
    for (let step = 0; step < 6; step += 1) {
      tick += 10;
      now += 0.25;
      expect(clock.update(tick, now)).toBeCloseTo(step < 4 ? 1 : 4, 1);
    }
    // Slowed to about half speed (or a simulation lagging behind).
    for (let step = 0; step < 6; step += 1) {
      tick += step % 2 === 0 ? 1 : 2;
      now += 0.25;
      clock.update(tick, now);
    }
    expect(clock.update(tick + 1, now + 0.25)).toBeCloseTo(0.6, 1);
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

interface PlayedStep {
  id: string;
  grain: StepGrain;
  when: number;
  gain: number;
  pan: number;
  rate: number;
}

class FakeOutput implements FootstepOutput {
  clock = 0;
  loaded = true;
  loops: { id: string; loop: FakeLoop }[] = [];
  steps: PlayedStep[] = [];
  readonly takes: StepGrain[] = [0, 1, 2, 3, 4].map((index) => ({ offset: index * 0.6, duration: 0.3 }));
  loop(id: string): LoopHandle | null {
    const loop = new FakeLoop();
    this.loops.push({ id, loop });
    return loop;
  }
  grains(): readonly StepGrain[] | null {
    return this.loaded ? this.takes : null;
  }
  step(id: string, grain: StepGrain, when: number, gain: number, pan: number, rate: number): void {
    this.steps.push({ id, grain, when, gain, pan, rate });
  }
  now(): number | null {
    return this.clock;
  }
  live(): string[] {
    return this.loops.filter((entry) => !entry.loop.stopped).map((entry) => entry.id).sort();
  }
}

const ear: ListeningPoint = { x: 0, y: -5, span: 25, right: { x: 1, y: 0 } };

/** Runs the slow clock for `seconds` from the output's clock, every 0.25 s. */
function run(player: FootstepPlayer, output: FakeOutput, groups: FootstepGroup[], seconds: number, rate = 1): void {
  const end = output.clock + seconds;
  for (; output.clock < end - 1e-9; output.clock += 0.25) player.update(groups, ear, rate);
}

const walker = (count: number, overrides: Partial<FootstepGroup> = {}): FootstepGroup => ({ squadId: 1, surface: 'grass', pace: 'walk', x: 0, y: 0, count, ...overrides });

describe('FootstepPlayer', () => {
  it('plays one man walking at an even cadence, with the takes, pitch and level varied', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output, seeded());
    run(player, output, [walker(1)], 10);
    const times = output.steps.map((step) => step.when).sort((a, b) => a - b);
    expect(times.length).toBeGreaterThan(10 / STEP_INTERVAL.walk - 3);
    expect(times.length).toBeLessThan(10 / STEP_INTERVAL.walk + 3);
    for (const gap of gaps(times)) expect(gap).toBeGreaterThan(STEP_INTERVAL.walk * 0.85);
    expect(output.steps.every((step) => step.id === 'steps-grass-one')).toBe(true);
    // Never the same take twice in a row, and no two steps alike.
    for (const [index, step] of output.steps.slice(1).entries()) expect(step.grain).not.toBe(output.steps[index]!.grain);
    expect(new Set(output.steps.map((step) => step.rate)).size).toBeGreaterThan(5);
    expect(new Set(output.steps.map((step) => step.gain)).size).toBeGreaterThan(5);
    expect(player.playing).toEqual(['1:grass:walk=steps-grass-one']);
  });

  it('runs quicker than it walks, and crawls slower', () => {
    const count = (pace: FootstepGroup['pace']): number => {
      const output = new FakeOutput();
      run(new FootstepPlayer(output, seeded()), output, [walker(1, { pace })], 10);
      return output.steps.length;
    };
    expect(count('run')).toBeGreaterThan(count('walk'));
    expect(count('walk')).toBeGreaterThan(count('crawl'));
  });

  it('hears eleven men as a few pairs of feet out of step, not one man louder', () => {
    const one = new FakeOutput();
    run(new FootstepPlayer(one, seeded()), one, [walker(1)], 10);
    const many = new FakeOutput();
    run(new FootstepPlayer(many, seeded()), many, [walker(11)], 10);
    const ratio = many.steps.length / one.steps.length;
    expect(ratio).toBeGreaterThan(MAX_STREAMS * 0.85);
    expect(ratio).toBeLessThan(MAX_STREAMS * 1.15);
    // Each step quieter than the group as a whole.
    const loudest = (output: FakeOutput): number => Math.max(...output.steps.map((step) => step.gain));
    expect(loudest(many)).toBeLessThan(loudest(one) * 1.2);
  });

  it('keeps the feet of a section out of step when the game speed changes, not bunched into one beat', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output, seeded(3));
    // The speed flickering between 1× and 0.5× now and then (the frames' uneven arrival, before the gait clock measured over a second).
    for (let update = 0; update < 48; update += 1, output.clock += 0.25) player.update([walker(11)], ear, update % 4 === 3 ? 0.5 : 1);
    const times = output.steps.map((step) => step.when).sort((a, b) => a - b);
    // Four pairs of feet at about 0.55 s or quicker: never a long hush between steps, never all at once.
    expect(Math.max(...gaps(times))).toBeLessThan(STEP_INTERVAL.walk);
    const together = gaps(times).filter((gap) => gap < 0.01).length;
    expect(together / times.length).toBeLessThan(0.15);
  });

  it('is silent while paused and keeps no steps for after: no burst on resuming', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output, seeded());
    run(player, output, [walker(1)], 3);
    const before = output.steps.length;
    run(player, output, [walker(1)], 6, 0);
    expect(output.steps.length).toBe(before);
    player.update([walker(1)], ear, 1);
    const resumed = output.steps.slice(before);
    expect(resumed.length).toBeLessThanOrEqual(1);
    expect(resumed.every((step) => step.when >= output.clock)).toBe(true);
  });

  it('follows a faster game speed only so far', () => {
    const steps = (rate: number): number => {
      const output = new FakeOutput();
      run(new FootstepPlayer(output, seeded()), output, [walker(1)], 20, rate);
      return output.steps.length;
    };
    expect(steps(2)).toBeGreaterThan(steps(1) * 1.3);
    expect(steps(8)).toBeLessThanOrEqual(Math.ceil(steps(1) * MAX_CADENCE_RATE * 1.1));
  });

  it('adds equipment rattle over a running section, on its side', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output, seeded());
    player.update([walker(9, { surface: 'road', pace: 'run', x: -3 })], ear);
    expect(output.live()).toEqual(['rattle']);
    expect(output.loops[0]!.loop.pan).toBeLessThan(0);
    expect(output.steps.every((step) => step.pan < 0)).toBe(true);
    player.update([walker(9, { surface: 'road', pace: 'walk', x: -3 })], ear);
    expect(output.live()).toEqual([]);
  });

  it('hears only the nearest groups, up to the cap, and nothing beyond range', () => {
    const output = new FakeOutput();
    const player = new FootstepPlayer(output, seeded());
    const groups = Array.from({ length: FOOTSTEP_CAP + 4 }, (_, index) => walker(4, { squadId: index + 1, x: index }));
    player.update(groups, ear);
    expect(player.playing.map((entry) => Number(entry.split(':')[0])).sort((a, b) => a - b)).toEqual(Array.from({ length: FOOTSTEP_CAP }, (_, index) => index + 1));
    player.update([walker(4, { y: FOOTSTEP_RANGE * 4 })], ear);
    expect(player.playing).toEqual([]);
  });

  it('plays nothing for a recording not loaded', () => {
    const output = new FakeOutput();
    output.loaded = false;
    const player = new FootstepPlayer(output, seeded());
    expect(() => run(player, output, [walker(2, { surface: 'wood' })], 2)).not.toThrow();
    expect(output.steps).toEqual([]);
  });
});
