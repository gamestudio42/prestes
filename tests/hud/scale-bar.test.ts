import { describe, expect, it } from 'vitest';
import { chooseScaleBar } from '../../apps/game/src/editor/scale-bar';

describe('editor scale bar', () => {
  it('snaps to the longest round length that fits', () => {
    // 0.5 m per pixel: 100 m is 200 px, 200 m would be 400 px.
    expect(chooseScaleBar(0.5, 240)).toEqual({ length: 100, segments: 4, pixels: 200 });
    // 2 m per pixel: 200 m is 100 px, 500 m would be 250 px.
    expect(chooseScaleBar(2, 240)).toMatchObject({ length: 200, pixels: 100 });
    // 0.1 m per pixel: 10 m is 100 px, 25 m would be 250 px.
    expect(chooseScaleBar(0.1, 240)).toMatchObject({ length: 10, segments: 5, pixels: 100 });
  });

  it('keeps a sensible width at every zoom', () => {
    for (let metresPerPixel = 0.03; metresPerPixel < 4; metresPerPixel *= 1.07) {
      const bar = chooseScaleBar(metresPerPixel, 240);
      expect(bar.pixels).toBeLessThanOrEqual(240);
      expect(bar.pixels).toBeGreaterThan(240 / 2.5);
      expect(bar.pixels * metresPerPixel).toBeCloseTo(bar.length, 6);
    }
  });

  it('falls back to the shortest length when even it is too wide', () => {
    expect(chooseScaleBar(0.001, 240)).toMatchObject({ length: 5, pixels: 5000 });
  });
});
