import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { battleMap } from '@prestes/shared';
import { BattleMapLayer, lines } from '../src/battle-map-layer';
import { PALETTE } from '../src/palette';

// refine-battle-maps 5.1: a battle map's walls are the map layer's, plastered
// or stone, not the cover layer's fortification blocks.
function instancesOf(group: THREE.Group, color: number): number {
  let count = 0;
  group.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && (object.material as THREE.MeshBasicMaterial).color?.getHex() === color) count += object.count;
  });
  return count;
}

describe('battle map walls', () => {
  it('stone blocks are not drawn for battle-map walls: the Bairro walls are plastered', () => {
    const map = battleMap('bairro');
    const walls = map.covers.filter((cover) => cover.kind === 'low-wall');
    expect(walls.length).toBeGreaterThan(100);
    expect(walls.every((cover) => cover.drawnBy === 'map')).toBe(true);
    const group = lines(map);
    expect(instancesOf(group, PALETTE.whitewash)).toBeGreaterThan(walls.length);
    // Its fences are boards, drawn here too.
    expect(map.fenceStyle).toBe('boards');
    expect(instancesOf(group, PALETTE.wood)).toBeGreaterThan(0);
  });

  it('the Fazenda field wall is dry stone, its fences wire', () => {
    const map = battleMap('fazenda');
    expect(map.covers.filter((cover) => cover.kind === 'low-wall').every((cover) => cover.drawnBy === 'map')).toBe(true);
    expect(instancesOf(lines(map), PALETTE.stone)).toBeGreaterThan(0);
    expect(map.fenceStyle ?? 'wire').toBe('wire');
  });
});

// refine-battle-maps 5.2: the Bairro's placeholders have doors, shuttered
// windows, shop awnings and blank sign boards, drawn as instanced pieces.
describe('battle map buildings', () => {
  it('the Bairro has doors on the street, awnings on the shops and an open coreto', () => {
    const map = battleMap('bairro');
    const layer = new BattleMapLayer(map);
    const doors = instancesOf(layer.group, PALETTE.door);
    const shops = map.buildings.filter((building) => building.model === 'venda' || building.model === 'armazem').length;
    // Every building but the open coreto has a street door.
    expect(doors).toBeGreaterThanOrEqual(map.buildings.length - 1);
    expect(instancesOf(layer.group, PALETTE.awning) + instancesOf(layer.group, PALETTE.awningAlt)).toBe(shops);
    expect(instancesOf(layer.group, PALETTE.sign)).toBe(shops);
    let meshes = 0;
    layer.group.getObjectByName('battle-map-buildings')!.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes += 1;
    });
    // Instanced: a few dozen meshes, not one per window.
    expect(meshes).toBeLessThan(40);
  });
});
