import * as THREE from 'three';
import { terrainHeightAt, type CoverPoint } from '@prestes/shared';
import { toon } from './materials';
import { PALETTE } from './palette';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitBarrel = new THREE.CylinderGeometry(1, 1, 1, 8);
const capacity = 512;

export class CoverLayer {
  readonly group = new THREE.Group();
  private readonly bags = new THREE.InstancedMesh(unitBox, toon({ color: 0xffffff }), capacity);
  private readonly stones = new THREE.InstancedMesh(unitBox, toon({ color: 0xffffff }), capacity);
  private readonly barrels = new THREE.InstancedMesh(unitBarrel, toon({ color: 0xffffff }), 64);
  private readonly bands = new THREE.InstancedMesh(unitBarrel, toon({ color: 0xffffff }), 128);
  private readonly trenchParts = new THREE.InstancedMesh(unitBox, toon({ color: 0xffffff }), 128);
  private signature = '';
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly coverQuaternion = new THREE.Quaternion();
  private readonly bagQuaternion = new THREE.Quaternion();
  private readonly color = new THREE.Color();

  constructor() {
    for (const mesh of [this.bags, this.stones, this.barrels, this.bands, this.trenchParts]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
    }
  }

  update(covers: readonly CoverPoint[]): void {
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
    let barrelCount = 0;
    let bandCount = 0;
    let trenchCount = 0;
    for (const cover of covers) {
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
          for (let index = 0; index < count; index += 1) {
            if (bagCount >= capacity) {
              break;
            }
            const localX = -cover.halfWidth + bagWidth * (index + 0.5) + offset;
            if (Math.abs(localX) > cover.halfWidth + 0.05) {
              continue;
            }
            const localZ = course === 1 ? -0.02 : 0;
            const world = toWorld(localX, localZ);
            this.position.set(
              world.x,
              terrainHeightAt(world.x, world.y) + 0.22 + course * 0.36,
              world.y,
            );
            this.bagQuaternion.setFromEuler(
              new THREE.Euler(0.02 * (index % 3 - 1), 0.08 * ((index + course) % 3 - 1), 0.02),
            );
            this.quaternion.copy(this.coverQuaternion).multiply(this.bagQuaternion);
            this.scale.set(bagWidth * 0.96, 0.38, cover.halfDepth * 1.75);
            this.matrix.compose(this.position, this.quaternion, this.scale);
            this.bags.setMatrixAt(bagCount, this.matrix);
            this.color.setHex(
              (index + course) % 3 === 0
                ? PALETTE.adobeDark
                : (index + course) % 3 === 1
                  ? PALETTE.sandbag
                  : PALETTE.dust,
            );
            this.bags.setColorAt(bagCount, this.color);
            bagCount += 1;
          }
        }
        continue;
      }
      if (cover.kind === 'stone' || cover.kind === 'low-wall') {
        const width = cover.halfWidth * 2;
        const blockWidth = 1.05;
        const count = Math.max(2, Math.round(width / blockWidth));
        const actualWidth = width / count;
        const courses = cover.kind === 'stone' ? 3 : 1;
        for (let course = 0; course < courses; course += 1) {
          const offset = course % 2 === 0 ? 0 : actualWidth * 0.5;
          for (let index = 0; index < count; index += 1) {
            if (stoneCount >= capacity) {
              break;
            }
            const localX = -cover.halfWidth + actualWidth * (index + 0.5) + offset;
            if (Math.abs(localX) > cover.halfWidth + 0.05) {
              continue;
            }
            const world = toWorld(localX, 0);
            this.position.set(
              world.x,
              terrainHeightAt(world.x, world.y) + 0.16 + course * 0.54,
              world.y,
            );
            this.quaternion.copy(this.coverQuaternion);
            this.scale.set(
              actualWidth * 0.96,
              cover.kind === 'stone' ? 0.52 : 0.58,
              cover.halfDepth * 1.9,
            );
            this.matrix.compose(this.position, this.quaternion, this.scale);
            this.stones.setMatrixAt(stoneCount, this.matrix);
            this.color.setHex(
              (index + course) % 4 === 0
                ? PALETTE.stoneDark
                : (index + course) % 4 === 1
                  ? PALETTE.stone
                  : PALETTE.adobeDark,
            );
            this.stones.setColorAt(stoneCount, this.color);
            stoneCount += 1;
          }
        }
        continue;
      }
      if (cover.kind === 'barrel') {
        this.position.set(
          cover.x,
          terrainHeightAt(cover.x, cover.y) + cover.height / 2,
          cover.y,
        );
        this.quaternion.copy(this.coverQuaternion);
        this.scale.set(cover.halfWidth, cover.height, cover.halfWidth);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.barrels.setMatrixAt(barrelCount, this.matrix);
        this.barrels.setColorAt(barrelCount, this.color.setHex(PALETTE.wood));
        barrelCount += 1;
        for (const height of [0.22, 0.72]) {
          if (bandCount >= 128) {
            break;
          }
          this.position.set(
            cover.x,
            terrainHeightAt(cover.x, cover.y) + cover.height * height,
            cover.y,
          );
          this.scale.set(cover.halfWidth * 1.02, 0.07, cover.halfWidth * 1.02);
          this.matrix.compose(this.position, this.quaternion, this.scale);
          this.bands.setMatrixAt(bandCount, this.matrix);
          this.bands.setColorAt(bandCount, this.color.setHex(PALETTE.metal));
          bandCount += 1;
        }
        continue;
      }
      if (cover.kind === 'trench') {
        const world = toWorld(0, 0);
        this.position.set(world.x, terrainHeightAt(world.x, world.y) + 0.03, world.y);
        this.quaternion.copy(this.coverQuaternion);
        this.scale.set(cover.halfWidth * 2, 0.08, cover.halfDepth * 2);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        this.trenchParts.setMatrixAt(trenchCount, this.matrix);
        this.trenchParts.setColorAt(trenchCount, this.color.setHex(PALETTE.trenchDeep));
        trenchCount += 1;
        for (const side of [-1, 1]) {
          if (trenchCount >= 128) {
            break;
          }
          const lip = toWorld(0, side * (cover.halfDepth - 0.16));
          this.position.set(
            lip.x,
            terrainHeightAt(lip.x, lip.y) + 0.28,
            lip.y,
          );
          this.scale.set(cover.halfWidth * 2, 0.5, 0.5);
          this.matrix.compose(this.position, this.quaternion, this.scale);
          this.trenchParts.setMatrixAt(trenchCount, this.matrix);
          this.trenchParts.setColorAt(trenchCount, this.color.setHex(PALETTE.sandbag));
          trenchCount += 1;
        }
      }
    }
    this.bags.count = bagCount;
    this.stones.count = stoneCount;
    this.barrels.count = barrelCount;
    this.bands.count = bandCount;
    this.trenchParts.count = trenchCount;
    for (const mesh of [this.bags, this.stones, this.barrels, this.bands, this.trenchParts]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    for (const mesh of [this.bags, this.stones, this.barrels, this.bands, this.trenchParts]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.group.clear();
  }
}

