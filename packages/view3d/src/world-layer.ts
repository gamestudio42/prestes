import * as THREE from 'three';
import {
  BUILDINGS,
  TRAINING_FENCES,
  TRAINING_TREES,
  terrainHeightAt,
  terrainSurfaceAt,
} from '@prestes/shared';
import { ModelPlacements, treeModel, warnMissing, type EnvironmentAsset } from './environment-models';
import { toon } from './materials';
import { PALETTE } from './palette';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
const unitBarrel = new THREE.CylinderGeometry(1, 1, 1, 8);
const unitTuft = new THREE.ConeGeometry(0.16, 0.55, 4);
const unitRock = new THREE.IcosahedronGeometry(0.55, 0);
const flatPlane = new THREE.PlaneGeometry(1, 1);
flatPlane.rotateX(-Math.PI / 2);
const shadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x14130e,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
});

const materialCache = new Map<number, THREE.MeshToonMaterial>();

function material(color: number): THREE.MeshToonMaterial {
  let value = materialCache.get(color);
  if (!value) {
    value = toon({ color });
    materialCache.set(color, value);
  }
  return value;
}

export function box(
  parent: THREE.Object3D,
  color: number,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  rotationY = 0,
  rotationX = 0,
  rotationZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(unitBox, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.rotation.set(rotationX, rotationY, rotationZ);
  parent.add(mesh);
  return mesh;
}

export function cylinder(
  parent: THREE.Object3D,
  color: number,
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  barrel = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(barrel ? unitBarrel : unitCylinder, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(radius, height, radius);
  parent.add(mesh);
  return mesh;
}

function groundShadow(
  parent: THREE.Object3D,
  x: number,
  z: number,
  width: number,
  depth: number,
  rotation = 0,
): void {
  const mesh = new THREE.Mesh(flatPlane, shadowMaterial);
  mesh.position.set(x, 0.04, z);
  mesh.scale.set(width, 1, depth);
  mesh.rotation.y = rotation;
  parent.add(mesh);
}

function gableRoof(
  parent: THREE.Object3D,
  width: number,
  depth: number,
  wallTop: number,
  rise: number,
  roofColor: number,
  gableColor: number,
  detailColor: number,
): void {
  const halfDepth = depth / 2;
  const slope = Math.sqrt(halfDepth * halfDepth + rise * rise);
  const angle = Math.atan2(rise, halfDepth);
  box(parent, roofColor, 0, wallTop + rise / 2, depth / 4, width + 0.8, 0.16, slope + 0.35, 0, angle);
  box(parent, roofColor, 0, wallTop + rise / 2, -depth / 4, width + 0.8, 0.16, slope + 0.35, 0, -angle);
  box(parent, roofColor, 0, wallTop + rise + 0.02, 0, width + 0.9, 0.16, 0.22);
  box(parent, detailColor, 0, wallTop + rise + 0.13, 0, width + 1.0, 0.07, 0.12);
  for (const ratio of [0.3, 0.62]) {
    box(
      parent,
      detailColor,
      0,
      wallTop + rise * (1 - ratio) + 0.1,
      ratio * halfDepth,
      width + 0.88,
      0.045,
      0.1,
      0,
      angle,
    );
    box(
      parent,
      detailColor,
      0,
      wallTop + rise * (1 - ratio) + 0.1,
      -ratio * halfDepth,
      width + 0.88,
      0.045,
      0.1,
      0,
      -angle,
    );
  }
  for (const side of [-1, 1]) {
    box(
      parent,
      detailColor,
      0,
      wallTop - 0.04,
      side * (halfDepth + 0.34),
      width + 0.95,
      0.18,
      0.18,
    );
  }
  const shape = new THREE.Shape();
  shape.moveTo(-halfDepth, 0);
  shape.lineTo(halfDepth, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  for (const side of [-1, 1]) {
    const mesh = new THREE.Mesh(geometry, material(gableColor));
    mesh.position.set((side * width) / 2, wallTop, 0);
    mesh.rotation.y = Math.PI / 2;
    parent.add(mesh);
  }
}

function windowDetail(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  side = false,
): void {
  if (side) {
    box(parent, PALETTE.wood, x, y, z, 0.1, height + 0.2, width + 0.2);
    box(parent, PALETTE.window, x + Math.sign(x) * 0.06, y, z, 0.06, height, width);
    return;
  }
  box(parent, PALETTE.wood, x, y, z, width + 0.2, height + 0.2, 0.1);
  box(parent, PALETTE.window, x, y, z + 0.06, width, height, 0.06);
  box(parent, PALETTE.wood, x, y, z + 0.1, 0.08, height, 0.04);
}

export function trainingHouse(
  parent: THREE.Object3D,
  x: number,
  z: number,
  rotation: number,
): void {
  const group = new THREE.Group();
  group.position.set(x, terrainHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const width = 6.8;
  const depth = 4.5;
  const wall = 2.15;
  const base = 0.4;
  groundShadow(group, 0, 0, width + 2.1, depth + 2.1);
  box(group, PALETTE.stoneDark, 0, 0.15, 0, width + 0.5, 1.0, depth + 0.5);
  box(group, PALETTE.adobe, 0, base + wall / 2, 0, width, wall, depth);
  gableRoof(group, width, depth, base + wall, 1.15, PALETTE.roof, PALETTE.adobe, PALETTE.roofDark);
  box(group, PALETTE.wood, 0, base + 0.96, depth / 2 + 0.04, 1.3, 1.9, 0.12);
  box(group, PALETTE.roofDark, 0, base + 0.93, depth / 2 + 0.1, 0.98, 1.66, 0.08);
  windowDetail(group, -2.05, base + 1.55, depth / 2 + 0.04, 0.66, 0.7);
  windowDetail(group, 2.05, base + 1.55, depth / 2 + 0.04, 0.66, 0.7);
  windowDetail(group, width / 2 + 0.02, base + 1.55, 0.9, 0.62, 0.7, true);
  box(group, PALETTE.stone, 2.1, base + wall + 0.62, 0.6, 0.55, 1.4, 0.55);
  box(group, PALETTE.stoneDark, 2.1, base + wall + 1.36, 0.6, 0.72, 0.12, 0.72);
}

function ruin(parent: THREE.Object3D, x: number, z: number, rotation: number): void {
  const group = new THREE.Group();
  group.position.set(x, terrainHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  groundShadow(group, 0, 0, 7.2, 4.6);
  const base = 0.2;
  box(group, PALETTE.stone, -2.4, base + 0.7, -1.2, 3.4, 1.4, 0.65);
  box(group, PALETTE.stoneDark, -1.1, base + 1.35, -1.2, 1.2, 0.55, 0.65);
  box(group, PALETTE.stone, 1.2, base + 0.55, -1.2, 2.2, 1.1, 0.65);
  box(group, PALETTE.stoneDark, 2.1, base + 1.25, -1.2, 0.9, 0.45, 0.65);
  box(group, PALETTE.stone, -2.8, base + 0.6, 0.2, 0.65, 1.2, 2.4);
  box(group, PALETTE.stone, 2.7, base + 0.45, 0.3, 0.65, 0.9, 2.0);
  for (const [dx, dz, size] of [
    [-1.5, 1.0, 0.55],
    [0.8, 1.4, 0.4],
    [2.1, 0.8, 0.5],
    [-0.3, -0.6, 0.32],
  ] as const) {
    const mesh = new THREE.Mesh(unitRock, material(PALETTE.stoneDark));
    mesh.position.set(dx, base + size * 0.35, dz);
    mesh.scale.setScalar(size);
    mesh.rotation.set(dx, dz, size);
    group.add(mesh);
  }
}

function telegraphPoles(parent: THREE.Object3D): void {
  const zValues = [-64, -32, 0, 32, 64];
  const x = -36;
  const tops: THREE.Vector3[] = [];
  for (const z of zValues) {
    const base = terrainHeightAt(x, z);
    cylinder(parent, PALETTE.wood, x, base + 3.6, z, 0.15, 7.2);
    box(parent, PALETTE.wood, x, base + 6.45, z, 2.4, 0.14, 0.16);
    for (const offset of [-0.85, 0.85]) {
      cylinder(parent, PALETTE.metal, x + offset, base + 6.62, z, 0.09, 0.22);
    }
    tops.push(new THREE.Vector3(x, base + 6.5, z));
  }
  for (const offset of [-0.85, 0.85]) {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index < tops.length - 1; index += 1) {
      const from = tops[index]!;
      const to = tops[index + 1]!;
      for (let step = 0; step < 10; step += 1) {
        const t = step / 10;
        const sag = Math.sin(Math.PI * t) * 0.75;
        points.push(
          new THREE.Vector3(
            from.x + offset,
            from.y + (to.y - from.y) * t - sag,
            from.z + (to.z - from.z) * t,
          ),
        );
      }
    }
    const last = tops[tops.length - 1]!;
    points.push(new THREE.Vector3(last.x + offset, last.y, last.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const wire = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: PALETTE.wire,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    wire.frustumCulled = false;
    parent.add(wire);
  }
}

function windmill(parent: THREE.Object3D, x: number, z: number): void {
  const base = terrainHeightAt(x, z);
  const group = new THREE.Group();
  group.position.set(x, base, z);
  parent.add(group);
  groundShadow(group, 0, 0, 4.2, 4.2);
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 1.18, 5.4, 8),
    material(PALETTE.whitewash),
  );
  tower.position.y = 2.7;
  group.add(tower);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.5, 8), material(PALETTE.roofDark));
  roof.position.y = 6.15;
  group.add(roof);
  box(group, PALETTE.wood, 0, 0.95, 1.02, 0.9, 1.9, 0.12);
  box(group, PALETTE.wood, 0, 5.02, 1.05, 0.32, 0.32, 0.32);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8),
    material(PALETTE.wood),
  );
  hub.position.set(0, 5.02, 1.28);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  for (let index = 0; index < 4; index += 1) {
    const blade = box(
      group,
      PALETTE.wood,
      0,
      5.02,
      1.34,
      0.42,
      4.7,
      0.1,
    );
    blade.rotation.z = (index * Math.PI) / 2;
  }
}

function buildFieldRows(
  parent: THREE.Object3D,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  spacing: number,
): void {
  const matrices: THREE.Matrix4[] = [];
  const colors: number[] = [];
  const length = maxX - minX;
  for (let z = minZ; z <= maxZ + 0.01; z += spacing) {
    const matrix = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3((minX + maxX) / 2, terrainHeightAt((minX + maxX) / 2, z) + 0.035, z),
      new THREE.Quaternion(),
      new THREE.Vector3(length, 0.05, 0.36),
    );
    matrices.push(matrix);
    colors.push(matrices.length % 2 === 0 ? PALETTE.grassDeep : PALETTE.grass);
  }
  const mesh = new THREE.InstancedMesh(unitBox, toon({ color: 0xffffff }), matrices.length);
  matrices.forEach((matrix, index) => {
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, new THREE.Color(colors[index]!));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.frustumCulled = false;
  parent.add(mesh);
}

export type WorldMap = 'sandbox' | 'training';

export class WorldLayer {
  readonly group = new THREE.Group();
  private readonly postMatrices: THREE.Matrix4[] = [];
  private readonly railMatrices: THREE.Matrix4[] = [];
  /** Where the Blender models go once they load (trees, buildings, props). */
  private readonly placements = new ModelPlacements();

  /**
   * The countryside around a map. On the training ground it is only grass,
   * trees and the boundary fence: the stations' own buildings and props are
   * the training layer's. Pieces with a Blender model are drawn when the
   * models load; the rest (sandbox only) stay procedural.
   */
  constructor(private readonly map: WorldMap = 'sandbox') {
    if (map === 'training') {
      this.buildVegetation();
      this.addFences();
      return;
    }
    this.buildBuildings();
    this.buildFields();
    this.buildVegetation();
    this.addFences();
    this.buildRocks();
    this.buildProps();
    telegraphPoles(this.group);
  }

  private buildFields(): void {
    buildFieldRows(this.group, -80, -38, 45, 57, 1.25);
    buildFieldRows(this.group, 40, 75, 49, 62, 1.3);
    buildFieldRows(this.group, -94, -72, 8, 30, 1.35);
  }

  private buildBuildings(): void {
    for (const building of BUILDINGS) {
      if (building.model === 'training-house') {
        trainingHouse(this.group, building.x, building.y, -building.rotation);
      } else {
        this.placements.add(building.model, building.x, building.y, building.rotation);
      }
    }
    ruin(this.group, -70, -42, 0.4);
  }

  private buildVegetation(): void {
    const sandboxTrees: Array<readonly [number, number, number]> = [
      [-16, 9, 1.0],
      [17, 8, 0.92],
      [-13, -13, 1.08],
      [15, -12, 0.96],
      [-88, 20, 1.3],
      [-80, -12, 1.12],
      [-68, 52, 1.22],
      [-44, 64, 1.05],
      [72, -18, 1.2],
      [86, 30, 1.32],
      [92, -82, 1.18],
      [-94, -70, 1.26],
      [36, 64, 1.1],
      [-30, 72, 1.2],
      [62, 70, 1.15],
    ];
    const trees = this.map === 'training' ? TRAINING_TREES : sandboxTrees;
    trees.forEach(([x, z, scale], index) => {
      this.placements.add(treeModel(index), x, z, (x + z) * 0.35, scale);
    });

    const random = seededRandom(1922);
    const tufts = new THREE.InstancedMesh(unitTuft, toon({ color: 0xffffff }), 380);
    tufts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tufts.frustumCulled = false;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    let count = 0;
    for (let attempt = 0; attempt < 900 && count < 380; attempt += 1) {
      const x = -110 + random() * 220;
      const z = -110 + random() * 220;
      if (terrainSurfaceAt(x, z) === 'road') {
        continue;
      }
      const height = 0.7 + random() * 0.65;
      position.set(x, terrainHeightAt(x, z) + 0.26 * height, z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2);
      scale.set(0.75 + random() * 0.55, height, 0.75 + random() * 0.55);
      matrix.compose(position, quaternion, scale);
      tufts.setMatrixAt(count, matrix);
      const shade = random();
      color.setHex(shade < 0.34 ? PALETTE.grassDeep : shade < 0.68 ? PALETTE.grass : PALETTE.grassLight);
      tufts.setColorAt(count, color);
      count += 1;
    }
    tufts.count = count;
    tufts.instanceMatrix.needsUpdate = true;
    if (tufts.instanceColor) {
      tufts.instanceColor.needsUpdate = true;
    }
    this.group.add(tufts);
  }

  private addFences(): void {
    if (this.map === 'training') {
      for (const line of TRAINING_FENCES) {
        this.addFence(line);
      }
    } else {
      this.addSandboxFences();
    }
  }

  private addSandboxFences(): void {
    this.addFence([{ x: -82, y: 58 }, { x: -34, y: 58 }]);
    this.addFence([{ x: -82, y: 24 }, { x: -34, y: 24 }]);
    this.addFence([{ x: 42, y: 64 }, { x: 76, y: 64 }]);
    this.addFence([{ x: 76, y: 64 }, { x: 76, y: 24 }]);
    this.addFence([{ x: 18, y: -42 }, { x: 18, y: -22 }]);
    this.addFence([{ x: 18, y: 24 }, { x: 18, y: 44 }]);
  }

  /** Draws the modelled pieces: trees, buildings, props and fence posts and rails. */
  useModels(asset: EnvironmentAsset): void {
    warnMissing('world', this.placements.missing(asset));
    this.group.add(this.placements.build(asset));
    for (const [name, matrices] of [
      ['fence-post', this.postMatrices],
      ['fence-rail', this.railMatrices],
    ] as const) {
      const geometry = asset.geometry(name);
      if (!geometry || matrices.length === 0) continue;
      const mesh = new THREE.InstancedMesh(geometry, asset.material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.name = name;
      this.group.add(mesh);
    }
  }

  private addFence(points: readonly { x: number; y: number }[]): void {
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index]!;
      const to = points[index + 1]!;
      const dx = to.x - from.x;
      const dz = to.y - from.y;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < 0.01) {
        continue;
      }
      const count = Math.max(2, Math.round(length / 2.5));
      for (let postIndex = 0; postIndex < count; postIndex += 1) {
        const t = postIndex / (count - 1);
        const x = from.x + dx * t;
        const z = from.y + dz * t;
        const matrix = new THREE.Matrix4();
        matrix.compose(
          new THREE.Vector3(x, terrainHeightAt(x, z) + 0.62, z),
          new THREE.Quaternion(),
          new THREE.Vector3(0.13, 1.24, 0.13),
        );
        this.postMatrices.push(matrix);
      }
      const angle = Math.atan2(-dz, dx);
      for (let railIndex = 0; railIndex < count - 1; railIndex += 1) {
        const t = (railIndex + 0.5) / (count - 1);
        const x = from.x + dx * t;
        const z = from.y + dz * t;
        const segment = length / (count - 1);
        for (const height of [0.55, 1.05]) {
          const matrix = new THREE.Matrix4();
          matrix.compose(
            new THREE.Vector3(x, terrainHeightAt(x, z) + height, z),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
            new THREE.Vector3(segment + 0.12, 0.09, 0.09),
          );
          this.railMatrices.push(matrix);
        }
      }
    }
  }

  private buildRocks(): void {
    const random = seededRandom(811);
    const rocks = new THREE.InstancedMesh(unitRock, toon({ color: 0xffffff }), 44);
    rocks.frustumCulled = false;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    let count = 0;
    for (let attempt = 0; attempt < 100 && count < 44; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 45 + random() * 70;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (terrainSurfaceAt(x, z) === 'road') {
        continue;
      }
      const size = 0.35 + random() * 1.15;
      position.set(x, terrainHeightAt(x, z) + size * 0.3, z);
      quaternion.setFromEuler(new THREE.Euler(random(), random() * Math.PI * 2, random()));
      scale.set(size, size * (0.55 + random() * 0.4), size);
      matrix.compose(position, quaternion, scale);
      rocks.setMatrixAt(count, matrix);
      color.setHex(random() < 0.5 ? PALETTE.rock : PALETTE.stoneDark);
      rocks.setColorAt(count, color);
      count += 1;
    }
    rocks.count = count;
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) {
      rocks.instanceColor.needsUpdate = true;
    }
    this.group.add(rocks);
  }

  private buildProps(): void {
    windmill(this.group, -84, 6);
    // The cart's procedural heading was the view's; the placement takes the simulation's.
    this.placements.add('cart', 44, 38, -0.25);
    for (const [x, z, scale] of [
      [48, 32, 1.0],
      [52.5, 34.5, 0.82],
      [45, 36, 0.72],
    ] as const) {
      this.placements.add('haystack', x, z, 0, scale);
    }
    this.placements.add('well', -36, 28);
    for (const [x, z] of [
      [46, 28],
      [49.5, 29],
      [63, 37],
      [65.5, 38],
    ] as const) {
      this.placements.add('barrel', x, z, 0, new THREE.Vector3(0.6, 0.96, 0.6), 0.48);
    }
    for (const [x, z, size] of [
      [61, 40, 1.1],
      [62.6, 41.4, 0.8],
      [-51, 41, 0.9],
      [-49.2, 42.2, 0.7],
    ] as const) {
      // The crate model is 0.9 m, standing on its base.
      this.placements.add('crate', x, z, -z * 0.2, size / 0.9);
    }
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}











