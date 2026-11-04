import { describe, expect, it } from 'vitest';
import { COVER_POINTS, type Frame, type SimEvent, type UnitSnapshot } from '@prestes/shared';
import { EffectsLayer, impactAt, missPoint, muzzleHeight } from '../src/effects-layer';

type Shot = Extract<SimEvent, { type: 'shot' }>;

const shot = (hit: boolean, tick = 5): Shot => ({ type: 'shot', tick, source: 1, target: 4, x: 0, y: 0, x2: 0, y2: -20, hit });

function frame(tick: number, events: SimEvent[], units: Array<Partial<UnitSnapshot>> = []): Frame {
  return { tick, units: units as UnitSnapshot[], orders: [], covers: [], events, outcome: 'playing', hash: 't' };
}

describe('effects layer', () => {
  it('a shot makes a flash and smoke at the muzzle and an impact where it lands', () => {
    const layer = new EffectsLayer();
    layer.onFrame(frame(5, [shot(true)]));
    expect(layer.count).toBe(3); // flash, smoke, blood
    layer.onFrame(frame(5, [shot(true)]));
    expect(layer.count).toBe(3); // the same tick is not replayed
    layer.onFrame(frame(6, [shot(false, 6)]));
    expect(layer.count).toBeGreaterThanOrEqual(6);
  });

  it('effects expire', () => {
    const layer = new EffectsLayer();
    layer.onFrame(frame(5, [shot(false)]));
    layer.update(null, 3, 8);
    expect(layer.count).toBe(0);
  });

  it('walking soldiers raise dust every step length', () => {
    const layer = new EffectsLayer();
    const unit = { id: 1, x: 0, y: 0, alive: true, incapacitated: false, dummy: false, stance: 'standing' as const };
    layer.update(frame(1, [], [unit]), 0.016, 8);
    for (let step = 1; step <= 10; step += 1) {
      layer.update(frame(1, [], [{ ...unit, x: step * 0.4 }]), 0.016, 8);
    }
    expect(layer.count).toBe(3); // 4 m walked, a puff every 1.1 m
  });

  it('misses land past the target and splinter on stone', () => {
    const point = missPoint(shot(false));
    expect(point.y).toBeLessThan(-20);
    expect(missPoint(shot(false))).toEqual(point); // repeatable
    const stone = COVER_POINTS.find((cover) => cover.kind === 'stone');
    if (stone) expect(impactAt({ x: stone.x, y: stone.y }, COVER_POINTS).kind).toBe('splinter');
    expect(impactAt({ x: 500, y: 500 }, []).kind).toBe('spurt');
    expect(muzzleHeight('prone')).toBeLessThan(muzzleHeight('crouched'));
  });
});
