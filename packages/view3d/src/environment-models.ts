import * as THREE from 'three';
import { terrainHeightAt, VARIANT_SWATCHES, type BuildingVariant } from '@prestes/shared';
import { ENVIRONMENT_ATLAS } from './environment-atlas';
import { toonGradient } from './materials';
import { lowestLeaf } from './canopy';

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
  /** Whether a model is a vertex-coloured tree or plant (they get strategic impostors). */
  isTree(name: string): boolean;
  /**
   * biome-trees-and-plants 4.1 (D3): loads the biome tree files
   * (`trees-<biome>`) not loaded yet; resolves once all are in. Each file is
   * fetched once; a map only asks for the files of the species it holds.
   */
  include(files: readonly string[]): Promise<void>;
  /** Whether these files are loaded already. */
  has(files: readonly string[]): boolean;
}

/**
 * The trees (refine-map-editor D8, from the owner's Refloreste models) load
 * last, so their broad-leaved tree and araucaria replace the older ones; they
 * are coloured per vertex, not by the atlas.
 */
const FILES = ['buildings', 'fortifications', 'vegetation', 'props', 'trees', 'stones'];
const VERTEX_COLOURED = new Set(['trees']);

/** Loads a model file's scene; the browser's is GLTFLoader, a test's records the request. */
export type SceneLoader = (url: string) => Promise<THREE.Object3D>;

/**
 * The named geometries of loaded model files. A later file replaces a name
 * an earlier one gave (the biome caatinga plants replace vegetation.glb's).
 */
export class ModelLibrary {
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private readonly coloured = new Set<string>();
  private readonly files = new Map<string, Promise<void>>();
  private readonly loaded = new Set<string>();

  constructor(
    private readonly load: SceneLoader,
    private readonly base: string,
  ) {}

  geometry(name: string): THREE.BufferGeometry | undefined {
    const found = this.geometries.get(name);
    if (found || !name.includes('@')) return found;
    // revise-buildings-and-stone 3.5: `<model>@<variant>` is the model with the variant's swatches swapped.
    const [model, variant] = name.split('@') as [string, BuildingVariant];
    const base = this.geometries.get(model);
    if (!base || !VARIANT_SWATCHES[variant]) return undefined;
    const geometry = withSwatches(base, VARIANT_SWATCHES[variant]);
    this.geometries.set(name, geometry);
    return geometry;
  }

  isColoured(name: string): boolean {
    return this.coloured.has(name.split('@')[0]!);
  }

  has(files: readonly string[]): boolean {
    return files.every((file) => this.loaded.has(file));
  }

  /** Loads each file once; trees files are vertex-coloured. */
  include(files: readonly string[]): Promise<void> {
    return Promise.all(
      files.map((file) => {
        let pending = this.files.get(file);
        if (!pending) {
          pending = this.load(`${this.base}${file}.glb`).then((scene) => {
            this.add(scene, VERTEX_COLOURED.has(file) || file.startsWith('trees-'));
            this.loaded.add(file);
          });
          // A failed file may be asked for again.
          pending.catch(() => this.files.delete(file));
          this.files.set(file, pending);
        }
        return pending;
      }),
    ).then(() => undefined);
  }

  private add(scene: THREE.Object3D, byVertex: boolean): void {
    scene.updateMatrixWorld(true);
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Bake the node transform so every model sits in its own Blender frame.
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
      this.geometries.set(mesh.name, geometry);
      if (byVertex) this.coloured.add(mesh.name);
      else this.coloured.delete(mesh.name);
      mesh.geometry.dispose();
    });
  }
}

/**
 * A copy of a model whose faces on one atlas swatch are moved onto another
 * (`from` -> `to`). The model's UVs sit half a texel inside their cells, so
 * each vertex names its swatch; cells are all the same size.
 */
export function withSwatches(base: THREE.BufferGeometry, swaps: Readonly<Record<string, string>>): THREE.BufferGeometry {
  const geometry = base.clone();
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return geometry;
  const [width, height] = ENVIRONMENT_ATLAS.size;
  const moves = Object.entries(swaps).flatMap(([from, to]) => {
    const a = ENVIRONMENT_ATLAS.regions[from];
    const b = ENVIRONMENT_ATLAS.regions[to];
    return a && b ? [{ a, du: (b[0] - a[0]) / width, dv: (b[1] - a[1]) / height }] : [];
  });
  for (let index = 0; index < uv.count; index += 1) {
    const x = uv.getX(index) * width;
    const y = uv.getY(index) * height;
    const move = moves.find(({ a }) => x >= a[0] && x < a[0] + a[2] && y >= a[1] && y < a[1] + a[3]);
    if (move) uv.setXY(index, uv.getX(index) + move.du, uv.getY(index) + move.dv);
  }
  uv.needsUpdate = true;
  return geometry;
}

export async function loadEnvironmentAsset(base = './models/'): Promise<EnvironmentAsset> {
  // The loader is a separate chunk, fetched only when models are wanted.
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const library = new ModelLibrary((url) => loader.loadAsync(url).then((gltf) => gltf.scene), base);
  const [map] = await Promise.all([new THREE.TextureLoader().loadAsync(`${base}textures/environment.png`), library.include(FILES)]);
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;
  map.needsUpdate = true;

  const material = new THREE.MeshToonMaterial({ map, gradientMap: toonGradient() });
  // Double-sided: the buriti's fronds are open sheets (hand check 2026-11-09: they vanished from behind).
  const vertexMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide });
  return {
    geometry: (name) => library.geometry(name),
    material,
    materialOf: (name) => (library.isColoured(name) ? vertexMaterial : material),
    isTree: (name) => library.isColoured(name),
    include: (files) => library.include(files),
    has: (files) => library.has(files),
  };
}

/**
 * biome-trees-and-plants 4.1: a tree's stand-in at strategic span, about 30
 * triangles: an icosahedron crown over a box trunk, coloured by the model's
 * own mean crown and trunk colours, so a wood still reads as its species'
 * greens from far off. A plant lower than 2 m is one lump. A palm is a
 * crown of drooping fronds on its bare trunk, a column cactus a column with
 * its arms (owner 2026-11-12: the açaí as a round tree read wrong).
 */
export type ImpostorShape = 'tree' | 'palm' | 'column';

/** The species whose stand-in is not a round crown (their dead forms too). */
const IMPOSTOR_SHAPES: Readonly<Record<string, ImpostorShape>> = {
  acai: 'palm',
  tucuma: 'palm',
  'palmito-jucara': 'palm',
  buriti: 'palm',
  mandacaru: 'column',
  facheiro: 'column',
};

export const impostorShape = (name: string): ImpostorShape => IMPOSTOR_SHAPES[name.replace(/-dead$/, '')] ?? 'tree';

export function impostorGeometry(model: THREE.BufferGeometry, shape: ImpostorShape = 'tree'): THREE.BufferGeometry {
  if (!model.boundingBox) model.computeBoundingBox();
  const box = model.boundingBox!;
  const height = box.max.y - box.min.y;
  const position = model.getAttribute('position');
  const colour = model.getAttribute('color');
  const split = shape === 'palm' ? (lowestLeaf(model) ?? box.max.y) : box.min.y + height * (height < 2 || shape === 'column' ? 0 : 0.45);
  const crown: [number, number, number, number] = [0, 0, 0, 0];
  const trunk: [number, number, number, number] = [0, 0, 0, 0];
  // The crown's colour is its leaves' (greener than red and blue), not the grey branches among them.
  const leaves: [number, number, number, number] = [0, 0, 0, 0];
  for (let index = 0; index < position.count; index += 1) {
    const r = colour ? colour.getX(index) : 0.3;
    const g = colour ? colour.getY(index) : 0.45;
    const b = colour ? colour.getZ(index) : 0.25;
    const high = position.getY(index) >= split;
    for (const sum of high ? (g > r && g > b ? [crown, leaves] : [crown]) : [trunk]) {
      sum[0] += r;
      sum[1] += g;
      sum[2] += b;
      sum[3] += 1;
    }
  }
  if (leaves[3] > crown[3] * 0.2) crown.splice(0, 4, ...leaves);
  const mean = (sum: readonly number[]) => (sum[3] ? [sum[0]! / sum[3], sum[1]! / sum[3], sum[2]! / sum[3]] : [0.35, 0.25, 0.15]);
  const parts: THREE.BufferGeometry[] = [];
  const paint = (geometry: THREE.BufferGeometry, rgb: number[]) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const count = flat.getAttribute('position').count;
    const colours = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) colours.set(rgb, index * 3);
    flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    flat.deleteAttribute('uv');
    parts.push(flat);
  };
  const width = Math.max(box.max.x - box.min.x, 0.4);
  const depth = Math.max(box.max.z - box.min.z, 0.4);
  const crownHeight = box.max.y - split;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  if (shape === 'palm') {
    // The bare trunk to the lowest frond, then seven fronds drooping from the top.
    const post = new THREE.BoxGeometry(0.3, Math.max(split - box.min.y, 0.1), 0.3);
    post.translate(cx, box.min.y + Math.max(split - box.min.y, 0.1) / 2, cz);
    paint(post, mean(trunk));
    if (crownHeight > 0.2) {
      const reach = Math.max(width, depth) / 2;
      const top = box.max.y;
      const vertices: number[] = [];
      for (let frond = 0; frond < 7; frond += 1) {
        const angle = (frond / 7) * Math.PI * 2;
        const along = [Math.cos(angle), Math.sin(angle)] as const;
        const side = [-along[1] * reach * 0.18, along[0] * reach * 0.18] as const;
        const mid = [cx + along[0] * reach * 0.5, top - crownHeight * 0.15, cz + along[1] * reach * 0.5] as const;
        const tip = [cx + along[0] * reach, top - crownHeight * 0.85, cz + along[1] * reach] as const;
        const base = [cx, top - crownHeight * 0.1, cz] as const;
        const left = [mid[0] + side[0], mid[1], mid[2] + side[1]];
        const right = [mid[0] - side[0], mid[1], mid[2] - side[1]];
        vertices.push(...base, ...left, ...right, ...left, ...tip, ...right);
      }
      const fronds = new THREE.BufferGeometry();
      fronds.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
      paint(fronds, mean(crown));
    }
    return finish(parts);
  }
  if (shape === 'column') {
    // A column, and two arms rising beside it when the cactus is wide.
    const green = mean(crown[3] ? crown : trunk);
    const column = new THREE.BoxGeometry(0.5, height, 0.5).translate(cx, box.min.y + height / 2, cz);
    paint(column, green);
    if (Math.max(width, depth) > 1.2) {
      const spread = Math.max(width, depth) * 0.35;
      for (const sign of [-1, 1]) {
        const arm = new THREE.BoxGeometry(0.4, height * 0.45, 0.4).translate(cx + sign * spread, box.min.y + height * 0.62, cz);
        paint(arm, green);
      }
      const bar = new THREE.BoxGeometry(spread * 2, 0.35, 0.35).translate(cx, box.min.y + height * 0.4, cz);
      paint(bar, green);
    }
    return finish(parts);
  }
  const lump = new THREE.IcosahedronGeometry(0.5, 0);
  // Fitted to the crown's box: an icosahedron does not reach its radius on every axis.
  lump.computeBoundingBox();
  const unit = lump.boundingBox!.getSize(new THREE.Vector3());
  lump.translate(0, -(lump.boundingBox!.min.y + lump.boundingBox!.max.y) / 2, 0);
  lump.scale((width * 0.9) / unit.x, Math.max(crownHeight, 0.3) / unit.y, (depth * 0.9) / unit.z);
  lump.translate((box.min.x + box.max.x) / 2, split + crownHeight / 2, (box.min.z + box.max.z) / 2);
  paint(lump, mean(crown));
  if (height >= 2) {
    const post = new THREE.BoxGeometry(Math.max(width * 0.08, 0.3), split - box.min.y, Math.max(depth * 0.08, 0.3));
    post.translate(0, box.min.y + (split - box.min.y) / 2, 0);
    paint(post, mean(trunk));
  }
  return finish(parts);
}

function finish(parts: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeFlat(parts);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

/** Joins non-indexed geometries of position, normal and colour. */
function mergeFlat(parts: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const names = ['position', 'color'] as const;
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const arrays = parts.map((part) => part.getAttribute(name).array as Float32Array);
    const joined = new Float32Array(arrays.reduce((sum, array) => sum + array.length, 0));
    let offset = 0;
    for (const array of arrays) {
      joined.set(array, offset);
      offset += array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(joined, 3));
  }
  return out;
}

/** Each tree model's stand-in, made once. */
const IMPOSTORS = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

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
    return this.instanced(asset, (name) => asset.geometry(name));
  }

  /**
   * biome-trees-and-plants 4.1: the trees' strategic stand-ins, one instanced
   * mesh per species at the same placements; other models are left out.
   */
  buildImpostors(asset: EnvironmentAsset): THREE.Group {
    return this.instanced(asset, (name) => {
      const model = asset.isTree(name) ? asset.geometry(name) : undefined;
      if (!model) return undefined;
      let impostor = IMPOSTORS.get(model);
      if (!impostor) {
        impostor = impostorGeometry(model, impostorShape(name));
        // Cached for every map: a map's disposal keeps it (scene-view disposeObject).
        impostor.userData.shared = true;
        IMPOSTORS.set(model, impostor);
      }
      return impostor;
    });
  }

  private instanced(asset: EnvironmentAsset, geometryOf: (name: string) => THREE.BufferGeometry | undefined): THREE.Group {
    const group = new THREE.Group();
    for (const [name, list] of this.matrices) {
      const geometry = geometryOf(name);
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
