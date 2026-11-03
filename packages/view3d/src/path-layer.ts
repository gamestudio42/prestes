import * as THREE from 'three';
import { terrainHeightAt, type OrderPath } from '@prestes/shared';
import { unitScaleForSpan } from './camera-rig';
import { PALETTE } from './palette';

const MAX_VERTICES = 8192;

export function buildPathVertices(orders: readonly OrderPath[], span: number): Float32Array {
  const dash = Math.max(1.5, span / 80);
  const values: number[] = [];
  const push = (x: number, z: number): void => {
    values.push(x, terrainHeightAt(x, z) + 0.2, z);
  };

  for (const order of orders) {
    if (order.points.length < 2) {
      continue;
    }
    for (let index = 0; index < order.points.length - 1; index += 1) {
      const from = order.points[index];
      const to = order.points[index + 1];
      if (!from || !to) {
        continue;
      }
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.001) {
        continue;
      }
      for (let d = 0; d < length; d += dash * 2) {
        const end = Math.min(length, d + dash);
        push(from.x + (dx * d) / length, from.y + (dy * d) / length);
        push(from.x + (dx * end) / length, from.y + (dy * end) / length);
      }
    }
    const cross = Math.max(0.5, dash * 0.55);
    for (const point of order.points) {
      push(point.x - cross, point.y - cross);
      push(point.x + cross, point.y + cross);
      push(point.x - cross, point.y + cross);
      push(point.x + cross, point.y - cross);
    }
  }

  const out = new Float32Array(Math.min(values.length, MAX_VERTICES));
  out.set(values.slice(0, out.length));
  return out;
}

export class PathLayer {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions = new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3);
  private readonly material = new THREE.LineBasicMaterial({
    color: PALETTE.path,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  private readonly markers = new Map<number, THREE.Mesh>();

  constructor() {
    this.geometry.setAttribute('position', this.positions);
    const lines = new THREE.LineSegments(this.geometry, this.material);
    lines.frustumCulled = false;
    this.group.add(lines);
  }

  update(orders: readonly OrderPath[], span: number): void {
    const values = buildPathVertices(orders, span);
    this.positions.array.set(values);
    this.positions.needsUpdate = true;
    this.geometry.setDrawRange(0, values.length / 3);

    const seen = new Set<number>();
    for (const order of orders) {
      const target = order.points[order.points.length - 1];
      if (!target) {
        continue;
      }
      seen.add(order.id);
      let marker = this.markers.get(order.id);
      if (!marker) {
        marker = new THREE.Mesh(
          new THREE.RingGeometry(0.7, 0.92, 16),
          new THREE.MeshBasicMaterial({
            color: PALETTE.orderMarker,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
          }),
        );
        marker.rotation.x = -Math.PI / 2;
        this.group.add(marker);
        this.markers.set(order.id, marker);
      }
      const scale = unitScaleForSpan(span);
      marker.position.set(target.x, terrainHeightAt(target.x, target.y) + 0.25, target.y);
      marker.scale.setScalar(scale);
    }

    for (const [id, marker] of this.markers) {
      if (!seen.has(id)) {
        this.group.remove(marker);
        marker.geometry.dispose();
        const material = marker.material;
        if (Array.isArray(material)) {
          for (const entry of material) entry.dispose();
        } else {
          material.dispose();
        }
        this.markers.delete(id);
      }
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const marker of this.markers.values()) {
      marker.geometry.dispose();
      const material = marker.material;
      if (Array.isArray(material)) {
        for (const entry of material) entry.dispose();
      } else {
        material.dispose();
      }
    }
    this.markers.clear();
  }
}

