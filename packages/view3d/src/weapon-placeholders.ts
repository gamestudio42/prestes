import * as THREE from 'three';
import { getWeapon, type WeaponId } from '@prestes/shared';

/**
 * pre-battle-roster 5.4: the weapon a soldier model shows, by kind. The
 * soldier's Mauser is part of its skinned mesh, on the `rifle` bone, so the
 * other weapons are drawn by scaling that bone (shorter for the Winchester,
 * gone for the revolver and the machine gun) and by small named placeholder
 * meshes: `placeholder:revolver` in the right hand, `placeholder:fuzil-automatico`
 * (a bipod under the muzzle) and `placeholder:metralhadora` (the gun on its
 * tripod, on the ground before the gunner while it is set). Not finished art.
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

/** The rifle bone's scale per look: a shorter rifle, or none in the hands. */
const RIFLE_SCALE: Readonly<Record<WeaponLook, readonly [number, number, number]>> = {
  rifle: [1, 1, 1],
  carbine: [1, 0.75, 1],
  pistol: [0.001, 0.001, 0.001],
  automatic: [1, 1, 1],
  gun: [0.001, 0.001, 0.001],
};

const METAL = new THREE.MeshLambertMaterial({ color: 0x3a3a38 });
const WOOD = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
const BOX = new THREE.BoxGeometry(1, 1, 1);

function box(material: THREE.Material, size: [number, number, number], at: [number, number, number], tilt = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(BOX, material);
  mesh.scale.set(...size);
  mesh.position.set(...at);
  mesh.rotation.z = tilt;
  return mesh;
}

/** A revolver in the right hand (forearm bone space; the hand is at its tip). */
function revolver(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'placeholder:revolver';
  // Oversized a little so it reads at tactical zoom.
  group.add(box(METAL, [0.05, 0.07, 0.22], [0, 0.31, 0.1]));
  group.add(box(WOOD, [0.05, 0.11, 0.06], [0, 0.28, 0.01]));
  return group;
}

/** Two bipod legs folded under the muzzle (rifle bone space, the barrel along +y). */
function bipod(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'placeholder:fuzil-automatico';
  group.add(box(METAL, [0.04, 0.34, 0.04], [0.07, 0.72, 0.07], 0.3));
  group.add(box(METAL, [0.04, 0.34, 0.04], [-0.07, 0.72, 0.07], -0.3));
  group.add(box(METAL, [0.07, 0.12, 0.06], [0, 0.55, 0.02]));
  return group;
}

/** The machine gun on its tripod (soldier space, metres; the model faces -z, so it points along -z). */
function tripodGun(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'placeholder:metralhadora';
  group.add(box(METAL, [0.14, 0.18, 0.5], [0, 0.42, -0.55]));
  group.add(box(METAL, [0.05, 0.05, 0.55], [0, 0.45, -1.05]));
  group.add(box(METAL, [0.08, 0.2, 0.03], [0.07, 0.48, -0.5]));
  for (const [x, z, tiltX, tiltZ] of [
    [0, -0.85, -0.45, 0],
    [0.22, -0.38, 0.3, 0.35],
    [-0.22, -0.38, 0.3, -0.35],
  ] as const) {
    const leg = box(METAL, [0.03, 0.45, 0.03], [x, 0.2, z]);
    leg.rotation.set(tiltX, 0, tiltZ);
    group.add(leg);
  }
  return group;
}

/** The weapon props of one soldier model. */
export class WeaponProps {
  private readonly rifleBone: THREE.Object3D | null;
  private readonly hand: THREE.Object3D | null;
  private pistol: THREE.Group | null = null;
  private bipod: THREE.Group | null = null;
  private gun: THREE.Group | null = null;
  private look: WeaponLook = 'rifle';

  constructor(private readonly root: THREE.Object3D) {
    this.rifleBone = root.getObjectByName('rifle') ?? null;
    // GLTFLoader strips the dot from node names (`forearm.R` is `forearmR`).
    this.hand = root.getObjectByName('forearmR') ?? root.getObjectByName('forearm.R') ?? null;
  }

  /** Called after the mixer: the clips would otherwise reset the rifle bone. */
  apply(id: WeaponId, gunSet: boolean, standing: boolean): void {
    const look = weaponLook(id);
    if (look !== this.look) {
      this.look = look;
      if (look === 'pistol' && !this.pistol && this.hand) this.hand.add((this.pistol = revolver()));
      if (look === 'automatic' && !this.bipod && this.rifleBone) this.rifleBone.add((this.bipod = bipod()));
      if (look === 'gun' && !this.gun) this.root.add((this.gun = tripodGun()));
    }
    this.rifleBone?.scale.set(...RIFLE_SCALE[look]);
    if (this.pistol) this.pistol.visible = look === 'pistol';
    if (this.bipod) this.bipod.visible = look === 'automatic';
    // Carried (hidden) while it is moved; on the ground before him once set.
    if (this.gun) this.gun.visible = look === 'gun' && gunSet && standing;
  }

  state(): { look: WeaponLook; shown: string[] } {
    const shown = [this.pistol, this.bipod, this.gun].filter((prop) => prop?.visible).map((prop) => prop!.name);
    // The Winchester is the soldier's own rifle, shortened: no mesh of its own.
    if (this.look === 'carbine') shown.push('placeholder:winchester');
    return { look: this.look, shown };
  }
}
