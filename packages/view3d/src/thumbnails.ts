import * as THREE from 'three';
import { propPreview } from './battle-map-layer';
import { loadEnvironmentAsset, type EnvironmentAsset } from './environment-models';
import { PALETTE } from './palette';
import { ARMIES, SECTION_TYPES, type SectionMan, type SectionRole, type SectionTypeId, type WeaponId } from '@prestes/shared';
import { UNIFORM_VARIANTS, type SoldierClip, type SoldierOutfit } from './soldier-clips';
import { loadSoldierAsset, SoldierInstance, type SoldierAsset } from './soldier-models';
import { weaponLook, WeaponProps } from './weapon-placeholders';

/**
 * refine-map-editor 5.1: small pictures of props (the trees tool's species
 * list), drawn by the same models or placeholders the battle layer uses,
 * from a three-quarter view on a transparent ground.
 */
export async function renderThumbnails(models: readonly string[], size = 64, base = './models/'): Promise<Map<string, string>> {
  let asset: EnvironmentAsset | null = null;
  try {
    asset = await loadEnvironmentAsset(base);
  } catch {
    // Without the models every prop shows its placeholder.
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(new THREE.HemisphereLight(PALETTE.skyLight, PALETTE.groundLight, 1.6));
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(-3, 6, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  const pictures = new Map<string, string>();
  try {
    for (const model of models) {
      const object = propPreview(model, asset);
      if (!object) continue;
      scene.add(object);
      const box = new THREE.Box3().setFromObject(object);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const distance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.05;
      camera.position.copy(sphere.center).add(new THREE.Vector3(0.7, 0.45, 0.7).normalize().multiplyScalar(distance));
      camera.lookAt(sphere.center);
      renderer.render(scene, camera);
      pictures.set(model, renderer.domElement.toDataURL('image/png'));
      scene.remove(object);
    }
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return pictures;
}

/**
 * troop-thumbnails-and-panel 1.1 (D3): a section type's picture. Up to four
 * men in a tight group with the leader in front (the officer of a command
 * section), each in his army's uniform with his own weapon; a crew-served
 * gun shows the gun on its tripod and two of its crew. Camera, light and
 * spacing are fixed so the whole set reads as one family.
 */
export interface SectionFigure {
  role: SectionRole;
  weapon: WeaponId;
  outfit: SoldierOutfit;
  variant: number;
  /** Metres in the picture's ground plane; the men face -z, toward the camera. */
  x: number;
  z: number;
  clip: SoldierClip;
}

/** Spots for the group, front first (metres). */
const GROUP_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [0, -0.55],
  [-0.75, 0.05],
  [0.75, 0.1],
  [0.05, 0.75],
];
/** The gun on its tripod in front, the gunner behind it, a loader at his side. */
const GUN_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [-0.3, 0.3],
  [0.5, 0.55],
];

export function sectionComposition(typeId: SectionTypeId): SectionFigure[] {
  const type = SECTION_TYPES[typeId];
  const uniform = ARMIES[type.army].uniform;
  const gunner = type.men.find((man) => weaponLook(man.weapon) === 'gun');
  let chosen: SectionMan[];
  if (gunner) {
    chosen = [gunner, type.men.find((man) => man !== gunner) ?? gunner];
  } else {
    const leader = type.men.find((man) => man.role === 'officer') ?? type.men[0]!;
    // Every weapon of the type shows before a second man of the same weapon.
    const rest = type.men.filter((man) => man !== leader);
    const distinct = rest.filter((man, at) => man.weapon !== leader.weapon && rest.findIndex((other) => other.weapon === man.weapon) === at);
    chosen = [leader, ...distinct, ...rest.filter((man) => !distinct.includes(man))].slice(0, GROUP_SPOTS.length);
  }
  const spots = gunner ? GUN_SPOTS : GROUP_SPOTS;
  return chosen.map((man, at) => ({
    role: man.role,
    weapon: man.weapon,
    outfit: `${uniform}-${man.role === 'officer' ? 'officer' : 'troop'}`,
    // A fixed spread of the three uniform variants, the same on every run.
    variant: at % UNIFORM_VARIANTS,
    x: spots[at]![0],
    z: spots[at]![1],
    clip: gunner ? 'crouch-idle' : 'idle-ready',
  }));
}

/** The posed group of one type, ready to render (and to inspect in tests). */
export function buildSectionScene(typeId: SectionTypeId, asset: SoldierAsset): THREE.Group {
  const group = new THREE.Group();
  group.name = `section:${typeId}`;
  for (const figure of sectionComposition(typeId)) {
    const soldier = new SoldierInstance(asset, figure.outfit, figure.variant);
    soldier.play(figure.clip);
    soldier.update(0.4);
    // After the mixer: the clips would otherwise reset the rifle bone.
    new WeaponProps(soldier.root).apply(figure.weapon, true, true);
    soldier.root.position.set(figure.x, 0, figure.z);
    soldier.root.name = `man:${figure.role}:${figure.weapon}`;
    // Not disposed: stopping the mixer would put him back in the bind pose.
    group.add(soldier.root);
  }
  return group;
}

/** Fixed framing for every type: a three-quarter view from the front left. */
const SECTION_TARGET = new THREE.Vector3(0, 0.78, 0.1);
const SECTION_CAMERA = new THREE.Vector3(-3.4, 2.3, -5.6);

/** Renders each type to a PNG data URL (the `pnpm thumbs` page calls this). */
export async function renderSectionThumbnails(typeIds: readonly SectionTypeId[], size = 96, base = './models/'): Promise<Map<SectionTypeId, string>> {
  const asset = await loadSoldierAsset(base);
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  scene.add(new THREE.HemisphereLight(PALETTE.skyLight, PALETTE.groundLight, 1.4));
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.8);
  sun.position.set(-4, 7, -5);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(19, 1, 0.1, 100);
  camera.position.copy(SECTION_CAMERA);
  camera.lookAt(SECTION_TARGET);
  const pictures = new Map<SectionTypeId, string>();
  try {
    for (const typeId of typeIds) {
      const group = buildSectionScene(typeId, asset);
      scene.add(group);
      renderer.render(scene, camera);
      pictures.set(typeId, renderer.domElement.toDataURL('image/png'));
      scene.remove(group);
    }
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return pictures;
}
