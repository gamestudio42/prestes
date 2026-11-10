import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { BattleMap } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { BattleMapLayer } from '../src/battle-map-layer';
import { PALETTE } from '../src/palette';
import { hillshade } from '../src/scene-view';

function named(group: THREE.Object3D, name: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (object.name === name && object instanceof THREE.Mesh) found.push(object);
  });
  return found;
}

function hasColor(mesh: THREE.Mesh, hex: number): boolean {
  const colors = mesh.geometry.attributes.color!;
  const target = new THREE.Color(hex);
  for (let index = 0; index < colors.count; index += 1) {
    if (Math.abs(colors.getX(index) - target.r) < 1e-3 && Math.abs(colors.getY(index) - target.g) < 1e-3 && Math.abs(colors.getZ(index) - target.b) < 1e-3) return true;
  }
  return false;
}

// refine-battle-maps 5.6 and 5.8: rutted roads and the headlands round the fields.
// author-game-maps 3.1: maps written as data (no painted ground) still draw
// their roads and field headlands; the fixture field stands for them.
const FIELD: BattleMap = {
  ...TEST_MAP,
  surfaces: [...TEST_MAP.surfaces, { surface: 'crop', polygon: [{ x: 40, y: 40 }, { x: 100, y: 40 }, { x: 100, y: 90 }, { x: 40, y: 90 }] }],
};

describe('battle map ground', () => {
  it('each dirt road of a data map is drawn rutted, with a crown and verges, never below the ground', () => {
    const map = FIELD;
    const roads = named(new BattleMapLayer(map).group, 'battle-map-road');
    expect(roads).toHaveLength(map.surfaces.filter((area) => area.surface === 'dirt-road').length);
    for (const road of roads) {
      expect(hasColor(road, PALETTE.rut)).toBe(true);
      expect(hasColor(road, PALETTE.roadCrown)).toBe(true);
      expect(hasColor(road, PALETTE.roadVerge)).toBe(true);
      const material = road.material as THREE.MeshToonMaterial;
      expect(material.polygonOffset).toBe(true);
    }
  });

  it('a headland path runs round each field of a data map, outside it', () => {
    const map = FIELD;
    const fields = map.surfaces.filter((area) => area.surface === 'crop');
    const headlands = named(new BattleMapLayer(map).group, 'battle-map-headland');
    expect(headlands).toHaveLength(fields.length);
    const field = fields[0]!.polygon!;
    const xs = field.map((point) => point.x);
    const ys = field.map((point) => point.y);
    const positions = headlands[0]!.geometry.attributes.position!;
    let outside = 0;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getZ(index);
      if (x <= Math.min(...xs) || x >= Math.max(...xs) || y <= Math.min(...ys) || y >= Math.max(...ys)) outside += 1;
    }
    expect(outside).toBe(positions.count);
  });

  // refine-battle-maps 5.9: a slope toward the sun is lighter than level ground, one away darker.
  it('the hillshade lightens slopes toward the sun and darkens those away, in soft steps', () => {
    const geometry = new THREE.BufferGeometry();
    const normals = [
      [0, 1, 0],
      [0.3, 0.95, 0],
      [-0.3, 0.95, 0],
    ].flatMap((normal) => new THREE.Vector3(...(normal as [number, number, number])).normalize().toArray());
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 3));
    hillshade(geometry, [60, 58, 0]);
    const colors = geometry.attributes.color!;
    const level = colors.getX(0);
    expect(colors.getX(1)).toBeGreaterThan(level);
    expect(colors.getX(2)).toBeLessThan(level);
    // Never black, never blown out.
    expect(colors.getX(2) / 0.5).toBeGreaterThanOrEqual(0.7 - 1e-6);
    expect(colors.getX(1) / 0.5).toBeLessThanOrEqual(1.17);
  });
});
