import { describe, expect, it } from 'vitest';
import { sunFromLight } from '../src/map-light';

// author-game-maps 5.1: the battle view lights the map from its `light`.
function lambert(normal: [number, number, number], time: number, bearing: number): number {
  const [x, y, z] = sunFromLight({ time, bearing }).position;
  const length = Math.hypot(x, y, z);
  return Math.max(0, (normal[0] * x + normal[1] * y + normal[2] * z) / length);
}

describe('map light', () => {
  it('late afternoon from the west lights west faces more than midday', () => {
    const westFace: [number, number, number] = [-1, 0, 0];
    expect(lambert(westFace, 17, 270)).toBeGreaterThan(lambert(westFace, 12, 270));
  });

  it('the sun is low and warmer at the ends of the day', () => {
    const noon = sunFromLight({ time: 12, bearing: 180 });
    const dusk = sunFromLight({ time: 17.5, bearing: 270 });
    expect(dusk.position[1]).toBeLessThan(noon.position[1]);
    expect(dusk.color & 0xff).toBeLessThan(noon.color & 0xff); // less blue
    expect(dusk.intensity).toBeLessThan(noon.intensity);
  });

  it('the bearing points the sun: east is +x, north is -z', () => {
    expect(sunFromLight({ time: 9, bearing: 90 }).position[0]).toBeGreaterThan(0);
    expect(sunFromLight({ time: 9, bearing: 0 }).position[2]).toBeLessThan(0);
  });
});
