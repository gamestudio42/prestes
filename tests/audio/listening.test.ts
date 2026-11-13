import { describe, expect, it } from 'vitest';
import {
  FAR_SPAN,
  MAX_PAN,
  NEAR_AMBIENCE,
  NEAR_SPAN,
  ZOOM_THIN,
  ambienceShare,
  gainAt,
  hear,
  panAt,
  zoomOf,
  type ListeningPoint,
} from '../../apps/game/src/audio/listening';

// ambient-sound-and-voices 1.2: the listening point's rule for nearness and
// left-right panning.

const point = (overrides: Partial<ListeningPoint> = {}): ListeningPoint => ({ x: 0, y: 0, span: NEAR_SPAN, right: { x: 1, y: 0 }, ...overrides });

describe('range', () => {
  it('is full at the point, falls with distance and is silent at its range and beyond', () => {
    expect(gainAt(0, 60, 0)).toBe(1);
    const near = gainAt(10, 60, 0);
    const far = gainAt(40, 60, 0);
    expect(near).toBeLessThan(1);
    expect(far).toBeLessThan(near);
    expect(far).toBeGreaterThan(0);
    expect(gainAt(60, 60, 0)).toBe(0);
    expect(gainAt(200, 60, 0)).toBe(0);
  });

  it('silences a river 200 m behind the camera (the spec: panning to a hilltop)', () => {
    expect(hear(point({ x: 0 }), 0, 5, 80).gain).toBeGreaterThan(0.8);
    expect(hear(point({ x: 200 }), 0, 5, 80).gain).toBe(0);
  });

  it('is zero for a sound with no range', () => {
    expect(gainAt(0, 0, 0)).toBe(0);
  });
});

describe('zoom', () => {
  it('runs from 0 at the nearest span to 1 at the farthest', () => {
    expect(zoomOf(NEAR_SPAN)).toBe(0);
    expect(zoomOf(10)).toBe(0);
    expect(zoomOf(FAR_SPAN)).toBe(1);
    expect(zoomOf(1000)).toBe(1);
    expect(zoomOf((NEAR_SPAN + FAR_SPAN) / 2)).toBeCloseTo(0.5);
  });

  it('thins a near sound when zoomed out', () => {
    expect(gainAt(0, 60, 1)).toBeCloseTo(1 - ZOOM_THIN);
    expect(gainAt(5, 60, 1)).toBeLessThan(gainAt(5, 60, 0));
  });

  it('lets a zoomed-out view hear farther, faintly', () => {
    expect(gainAt(90, 60, 0)).toBe(0);
    expect(gainAt(90, 60, 1)).toBeGreaterThan(0);
  });

  it('raises the general ambience when zoomed out', () => {
    expect(ambienceShare(0)).toBe(NEAR_AMBIENCE);
    expect(ambienceShare(1)).toBe(1);
    expect(ambienceShare(0.5)).toBeGreaterThan(ambienceShare(0));
  });
});

describe('pan', () => {
  it('puts a source on the screen\'s left on the left and its right on the right', () => {
    const view = point({ span: 100 });
    expect(panAt(view, -30, 0)).toBeLessThan(0);
    expect(panAt(view, 30, 0)).toBeGreaterThan(0);
    expect(panAt(view, 0, 0)).toBe(0);
  });

  it('is centred for a source straight ahead or behind', () => {
    expect(panAt(point({ span: 100 }), 0, 40)).toBe(0);
  });

  it('follows the camera turning: with the screen\'s right along +y, a source at +y is on the right', () => {
    const turned = point({ span: 100, right: { x: 0, y: 1 } });
    expect(panAt(turned, 0, 30)).toBeGreaterThan(0);
    expect(panAt(turned, 30, 0)).toBe(0);
  });

  it('never goes all the way into one ear', () => {
    expect(panAt(point({ span: 100 }), 500, 0)).toBe(MAX_PAN);
    expect(panAt(point({ span: 100 }), -500, 0)).toBe(-MAX_PAN);
  });
});
