import { describe, expect, it } from 'vitest';
import { createEditableMap, heightNodes, MAX_HEIGHT, MIN_HEIGHT } from '../../packages/shared/src';
import { sampleHeight, Stroke } from '../../apps/game/src/editor/brush';
import { EditorStore } from '../../apps/game/src/editor/store';

// add-map-editor: the height brushes.

const settings = () => ({ ...new EditorStore().settings, size: 8, strength: 1 });
const fresh = () => createEditableMap({ id: 'brush-test', size: 'small', name: { en: 'Brush', 'pt-BR': 'Pincel' } });

describe('height brushes', () => {
  it('raise grows the ground under the brush and falls off to its edge', () => {
    const map = fresh();
    const stroke = new Stroke(map, 'raise', settings(), { x: 0, y: 0 });
    for (let n = 0; n < 30; n += 1) stroke.apply(0, 0, 1 / 30);
    expect(sampleHeight(map, 0, 0)).toBeGreaterThan(1.5);
    expect(sampleHeight(map, 2, 0)).toBeLessThan(sampleHeight(map, 0, 0));
    expect(sampleHeight(map, 10, 0)).toBe(0);
    expect(stroke.changes.size).toBeGreaterThan(0);
  });

  it('keeps every height within −12 m and +40 m', () => {
    const map = fresh();
    const up = new Stroke(map, 'raise', settings(), { x: 0, y: 0 });
    for (let n = 0; n < 400; n += 1) up.apply(0, 0, 0.1);
    expect(Math.max(...map.heights)).toBe(MAX_HEIGHT * 100);
    const down = new Stroke(map, 'lower', settings(), { x: 0, y: 0 });
    for (let n = 0; n < 800; n += 1) down.apply(0, 0, 0.1);
    expect(Math.min(...map.heights)).toBe(MIN_HEIGHT * 100);
  });

  it('seeded noise gives the same ground for the same stroke, other ground for another seed', () => {
    const run = (seed: number) => {
      const map = fresh();
      const stroke = new Stroke(map, 'noise', { ...settings(), size: 40, seed }, { x: 0, y: 0 });
      stroke.applyAlong({ x: -20, y: 0 }, { x: 20, y: 0 }, 0.2);
      stroke.apply(0, 0, 1);
      return map.heights;
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
    // Applied once per node per stroke: going over it again in the same stroke changes nothing.
    const map = fresh();
    const stroke = new Stroke(map, 'noise', { ...settings(), size: 40 }, { x: 0, y: 0 });
    stroke.apply(0, 0, 1);
    const once = map.heights.slice();
    stroke.apply(0, 0, 1);
    expect(map.heights).toEqual(once);
    expect(map.heights.length).toBe(heightNodes('small') ** 2);
  });
});
