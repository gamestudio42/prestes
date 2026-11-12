import * as THREE from 'three';

/**
 * biome-trees-and-plants 4.1b (D5d): soldiers stay visible under trees. A
 * crown between the camera and one of the player's men, or close over him,
 * fades with a screen-door dither in whole pixels (no sorted transparency);
 * the trunk below the crown stays solid. The kept crown pixels are marked in
 * the colour target's alpha so the outline pass draws no outline around
 * every dither hole (post.ts), and the trees keep their look. Only the
 * player's own men are passed in, so a fade never shows a fogged enemy.
 */

/** At full fade this share of the crown's pixels is dropped. */
export const CANOPY_DROP = 0.7;
/** Fade per second, in and out. */
const FADE_RATE = 5;
/** Below this fade a crown no longer counts as hiding a man (his outline goes). */
const HIDING_FADE = 0.3;
/** The marked alpha of a faded crown's kept pixels; post.ts skips outlines there. */
export const FADED_ALPHA = 0.5;

/**
 * The height of a tree model's lowest leaf (a vertex greener than red and
 * blue), or null when it has none (a dead tree, an uncoloured model).
 */
export function lowestLeaf(geometry: THREE.BufferGeometry): number | null {
  const position = geometry.getAttribute('position');
  const colour = geometry.getAttribute('color');
  if (!colour) return null;
  let lowest = Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const g = colour.getY(index);
    if (g > colour.getX(index) && g > colour.getZ(index)) lowest = Math.min(lowest, position.getY(index));
  }
  return lowest === Infinity ? null : lowest;
}

/** Marks each vertex of a tree model: 1 in the crown (from the lowest leaf up), 0 in the trunk below. */
export function crownMask(geometry: THREE.BufferGeometry): { base: number; top: number } {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const height = box.max.y - box.min.y;
  const position = geometry.getAttribute('position');
  // A plant lower than 2 m fades whole; a tree without leaves (a dead one) from 45% of its height.
  let base = lowestLeaf(geometry) ?? box.min.y + height * 0.45;
  // The trunk keeps at least its lowest 1.6 m (or 30%) solid.
  base = Math.max(base, box.min.y + Math.min(1.6, height * 0.3));
  if (height < 2) base = box.min.y;
  if (!geometry.getAttribute('crownMask')) {
    const mask = new Float32Array(position.count);
    for (let index = 0; index < position.count; index += 1) mask[index] = position.getY(index) >= base ? 1 : 0;
    geometry.setAttribute('crownMask', new THREE.BufferAttribute(mask, 1));
  }
  return { base, top: box.max.y };
}

const FADING = new WeakMap<THREE.Material, THREE.Material>();

/** The tree material with the per-instance crown dither. */
export function fadingMaterial(source: THREE.Material): THREE.Material {
  let material = FADING.get(source);
  if (material) return material;
  material = source.clone();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.canopyDrop = { value: CANOPY_DROP };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float instanceFade;\nattribute float crownMask;\nvarying float vCanopyFade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCanopyFade = instanceFade * crownMask;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float canopyDrop;
varying float vCanopyFade;
float canopyBayer(vec2 p) {
  int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[i] + 0.5) / 16.0;
}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
if (vCanopyFade > 0.01 && canopyBayer(gl_FragCoord.xy) < vCanopyFade * canopyDrop) discard;`,
      )
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>\nif (vCanopyFade > 0.01) gl_FragColor.a = ${FADED_ALPHA.toFixed(2)};`);
  };
  material.customProgramCacheKey = () => 'canopy-fade';
  // Cached for every map: a map's disposal keeps it (scene-view disposeObject).
  material.userData = { shared: true };
  FADING.set(source, material);
  return material;
}

interface Crown {
  mesh: THREE.InstancedMesh;
  index: number;
  centre: THREE.Vector3;
  radius: number;
  top: number;
  fade: number;
}

/** Distance from a point to the ray from `origin` along unit `direction` (t >= 0). */
export function rayDistance(origin: THREE.Vector3, direction: THREE.Vector3, point: THREE.Vector3): number {
  const t = Math.max(0, (point.x - origin.x) * direction.x + (point.y - origin.y) * direction.y + (point.z - origin.z) * direction.z);
  const dx = origin.x + direction.x * t - point.x;
  const dy = origin.y + direction.y * t - point.y;
  const dz = origin.z + direction.z * t - point.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** The crowns of a battle map's trees and how faded each one is. */
export class CanopyFade {
  private readonly crowns: Crown[] = [];
  private readonly meshes = new Set<THREE.InstancedMesh>();
  private readonly back = new THREE.Vector3();
  // Scratch kept across frames: update runs every frame.
  private readonly hiddenFlags: boolean[] = [];
  private readonly hidden: number[] = [];
  private readonly touched = new Set<THREE.InstancedMesh>();

  /** Takes over a tree species' instanced mesh: its material fades, its crowns are tracked. */
  add(mesh: THREE.InstancedMesh): void {
    const { base, top } = crownMask(mesh.geometry);
    const box = mesh.geometry.boundingBox!;
    const local = new THREE.Vector3((box.min.x + box.max.x) / 2, (base + top) / 2, (box.min.z + box.max.z) / 2);
    const halfSpan = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    const reach = Math.max(halfSpan, (top - base) / 2);
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const fades = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count), 1);
    fades.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry = mesh.geometry.clone();
    // The clone is this map's own (the clone shares the source's userData object).
    mesh.geometry.userData = {};
    mesh.geometry.setAttribute('instanceFade', fades);
    mesh.material = fadingMaterial(mesh.material as THREE.Material);
    for (let index = 0; index < mesh.count; index += 1) {
      mesh.getMatrixAt(index, matrix);
      scale.setFromMatrixScale(matrix);
      const size = Math.max(scale.x, scale.y, scale.z);
      const origin = new THREE.Vector3().setFromMatrixPosition(matrix);
      this.crowns.push({
        mesh,
        index,
        centre: local.clone().applyMatrix4(matrix),
        radius: reach * size * 0.85,
        top: origin.y + top * scale.y,
        fade: 0,
      });
    }
    this.meshes.add(mesh);
  }

  /**
   * Fades the crowns that hide one of these men from a camera looking along
   * `view` (orthographic: the rays are parallel), or stand close over him,
   * and brings the others back. Returns the indices of the men still hidden
   * behind a crown, for their outline, ascending (the array is reused by
   * the next call).
   */
  update(view: THREE.Vector3, men: readonly THREE.Vector3[], seconds: number): readonly number[] {
    const back = this.back.copy(view).normalize().negate();
    const flags = this.hiddenFlags;
    flags.length = men.length;
    flags.fill(false);
    const touched = this.touched;
    touched.clear();
    const step = Math.min(1, seconds * FADE_RATE);
    // Seen from above, a crown can hide a man only if it stands within this
    // much of him horizontally: the ray climbs at the camera's pitch.
    const climb = Math.max(0.2, -back.y) / Math.max(0.2, Math.hypot(back.x, back.z));
    for (const crown of this.crowns) {
      let covers = false;
      if (men.length > 0) {
        const near = crown.radius + Math.max(0, crown.top - 1) / climb;
        for (let index = 0; index < men.length; index += 1) {
          const man = men[index]!;
          const dx = man.x - crown.centre.x;
          const dz = man.z - crown.centre.z;
          if (Math.abs(dx) > near || Math.abs(dz) > near) continue;
          const along = rayDistance(man, back, crown.centre) < crown.radius;
          const over = dx * dx + dz * dz < crown.radius * crown.radius && man.y < crown.top;
          if (along || over) {
            covers = true;
            if (crown.fade > HIDING_FADE || along) flags[index] = true;
          }
        }
      }
      const target = covers ? 1 : 0;
      if (crown.fade === target) continue;
      crown.fade = target > crown.fade ? Math.min(target, crown.fade + step) : Math.max(target, crown.fade - step);
      (crown.mesh.geometry.getAttribute('instanceFade') as THREE.InstancedBufferAttribute).setX(crown.index, crown.fade);
      touched.add(crown.mesh);
    }
    for (const mesh of touched) mesh.geometry.getAttribute('instanceFade').needsUpdate = true;
    this.hidden.length = 0;
    for (let index = 0; index < flags.length; index += 1) if (flags[index]) this.hidden.push(index);
    return this.hidden;
  }

  /** Each crown's fade, by species and instance (view tests). */
  fades(): { model: string; index: number; fade: number }[] {
    return this.crowns.map((crown) => ({ model: crown.mesh.name, index: crown.index, fade: crown.fade }));
  }

  /** Every crown solid again (strategic span: the stand-ins are drawn instead). */
  clear(): void {
    for (const crown of this.crowns) crown.fade = 0;
    for (const mesh of this.meshes) {
      (mesh.geometry.getAttribute('instanceFade').array as Float32Array).fill(0);
      mesh.geometry.getAttribute('instanceFade').needsUpdate = true;
    }
  }
}
