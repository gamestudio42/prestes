import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { compileMapDocument, createEditableMap, fromMapDocument, toMapDocument, setActiveMap, vegetationCell, VEGETATION_KINDS, type BattleMap } from '@prestes/shared';
import { BattleMapLayer } from '../src/battle-map-layer';
import { clumpGeometry, plantGeometry, plantSpots, STRATEGIC_CLUMP_CAP } from '../src/plant-meshes';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';

// refine-map-editor 3.2: plants are code-built meshes, corn in rows, capim as blades.
afterEach(() => setActiveMap(TEST_MAP));

function fieldMap(kind: 'corn' | 'tall-grass', density = 0): BattleMap {
  const map = createEditableMap({ id: 'plants', size: 'small', name: { en: 'P', 'pt-BR': 'P' } });
  const code = vegetationCell(VEGETATION_KINDS.indexOf(kind) + 1, density);
  // A 40 x 20 m field, its long axis along x.
  for (let y = 100; y < 120; y += 1) for (let x = 100; x < 140; x += 1) map.vegetation[y * 240 + x] = code;
  const compiled = compileMapDocument(map);
  setActiveMap(compiled);
  return compiled;
}

function triangles(geometry: THREE.BufferGeometry): THREE.Vector3[][] {
  const position = geometry.getAttribute('position');
  const out: THREE.Vector3[][] = [];
  for (let index = 0; index < position.count; index += 3) {
    out.push([0, 1, 2].map((corner) => new THREE.Vector3().fromBufferAttribute(position, index + corner)));
  }
  return out;
}

describe('plant meshes', () => {
  it('density (author-game-maps): the look only; dense draws more plants, sparse fewer, the raster keeps the kind', () => {
    const counts = [0, 1, 2].map((density) => {
      const map = fieldMap('tall-grass', density);
      expect(map.raster!.vegetation[110 * 240 + 120]).toBe(VEGETATION_KINDS.indexOf('tall-grass') + 1);
      expect(map.raster!.vegetationDensity?.[110 * 240 + 120] ?? 0).toBe(density);
      return plantSpots(map, 'tall-grass', 1924).length;
    });
    const [normal, sparse, dense] = counts as [number, number, number];
    expect(dense).toBeGreaterThan(normal * 2.5);
    expect(sparse).toBeLessThan(normal * 0.65);
    expect(sparse).toBeGreaterThan(normal * 0.3);
  });

  it('density survives the saved document', () => {
    const map = createEditableMap({ id: 'plants', size: 'small', name: { en: 'P', 'pt-BR': 'P' } });
    map.vegetation[5] = vegetationCell(4, 2);
    expect(fromMapDocument(JSON.parse(JSON.stringify(toMapDocument(map)))).vegetation[5]).toBe(vegetationCell(4, 2));
  });

  it('corn in rows: stalks stand in parallel rows along the field, with leaves and a tassel', () => {
    const map = fieldMap('corn');
    const spots = plantSpots(map, 'corn', 1924);
    expect(spots.length).toBeGreaterThan(800);
    // Rows run along x (the field's long axis): every stalk's y sits on a row line 0.9 m apart.
    const rows = new Map<number, number>();
    const first = spots[0]!.y;
    for (const spot of spots) {
      const row = Math.round((spot.y - first) / 0.9);
      expect(Math.abs(spot.y - first - row * 0.9)).toBeLessThan(0.07);
      rows.set(row, (rows.get(row) ?? 0) + 1);
    }
    expect(rows.size).toBeGreaterThanOrEqual(20);
    // A plant reaches above 2 m (the tassel) and has leaves out to the side.
    const box = new THREE.Box3().setFromBufferAttribute(plantGeometry('corn').getAttribute('position') as THREE.BufferAttribute);
    expect(box.max.y).toBeGreaterThan(2.05);
    expect(box.max.x - box.min.x).toBeGreaterThan(0.6);
  });

  it('capim as blades: a fan of thin triangles from one base, no cone', () => {
    const blades = triangles(plantGeometry('tall-grass'));
    expect(blades.length).toBeGreaterThanOrEqual(8);
    expect(blades.length).toBeLessThanOrEqual(14);
    for (const blade of blades) {
      // Two corners at the base, one tip up and out.
      const base = blade.filter((vertex) => vertex.y < 0.01);
      expect(base).toHaveLength(2);
      expect(base[0]!.distanceTo(base[1]!)).toBeLessThan(0.06);
      const tip = blade.find((vertex) => vertex.y > 0.5)!;
      expect(Math.hypot(tip.x, tip.z)).toBeGreaterThan(0.1);
    }
    // No vegetation geometry is a cone.
    for (const kind of VEGETATION_KINDS) {
      expect(plantGeometry(kind)).not.toBeInstanceOf(THREE.ConeGeometry);
      expect(clumpGeometry(kind)).not.toBeInstanceOf(THREE.ConeGeometry);
    }
  });

  it('editing elsewhere leaves a field as it was; objects show themselves, not scrub', () => {
    // refine-map-editor 7.3: bushes added later moved the plants already there.
    const editable = createEditableMap({ id: 'plants', size: 'small', name: { en: 'P', 'pt-BR': 'P' } });
    const scrub = VEGETATION_KINDS.indexOf('scrub') + 1;
    for (let y = 100; y < 120; y += 1) for (let x = 100; x < 120; x += 1) editable.vegetation[y * 240 + x] = scrub;
    const before = plantSpots(compileMapDocument(editable), 'scrub', 7);
    expect(before.length).toBeGreaterThan(20);
    // A second scrub field, a bush and a cactus elsewhere.
    for (let y = 30; y < 50; y += 1) for (let x = 30; x < 60; x += 1) editable.vegetation[y * 240 + x] = scrub;
    editable.objects.push({ id: 1, type: 'bush', x: 60, y: 60, rotation: 0 }, { id: 2, type: 'xique-xique', x: 80, y: 60, rotation: 0 }, { id: 3, type: 'cerrado-tree', x: 90, y: 40, rotation: 0 });
    const after = plantSpots(compileMapDocument(editable), 'scrub', 7);
    const inFirst = after.filter((spot) => spot.x > -21 && spot.x < 1 && spot.y > -21 && spot.y < 1);
    expect(inFirst).toEqual(before);
    // No scrub plants round the bush, the cactus or the tree: the objects stand for it.
    for (const object of editable.objects) {
      expect(after.some((spot) => Math.hypot(spot.x - (object.x - 120), spot.y - (object.y - 120)) < 3)).toBe(false);
    }
  });

  it('a field thins out in its last metre', () => {
    const map = fieldMap('tall-grass');
    const spots = plantSpots(map, 'tall-grass', 1924);
    const inner = spots.filter((spot) => spot.x > -18 && spot.x < 18 && spot.y > -18 && spot.y < -2).length;
    const edge = spots.filter((spot) => spot.x < -19 || spot.x > 19).length;
    // 36 x 16 m inside, about 2 x 20 m on the edges at half density.
    expect(inner / (36 * 16)).toBeGreaterThan(0.8);
    expect(edge / 40).toBeLessThan(0.75);
  });

  it('a farm shows plants up close and capped clumps at strategic span', () => {
    // author-game-maps 3.1: a field of each kind on a small authored map.
    const editable = createEditableMap({ id: 'farm', size: 'small', name: { en: 'F', 'pt-BR': 'F' } });
    VEGETATION_KINDS.forEach((_, index) => {
      for (let y = 20; y < 60; y += 1) for (let x = 10 + index * 55; x < 55 + index * 55; x += 1) editable.vegetation[y * 240 + x] = index + 1;
    });
    const fazenda = compileMapDocument(editable);
    setActiveMap(fazenda);
    const layer = new BattleMapLayer(fazenda);
    const meshes: THREE.InstancedMesh[] = [];
    layer.group.traverse((object) => {
      if (object instanceof THREE.InstancedMesh && object.name.startsWith('vegetation')) meshes.push(object);
    });
    const plants = meshes.filter((mesh) => mesh.name.startsWith('vegetation:'));
    const clumps = meshes.filter((mesh) => mesh.name.startsWith('vegetation-clumps:'));
    expect(plants.map((mesh) => mesh.name).sort()).toEqual(['vegetation:cane', 'vegetation:corn', 'vegetation:scrub', 'vegetation:tall-grass']);
    layer.tick(1, 80);
    expect(plants.every((mesh) => mesh.visible) && clumps.every((mesh) => !mesh.visible)).toBe(true);
    layer.tick(2, 240);
    expect(plants.every((mesh) => !mesh.visible) && clumps.every((mesh) => mesh.visible)).toBe(true);
    for (const clump of clumps) expect(clump.count).toBeLessThanOrEqual(STRATEGIC_CLUMP_CAP);
  });
});
