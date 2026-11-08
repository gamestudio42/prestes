import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { battleMap } from '@prestes/shared';
import { BattleMapLayer, WATER_LOOK } from '../src/battle-map-layer';
import { PALETTE } from '../src/palette';

function lightness(hex: number): number {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl);
  return hsl.l;
}

function named(group: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  group.traverse((object) => {
    if (object.name === name) found.push(object);
  });
  return found;
}

function instances(group: THREE.Object3D, color: number): number {
  let count = 0;
  group.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && (object.material as THREE.MeshBasicMaterial).color.getHex() === color) count += object.count;
  });
  return count;
}

// refine-battle-maps 5.10: a ford is told from the deep river at a glance.
describe('battle map water', () => {
  it('ford reads as a ford', () => {
    expect(lightness(WATER_LOOK.ford.color) - lightness(WATER_LOOK.deep.color)).toBeGreaterThan(0.2);
    expect(WATER_LOOK.ford.opacity).toBeLessThan(WATER_LOOK.deep.opacity);
    const layer = new BattleMapLayer(battleMap('serra-rio'));
    const [water] = named(layer.group, 'ford-water') as THREE.Mesh[];
    expect((water!.material as THREE.MeshBasicMaterial).color.getHex()).toBe(WATER_LOOK.ford.color);
    // A gravel bar under it, a foam edge round it, stones and ripples on it.
    expect(named(layer.group, 'ford-bed')).toHaveLength(1);
    expect(named(layer.group, 'ford-edge')).toHaveLength(1);
    expect(named(layer.group, 'ford-ripple').length).toBeGreaterThan(8);
    const [ford] = named(layer.group, 'battle-map-ford');
    expect(instances(ford!, PALETTE.stone) + instances(ford!, PALETTE.stoneDark)).toBeGreaterThan(20);
  });

  it('ripples move with time', () => {
    const layer = new BattleMapLayer(battleMap('serra-rio'));
    const ripple = named(layer.group, 'ford-ripple')[0] as THREE.Mesh;
    layer.update([]);
    const before = ripple.scale.x;
    const start = performance.now();
    while (performance.now() - start < 120) {
      // wait a little view time
    }
    layer.update([]);
    expect(ripple.scale.x).not.toBe(before);
  });

  // refine-battle-maps 5.4: gravel and reeds along the banks, clear at the crossings.
  it('the banks have gravel, stones and reeds, kept clear at the crossings', () => {
    const map = battleMap('serra-rio');
    const layer = new BattleMapLayer(map);
    const [banks] = named(layer.group, 'battle-map-banks');
    expect(named(banks!, 'battle-map-gravel')).toHaveLength(2);
    expect(instances(banks!, PALETTE.reed)).toBeGreaterThan(100);
    expect(instances(banks!, PALETTE.gravelDark)).toBeGreaterThan(100);
    const near = (x: number, y: number, reach: number) => {
      let count = 0;
      const point = new THREE.Vector3();
      const matrix = new THREE.Matrix4();
      banks!.traverse((object) => {
        if (!(object instanceof THREE.InstancedMesh)) return;
        for (let index = 0; index < object.count; index += 1) {
          object.getMatrixAt(index, matrix);
          point.setFromMatrixPosition(matrix);
          if ((point.x - x) ** 2 + (point.z - y) ** 2 < reach * reach) count += 1;
        }
      });
      return count;
    };
    const ferry = map.ferries[0]!;
    expect(near(ferry.landingA.x, ferry.landingA.y, 5)).toBe(0);
    expect(near(ferry.landingB.x, ferry.landingB.y, 5)).toBe(0);
    const bridge = map.bridges[0]!;
    expect(near(bridge.x, bridge.y + 9, 2)).toBe(0);
    expect(near(bridge.x, bridge.y - 9, 2)).toBe(0);
    // The raft carries a marker, and each landing has its posts.
    expect(named(layer.group, 'ferry-marker')).toHaveLength(1);
    expect(named(layer.group, 'ferry-landing')).toHaveLength(2);
  });
});
