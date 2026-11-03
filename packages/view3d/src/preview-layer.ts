import * as THREE from 'three';
import { terrainHeightAt, type PreviewPlan } from '@prestes/shared';
import { PALETTE } from './palette';

const MAX_LINE_VERTICES = 4096;
const MAX_RINGS = 64;

export class PreviewLayer {
  readonly group = new THREE.Group();
  private readonly pathGeometry = new THREE.BufferGeometry();
  private readonly pathPositions = new THREE.BufferAttribute(
    new Float32Array(MAX_LINE_VERTICES * 3),
    3,
  );
  private readonly losClearGeometry = new THREE.BufferGeometry();
  private readonly losClearPositions = new THREE.BufferAttribute(
    new Float32Array(MAX_LINE_VERTICES * 3),
    3,
  );
  private readonly losBlockedGeometry = new THREE.BufferGeometry();
  private readonly losBlockedPositions = new THREE.BufferAttribute(
    new Float32Array(MAX_LINE_VERTICES * 3),
    3,
  );
  private readonly rings: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1, 1);

  constructor() {
    this.pathGeometry.setAttribute('position', this.pathPositions);
    const pathLines = new THREE.LineSegments(
      this.pathGeometry,
      new THREE.LineBasicMaterial({
        color: PALETTE.preview,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    pathLines.frustumCulled = false;
    this.losClearGeometry.setAttribute('position', this.losClearPositions);
    const losClear = new THREE.LineSegments(
      this.losClearGeometry,
      new THREE.LineBasicMaterial({
        color: PALETTE.losClear,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    losClear.frustumCulled = false;
    this.losBlockedGeometry.setAttribute('position', this.losBlockedPositions);
    const losBlocked = new THREE.LineSegments(
      this.losBlockedGeometry,
      new THREE.LineBasicMaterial({
        color: PALETTE.losBlocked,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    losBlocked.frustumCulled = false;
    const ringGeometry = new THREE.RingGeometry(0.52, 0.78, 12);
    ringGeometry.rotateX(-Math.PI / 2);
    this.rings = new THREE.InstancedMesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color: PALETTE.preview,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
      MAX_RINGS,
    );
    this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rings.frustumCulled = false;
    this.group.add(pathLines, losClear, losBlocked, this.rings);
  }

  setPlan(plan: PreviewPlan | null): void {
    if (!plan) {
      this.pathGeometry.setDrawRange(0, 0);
      this.losClearGeometry.setDrawRange(0, 0);
      this.losBlockedGeometry.setDrawRange(0, 0);
      this.rings.count = 0;
      return;
    }

    let pathVertices = 0;
    const pushPath = (fromX: number, fromY: number, toX: number, toY: number): void => {
      if (pathVertices + 2 > MAX_LINE_VERTICES) {
        return;
      }
      const array = this.pathPositions.array as Float32Array;
      array[pathVertices * 3] = fromX;
      array[pathVertices * 3 + 1] = terrainHeightAt(fromX, fromY) + 0.22;
      array[pathVertices * 3 + 2] = fromY;
      pathVertices += 1;
      array[pathVertices * 3] = toX;
      array[pathVertices * 3 + 1] = terrainHeightAt(toX, toY) + 0.22;
      array[pathVertices * 3 + 2] = toY;
      pathVertices += 1;
    };
    for (const path of plan.paths) {
      for (let index = 0; index < path.points.length - 1; index += 1) {
        const from = path.points[index];
        const to = path.points[index + 1];
        if (from && to) {
          pushPath(from.x, from.y, to.x, to.y);
        }
      }
    }
    this.pathPositions.needsUpdate = true;
    this.pathGeometry.setDrawRange(0, pathVertices);
    this.pathGeometry.computeBoundingSphere();

    let clearVertices = 0;
    let blockedVertices = 0;
    const pushLos = (
      positions: THREE.BufferAttribute,
      count: number,
      from: THREE.Vector3,
      to: THREE.Vector3,
    ): number => {
      if (count + 2 > MAX_LINE_VERTICES) {
        return count;
      }
      const array = positions.array as Float32Array;
      array[count * 3] = from.x;
      array[count * 3 + 1] = from.y;
      array[count * 3 + 2] = from.z;
      array[count * 3 + 3] = to.x;
      array[count * 3 + 4] = to.y;
      array[count * 3 + 5] = to.z;
      return count + 2;
    };
    for (const los of plan.los ?? []) {
      const from = new THREE.Vector3(
        los.from.x,
        terrainHeightAt(los.from.x, los.from.y) + 0.3,
        los.from.y,
      );
      const end = new THREE.Vector3(
        los.to.x,
        terrainHeightAt(los.to.x, los.to.y) + 0.3,
        los.to.y,
      );
      const blocker = los.blockedAt
        ? new THREE.Vector3(
            los.blockedAt.x,
            terrainHeightAt(los.blockedAt.x, los.blockedAt.y) + 0.3,
            los.blockedAt.y,
          )
        : null;
      clearVertices = pushLos(this.losClearPositions, clearVertices, from, blocker ?? end);
      if (blocker) {
        blockedVertices = pushLos(this.losBlockedPositions, blockedVertices, blocker, end);
      }
    }
    this.losClearPositions.needsUpdate = true;
    this.losBlockedPositions.needsUpdate = true;
    this.losClearGeometry.setDrawRange(0, clearVertices);
    this.losBlockedGeometry.setDrawRange(0, blockedVertices);
    this.losClearGeometry.computeBoundingSphere();
    this.losBlockedGeometry.computeBoundingSphere();

    let ringCount = 0;
    for (const path of plan.paths) {
      if (ringCount >= MAX_RINGS) {
        break;
      }
      this.position.set(
        path.destination.x,
        terrainHeightAt(path.destination.x, path.destination.y) + 0.2,
        path.destination.y,
      );
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.rings.setMatrixAt(ringCount, this.matrix);
      ringCount += 1;
    }
    this.rings.count = ringCount;
    this.rings.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.pathGeometry.dispose();
    this.losClearGeometry.dispose();
    this.losBlockedGeometry.dispose();
    this.rings.geometry.dispose();
    for (const child of this.group.children) {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        const material = child.material;
        if (Array.isArray(material)) {
          for (const entry of material) entry.dispose();
        } else {
          material.dispose();
        }
      }
    }
    this.group.clear();
  }
}
