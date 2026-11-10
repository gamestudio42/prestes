import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { MAX_TRACERS, TRACER_SPEED, TRACER_STREAK, TRACER_STYLES, TracerLayer, tracerKind } from '../src/tracer-layer';

type Shot = Extract<SimEvent, { type: 'shot' }>;
const shot = (tick: number, burstStart?: boolean): Shot => ({
  type: 'shot',
  tick,
  source: 1,
  target: 2,
  x: 0,
  y: 0,
  x2: 0,
  y2: -32,
  hit: false,
  ...(burstStart !== undefined ? { burstStart } : {}),
});

describe('tracer layer', () => {
  it('flies a streak from the muzzle to the target, then it is gone', () => {
    const layer = new TracerLayer();
    layer.spawn(shot(1));
    layer.update(0.05);
    expect(layer.count).toBe(1); // 7.5 m out of 32
    layer.update((32 + TRACER_STREAK) / TRACER_SPEED);
    expect(layer.count).toBe(0);
  });

  it('a burst draws a tracer per round (machine-gun-fire-feedback 5.1)', () => {
    const layer = new TracerLayer();
    for (let round = 0; round < 6; round += 1) layer.spawn(shot(10 + round, round === 0), 'machine-gun');
    expect(layer.countOf('machine-gun')).toBe(6);
    expect(MAX_TRACERS).toBeGreaterThanOrEqual(160);
  });

  it('styles by weapon: thin, long and fast; the gun longer, faster and red', () => {
    expect(tracerKind('metralhadora-7mm', {})).toBe('machine-gun');
    expect(tracerKind('fuzil-automatico-7mm', {})).toBe('automatic');
    expect(tracerKind('mauser-7mm', {})).toBe('rifle');
    expect(tracerKind(undefined, { burstStart: true })).toBe('automatic');
    expect(tracerKind(undefined, {})).toBe('rifle');
    const gun = TRACER_STYLES['machine-gun'];
    const rifle = TRACER_STYLES.rifle;
    expect(gun.streak).toBeGreaterThan(rifle.streak);
    expect(gun.speed).toBeGreaterThan(rifle.speed);
    // User, 2026-11-09: longer and faster than the first pass (5 m at 90 m/s).
    expect(rifle.streak).toBeGreaterThanOrEqual(8);
    expect(rifle.speed).toBeGreaterThanOrEqual(150);
    for (const style of Object.values(TRACER_STYLES)) {
      // One render pixel, no thicker, and no bloom halo round the head.
      expect(style.minPixels).toBeLessThanOrEqual(1);
      const head = new THREE.Color(style.head);
      expect(Math.max(head.r, head.g, head.b)).toBeLessThan(0.9);
    }
    // The gun's head is red-orange, the rifle's pale straw: told apart by hue.
    const hue = (hex: number) => new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).h * 360;
    expect(hue(gun.head)).toBeLessThan(25);
    expect(hue(rifle.head)).toBeGreaterThan(35);
    expect(gun.fade).toBeLessThan(rifle.fade);
  });

  it('keeps a least width in render pixels when zoomed out', () => {
    const layer = new TracerLayer();
    // Strategic band: about 0.4 m to a render pixel.
    layer.setView(new THREE.Vector3(0, -1, 0), 0.4);
    expect(layer.widthOf('rifle')).toBeCloseTo(0.4 * TRACER_STYLES.rifle.minPixels);
    expect(layer.widthOf('machine-gun')).toBeCloseTo(0.4 * TRACER_STYLES['machine-gun'].minPixels);
    // The ribbon is drawn that wide, across its flight.
    layer.spawn(shot(1), 'machine-gun');
    layer.update(0.1);
    const mesh = layer.group.children[0] as THREE.Mesh;
    const position = mesh.geometry.getAttribute('position');
    expect(mesh.geometry.drawRange.count).toBe(18);
    const xs = Array.from({ length: 18 }, (_, index) => position.getX(index));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(layer.widthOf('machine-gun'));
  });
});
