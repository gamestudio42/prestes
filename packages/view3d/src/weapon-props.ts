import type * as THREE from 'three';
import { getWeapon, type WeaponId } from '@prestes/shared';

/**
 * improve-soldier-models 1.4: the weapon a soldier shows, by kind. Each is
 * its own mesh in `soldier.glb` (art-src/blender/soldier_parts.py): the
 * Mauser, a lever-action carbine, an automatic rifle with its bipod, a
 * revolver and its holster, and the machine gun on its tripod. The long arms
 * ride the rifle bone, so they follow the hands; the revolver is in the hand
 * while the hands hold a weapon and in its holster otherwise; the gun stands
 * on the ground before the gunner while it is set and is hidden while carried.
 */
export type WeaponLook = 'rifle' | 'carbine' | 'pistol' | 'automatic' | 'gun';

export function weaponLook(id: WeaponId): WeaponLook {
  switch (getWeapon(id)?.kind) {
    case 'lever-rifle':
      return 'carbine';
    case 'pistol':
      return 'pistol';
    case 'automatic-rifle':
      return 'automatic';
    case 'machine-gun':
      return 'gun';
    default:
      return 'rifle';
  }
}

/** The mesh names of the weapons, as the glTF loader names them. */
export const WEAPON_MESHES = ['WeaponMauser', 'WeaponWinchester', 'WeaponAutomatic', 'WeaponRevolver', 'WeaponHolster', 'WeaponGun'] as const;
export type WeaponMesh = (typeof WEAPON_MESHES)[number];

const LONG_ARM: Readonly<Partial<Record<WeaponLook, WeaponMesh>>> = {
  rifle: 'WeaponMauser',
  carbine: 'WeaponWinchester',
  automatic: 'WeaponAutomatic',
};

/** The weapon props of one soldier model. */
export class WeaponProps {
  private readonly meshes = new Map<WeaponMesh, THREE.Object3D>();
  private look: WeaponLook = 'rifle';

  constructor(root: THREE.Object3D) {
    for (const name of WEAPON_MESHES) {
      const mesh = root.getObjectByName(name);
      if (mesh) this.meshes.set(name, mesh);
    }
  }

  /**
   * `gunSet`: the crew has set the gun; `standing`: the man is up and
   * fighting; `handsOn`: his clip holds a weapon in his hands.
   */
  apply(id: WeaponId, gunSet: boolean, standing: boolean, handsOn = true): void {
    this.look = weaponLook(id);
    const shown = new Set<WeaponMesh>();
    const long = LONG_ARM[this.look];
    if (long) shown.add(long);
    if (this.look === 'pistol') shown.add(handsOn ? 'WeaponRevolver' : 'WeaponHolster');
    if (this.look === 'gun' && gunSet && standing) shown.add('WeaponGun');
    for (const [name, mesh] of this.meshes) mesh.visible = shown.has(name);
  }

  state(): { look: WeaponLook; shown: WeaponMesh[] } {
    return { look: this.look, shown: [...this.meshes].filter(([, mesh]) => mesh.visible).map(([name]) => name) };
  }
}
