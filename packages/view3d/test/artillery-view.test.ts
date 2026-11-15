import { describe, expect, it } from 'vitest';
import type { CoverPoint, Frame, SimEvent } from '@prestes/shared';
import { CameraRig, SHAKE_SECONDS, shakeOffset, shakeStrength } from '../src/camera-rig';
import { CoverLayer } from '../src/cover-layer';
import { EffectsLayer } from '../src/effects-layer';

// add-artillery-bombardment 3.1 to 3.3: the burst, the crater mark and the camera shake.
type Impact = Extract<SimEvent, { type: 'shell_impact' }>;
const impact = (gun: Impact['gun'], tick = 30): Impact => ({ type: 'shell_impact', tick, gun, x: 5, y: -8 });
const frame = (tick: number, events: SimEvent[]): Frame => ({ tick, units: [], orders: [], covers: [], events, outcome: 'playing', hash: 't' });

describe('shell burst', () => {
  it('a burst throws flash, dust, smoke and debris; the howitzer throws more', () => {
    const field = new EffectsLayer();
    field.onFrame(frame(30, [impact('field-75')]));
    expect(field.count).toBe(1 + 14 + 8 + 10);
    const howitzer = new EffectsLayer();
    howitzer.onFrame(frame(30, [impact('howitzer-105')]));
    expect(howitzer.count).toBeGreaterThan(field.count);
  });

  it('the particles die away within a few seconds', () => {
    const layer = new EffectsLayer();
    layer.onFrame(frame(30, [impact('field-75')]));
    for (let step = 0; step < 60; step += 1) layer.update(null, 0.1, 8);
    expect(layer.count).toBe(0);
  });
});

describe('crater mark', () => {
  it('draws one mark per crater and keeps it', () => {
    const layer = new CoverLayer();
    const crater: CoverPoint = { id: 70, kind: 'crater', x: 3, y: 4, halfWidth: 1.5, halfDepth: 1.5, height: 0.5, radius: 1.5, quality: 0.35, blocksMovement: false, blocksSight: false };
    layer.update([crater]);
    expect(layer.craterCount).toBe(1);
    layer.update([crater, { ...crater, id: 71, x: 20 }]);
    expect(layer.craterCount).toBe(2);
  });
});

describe('camera shake', () => {
  it('is strong near the focus and nothing far away', () => {
    expect(shakeStrength(10, 1)).toBeGreaterThan(0.7);
    expect(shakeStrength(200, 1)).toBe(0);
    expect(shakeStrength(10, 1.4)).toBeGreaterThan(shakeStrength(10, 1));
  });

  it('decays to nothing and never moves the focus or the resting camera', () => {
    const still = new CameraRig();
    const shaken = new CameraRig();
    still.update(0);
    shaken.update(0);
    shaken.kick(1);
    shaken.update(0.05);
    still.update(0.05);
    expect(shaken.camera.position.distanceTo(still.camera.position)).toBeGreaterThan(0);
    for (let step = 0; step < 30; step += 1) {
      shaken.update(1 / 60);
      still.update(1 / 60);
    }
    expect(shaken.focusX).toBe(still.focusX);
    expect(shaken.focusY).toBe(still.focusY);
    expect(shaken.camera.position.distanceTo(still.camera.position)).toBeLessThan(1e-6);
    expect(shakeOffset(SHAKE_SECONDS + 0.01, 1).amplitude).toBe(0);
  });
});
