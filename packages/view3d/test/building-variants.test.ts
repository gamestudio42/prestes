import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ENVIRONMENT_ATLAS } from '../src/environment-atlas';
import { withSwatches } from '../src/environment-models';

// revise-buildings-and-stone 3.5: a variant moves a model's faces from one atlas swatch to another.
const [WIDTH, HEIGHT] = ENVIRONMENT_ATLAS.size;
const inside = (swatch: string): [number, number] => {
  const [x, y, w, h] = ENVIRONMENT_ATLAS.regions[swatch]!;
  return [(x + w / 2) / WIDTH, (y + h / 2) / HEIGHT];
};

describe('building variant swatches', () => {
  it('the swapped swatches move to their new cells and the rest stay', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([...inside('plaster'), ...inside('tile'), ...inside('door')], 2));
    const swapped = withSwatches(geometry, { plaster: 'adobe', tile: 'zinc' });
    const uv = swapped.getAttribute('uv');
    expect([uv.getX(0), uv.getY(0)]).toEqual(inside('adobe'));
    expect([uv.getX(1), uv.getY(1)]).toEqual(inside('zinc'));
    expect([uv.getX(2), uv.getY(2)]).toEqual(inside('door'));
    // The model itself is untouched.
    expect([geometry.getAttribute('uv').getX(0), geometry.getAttribute('uv').getY(0)]).toEqual(inside('plaster'));
  });
});
