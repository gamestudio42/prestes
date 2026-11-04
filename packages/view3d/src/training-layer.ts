import * as THREE from 'three';
import { TRAINING_GROUND, terrainHeightAt, type TrainingProp } from '@prestes/shared';
import { detachChildren, ModelPlacements, type EnvironmentAsset } from './environment-models';
import { toon } from './materials';
import { PALETTE } from './palette';
import { box, cart, cylinder, haystack, placeBuilding, well } from './world-layer';

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

  /**
   * Swaps the procedural buildings and props for the Blender models, all at
   * once so the ground never mixes the two styles.
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
    if (placements.missing(asset).length > 0) return;
    detachChildren(this.props);
    this.props.add(placements.build(asset));
  }

  /** The training ground's buildings and small props, from the shared data. */
  private buildProps(): void {
    for (const building of TRAINING_GROUND.buildings) {
      placeBuilding(this.props, building.model, building.x, building.y, building.rotation);
    }
    for (const prop of TRAINING_GROUND.props) {
      buildProp(this.props, prop);
    }
  }
}

function buildProp(parent: THREE.Group, prop: TrainingProp): void {
  const base = terrainHeightAt(prop.x, prop.y);
  switch (prop.kind) {
    case 'flagpole': {
      cylinder(parent, PALETTE.wood, prop.x, base + 3.5, prop.y, 0.1, 7);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), toon({ color: PALETTE.scarf, side: THREE.DoubleSide }));
      flag.position.set(prop.x + 1.25, base + 6.2, prop.y);
      parent.add(flag);
      break;
    }
    case 'target-frame': {
      // A wooden frame holding a pale paper target at the range butts.
      for (const side of [-0.6, 0.6]) {
        box(parent, PALETTE.wood, prop.x + side, base + 0.9, prop.y, 0.1, 1.8, 0.1);
      }
      box(parent, PALETTE.whitewash, prop.x, base + 1.35, prop.y, 1.1, 0.9, 0.05);
      box(parent, PALETTE.window, prop.x, base + 1.35, prop.y + 0.03, 0.3, 0.3, 0.02);
      break;
    }
    case 'haystack':
      haystack(parent, prop.x, prop.y, 0.9);
      break;
    case 'crate':
      box(parent, PALETTE.wood, prop.x, base + 0.45, prop.y, 0.9, 0.9, 0.9, prop.x * 0.3);
      break;
    case 'well':
      well(parent, prop.x, prop.y);
      break;
    case 'cart':
      cart(parent, prop.x, prop.y, prop.rotation ?? 0);
      break;
    case 'signpost': {
      box(parent, PALETTE.wood, prop.x, base + 0.9, prop.y, 0.12, 1.8, 0.12);
      box(parent, PALETTE.plaster, prop.x + 0.45, base + 1.55, prop.y, 1.0, 0.36, 0.06);
      break;
    }
  }
}
