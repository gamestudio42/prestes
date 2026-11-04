import * as THREE from 'three';
import { HELD_CLIPS, type SoldierClip, type SoldierOutfit } from './soldier-clips';
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
  materials: Record<SoldierOutfit, THREE.Material>;
  /** Skeleton-aware clone (three's SkeletonUtils, loaded with the asset). */
  clone: (source: THREE.Object3D) => THREE.Object3D;
}

const OUTFITS: readonly SoldierOutfit[] = ['column', 'legalist', 'officer'];

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
  const materials = {} as Record<SoldierOutfit, THREE.Material>;
  for (const outfit of OUTFITS) {
    const map = pixelTexture(await textureLoader.loadAsync(`${base}textures/soldier-${outfit}.png`));
    materials[outfit] = new THREE.MeshToonMaterial({ map, gradientMap: toonGradient() });
  }
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

  constructor(asset: SoldierAsset, outfit: SoldierOutfit) {
    this.root = asset.clone(asset.scene);
    this.root.traverse((child) => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.material = asset.materials[outfit];
      mesh.frustumCulled = false;
      if (mesh.name.startsWith('Kepi')) mesh.visible = outfit !== 'column';
      if (mesh.name.startsWith('Slouch')) mesh.visible = outfit === 'column';
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
    // From the stagger to the ground the blend is the fall itself: slower.
    const falling = this.current === 'hit' && (clip === 'corpse' || clip === 'wounded');
    const fade = falling ? 0.5 : 0.15;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    previous?.fadeOut(fade);
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
