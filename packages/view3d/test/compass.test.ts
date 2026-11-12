import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../src/camera-rig';
import { compassAngle } from '../src/compass';
import { sunFromLight } from '../src/map-light';

/** The on-screen angle of true north, clockwise from screen up, measured from the real camera. */
function screenNorth(rig: CameraRig, north: number): number {
  rig.camera.updateMatrixWorld();
  const e = rig.camera.matrixWorld.elements;
  const right = new THREE.Vector3(e[0], e[1], e[2]);
  const up = new THREE.Vector3(e[4], e[5], e[6]);
  // True north on the grid: `north` degrees clockwise from the top edge (-y, three's -z).
  const radians = (north * Math.PI) / 180;
  const direction = new THREE.Vector3(Math.sin(radians), 0, -Math.cos(radians));
  const angle = (Math.atan2(direction.dot(right), direction.dot(up)) * 180) / Math.PI;
  return ((angle % 360) + 360) % 360;
}

const settle = (rig: CameraRig): void => {
  for (let frame = 0; frame < 300; frame += 1) rig.update(1 / 30);
};

const sameAngle = (a: number, b: number): void => {
  const gap = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  expect(gap).toBeLessThan(0.5);
};

describe('compass (add-map-compass)', () => {
  it('points 45 degrees clockwise on a north-up map seen from straight above at the default yaw', () => {
    expect(compassAngle(0, Math.PI / 4)).toBeCloseTo(45);
    const rig = new CameraRig();
    rig.tiltOverride = Math.PI / 2 - 1e-6;
    settle(rig);
    sameAngle(screenNorth(rig, 0), 45);
  });

  it('follows the foreshortening of the tilted view', () => {
    const rig = new CameraRig();
    settle(rig);
    const angle = compassAngle(0, rig.yaw, rig.tilt);
    expect(angle).toBeGreaterThan(45);
    sameAngle(angle, screenNorth(rig, 0));
  });

  it('matches the real camera at every rotation step and several norths', () => {
    for (const north of [0, 30, 90, 185, 315]) {
      const rig = new CameraRig();
      for (let step = 0; step < 9; step += 1) {
        settle(rig);
        sameAngle(compassAngle(north, rig.yaw, rig.tilt), screenNorth(rig, north));
        rig.rotate(step % 3 === 0 ? -1 : 1);
      }
    }
  });

  it('turns by 45 degrees with one rotation step (seen from above) and the same way when tilted', () => {
    const rig = new CameraRig();
    settle(rig);
    const before = compassAngle(30, rig.yaw);
    const tilted = compassAngle(30, rig.yaw, rig.tilt);
    rig.rotate(1);
    settle(rig);
    sameAngle(compassAngle(30, rig.yaw), before + 45);
    const turn = ((compassAngle(30, rig.yaw, rig.tilt) - tilted + 540) % 360) - 180;
    expect(turn).toBeGreaterThan(20);
    expect(turn).toBeLessThan(70);
  });

  it('is normalised to [0, 360)', () => {
    expect(compassAngle(0, 0)).toBe(0);
    expect(compassAngle(350, Math.PI / 4)).toBeCloseTo(35);
    expect(compassAngle(10, -Math.PI / 2)).toBeCloseTo(280);
    expect(compassAngle(0, 2 * Math.PI)).toBeCloseTo(0);
  });

  it('faceNorth turns the shortest way until north is up', () => {
    for (const north of [0, 30, 90, 200, 355]) {
      const rig = new CameraRig();
      rig.rotate(5);
      settle(rig);
      const from = rig.targetYaw;
      rig.faceNorth(north);
      expect(Math.abs(rig.targetYaw - from)).toBeLessThanOrEqual(Math.PI + 1e-9);
      settle(rig);
      sameAngle(screenNorth(rig, north), 0);
      sameAngle(compassAngle(north, rig.yaw, rig.tilt), 0);
    }
  });

  it('the sun bearing is read from true north', () => {
    const light = { time: 12, bearing: 0 };
    const grid = sunFromLight(light, 1.7, 0).position;
    const turned = sunFromLight(light, 1.7, 90).position;
    // Sun from the north on a north-up map: towards -z. North turned to the right: towards +x.
    expect(grid[2]).toBeLessThan(0);
    expect(Math.abs(grid[0])).toBeLessThan(1e-9);
    expect(turned[0]).toBeGreaterThan(0);
    expect(Math.abs(turned[2])).toBeLessThan(1e-9);
    expect(turned[1]).toBeCloseTo(grid[1]);
  });
});
