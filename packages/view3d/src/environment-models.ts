import * as THREE from 'three';
import { terrainHeightAt } from '@prestes/shared';
import { toonGradient } from './materials';

/**
 * The Blender-built environment (art-src/blender/target_{buildings,
 * fortifications,vegetation,props}.py): one geometry per named model, all
 * sharing the environment pixel atlas. Layers place them as instanced meshes
 * once the models load; if loading fails, those pieces are not drawn.
 */
export interface EnvironmentAsset {
  geometry(name: string): THREE.BufferGeometry | undefined;
  /** The atlas material most models share. */
  readonly material: THREE.Material;
  /** A model's own material: the atlas, or vertex colours for the trees. */
  materialOf(name: string): THREE.Material;
}

/**
 * The trees (refine-map-editor D8, from the owner's Refloreste models) load
 * last, so their broad-leaved tree and araucaria replace the older ones; they
 * are coloured per vertex, not by the atlas.
 */
const FILES = ['buildings', 'fortifications', 'vegetation', 'props', 'trees'];
const VERTEX_COLOURED = new Set(['trees']);

export async function loadEnvironmentAsset(base = './models/'): Promise<EnvironmentAsset> {
  // The loader is a separate chunk, fetched only when models are wanted.
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const [map, ...scenes] = await Promise.all([
    new THREE.TextureLoader().loadAsync(`${base}textures/environment.png`),
    ...FILES.map((file) => loader.loadAsync(`${base}${file}.glb`).then((gltf) => gltf.scene)),
  ]);
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;
  map.needsUpdate = true;

  const geometries = new Map<string, THREE.BufferGeometry>();
  const coloured = new Set<string>();
  for (const [index, scene] of scenes.entries()) {
    const byVertex = VERTEX_COLOURED.has(FILES[index]!);
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Bake the node transform so every model sits in its own Blender frame.
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      geometry.computeBoundingSphere();
      geometries.set(mesh.name, geometry);
      if (byVertex) coloured.add(mesh.name);
      else coloured.delete(mesh.name);
      mesh.geometry.dispose();
    });
  }
  const material = new THREE.MeshToonMaterial({ map, gradientMap: toonGradient() });
  // Double-sided: the buriti's fronds are open sheets (hand check 2026-11-09: they vanished from behind).
  const vertexMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide });
  return {
    geometry: (name) => geometries.get(name),
    material,
    materialOf: (name) => (coloured.has(name) ? vertexMaterial : material),
  };
}

/**
 * Collects model placements and turns them into one instanced mesh per model.
 * Positions are simulation ground points (x, y); `rotation` is the
 * simulation heading, which the view turns by its negative.
 */
export class ModelPlacements {
  private readonly matrices = new Map<string, THREE.Matrix4[]>();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private static readonly up = new THREE.Vector3(0, 1, 0);

  add(name: string, x: number, y: number, rotation = 0, scale: number | THREE.Vector3 = 1, lift = 0): void {
    this.position.set(x, terrainHeightAt(x, y) + lift, y);
    this.quaternion.setFromAxisAngle(ModelPlacements.up, -rotation);
    if (typeof scale === 'number') this.scale.setScalar(scale);
    else this.scale.copy(scale);
    const matrix = new THREE.Matrix4().compose(this.position, this.quaternion, this.scale);
    const list = this.matrices.get(name) ?? [];
    list.push(matrix);
    this.matrices.set(name, list);
  }

  /** The names placed so far that the asset has no geometry for. */
  missing(asset: EnvironmentAsset): string[] {
    return [...this.matrices.keys()].filter((name) => !asset.geometry(name));
  }

  build(asset: EnvironmentAsset): THREE.Group {
    const group = new THREE.Group();
    for (const [name, list] of this.matrices) {
      const geometry = asset.geometry(name);
      if (!geometry) continue;
      const mesh = new THREE.InstancedMesh(geometry, asset.materialOf(name), list.length);
      list.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.name = name;
      group.add(mesh);
    }
    return group;
  }
}

/** Logs the placed names the loaded models do not provide (they are not drawn). */
export function warnMissing(where: string, names: readonly string[]): void {
  if (names.length > 0) console.warn(`${where}: no model for ${names.join(', ')}`);
}

/** Tree model for the n-th tree of a map: broad-leaved, conifer, araucaria. */
export function treeModel(index: number): 'tree-broad' | 'tree-pine' | 'tree-araucaria' {
  return (['tree-broad', 'tree-pine', 'tree-araucaria'] as const)[index % 3]!;
}
