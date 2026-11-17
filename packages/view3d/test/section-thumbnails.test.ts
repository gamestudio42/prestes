import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SECTION_TYPES, type SectionTypeId } from '@prestes/shared';
import { SOLDIER_OUTFITS, UNIFORM_VARIANTS } from '../src/soldier-clips';
import type { SoldierAsset } from '../src/soldier-models';
import { buildSectionScene, sectionComposition } from '../src/thumbnails';
import { WEAPON_MESHES } from '../src/weapon-props';

/**
 * troop-thumbnails-and-panel 1.1: a type's picture poses its men in the
 * army's uniform with their weapons; a machine gun shows the gun.
 */
function asset(): SoldierAsset {
  const scene = new THREE.Group();
  const rifle = new THREE.Bone();
  rifle.name = 'rifle';
  scene.add(rifle);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.7, 0.2));
  body.name = 'Soldier';
  scene.add(body);
  for (const name of WEAPON_MESHES) {
    const weapon = new THREE.Mesh();
    weapon.name = name;
    scene.add(weapon);
  }
  const materials: Record<string, THREE.Material> = {};
  for (const outfit of SOLDIER_OUTFITS) for (let variant = 0; variant < UNIFORM_VARIANTS; variant += 1) materials[`${outfit}-${variant}`] = new THREE.MeshBasicMaterial({ name: `${outfit}-${variant}` });
  return { scene, clips: new Map(), materials, clone: (object: THREE.Object3D) => object.clone(true) } as unknown as SoldierAsset;
}

/** What a picture holds: each man's place, uniform and weapon props. */
function signature(group: THREE.Group): string[] {
  return group.children.map((man) => {
    const material = ((man.getObjectByName('Soldier') as THREE.Mesh).material as THREE.Material).name;
    const props: string[] = [];
    man.traverse((child) => {
      if (child.name.startsWith('Weapon') && child.visible) props.push(child.name);
    });
    return `${man.name} ${material} ${man.position.x},${man.position.z} ${props.join('+')}`;
  });
}

describe('section thumbnails (1.1)', () => {
  it('a rifle section and a machine-gun section make different pictures, and the gun is in its scene', () => {
    const rifles = buildSectionScene('fuzileiros', asset());
    const gun = buildSectionScene('metralhadora', asset());
    expect(signature(rifles)).not.toEqual(signature(gun));
    expect(rifles.children).toHaveLength(4);
    expect(signature(rifles).join()).not.toContain('WeaponGun');
    expect(gun.children[0]!.getObjectByName('WeaponGun')?.visible).toBe(true);
    expect(gun.children).toHaveLength(2);
  });

  it("each man wears his army's uniform, the officer his own, and leads", () => {
    expect(sectionComposition('comando')[0]).toMatchObject({ role: 'officer', outfit: 'coluna-officer', weapon: 'revolver' });
    expect(sectionComposition('comando')[1]!.outfit).toBe('coluna-troop');
    expect(new Set(sectionComposition('infantaria-exercito').map((man) => man.outfit))).toEqual(new Set(['legalista-troop']));
    // improve-soldier-models 4.4: the sertao's men in their own leather.
    expect(new Set(sectionComposition('jaguncos').map((man) => man.outfit))).toEqual(new Set(['jagunco-troop']));
    expect(new Set(sectionComposition('cangaceiros').map((man) => man.outfit))).toEqual(new Set(['cangaceiro-troop']));
    // The leader stands in front (nearest the camera, which looks along +z).
    for (const id of Object.keys(SECTION_TYPES) as SectionTypeId[]) {
      const [leader, ...rest] = sectionComposition(id);
      for (const man of rest) expect(leader!.z, id).toBeLessThan(man.z);
    }
  });

  it("every weapon of a type shows before a second man of the same weapon", () => {
    expect(sectionComposition('esquadra-5').map((man) => man.weapon)).toContain('fuzil-automatico-7mm');
    expect(new Set(sectionComposition('provisorios').map((man) => man.weapon))).toEqual(new Set(['mauser-7mm', 'winchester-44']));
    expect(signature(buildSectionScene('esquadra-5', asset())).join()).toContain('WeaponAutomatic');
  });

  it('the same type gives the same picture on every run', () => {
    expect(signature(buildSectionScene('provisorios', asset()))).toEqual(signature(buildSectionScene('provisorios', asset())));
  });
});
