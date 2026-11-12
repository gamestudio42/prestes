import * as THREE from 'three';
import { clipFade, HELD_CLIPS, missingClips, SOLDIER_OUTFITS, UNIFORM_VARIANTS, wearsKepi, type SoldierClip, type SoldierOutfit } from './soldier-clips';
import { toonGradient } from './materials';

/**
 * The Blender-built soldier (art-src/blender/target_soldier.py), loaded once
 * and cloned per unit. Each clone has its own animation mixer; the outfits
 * share the geometry and differ by texture, the column wearing the slouch
 * hat and the others the kepi.
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

export async function loadSoldierAsset(base = './models/'): Promise<SoldierAsset> {
  // The loaders are a separate chunk, fetched only when models are wanted.
  const [{ GLTFLoader }, { clone }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/utils/SkeletonUtils.js'),
  ]);
  const gltf = await new GLTFLoader().loadAsync(`${base}soldier.glb`);
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

/** One soldier: a skinned clone, its mixer and the clip it is playing. */
export class SoldierInstance {
  readonly root: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current: SoldierClip | null = null;

  constructor(asset: SoldierAsset, outfit: SoldierOutfit, variant = 0) {
    this.root = asset.clone(asset.scene);
    this.root.traverse((child) => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.material = asset.materials[`${outfit}-${variant}`]!;
      mesh.frustumCulled = false;
      if (mesh.name.startsWith('Kepi')) mesh.visible = wearsKepi(outfit);
      if (mesh.name.startsWith('Slouch')) mesh.visible = !wearsKepi(outfit);
    });
    this.mixer = new THREE.AnimationMixer(this.root);
    for (const [name, clip] of asset.clips) {
      const action = this.mixer.clipAction(clip);
      if (HELD_CLIPS.has(name as SoldierClip)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(name, action);
    }
  }

  play(clip: SoldierClip, timeScale = 1): void {
    const next = this.actions.get(clip);
    if (!next) return;
    next.timeScale = timeScale;
    if (clip === this.current) return;
    const previous = this.current ? this.actions.get(this.current) : undefined;
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

  /** The clip of a fire burst restarts on each shot. */
  retrigger(clip: SoldierClip): void {
    const action = this.actions.get(clip);
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

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
