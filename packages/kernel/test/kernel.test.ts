import { describe, expect, it } from 'vitest';
import {
  MAX_TICKS_PER_FRAME,
  RNG,
  TICK_DT,
  TICKS_PER_SECOND,
  clampTicks,
  fnv1a,
  hashNumbers,
  secondsToTicks,
  ticksToSeconds,
} from '../src/index';

describe('RNG', () => {
  it('reproduces a fixed sequence for seed 1922', () => {
    const rng = new RNG(1922);
    expect(Array.from({ length: 8 }, () => rng.nextUint32())).toEqual([
      1193216359, 2557084113, 659763956, 3717923581, 3833997094, 211487478, 3838924094,
      2048400075,
    ]);
  });

  it('matches for equal seeds and diverges for different seeds', () => {
    const first = new RNG(7);
    const second = new RNG(7);
    const third = new RNG(8);
    expect(first.nextUint32()).toBe(second.nextUint32());
    expect(first.nextUint32()).not.toBe(third.nextUint32());
  });

  it('round-trips its state', () => {
    const rng = new RNG(42);
    rng.nextUint32();
    const clone = rng.clone();
    expect(clone.nextUint32()).toBe(rng.nextUint32());
    const state = rng.getState();
    const restored = new RNG(1);
    restored.setState(state);
    expect(restored.nextUint32()).toBe(rng.nextUint32());
  });

  it('returns floats in the unit interval', () => {
    const rng = new RNG(3);
    for (let index = 0; index < 20; index += 1) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('hash helpers', () => {
  it('is stable for equal input and changes after a mutation', () => {
    expect(fnv1a('prestes')).toBe(fnv1a('prestes'));
    expect(fnv1a('prestes')).not.toBe(fnv1a('prestes!'));
    expect(hashNumbers([1, 2, 3])).toBe(hashNumbers([1, 2, 3]));
    expect(hashNumbers([1, 2, 3])).not.toBe(hashNumbers([1, 2, 4]));
  });
});

describe('tick helpers', () => {
  it('uses a 10 Hz fixed tick', () => {
    expect(TICK_DT).toBe(0.1);
    expect(TICKS_PER_SECOND).toBe(10);
    expect(secondsToTicks(1)).toBe(10);
    expect(secondsToTicks(0.25)).toBe(3);
    expect(ticksToSeconds(15)).toBeCloseTo(1.5);
  });

  it('clamps ticks per frame', () => {
    expect(clampTicks(-1)).toBe(0);
    expect(clampTicks(MAX_TICKS_PER_FRAME + 10)).toBe(MAX_TICKS_PER_FRAME);
    expect(clampTicks(3.9)).toBe(3);
  });
});
