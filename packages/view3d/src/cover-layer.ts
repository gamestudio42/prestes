import * as THREE from 'three';
import { terrainHeightAt, type CoverPoint } from '@prestes/shared';
import { warnMissing, type EnvironmentAsset } from './environment-models';

const capacity = 512;

/** Placeholder until the fortification models arrive (nothing is drawn before). */
const empty = new THREE.BufferGeometry();
const unset = new THREE.MeshBasicMaterial();

/**
 * Draws each cover with the Blender fortification pieces (sandbags, stone and
 * wall blocks, barrels, trench floor) along its footprint. Until the models
 * load, or if they fail, covers are not drawn.
 */
export class CoverLayer {
  readonly group = new THREE.Group();
  private readonly bags = new THREE.InstancedMesh(empty, unset, capacity);
  private readonly stones = new THREE.InstancedMesh(empty, unset, capacity);
  private readonly blocks = new THREE.InstancedMesh(empty, unset, capacity);
  private readonly barrels = new THREE.InstancedMesh(empty, unset, 64);
  private readonly trenchParts = new THREE.InstancedMesh(empty, unset, 128);
  private signature = '';
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly coverQuaternion = new THREE.Quaternion();
  private readonly bagQuaternion = new THREE.Quaternion();
  private readonly color = new THREE.Color();
  /** The fortification models have loaded. */
  private modelled = false;

  constructor() {
    for (const mesh of this.meshes()) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
    }
  }

  private meshes(): THREE.InstancedMesh[] {
    return [this.bags, this.stones, this.blocks, this.barrels, this.trenchParts];
  }

  /** Takes the unit-sized fortification models; covers are drawn from now on. */
  useModels(asset: EnvironmentAsset): void {
    const pieces: Array<[THREE.InstancedMesh, string]> = [
      [this.bags, 'sandbag'],
      [this.stones, 'stone-block'],
      [this.blocks, 'wall-block'],
      [this.barrels, 'barrel'],
      [this.trenchParts, 'trench-floor'],
    ];
    const missing = pieces.filter(([, name]) => !asset.geometry(name)).map(([, name]) => name);
    if (missing.length > 0) {
      warnMissing('covers', missing);
      return;
    }
    for (const [mesh, name] of pieces) {
      mesh.geometry = asset.geometry(name)!;
      mesh.material = asset.material;
    }
    this.modelled = true;
    this.signature = '';
  }

  /** Instance colour: a light shade over the texture, so pieces vary a little. */
  private tint(index: number): THREE.Color {
    return this.color.setHex([0xffffff, 0xece4d4, 0xdcd3c2][index % 3]!);
  }

  /** One sandbag at a local point of a cover, `course` bags up. */
  private addBag(
    count: number,
    world: { x: number; y: number },
    course: number,
    index: number,
    width: number,
    depth: number,
  ): void {
    this.position.set(world.x, terrainHeightAt(world.x, world.y) + 0.22 + course * 0.36, world.y);
    this.bagQuaternion.setFromEuler(
      new THREE.Euler(0.02 * (index % 3 - 1), 0.08 * ((index + course) % 3 - 1), 0.02),
    );
    this.quaternion.copy(this.coverQuaternion).multiply(this.bagQuaternion);
    this.scale.set(width, 0.38, depth);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    this.bags.setMatrixAt(count, this.matrix);
    this.bags.setColorAt(count, this.tint(index + course));
  }

  update(covers: readonly CoverPoint[]): void {
    if (!this.modelled) {
      return;
    }
    const signature = covers
      .map(
        (cover) =>
          `${cover.id}:${cover.kind}:${cover.x}:${cover.y}:${cover.rotation ?? 0}:${cover.halfWidth}:${cover.halfDepth}:${cover.height}`,
      )
      .join('|');
    if (signature === this.signature) {
      return;
    }
    this.signature = signature;
    let bagCount = 0;
    let stoneCount = 0;
    let blockCount = 0;
    let barrelCount = 0;
    let trenchCount = 0;
    for (const cover of covers) {
      if (cover.drawnBy === 'map') continue;
      const rotation = -(cover.rotation ?? 0);
      this.coverQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      const cos = Math.cos(cover.rotation ?? 0);
      const sin = Math.sin(cover.rotation ?? 0);
      const toWorld = (localX: number, localZ: number): { x: number; y: number } => ({
        x: cover.x + localX * cos - localZ * sin,
        y: cover.y + localX * sin + localZ * cos,
      });
      if (cover.kind === 'sandbag') {
        const width = cover.halfWidth * 2;
        const count = Math.max(2, Math.round(width / 0.82));
        const bagWidth = width / count;
        for (let course = 0; course < 2; course += 1) {
          const offset = course === 1 ? bagWidth * 0.5 : 0;
          for (let index = 0; index < count && bagCount < capacity; index += 1) {
            const localX = -cover.halfWidth + bagWidth * (index + 0.5) + offset;
            if (Math.abs(localX) > cover.halfWidth + 0.05) {
              continue;
            }
            const world = toWorld(localX, course === 1 ? -0.02 : 0);
            this.addBag(bagCount, world, course, index, bagWidth * 0.96, cover.halfDepth * 1.75);
            bagCount += 1;
          }
        }
        continue;
      }
      if (cover.kind === 'stone' || cover.kind === 'low-wall') {
        // Stone walls are courses of stone blocks; low walls one plastered block high.
        const stone = cover.kind === 'stone';
        const mesh = stone ? this.stones : this.blocks;
        const width = cover.halfWidth * 2;
        const count = Math.max(2, Math.round(width / 1.05));
        const actualWidth = width / count;
        const courses = cover.kind === 'stone' ? 3 : 1;
        for (let course = 0; course < courses; course += 1) {
          const offset = course % 2 === 0 ? 0 : actualWidth * 0.5;
          for (let index = 0; index < count; index += 1) {
            const used = stone ? stoneCount : blockCount;
            if (used >= capacity) {
              break;
            }
            const localX = -cover.halfWidth + actualWidth * (index + 0.5) + offset;
            if (Math.abs(localX) > cover.halfWidth + 0.05) {
              continue;
            }
            const world = toWorld(localX, 0);
            const block = !stone;
            const height = cover.kind === 'stone' ? 0.52 : block ? cover.height * 0.92 : 0.58;
            const lift = cover.kind === 'stone' ? 0.16 + course * 0.54 : block ? height / 2 : 0.16;
            this.position.set(world.x, terrainHeightAt(world.x, world.y) + lift, world.y);
            this.quaternion.copy(this.coverQuaternion);
            this.scale.set(actualWidth * (block ? 1.0 : 0.96), height, cover.halfDepth * 1.9);
            this.matrix.compose(this.position, this.quaternion, this.scale);
            mesh.setMatrixAt(used, this.matrix);
            mesh.setColorAt(used, this.tint(index + course));
            if (stone) stoneCount += 1;
            else blockCount += 1;
          }
        }
        continue;
      }
      if (cover.kind === 'barrel') {
        this.position.set(cover.x, terrainHeightAt(cover.x, cover.y) + cover.height / 2, cover.y);
        this.quaternion.copy(this.coverQuaternion);
        this.scale.set(cover.halfWidth, cover.height, cover.halfWidth);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.barrels.setMatrixAt(barrelCount, this.matrix);
        this.barrels.setColorAt(barrelCount, this.tint(barrelCount));
        barrelCount += 1;
        continue;
      }
      if (cover.kind === 'trench') {
        // Earth floor in cells of about two metres, a sandbag lip on each side.
        const across = Math.max(1, Math.round(cover.halfWidth));
        const cellWidth = (cover.halfWidth * 2) / across;
        const floorDepth = cover.halfDepth * 2 - 0.9;
        for (let index = 0; index < across && trenchCount < 128; index += 1) {
          const world = toWorld(-cover.halfWidth + cellWidth * (index + 0.5), 0);
          this.position.set(world.x, terrainHeightAt(world.x, world.y) + 0.02, world.y);
          this.quaternion.copy(this.coverQuaternion);
          this.scale.set(cellWidth, 0.06, floorDepth);
          this.matrix.compose(this.position, this.quaternion, this.scale);
          this.trenchParts.setMatrixAt(trenchCount, this.matrix);
          this.trenchParts.setColorAt(trenchCount, this.color.setHex(0xffffff));
          trenchCount += 1;
        }
        const bagsAcross = Math.max(2, Math.round((cover.halfWidth * 2) / 0.82));
        const bagWidth = (cover.halfWidth * 2) / bagsAcross;
        for (const side of [-1, 1]) {
          for (let index = 0; index < bagsAcross && bagCount < capacity; index += 1) {
            const world = toWorld(-cover.halfWidth + bagWidth * (index + 0.5), side * (cover.halfDepth - 0.25));
            this.addBag(bagCount, world, 0, index + (side > 0 ? 1 : 0), bagWidth * 0.96, 0.5);
            bagCount += 1;
          }
        }
      }
    }
    this.bags.count = bagCount;
    this.stones.count = stoneCount;
    this.blocks.count = blockCount;
    this.barrels.count = barrelCount;
    this.trenchParts.count = trenchCount;
    for (const mesh of this.meshes()) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    // The models' geometry and material are shared with the other layers.
    this.group.clear();
  }
}
