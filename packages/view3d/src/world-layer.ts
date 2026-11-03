import * as THREE from 'three';
import { terrainHeightAt, terrainSurfaceAt } from '@prestes/shared';
import { toon } from './materials';
import { PALETTE } from './palette';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
const unitBarrel = new THREE.CylinderGeometry(1, 1, 1, 8);
const unitCone = new THREE.ConeGeometry(1, 1, 6);
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

function box(
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

function cylinder(
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

function farmhouse(parent: THREE.Object3D, x: number, z: number, rotation: number): void {
  const group = new THREE.Group();
  group.position.set(x, terrainHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const width = 8;
  const depth = 5;
  groundShadow(group, 0, 0, width + 2.4, depth + 2.4);
  const wall = 2.6;
  const base = 0.5;
  box(group, PALETTE.stoneDark, 0, 0.18, 0, width + 0.7, 1.2, depth + 0.7);
  box(group, PALETTE.plaster, 0, base + wall / 2, 0, width, wall, depth);
  gableRoof(group, width, depth, base + wall, 1.7, PALETTE.tile, PALETTE.plasterShade, PALETTE.roofDark);
  box(group, PALETTE.wood, 0, base + 1.05, depth / 2 + 0.03, 1.55, 2.05, 0.12);
  box(group, PALETTE.roofDark, 0, base + 1.02, depth / 2 + 0.1, 1.18, 1.82, 0.08);
  windowDetail(group, -2.6, base + 1.8, depth / 2 + 0.04, 0.75, 0.82);
  windowDetail(group, 2.6, base + 1.8, depth / 2 + 0.04, 0.75, 0.82);
  windowDetail(group, width / 2 + 0.02, base + 1.8, -1.2, 0.8, 0.85, true);
  windowDetail(group, width / 2 + 0.02, base + 1.8, 1.2, 0.8, 0.85, true);
  box(group, PALETTE.stone, 2.6, base + wall + 0.9, 0.7, 0.72, 2.0, 0.72);
  box(group, PALETTE.stoneDark, 2.6, base + wall + 1.95, 0.7, 0.9, 0.14, 0.9);
  box(group, PALETTE.tile, 0, base + 2.62, depth / 2 + 0.82, width * 0.64, 0.12, 1.65, 0, -0.1);
  for (const offset of [-2.15, 2.15]) {
    box(group, PALETTE.wood, offset, base + 1.35, depth / 2 + 1.38, 0.16, 2.55, 0.16);
  }
  box(group, PALETTE.wood, 0, base + 0.08, depth / 2 + 1.35, 4.8, 0.14, 1.5);
}

function barn(parent: THREE.Object3D, x: number, z: number, rotation: number): void {
  const group = new THREE.Group();
  group.position.set(x, terrainHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const width = 10.5;
  const depth = 6.2;
  groundShadow(group, 0, 0, width + 2.6, depth + 2.6);
  const wall = 3.4;
  const base = 0.45;
  box(group, PALETTE.stoneDark, 0, 0.16, 0, width + 0.8, 1.1, depth + 0.8);
  box(group, PALETTE.barn, 0, base + wall / 2, 0, width, wall, depth);
  gableRoof(group, width, depth, base + wall, 2.15, PALETTE.roofDark, PALETTE.barn, PALETTE.wood);
  box(group, PALETTE.barn, 0, base + wall + 2.15 + 0.5, 0, 1.45, 1.0, 1.45);
  box(group, PALETTE.roofDark, 0, base + wall + 2.15 + 1.08, 0, 1.85, 0.16, 1.85, Math.PI / 4);
  box(group, PALETTE.wood, 0, base + wall + 2.15 + 1.62, 0, 0.06, 0.9, 0.06);
  box(group, PALETTE.wood, 0, base + wall + 2.15 + 1.82, 0, 0.62, 0.06, 0.06);
  box(group, PALETTE.roofDark, 0, base + 1.35, depth / 2 + 0.06, 3.2, 2.65, 0.16);
  box(group, PALETTE.wood, 0, base + 1.35, depth / 2 + 0.14, 2.8, 2.25, 0.1);
  box(group, PALETTE.wood, 0, base + 1.35, depth / 2 + 0.19, 2.92, 0.12, 0.08);
  box(group, PALETTE.wood, 0, base + 1.35, depth / 2 + 0.19, 0.12, 2.35, 0.08);
  windowDetail(group, width / 2 + 0.02, base + 2.15, 1.4, 0.86, 0.9, true);
  windowDetail(group, -width / 2 - 0.02, base + 2.15, -1.4, 0.86, 0.9, true);
  for (const offset of [-3.1, 3.1]) {
    box(group, PALETTE.wood, offset, base + 0.02, depth / 2 + 0.85, 0.18, 0.9, 1.8);
  }
}

function chapel(parent: THREE.Object3D, x: number, z: number, rotation: number): void {
  const group = new THREE.Group();
  group.position.set(x, terrainHeightAt(x, z), z);
  group.rotation.y = rotation;
  parent.add(group);
  const width = 5.8;
  const depth = 9;
  groundShadow(group, 0, 0, width + 2.2, depth + 2.2);
  const wall = 3.1;
  const base = 0.5;
  box(group, PALETTE.stoneDark, 0, 0.18, 0, width + 0.6, 1.1, depth + 0.6);
  box(group, PALETTE.whitewash, 0, base + wall / 2, 0, width, wall, depth);
  gableRoof(group, width, depth, base + wall, 1.55, PALETTE.roof, PALETTE.whitewash, PALETTE.roofDark);
  box(group, PALETTE.wood, 0, base + 1.1, depth / 2 + 0.04, 1.45, 2.1, 0.12);
  box(group, PALETTE.roofDark, 0, base + 1.05, depth / 2 + 0.1, 1.08, 1.85, 0.08);
  windowDetail(group, -1.7, base + 1.9, depth / 2 + 0.05, 0.52, 1.0);
  windowDetail(group, 1.7, base + 1.9, depth / 2 + 0.05, 0.52, 1.0);
  box(group, PALETTE.whitewash, 0, base + wall + 1.25, -2.5, 2.2, 4.7, 2.2);
  box(group, PALETTE.roofDark, 0, base + wall + 3.75, -2.5, 2.8, 0.18, 2.8);
  box(group, PALETTE.roofDark, 0, base + wall + 3.45, -2.5, 2.45, 0.18, 2.45, Math.PI / 4);
  box(group, PALETTE.bell, 0, base + wall + 3.0, -2.5, 0.46, 0.7, 0.28);
  box(group, PALETTE.wood, 0, base + wall + 4.55, -2.5, 0.12, 1.3, 0.12);
  box(group, PALETTE.wood, 0, base + wall + 4.78, -2.5, 0.72, 0.12, 0.12);
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

function tree(parent: THREE.Object3D, x: number, z: number, scale: number, dark: boolean): void {
  const base = terrainHeightAt(x, z);
  cylinder(parent, PALETTE.bark, x, base + 1.25 * scale, z, 0.22 * scale, 2.5 * scale);
  const crown = dark ? PALETTE.leafDark : PALETTE.leaf;
  for (const [height, radius, length] of [
    [2.1, 1.8, 2.6],
    [3.35, 1.42, 2.3],
    [4.35, 0.92, 1.9],
  ] as const) {
    const mesh = new THREE.Mesh(unitCone, material(crown));
    mesh.position.set(x, base + height * scale, z);
    mesh.scale.set(radius * scale, length * scale, radius * scale);
    mesh.rotation.y = (x + z) * 0.35;
    parent.add(mesh);
  }
}

function haystack(parent: THREE.Object3D, x: number, z: number, scale: number): void {
  const base = terrainHeightAt(x, z);
  cylinder(parent, PALETTE.hayDark, x, base + 0.55 * scale, z, 1.15 * scale, 1.1 * scale);
  const top = new THREE.Mesh(unitCone, material(PALETTE.hay));
  top.position.set(x, base + 1.45 * scale, z);
  top.scale.set(1.3 * scale, 1.2 * scale, 1.3 * scale);
  top.rotation.y = x * 0.2;
  parent.add(top);
}

function well(parent: THREE.Object3D, x: number, z: number): void {
  const base = terrainHeightAt(x, z);
  cylinder(parent, PALETTE.stone, x, base + 0.42, z, 0.95, 0.85);
  cylinder(parent, PALETTE.stoneDark, x, base + 0.86, z, 1.02, 0.16);
  for (const offset of [-0.72, 0.72]) {
    box(parent, PALETTE.wood, x + offset, base + 1.65, z, 0.14, 1.7, 0.14);
  }
  box(parent, PALETTE.roof, x, base + 2.52, z, 2.1, 0.14, 1.3, 0, 0.22);
  box(parent, PALETTE.wood, x, base + 2.2, z, 1.6, 0.12, 0.12);
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

function cart(parent: THREE.Object3D, x: number, z: number, rotation: number): void {
  const base = terrainHeightAt(x, z);
  const group = new THREE.Group();
  group.position.set(x, base, z);
  group.rotation.y = rotation;
  parent.add(group);
  groundShadow(group, 0, 0, 4.2, 2.6);
  box(group, PALETTE.wood, 0, 0.78, 0, 2.5, 0.32, 1.25);
  box(group, PALETTE.wood, 0, 1.12, -0.55, 2.5, 0.55, 0.12);
  box(group, PALETTE.wood, 0, 1.12, 0.55, 2.5, 0.55, 0.12);
  box(group, PALETTE.wood, 1.55, 0.84, -0.38, 1.8, 0.1, 0.1);
  box(group, PALETTE.wood, 1.55, 0.84, 0.38, 1.8, 0.1, 0.1);
  for (const side of [-1, 1]) {
    const wheel = cylinder(group, PALETTE.wood, -0.45, 0.55, side * 0.72, 0.58, 0.2, true);
    wheel.rotation.x = Math.PI / 2;
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

export class WorldLayer {
  readonly group = new THREE.Group();
  private readonly postMatrices: THREE.Matrix4[] = [];
  private readonly railMatrices: THREE.Matrix4[] = [];

  constructor() {
    this.buildBuildings();
    this.buildFields();
    this.buildVegetation();
    this.buildFences();
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
    farmhouse(this.group, -56, 36, 0.22);
    barn(this.group, 58, 44, -0.16);
    chapel(this.group, 78, -52, 0.1);
    ruin(this.group, -70, -42, 0.4);
  }

  private buildVegetation(): void {
    const trees: Array<readonly [number, number, number, boolean]> = [
      [-16, 9, 1.0, false],
      [17, 8, 0.92, true],
      [-13, -13, 1.08, true],
      [15, -12, 0.96, false],
      [-88, 20, 1.3, true],
      [-80, -12, 1.12, false],
      [-68, 52, 1.22, false],
      [-44, 64, 1.05, true],
      [72, -18, 1.2, false],
      [86, 30, 1.32, true],
      [92, -82, 1.18, true],
      [-94, -70, 1.26, false],
      [36, 64, 1.1, true],
      [-30, 72, 1.2, false],
      [62, 70, 1.15, true],
    ];
    for (const [x, z, scale, dark] of trees) {
      tree(this.group, x, z, scale, dark);
    }

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

  private buildFences(): void {
    this.addFence([{ x: -82, y: 58 }, { x: -34, y: 58 }]);
    this.addFence([{ x: -82, y: 24 }, { x: -34, y: 24 }]);
    this.addFence([{ x: 42, y: 64 }, { x: 76, y: 64 }]);
    this.addFence([{ x: 76, y: 64 }, { x: 76, y: 24 }]);
    this.addFence([{ x: 18, y: -42 }, { x: 18, y: -22 }]);
    this.addFence([{ x: 18, y: 24 }, { x: 18, y: 44 }]);

    const posts = new THREE.InstancedMesh(unitBox, material(PALETTE.wood), this.postMatrices.length);
    const rails = new THREE.InstancedMesh(unitBox, material(PALETTE.wood), this.railMatrices.length);
    this.postMatrices.forEach((matrix, index) => posts.setMatrixAt(index, matrix));
    this.railMatrices.forEach((matrix, index) => rails.setMatrixAt(index, matrix));
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    posts.frustumCulled = false;
    rails.frustumCulled = false;
    this.group.add(posts, rails);
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
    cart(this.group, 44, 38, 0.25);
    haystack(this.group, 48, 32, 1.0);
    haystack(this.group, 52.5, 34.5, 0.82);
    haystack(this.group, 45, 36, 0.72);
    well(this.group, -36, 28);
    for (const [x, z] of [
      [46, 28],
      [49.5, 29],
      [63, 37],
      [65.5, 38],
    ] as const) {
      cylinder(this.group, PALETTE.wood, x, terrainHeightAt(x, z) + 0.48, z, 0.6, 0.96, true);
      cylinder(this.group, PALETTE.metal, x, terrainHeightAt(x, z) + 0.72, z, 0.62, 0.08, true);
    }
    for (const [x, z, size] of [
      [61, 40, 1.1],
      [62.6, 41.4, 0.8],
      [-51, 41, 0.9],
      [-49.2, 42.2, 0.7],
    ] as const) {
      box(this.group, PALETTE.wood, x, terrainHeightAt(x, z) + size / 2, z, size, size, size, z * 0.2);
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











