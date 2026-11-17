import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WEAPON_MESHES, WeaponProps, weaponLook } from '../src/weapon-props';

// improve-soldier-models 1.4: each weapon kind shows its own mesh and no other.

function soldier(): THREE.Object3D {
  const root = new THREE.Group();
  for (const name of WEAPON_MESHES) {
    const mesh = new THREE.Mesh();
    mesh.name = name;
    root.add(mesh);
  }
  return root;
}

describe('weapon props', () => {
  it('maps each weapon to its look', () => {
    expect(weaponLook('mauser-7mm')).toBe('rifle');
    expect(weaponLook('winchester-44')).toBe('carbine');
    expect(weaponLook('revolver')).toBe('pistol');
    expect(weaponLook('fuzil-automatico-7mm')).toBe('automatic');
    expect(weaponLook('metralhadora-7mm')).toBe('gun');
  });

  it('each long arm shows only its own mesh', () => {
    for (const [id, mesh] of [
      ['mauser-7mm', 'WeaponMauser'],
      ['winchester-44', 'WeaponWinchester'],
      ['fuzil-automatico-7mm', 'WeaponAutomatic'],
    ] as const) {
      const props = new WeaponProps(soldier());
      props.apply(id, false, true);
      expect(props.state().shown).toEqual([mesh]);
    }
  });

  it('a revolver hides every long arm: in the hand while the hands hold it, else holstered', () => {
    const props = new WeaponProps(soldier());
    props.apply('revolver', false, true, true);
    expect(props.state().shown).toEqual(['WeaponRevolver']);
    props.apply('revolver', false, true, false);
    expect(props.state().shown).toEqual(['WeaponHolster']);
  });

  it('shows the gun on its tripod only while it is set and the gunner stands', () => {
    const props = new WeaponProps(soldier());
    props.apply('metralhadora-7mm', false, true);
    expect(props.state().shown).toEqual([]);
    props.apply('metralhadora-7mm', true, true);
    expect(props.state().shown).toEqual(['WeaponGun']);
    props.apply('metralhadora-7mm', true, false);
    expect(props.state().shown).toEqual([]);
  });

  it('a crewman who takes the gun puts down his rifle', () => {
    const props = new WeaponProps(soldier());
    props.apply('mauser-7mm', false, true);
    props.apply('metralhadora-7mm', true, true);
    expect(props.state()).toEqual({ look: 'gun', shown: ['WeaponGun'] });
  });
});
