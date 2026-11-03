import { describe, expect, it } from 'vitest';
import {
  CameraRig,
  MAX_SPAN,
  MIN_SPAN,
  unitScaleForSpan,
} from '../src/camera-rig';

describe('CameraRig', () => {
  it('starts tactical and reaches strategic after zooming out', () => {
    const rig = new CameraRig();
    expect(rig.band).toBe('tactical');
    rig.zoom(6);
    rig.update(1);
    expect(rig.band).toBe('strategic');
  });

  it('clamps the span and rotates in 45 degree steps', () => {
    const rig = new CameraRig();
    rig.zoom(100);
    expect(rig.targetSpan).toBe(MAX_SPAN);
    rig.zoom(-100);
    expect(rig.targetSpan).toBe(MIN_SPAN);
    const yaw = rig.targetYaw;
    rig.rotate(1);
    expect(rig.targetYaw).toBeCloseTo(yaw + Math.PI / 4);
  });

  it('pans the focus without touching the simulation', () => {
    const rig = new CameraRig();
    rig.pan(10, 0);
    expect(Math.abs(rig.focusX) + Math.abs(rig.focusY)).toBeGreaterThan(0.1);
  });
});

describe('unitScaleForSpan', () => {
  it('keeps tactical characters at their model scale', () => {
    expect(unitScaleForSpan(30)).toBe(1);
    expect(unitScaleForSpan(60)).toBe(1);
  });

  it('grows characters at strategic span', () => {
    expect(unitScaleForSpan(120)).toBeGreaterThan(1);
    expect(unitScaleForSpan(180)).toBeGreaterThan(unitScaleForSpan(120));
  });
});

