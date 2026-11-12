import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { compileMapDocument, createEditableMap, setActiveMap } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { BattleMapLayer } from '../src/battle-map-layer';
import { impostorGeometry, ModelLibrary, ModelPlacements, type EnvironmentAsset } from '../src/environment-models';

// biome-trees-and-plants 4.1: the biome tree files load by the map's species; strategic stand-ins.

afterEach(() => setActiveMap(TEST_MAP));

/** A model file's scene: one coloured mesh per name, `height` tall. */
function scene(names: readonly string[], height = 6): THREE.Object3D {
  const root = new THREE.Group();
  for (const name of names) {
    const geometry = new THREE.CylinderGeometry(1.5, 0.3, height, 8).translate(0, height / 2, 0);
    const count = geometry.getAttribute('position').count;
    const colours = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) colours.set([0.2, 0.5, 0.15], index * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const mesh = new THREE.Mesh(geometry);
    mesh.name = name;
    root.add(mesh);
  }
  return root;
}

function caatingaMap() {
  const map = createEditableMap({ id: 'sertao', size: 'small', name: { en: 'S', 'pt-BR': 'S' } });
  map.objects.push({ id: 1, type: 'umbuzeiro', x: 0, y: 0, rotation: 0 });
  map.objects.push({ id: 2, type: 'mandacaru', x: 10, y: 0, rotation: 0 });
  map.objects.push({ id: 3, type: 'bush-caatinga-head-a', x: -10, y: 0, rotation: 0 });
  map.objects.push({ id: 4, type: 'rock-small', x: 0, y: 10, rotation: 0 });
  const compiled = compileMapDocument(map);
  setActiveMap(compiled);
  return compiled;
}

describe('biome tree files', () => {
  it('a caatinga map asks for the caatinga file only, never the Atlantic forest one', async () => {
    const layer = new BattleMapLayer(caatingaMap());
    expect(layer.modelFiles()).toEqual(['trees-caatinga']);
    const requested: string[] = [];
    const library = new ModelLibrary(async (url) => {
      requested.push(url);
      return scene(['umbuzeiro', 'mandacaru', 'bush-caatinga-head-a']);
    }, './models/');
    expect(library.has(layer.modelFiles())).toBe(false);
    await library.include(layer.modelFiles());
    // Asked again (the editor recompiles on every edit), the file is not fetched twice.
    await library.include(layer.modelFiles());
    expect(requested).toEqual(['./models/trees-caatinga.glb']);
    expect(library.has(['trees-caatinga'])).toBe(true);
    expect(library.isColoured('umbuzeiro')).toBe(true);
    expect(library.geometry('mandacaru')).toBeDefined();
  });

  it('a file that failed to load is asked for again', async () => {
    let calls = 0;
    const library = new ModelLibrary(async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return scene(['ipe']);
    }, '');
    await expect(library.include(['trees-cerrado'])).rejects.toThrow('offline');
    await library.include(['trees-cerrado']);
    expect(library.has(['trees-cerrado'])).toBe(true);
  });
});

describe('strategic stand-ins', () => {
  it('a tree becomes an icosahedron crown over a box trunk in its own greens, under 40 triangles', () => {
    const model = (scene(['ipe']).children[0] as THREE.Mesh).geometry;
    const impostor = impostorGeometry(model);
    expect(impostor.getAttribute('position').count / 3).toBeLessThan(40);
    impostor.computeBoundingBox();
    expect(impostor.boundingBox!.max.y).toBeCloseTo(6, 1);
    const colour = impostor.getAttribute('color');
    expect(colour.getY(0)).toBeCloseTo(0.5, 2);
  });

  it('only trees get stand-ins; a cart keeps its model at any span', () => {
    const tree = scene(['ipe']).children[0] as THREE.Mesh;
    const cart = new THREE.BoxGeometry(1, 1, 2);
    const material = new THREE.MeshBasicMaterial();
    const asset: EnvironmentAsset = {
      geometry: (name) => (name === 'ipe' ? tree.geometry : name === 'cart' ? cart : undefined),
      material,
      materialOf: () => material,
      isTree: (name) => name === 'ipe',
      include: async () => undefined,
      has: () => true,
    };
    const placements = new ModelPlacements();
    placements.add('ipe', 0, 0);
    placements.add('ipe', 5, 0);
    placements.add('cart', 0, 5);
    const impostors = placements.buildImpostors(asset);
    expect(impostors.children.map((mesh) => [mesh.name, (mesh as THREE.InstancedMesh).count])).toEqual([['ipe', 2]]);
  });

  it('at strategic span the layer shows the stand-ins in place of the trees', () => {
    const layer = new BattleMapLayer(caatingaMap());
    const library = new ModelLibrary(async () => new THREE.Group(), '');
    const umbuzeiro = (scene(['umbuzeiro']).children[0] as THREE.Mesh).geometry;
    const material = new THREE.MeshBasicMaterial();
    const asset: EnvironmentAsset = {
      geometry: (name) => (name === 'umbuzeiro' ? umbuzeiro : library.geometry(name)),
      material,
      materialOf: () => material,
      isTree: (name) => name === 'umbuzeiro',
      include: async () => undefined,
      has: () => true,
    };
    layer.useModels(asset);
    const impostors = layer.group.getObjectByName('battle-map-tree-impostors')!;
    const tree = layer.group.children.flatMap((child) => child.children).find((mesh) => mesh.name === 'umbuzeiro' && mesh.parent !== impostors)!;
    layer.tick(0, 60);
    expect([tree.visible, impostors.visible]).toEqual([true, false]);
    layer.tick(0, 200);
    expect([tree.visible, impostors.visible]).toEqual([false, true]);
  });
});
