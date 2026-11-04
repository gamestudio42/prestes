import * as THREE from 'three';
import { BUILDINGS, terrainHeightAt } from '@prestes/shared';
import { toon } from './materials';
import { PALETTE } from './palette';
import { placeBuilding } from './world-layer';

export interface TrainingMarker {
  id: string;
  x: number;
  y: number;
  kind: 'waypoint' | 'cover' | 'zone' | 'approach' | 'fallback';
  radius?: number;
}

function disposeChildren(group: THREE.Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse((entry) => {
      const mesh = entry as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        for (const value of material) value.dispose();
      } else {
        material?.dispose();
      }
    });
  }
}

function box(
  group: THREE.Group,
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: number,
  yOffset = 0,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), toon({ color }));
  mesh.position.set(x, terrainHeightAt(x, z) + height / 2 + yOffset, z);
  group.add(mesh);
}

function tent(group: THREE.Group, x: number, z: number, color: number): void {
  const base = terrainHeightAt(x, z);
  const width = 5.2;
  const depth = 4.4;
  const height = 2.75;
  const angle = Math.atan2(height, depth / 2);
  const slope = Math.sqrt((depth / 2) ** 2 + height ** 2);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 1.2, depth + 1.2),
    new THREE.MeshBasicMaterial({
      color: 0x14130e,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, base + 0.03, z);
  group.add(shadow);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, slope + 0.15),
      toon({ color }),
    );
    panel.position.set(x, base + height / 2, z + (side * depth) / 4);
    panel.rotation.x = side * angle;
    group.add(panel);
  }
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, width + 0.3, 5),
    toon({ color: PALETTE.wood }),
  );
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(x, base + height + 0.04, z);
  group.add(ridge);
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, height + 0.5, 5),
      toon({ color: PALETTE.wood }),
    );
    pole.position.set(x + (side * width) / 2, base + height / 2, z);
    group.add(pole);
    const stake = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.08, 0.08),
      toon({ color: PALETTE.wood }),
    );
    stake.position.set(x + side * (width / 2 + 0.8), base + 0.05, z);
    group.add(stake);
    const rope = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x + side * (width / 2), base + height + 0.04, z),
        new THREE.Vector3(x + side * (width / 2 + 0.8), base + 0.05, z),
      ]),
      new THREE.LineBasicMaterial({
        color: PALETTE.bandolier,
        transparent: true,
        opacity: 0.5,
      }),
    );
    group.add(rope);
  }
  const back = new THREE.Mesh(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x - width / 2, base, z - depth / 2),
      new THREE.Vector3(x + width / 2, base, z - depth / 2),
      new THREE.Vector3(x, base + height, z - depth / 2),
    ]),
    toon({ color }),
  );
  back.geometry.setIndex([0, 1, 2]);
  back.geometry.computeVertexNormals();
  group.add(back);
  const flap = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.9, 0.06),
    toon({ color: PALETTE.roofDark }),
  );
  flap.position.set(x, base + 0.98, z + depth / 2 - 0.02);
  group.add(flap);
}

function fence(group: THREE.Group, z: number): void {
  for (let x = -30; x <= 30; x += 2.4) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 1.4, 4),
      toon({ color: PALETTE.wood }),
    );
    post.position.set(x, terrainHeightAt(x, z) + 0.7, z);
    group.add(post);
  }
  for (const offset of [-0.45, 0.35]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(60, 0.08, 0.1),
      toon({ color: PALETTE.wood }),
    );
    rail.position.set(0, terrainHeightAt(0, z) + 1.1 + offset, z);
    group.add(rail);
  }
}

export class TrainingLayer {
  readonly group = new THREE.Group();
  private readonly props = new THREE.Group();
  private readonly markers = new THREE.Group();

  constructor() {
    this.group.add(this.props, this.markers);
    this.buildProps();
  }

  setMarkers(entries: readonly TrainingMarker[]): void {
    disposeChildren(this.markers);
    for (const marker of entries) {
      const color =
        marker.kind === 'cover'
          ? PALETTE.preview
          : marker.kind === 'zone'
            ? PALETTE.losClear
            : marker.kind === 'approach'
              ? PALETTE.scarf
              : marker.kind === 'fallback'
                ? PALETTE.pathWithdraw
                : PALETTE.orderMarker;
      const radius = marker.radius ?? 2;
      const inner = marker.kind === 'zone' ? Math.max(0.2, radius - 0.6) : 1.6;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, radius, 32),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(marker.x, terrainHeightAt(marker.x, marker.y) + 0.22, marker.y);
      ring.renderOrder = 2;
      this.markers.add(ring);

      if (marker.kind === 'zone') {
        const fill = new THREE.Mesh(
          new THREE.CircleGeometry(Math.max(0.2, radius - 0.7), 32),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.04,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.set(marker.x, terrainHeightAt(marker.x, marker.y) + 0.18, marker.y);
        fill.renderOrder = 1;
        this.markers.add(fill);
      } else if (marker.kind !== 'approach') {
        const beacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.28, 3.2, 6, 1, true),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        beacon.position.set(marker.x, terrainHeightAt(marker.x, marker.y) + 1.8, marker.y);
        beacon.renderOrder = 1;
        this.markers.add(beacon);
      }
    }
  }

  dispose(): void {
    disposeChildren(this.markers);
    disposeChildren(this.props);
    this.group.clear();
  }

  private buildProps(): void {
    tent(this.props, -26, 15, PALETTE.adobe);
    tent(this.props, 26, 15, PALETTE.adobeDark);
    tent(this.props, -25, -10, PALETTE.adobe);

    for (const building of BUILDINGS.filter((entry) => entry.model === 'training-house')) {
      placeBuilding(this.props, building.model, building.x, building.y, building.rotation);
    }
    box(this.props, -18, 12, 1.1, 0.9, 1.1, PALETTE.wood);
    box(this.props, -16.5, 12, 1.1, 0.9, 1.1, PALETTE.wood);
    box(this.props, 18, 11, 1.1, 0.9, 1.1, PALETTE.wood);
    box(this.props, 8, 17, 1.4, 1.0, 1.0, PALETTE.sandbag);
    box(this.props, -8, 17, 1.4, 1.0, 1.0, PALETTE.sandbag);

    fence(this.props, 22);

    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 6, 5),
      toon({ color: PALETTE.wood }),
    );
    flagPole.position.set(0, terrainHeightAt(0, 23) + 3, 23);
    this.props.add(flagPole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), toon({ color: PALETTE.scarf }));
    flag.position.set(1.2, terrainHeightAt(0, 23) + 5.1, 23);
    this.props.add(flag);
  }
}








