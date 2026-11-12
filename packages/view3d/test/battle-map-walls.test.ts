import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { battleMap, compileMapDocument, createEditableMap, toMapDocument, type BattleMap } from '@prestes/shared';
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

// author-game-maps 3.1: a small authored street, for the plastered walls, board fences and shopfronts.
function street(): BattleMap {
  const map = createEditableMap({ id: 'street', size: 'small', name: { en: 'S', 'pt-BR': 'S' } });
  map.lines.push(
    { id: 1, kind: 'brick-wall', height: 2, points: [{ x: -40, y: 20 }, { x: 40, y: 20 }] },
    { id: 2, kind: 'board-fence', height: 1.8, points: [{ x: -40, y: 30 }, { x: 40, y: 30 }] },
  );
  map.objects.push(
    { id: 1, type: 'casa-terrea', x: -30, y: 0, rotation: 0 },
    { id: 2, type: 'venda', x: -10, y: 0, rotation: 0 },
    { id: 3, type: 'armazem', x: 12, y: 0, rotation: 0 },
    { id: 4, type: 'coreto', x: 35, y: -30, rotation: 0 },
  );
  return compileMapDocument(toMapDocument(map));
}

describe('battle map walls', () => {
  it('stone blocks are not drawn for battle-map walls: a brick wall is plastered, a board fence boards', () => {
    const map = street();
    const walls = map.covers.filter((cover) => cover.kind === 'low-wall');
    expect(walls.length).toBeGreaterThan(0);
    expect(walls.every((cover) => cover.drawnBy === 'map')).toBe(true);
    const group = lines(map);
    expect(instancesOf(group, PALETTE.whitewash)).toBeGreaterThan(walls.length);
    expect(instancesOf(group, PALETTE.wood)).toBeGreaterThan(0);
  });

  it('the test map field walls are dry stone', () => {
    const map = battleMap('campo-de-provas');
    expect(map.covers.filter((cover) => cover.kind === 'low-wall').every((cover) => cover.drawnBy === 'map')).toBe(true);
    expect(instancesOf(lines(map), PALETTE.stone)).toBeGreaterThan(0);
  });
});

// revise-buildings-and-stone 3.3: every catalog building is a model now; the
// street's buildings are placed as models and no coded box is drawn for them.
describe('battle map buildings', () => {
  it('the street buildings are placed as their models, not drawn as boxes', () => {
    const map = street();
    const layer = new BattleMapLayer(map);
    let meshes = 0;
    layer.group.getObjectByName('battle-map-buildings')!.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes += 1;
    });
    expect(meshes).toBe(0);
    // An asset with no geometry reports every placed model as missing.
    const placed = (layer as unknown as { placements: { missing: (asset: { geometry: () => undefined }) => string[] } }).placements.missing({
      geometry: () => undefined,
    });
    expect(placed).toEqual(expect.arrayContaining(map.buildings.map((building) => building.model)));
  });
});
