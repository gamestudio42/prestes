import * as THREE from 'three';
import {
  clipFade,
  GEAR_PIECES,
  headgear,
  HELD_CLIPS,
  missingClips,
  SOLDIER_OUTFITS,
  UNIFORM_VARIANTS,
  type GearPiece,
  type Headgear,
  type SoldierClip,
  type WoundSide,
  type SoldierOutfit,
} from './soldier-clips';
import { toonGradient } from './materials';

/**
 * The Blender-built soldier (art-src/blender/target_soldier.py), loaded once
 * and cloned per unit. Each clone has its own animation mixer; the outfits
 * share the geometry and differ by texture, hat and gear
 * (improve-soldier-models 4.x). Each body and hat has a far mesh on the same
 * skeleton (`<mesh>Far`), so the swap is a visibility change (3.4).
 */
export interface SoldierAsset {
  scene: THREE.Group;
  clips: Map<string, THREE.AnimationClip>;
  /** 3.3: by outfit and variant, `<outfit>-<n>`. */
  materials: Record<string, THREE.Material>;
  /** Skeleton-aware clone (three's SkeletonUtils, loaded with the asset). */
  clone: (source: THREE.Object3D) => THREE.Object3D;
}

const OUTFITS = SOLDIER_OUTFITS;

function pixelTexture(texture: THREE.Texture): THREE.Texture {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * prepare-online-release D2: the soldier is fetched once per page and shared
 * by every scene, the thumbnails and the battle preload; a failed load may be
 * asked for again.
 */
const soldiers = new Map<string, Promise<SoldierAsset>>();
export function loadSoldierAsset(base = './models/'): Promise<SoldierAsset> {
  let pending = soldiers.get(base);
  if (!pending) {
    const loading = fetchSoldierAsset(base);
    loading.catch(() => {
      if (soldiers.get(base) === loading) soldiers.delete(base);
    });
    soldiers.set(base, loading);
    pending = loading;
  }
  return pending;
}

/**
 * improve-soldier-models 6.1 (D7): starts fetching the soldier when a
 * briefing or the skirmish setup opens, so it is in flight before the
 * battle; the battle's preload then finds it cached. A failure is left for
 * the preload to retry.
 */
export function prefetchSoldier(base = './models/'): void {
  loadSoldierAsset(base).catch(() => undefined);
}

async function fetchSoldierAsset(base: string): Promise<SoldierAsset> {
  // The loaders are a separate chunk, fetched only when models are wanted.
  const [{ GLTFLoader }, { clone }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/utils/SkeletonUtils.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  // improve-soldier-models 1.2: the soldier is meshopt-compressed (pnpm models).
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${base}soldier.glb`);
  const textureLoader = new THREE.TextureLoader();
  const materials: Record<string, THREE.Material> = {};
  const gradientMap = toonGradient();
  await Promise.all(
    OUTFITS.flatMap((outfit) =>
      Array.from({ length: UNIFORM_VARIANTS }, async (_, variant) => {
        const map = pixelTexture(await textureLoader.loadAsync(`${base}textures/soldier-${outfit}-${variant}.png`));
        materials[`${outfit}-${variant}`] = new THREE.MeshToonMaterial({ map, gradientMap });
      }),
    ),
  );
  const missing = missingClips(gltf.animations.map((clip) => clip.name));
  // A test fails the build on this; at run time the soldier just holds his pose.
  if (missing.length > 0) console.error(`soldier.glb lacks clips: ${missing.join(', ')}`);
  return {
    scene: gltf.scene,
    clips: new Map(gltf.animations.map((clip) => [clip.name, clip])),
    materials,
    clone,
  };
}

/** 3.4: the blood patch: a thin slab on the side of the tunic (metres, bone space). */
const BLOOD_OFFSET = 0.195;
const BLOOD_GEOMETRY = new THREE.BoxGeometry(0.02, 0.15, 0.13);
const BLOOD_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x6e2820 });

/** The mesh of each hat in `soldier.glb`. */
const HAT_MESH: Readonly<Record<Headgear, string>> = { slouch: 'Slouch', kepi: 'Kepi', leather: 'LeatherHat', halfmoon: 'Halfmoon' };
const gearMesh = (piece: GearPiece): string => `Gear${piece[0]!.toUpperCase()}${piece.slice(1)}`;

/** The suffix of the clips a man with a revolver plays in his own way (1.4). */
export const PISTOL_SUFFIX = '-pistol';

/** One soldier: a skinned clone, its mixer and the clip it is playing. */
export class SoldierInstance {
  readonly root: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current: SoldierClip | null = null;
  /** 3.4: the blood on the side of his wound, made when first needed. */
  private blood: THREE.Mesh | null = null;
  private readonly near: THREE.Object3D[] = [];
  private readonly far: THREE.Object3D[] = [];
  private isFar = false;
  private pistol = false;
  private timeScale = 1;
  /** 2.1-2.2: seconds not yet given to the mixer, and the half-rate beat. */
  private pending = 0;
  private beat = false;

  /** `gear`: the pieces he carries (`soldierGear`); the rest stay hidden. */
  constructor(asset: SoldierAsset, outfit: SoldierOutfit, variant = 0, gear: ReadonlySet<GearPiece> = new Set()) {
    this.root = asset.clone(asset.scene);
    this.root.traverse((child) => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.material = asset.materials[`${outfit}-${variant}`]!;
      mesh.frustumCulled = false;
    });
    const hat = HAT_MESH[headgear(outfit)];
    const near = new Set(['Soldier', hat, ...[...gear].map(gearMesh)]);
    const far = new Set(['SoldierFar', `${hat}Far`]);
    const optional = ['Soldier', 'SoldierFar', ...Object.values(HAT_MESH).flatMap((name) => [name, `${name}Far`]), ...GEAR_PIECES.map(gearMesh)];
    for (const name of optional) {
      const object = this.root.getObjectByName(name);
      if (!object) continue;
      object.visible = near.has(name);
      if (near.has(name)) this.near.push(object);
      if (far.has(name)) this.far.push(object);
    }
    this.mixer = new THREE.AnimationMixer(this.root);
    for (const [name, clip] of asset.clips) {
      const action = this.mixer.clipAction(clip);
      if (HELD_CLIPS.has(name.replace(PISTOL_SUFFIX, '') as SoldierClip)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(name, action);
    }
  }

  /** 3.4: the far body and hat (fewer triangles) or the near ones and the gear. */
  setFar(far: boolean): void {
    if (far === this.isFar) return;
    this.isFar = far;
    for (const object of this.near) object.visible = !far;
    for (const object of this.far) object.visible = far;
  }

  get drawnFar(): boolean {
    return this.isFar;
  }

  /**
   * 1.4: a man with a revolver plays `<clip>-pistol` where the model has one
   * (the arm out with the gun, the left hand free).
   */
  setPistol(pistol: boolean): void {
    if (pistol === this.pistol) return;
    this.pistol = pistol;
    const clip = this.current;
    if (clip) {
      this.current = null;
      this.play(clip, this.timeScale);
    }
  }

  /** The revolver is in his hand: his clip has a revolver variant. */
  get holdsPistol(): boolean {
    return this.pistol && this.current !== null && this.actions.has(this.current + PISTOL_SUFFIX);
  }

  private action(clip: SoldierClip): THREE.AnimationAction | undefined {
    return (this.pistol ? this.actions.get(clip + PISTOL_SUFFIX) : undefined) ?? this.actions.get(clip);
  }

  play(clip: SoldierClip, timeScale = 1): void {
    const next = this.action(clip);
    if (!next) return;
    next.timeScale = timeScale;
    this.timeScale = timeScale;
    if (clip === this.current) return;
    const previous = this.current ? this.action(this.current) : undefined;
    // soldier-animation 2.3: a fixed short cross-fade; a death cuts in at once.
    const fade = clipFade(clip);
    if (fade === 0) {
      for (const action of this.actions.values()) if (action !== next) action.stop();
      next.reset().setEffectiveWeight(1).play();
    } else {
      next.reset().setEffectiveWeight(1).fadeIn(fade).play();
      previous?.fadeOut(fade);
    }
    this.current = clip;
  }

  /**
   * 3.4: blood on his tunic on the side of his wound (+1 his right, -1 his
   * left), or none. It rides on the chest bone, so it follows every clip.
   */
  setWound(side: WoundSide | null): void {
    if (side === null) {
      if (this.blood) this.blood.visible = false;
      return;
    }
    if (!this.blood) {
      const chest = this.root.getObjectByName('chest');
      if (!chest) return;
      this.blood = new THREE.Mesh(BLOOD_GEOMETRY, BLOOD_MATERIAL);
      this.blood.name = 'blood-overlay';
      chest.add(this.blood);
    }
    // Bone space: x across the body, y up the chest from the waist.
    this.blood.position.set(side * BLOOD_OFFSET, 0.1, 0.02);
    this.blood.visible = true;
  }

  /** The side his blood shows on, or null (tests and dev checks). */
  get woundSide(): WoundSide | null {
    return this.blood?.visible ? (this.blood.position.x > 0 ? 1 : -1) : null;
  }

  /** The clip of a fire burst restarts on each shot. */
  retrigger(clip: SoldierClip): void {
    const action = this.action(clip);
    if (action && this.current === clip) action.reset().play();
  }

  /** Actions currently weighing on the pose (dev checks). */
  activeClips(): Array<{ clip: string; weight: number }> {
    return [...this.actions]
      .filter(([, action]) => action.isScheduled())
      .map(([clip, action]) => ({ clip, weight: Math.round(action.getEffectiveWeight() * 100) / 100 }));
  }

  get playing(): string | null {
    return this.current;
  }

  update(seconds: number): void {
    this.mixer.update(seconds);
  }

  /**
   * improve-soldier-models 2.1-2.2: off screen the mixer is not advanced and
   * the time is kept; drawn far, it is advanced every other frame. The kept
   * time is given in one update, so a man who lay down unseen is drawn lying.
   * Returns whether the mixer was advanced.
   */
  advance(seconds: number, onScreen: boolean, halfRate = false): boolean {
    this.pending += seconds;
    if (!onScreen) return false;
    if (halfRate) {
      this.beat = !this.beat;
      if (!this.beat) return false;
    }
    this.mixer.update(this.pending);
    this.pending = 0;
    return true;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
