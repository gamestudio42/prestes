import { describe, expect, it } from 'vitest';
import { TRACER_SPEED, TRACER_STREAK, TracerLayer } from '../src/tracer-layer';

describe('tracer layer', () => {
  it('flies a streak from the muzzle to the target, then it is gone', () => {
    const layer = new TracerLayer();
    layer.spawn({ type: 'shot', tick: 1, source: 1, target: 2, x: 0, y: 0, x2: 0, y2: -32, hit: false });
    layer.update(0.05);
    expect(layer.count).toBe(1); // 4.5 m out of 32
    layer.update((32 + TRACER_STREAK) / TRACER_SPEED);
    expect(layer.count).toBe(0);
  });
});
