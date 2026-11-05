import * as THREE from 'three';
import { TRAINING_GROUND, terrainHeightAt } from '@prestes/shared';
import { ModelPlacements, warnMissing, type EnvironmentAsset } from './environment-models';
import { PALETTE } from './palette';

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

export class TrainingLayer {
  readonly group = new THREE.Group();
  private readonly props = new THREE.Group();
  private readonly markers = new THREE.Group();

  constructor() {
    this.group.add(this.props, this.markers);
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
    this.props.clear();
    this.group.clear();
  }

  /**
   * Places the training ground's buildings and small props, from the shared
   * data, once the Blender models have loaded.
   */
  useModels(asset: EnvironmentAsset): void {
    const placements = new ModelPlacements();
    for (const building of TRAINING_GROUND.buildings) {
      placements.add(building.model, building.x, building.y, building.rotation);
    }
    for (const prop of TRAINING_GROUND.props) {
      const rotation = prop.rotation ?? (prop.kind === 'crate' ? prop.x * 0.3 : 0);
      placements.add(prop.kind, prop.x, prop.y, rotation, prop.kind === 'haystack' ? 0.9 : 1);
    }
    warnMissing('training ground', placements.missing(asset));
    // The models' geometry and material are shared: clear, never dispose.
    this.props.clear();
    this.props.add(placements.build(asset));
  }
}
