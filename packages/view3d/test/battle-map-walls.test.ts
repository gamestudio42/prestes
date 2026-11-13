import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { battleMap, compileMapDocument, createEditableMap, setActiveMap, terrainHeightAt, toMapDocument, type BattleMap } from '@prestes/shared';
import { BattleMapLayer, lines } from '../src/battle-map-layer';
import { PALETTE } from '../src/palette';
import { buildingModelName, placeStoneWalls, STONE_WALL_PIECE } from '../src/structures-layer';
import { ModelPlacements } from '../src/environment-models';
import { hillside } from '../../shared/test/fixtures/hillside';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';

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
    expect(placedModels(new BattleMapLayer(map))).toContain('dry-wall');
  });

  // revise-buildings-and-stone 4.2: a dry stone wall down a hillside is its
  // rock kind's model in pieces of at most 2 m, each sunk deeper than the
  // ground falls away under its ends, so no gap shows under it.
  it('a dry stone wall follows a slope with no gap under it', () => {
    const map = hillside('basalt');
    setActiveMap(map);
    const placements = new ModelPlacements();
    placeStoneWalls({ lines: (map.lines ?? []).filter((line) => line.points[0]!.x === 0) }, placements);
    const matrices = (placements as unknown as { matrices: Map<string, THREE.Matrix4[]> }).matrices;
    expect([...matrices.keys()]).toEqual(['dry-wall@basalt']);
    const pieces = matrices.get('dry-wall@basalt')!;
    expect(pieces).toHaveLength(40);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    for (const matrix of pieces) {
      matrix.decompose(position, new THREE.Quaternion(), scale);
      const length = scale.x * STONE_WALL_PIECE;
      expect(length).toBeLessThanOrEqual(2.1);
      expect(position.y).toBeCloseTo(terrainHeightAt(position.x, position.z), 5);
      // The model reaches 0.3 m below its base at height 1, stretched to the line's.
      const footing = 0.3 * scale.y;
      for (const end of [-1, 1]) expect(position.y - terrainHeightAt(position.x, position.z + (end * length) / 2)).toBeLessThan(footing);
    }
    setActiveMap(TEST_MAP);
  });
});

// revise-buildings-and-stone 5.2: a camp object on the government's side is its model in their looks.
describe('camp sides', () => {
  it("the government's ammunition boxes are placed in their looks, the Column's as built", () => {
    const base = street();
    const map = { ...base, props: [{ model: 'ammo-boxes', x: 0, y: 40 }, { model: 'ammo-boxes', x: 4, y: 40, side: 'legalist' as const }, { model: 'aid-tent', x: 8, y: 40 }] };
    expect(placedModels(new BattleMapLayer(map))).toEqual(expect.arrayContaining(['ammo-boxes', 'ammo-boxes@legalist', 'aid-tent']));
  });
});

function placedModels(layer: BattleMapLayer): string[] {
  return (layer as unknown as { placements: { missing: (asset: { geometry: () => undefined }) => string[] } }).placements.missing({ geometry: () => undefined });
}

// revise-buildings-and-stone 3.6: every building is its model, placed by the
// structures layer; no coded box is drawn for any of them.
describe('battle map buildings', () => {
  it('the street buildings are placed as their models, in their looks, not drawn as boxes', () => {
    const base = street();
    const map = { ...base, buildings: base.buildings.map((building, index) => (index === 1 ? { ...building, variant: 'adobe' as const } : building)) };
    const layer = new BattleMapLayer(map);
    expect(layer.group.getObjectByName('battle-map-buildings')).toBeUndefined();
    // An asset with no geometry reports every placed model as missing.
    const placed = (layer as unknown as { placements: { missing: (asset: { geometry: () => undefined }) => string[] } }).placements.missing({
      geometry: () => undefined,
    });
    expect(placed).toEqual(expect.arrayContaining(map.buildings.map(buildingModelName)));
    expect(placed).toContain(`${map.buildings[1]!.model}@adobe`);
  });

  // revise-buildings-and-stone 4.1: a stone is its rock kind's model.
  it('stones are placed as their rock kind models', () => {
    const base = street();
    const map = {
      ...base,
      props: [
        { model: 'boulder', x: 0, y: 40 },
        { model: 'outcrop', x: 10, y: 40, kind: 'basalt' as const },
      ],
    };
    const layer = new BattleMapLayer(map);
    const placed = (layer as unknown as { placements: { missing: (asset: { geometry: () => undefined }) => string[] } }).placements.missing({
      geometry: () => undefined,
    });
    expect(placed).toEqual(expect.arrayContaining(['boulder', 'outcrop@basalt']));
  });
});
