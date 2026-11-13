import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { compileMapDocument, createEditableMap, setActiveMap } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { BattleMapLayer } from '../src/battle-map-layer';
import { farName, ModelPlacements, type EnvironmentAsset } from '../src/environment-models';

// revise-buildings-and-stone 6.1: the model files load by what the map uses;
// at strategic span a building is drawn as its mesh without small features (D8).

afterEach(() => setActiveMap(TEST_MAP));

function mapOf(objects: { type: string; variant?: string }[], lines: { kind: 'stone-wall' | 'rail-fence'; variant?: string }[] = []) {
  const map = createEditableMap({ id: 'files', size: 'small', name: { en: 'F', 'pt-BR': 'F' } });
  objects.forEach((object, index) => map.objects.push({ id: index + 1, x: -60 + index * 20, y: 0, rotation: 0, ...object }));
  lines.forEach((line, index) => map.lines.push({ id: index + 1, height: 1.2, points: [{ x: -40, y: 40 + index * 10 }, { x: 40, y: 40 + index * 10 }], ...line }));
  const compiled = compileMapDocument(map);
  setActiveMap(compiled);
  return compiled;
}

describe('model files by what the map uses', () => {
  it("a farm in granite needs only the countryside's buildings, which are always loaded", () => {
    const layer = new BattleMapLayer(mapOf([{ type: 'farmhouse' }, { type: 'barn' }, { type: 'boulder' }, { type: 'ridge-tent', variant: 'legalist' }], [{ kind: 'stone-wall' }]));
    expect(layer.modelFiles()).toEqual(['buildings-rural']);
  });

  it("a town asks for the town's buildings and its rock kinds' stones and walls", () => {
    const layer = new BattleMapLayer(
      mapOf([{ type: 'casa-terrea' }, { type: 'church' }, { type: 'boulder', variant: 'sandstone' }], [{ kind: 'stone-wall', variant: 'basalt' }, { kind: 'rail-fence' }]),
    );
    expect(layer.modelFiles()).toEqual(['buildings-town', 'stones-basalt', 'stones-sandstone']);
  });
});

describe('strategic-band buildings', () => {
  it("a building's stand-in is its far mesh, in its variant", () => {
    const near = new THREE.BoxGeometry(8, 4, 6);
    const far = new THREE.BoxGeometry(8, 4, 6);
    const geometries = new Map([
      ['casa-terrea', near],
      ['casa-terrea.far', far],
      ['casa-terrea.far@ochre', far],
      ['boulder', near],
    ]);
    const asset = {
      geometry: (name: string) => geometries.get(name),
      materialOf: () => new THREE.MeshBasicMaterial(),
      isTree: () => false,
    } as unknown as EnvironmentAsset;
    const placements = new ModelPlacements();
    placements.add('casa-terrea', 0, 0);
    placements.add('casa-terrea@ochre', 20, 0);
    placements.add('boulder', 40, 0);
    const stood = placements.buildImpostors(asset).children as THREE.InstancedMesh[];
    expect(stood.map((mesh) => mesh.name).sort()).toEqual(['casa-terrea', 'casa-terrea@ochre']);
    expect(stood.every((mesh) => mesh.geometry === far)).toBe(true);
    expect(farName('casa-terrea@ochre')).toBe('casa-terrea.far@ochre');
  });
});
