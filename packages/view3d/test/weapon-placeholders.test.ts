import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WeaponProps, weaponLook } from '../src/weapon-placeholders';

// pre-battle-roster 5.4: the weapon a soldier model shows, by kind.

function soldier(): { root: THREE.Object3D; rifle: THREE.Object3D } {
  const root = new THREE.Group();
  const rifle = new THREE.Bone();
  rifle.name = 'rifle';
  const hand = new THREE.Bone();
  hand.name = 'forearmR';
  root.add(rifle, hand);
  return { root, rifle };
}

describe('weapon placeholders', () => {
  it('maps each weapon to its look', () => {
    expect(weaponLook('mauser-7mm')).toBe('rifle');
    expect(weaponLook('winchester-44')).toBe('carbine');
    expect(weaponLook('revolver')).toBe('pistol');
    expect(weaponLook('fuzil-automatico-7mm')).toBe('automatic');
    expect(weaponLook('metralhadora-7mm')).toBe('gun');
  });

  it('shows the gun on its tripod only while it is set and the gunner stands', () => {
    const { root, rifle } = soldier();
    const props = new WeaponProps(root);
    props.apply('metralhadora-7mm', false, true);
    expect(props.state().shown).toEqual([]);
    expect(rifle.scale.x).toBeLessThan(0.01);
    props.apply('metralhadora-7mm', true, true);
    expect(props.state().shown).toEqual(['placeholder:metralhadora']);
    props.apply('metralhadora-7mm', true, false);
    expect(props.state().shown).toEqual([]);
  });

  it('puts a revolver in the officer hand, a bipod on the automatic rifle and shortens the Winchester', () => {
    const officer = soldier();
    const pistol = new WeaponProps(officer.root);
    pistol.apply('revolver', false, true);
    expect(pistol.state().shown).toEqual(['placeholder:revolver']);
    expect(officer.rifle.scale.y).toBeLessThan(0.01);

    const gunner = soldier();
    const automatic = new WeaponProps(gunner.root);
    automatic.apply('fuzil-automatico-7mm', false, true);
    expect(automatic.state().shown).toEqual(['placeholder:fuzil-automatico']);

    const irregular = soldier();
    const carbine = new WeaponProps(irregular.root);
    carbine.apply('winchester-44', false, true);
    expect(carbine.state().shown).toEqual(['placeholder:winchester']);
    expect(irregular.rifle.scale.y).toBeCloseTo(0.75);

    // A crewman who takes the gun drops his rifle look.
    const crew = soldier();
    const taken = new WeaponProps(crew.root);
    taken.apply('mauser-7mm', false, true);
    expect(crew.rifle.scale.y).toBe(1);
    taken.apply('metralhadora-7mm', true, true);
    expect(taken.state()).toEqual({ look: 'gun', shown: ['placeholder:metralhadora'] });
  });
});
