import { describe, expect, it } from 'vitest';
import type { Frame, SimEvent } from '@prestes/shared';
import { EffectsLayer } from '../src/effects-layer';
import { MarkerLayer, dashedRing } from '../src/marker-layer';

// scrub-concealment-and-area-fire: the area-fire disc and its rounds in the view.
describe('area fire in the view', () => {
  it('draws one dashed ring per disc the player fires into', () => {
    const layer = new MarkerLayer();
    const disc = { x: 10, y: 20, radius: 6 };
    layer.updateAreaFire([{ areaFire: disc }, { areaFire: disc }, {}, { areaFire: { x: -5, y: 0, radius: 4 } }]);
    expect(layer.areaCount).toBe(2);
    layer.updateAreaFire([]);
    expect(layer.areaCount).toBe(0);
    layer.dispose();
  });

  it('the dashed ring has the dashes asked for', () => {
    const geometry = dashedRing(0.9, 1, 20);
    expect(geometry.getIndex()!.count).toBe(20 * 4 * 6);
  });

  it('an area round with no one in the disc draws at its aim point without error', () => {
    const effects = new EffectsLayer();
    const round: SimEvent = { type: 'shot', tick: 3, source: 1, target: -1, x: 0, y: 0, x2: 4, y2: 60, hit: false, area: true };
    const frame: Frame = { tick: 3, units: [], orders: [], covers: [], events: [round], outcome: 'playing', hash: 't' };
    expect(() => effects.onFrame(frame)).not.toThrow();
    expect(effects.count).toBeGreaterThan(0);
  });
});
