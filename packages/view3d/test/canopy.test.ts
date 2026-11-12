import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CANOPY_DROP, CanopyFade, crownMask, fadingMaterial, rayDistance } from '../src/canopy';

// biome-trees-and-plants 4.1b (D5d): the crowns over the player's men fade; trunks stay solid.

/** A 6 m tree: a brown trunk to 2.5 m under a green crown 4 m across. */
function tree(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 6).translate(0, 1.25, 0).toNonIndexed();
  const crown = new THREE.IcosahedronGeometry(2, 0).translate(0, 4, 0).toNonIndexed();
  const paint = (geometry: THREE.BufferGeometry, rgb: number[]) => {
    const count = geometry.getAttribute('position').count;
    const colours = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) colours.set(rgb, index * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  };
  paint(trunk, [0.35, 0.22, 0.12]);
  paint(crown, [0.2, 0.5, 0.15]);
  const merged = new THREE.BufferGeometry();
  for (const name of ['position', 'color']) {
    const a = trunk.getAttribute(name).array as Float32Array;
    const b = crown.getAttribute(name).array as Float32Array;
    const joined = new Float32Array(a.length + b.length);
    joined.set(a);
    joined.set(b, a.length);
    merged.setAttribute(name, new THREE.BufferAttribute(joined, 3));
  }
  return merged;
}

/** A wood of `points` (x, z) of one species. */
function wood(points: readonly [number, number][]): { canopy: CanopyFade; mesh: THREE.InstancedMesh } {
  const mesh = new THREE.InstancedMesh(tree(), new THREE.MeshToonMaterial({ vertexColors: true }), points.length);
  mesh.name = 'jequitiba';
  points.forEach(([x, z], index) => mesh.setMatrixAt(index, new THREE.Matrix4().makeTranslation(x, 0, z)));
  const canopy = new CanopyFade();
  canopy.add(mesh);
  return { canopy, mesh };
}

/** The battle camera looks down at about 50 degrees, towards -z... here towards +z and down. */
const VIEW = new THREE.Vector3(0, -0.77, 0.64).normalize();
const chest = (x: number, z: number) => new THREE.Vector3(x, 1.2, z);

describe('canopy fade', () => {
  it('the crown is from the lowest leaf up; the trunk below stays solid', () => {
    const geometry = tree();
    const { base, top } = crownMask(geometry);
    expect(base).toBeCloseTo(2, 0);
    expect(top).toBe(geometry.boundingBox!.max.y);
    const mask = geometry.getAttribute('crownMask');
    const position = geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) expect(mask.getX(index)).toBe(position.getY(index) >= base ? 1 : 0);
  });

  it('a crown over a man fades, the crowns elsewhere stay solid, and it comes back when he leaves', () => {
    const { canopy } = wood([[0, 0], [30, 0], [-30, 10]]);
    for (let frame = 0; frame < 10; frame += 1) canopy.update(VIEW, [chest(0, 0.5)], 0.05);
    expect(canopy.fades().map((crown) => crown.fade)).toEqual([1, 0, 0]);
    for (let frame = 0; frame < 10; frame += 1) canopy.update(VIEW, [chest(60, 40)], 0.05);
    expect(canopy.fades().map((crown) => crown.fade)).toEqual([0, 0, 0]);
  });

  it('a crown between the camera and a man fades though he stands clear of its trunk', () => {
    // The camera looks along +z and down: a crown 4 m nearer the camera (lower z) hides him.
    const { canopy } = wood([[0, -4], [0, 8]]);
    const hidden = canopy.update(VIEW, [chest(0, 0)], 1);
    expect(canopy.fades().map((crown) => crown.fade)).toEqual([1, 0]);
    // Still behind it: he keeps his outline.
    expect(hidden).toEqual([0]);
  });

  it('only the men passed in count: with none (an enemy under the crown is never passed), every crown stays solid', () => {
    const { canopy } = wood([[0, 0]]);
    expect(canopy.update(VIEW, [], 1)).toEqual([]);
    expect(canopy.fades()[0]!.fade).toBe(0);
  });

  it('the fade is written per instance, and clear() makes every crown solid again', () => {
    const { canopy, mesh } = wood([[0, 0], [30, 0]]);
    canopy.update(VIEW, [chest(0, 0)], 1);
    const fades = mesh.geometry.getAttribute('instanceFade');
    expect([fades.getX(0), fades.getX(1)]).toEqual([1, 0]);
    canopy.clear();
    expect(fades.getX(0)).toBe(0);
  });

  it('the dither keeps the look: a whole-pixel screen door, never a transparent material', () => {
    const material = fadingMaterial(new THREE.MeshToonMaterial({ vertexColors: true }));
    expect(material.transparent).toBe(false);
    expect(fadingMaterial(new THREE.MeshToonMaterial())).not.toBe(material);
    expect(CANOPY_DROP).toBeLessThan(1);
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <clipping_planes_fragment>\n#include <dithering_fragment>' };
    material.onBeforeCompile(shader as never, undefined as never);
    expect(shader.fragmentShader).toContain('discard');
    expect(shader.fragmentShader).toContain('gl_FragCoord');
  });

  it('ray distance', () => {
    expect(rayDistance(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), new THREE.Vector3(3, 0, 5))).toBeCloseTo(3);
    // Behind the origin the ray does not reach.
    expect(rayDistance(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 4, -3))).toBeCloseTo(5);
  });
});
