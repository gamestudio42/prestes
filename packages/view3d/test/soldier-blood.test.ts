import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { woundSide } from '../src/soldier-clips';
import { SoldierInstance, type SoldierAsset } from '../src/soldier-models';

/**
 * soldier-animation-and-textures 3.4: a wounded soldier shows blood on the
 * side of his wound; an unwounded one shows none.
 */
function asset(): SoldierAsset {
  const scene = new THREE.Group();
  const chest = new THREE.Bone();
  chest.name = 'chest';
  scene.add(chest);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.2));
  body.name = 'Soldier';
  scene.add(body);
  const material = new THREE.MeshBasicMaterial();
  const materials: Record<string, THREE.Material> = {};
  for (const outfit of ['coluna-troop', 'legalista-troop']) for (const variant of [0, 1, 2]) materials[`${outfit}-${variant}`] = material;
  return { scene, clips: new Map(), materials, clone: (object: THREE.Object3D) => object.clone(true) } as unknown as SoldierAsset;
}

describe('blood on the side of the wound (3.4)', () => {
  it('a wounded soldier carries the blood overlay on that side; an unwounded one none', () => {
    const wounded = new SoldierInstance(asset(), 'coluna-troop');
    wounded.setWound(1);
    const blood = wounded.root.getObjectByName('blood-overlay')!;
    expect(blood.visible).toBe(true);
    expect(blood.parent?.name).toBe('chest');
    expect(blood.position.x).toBeGreaterThan(0);
    expect(wounded.woundSide).toBe(1);
    wounded.setWound(-1);
    expect(wounded.woundSide).toBe(-1);

    const whole = new SoldierInstance(asset(), 'legalista-troop');
    whole.setWound(null);
    expect(whole.root.getObjectByName('blood-overlay')).toBeUndefined();
    expect(whole.woundSide).toBeNull();
  });

  it('the side is the one that faced the shot', () => {
    // Facing north (-y): a shot from the east is on his right, from the west his left.
    expect(woundSide(1, 0, -1, 30, 0)).toBe(1);
    expect(woundSide(1, 0, -1, -30, 0)).toBe(-1);
    // Facing east (+x): a shot from the south (+y) is on his right.
    expect(woundSide(1, 1, 0, 0, 30)).toBe(1);
    // No shot seen: a side by his id, the same each time.
    expect(woundSide(7, 0, -1)).toBe(woundSide(7, 0, -1));
  });
});
