import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { allCoverSlots, compileMapDocument, createEditableMap, setActiveMap, terrainHeightAt, battleMap } from '@prestes/shared';
import { trenchWorks } from '../src/battle-map-layer';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';

// refine-map-editor 2.4: trench lines are drawn by the map layer on the simulation's cut.
afterEach(() => setActiveMap(TEST_MAP));

function trenchMap() {
  const map = createEditableMap({ id: 'trench-view', size: 'small', name: { en: 'T', 'pt-BR': 'T' } });
  map.trenches.push({ id: 1, kind: 'fire', depth: 1.2, facing: 'left', bays: true, parapet: 'sandbag', points: [{ x: -20, y: 0 }, { x: 20, y: 0 }] });
  map.trenches.push({ id: 2, kind: 'communication', depth: 0.8, facing: 'left', bays: false, parapet: 'earth', points: [{ x: 0, y: 0.75 }, { x: 0, y: 30 }] });
  const compiled = compileMapDocument(map);
  setActiveMap(compiled);
  return compiled;
}

function heights(mesh: THREE.Mesh): number[] {
  const position = mesh.geometry.getAttribute('position');
  return Array.from({ length: position.count }, (_, index) => position.getY(index));
}

describe('trench works', () => {
  it('a man on the floor is drawn below the ground, inside revetted walls', () => {
    const map = trenchMap();
    const group = trenchWorks(map);
    const slot = allCoverSlots(map.covers).find((candidate) => Math.abs(candidate.x) < 2)!;
    // A man is drawn at the ground height where he stands: in the cut.
    expect(terrainHeightAt(slot.x, slot.y)).toBeLessThan(-0.3);
    const floors = group.children.filter((child): child is THREE.Mesh => child.name === 'trench-floor');
    expect(floors).toHaveLength(2);
    expect(Math.max(...heights(floors[0]!))).toBeLessThan(0);
    const walls = group.children.filter((child): child is THREE.Mesh => child.name === 'trench-revetment');
    expect(walls).toHaveLength(4);
    // Each wall rises from the floor to above the floor's edge.
    const wall = heights(walls[0]!);
    expect(Math.max(...wall) - Math.min(...wall)).toBeGreaterThan(0.2);
  });

  it('draws sandbags, duckboards and traverses as instanced pieces', () => {
    const group = trenchWorks(trenchMap());
    const instanced = group.children.filter((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);
    // Duckboards, sandbag courses and traverses (earth): three colours of boxes.
    expect(instanced.length).toBeGreaterThanOrEqual(3);
    expect(instanced.reduce((sum, mesh) => sum + mesh.count, 0)).toBeGreaterThan(100);
  });

  it('the test map draws its trench line', () => {
    const map = battleMap('campo-de-provas');
    setActiveMap(map);
    expect(map.trenches).toHaveLength(1);
    const group = trenchWorks(map);
    expect(group.children.filter((child) => child.name === 'trench-floor')).toHaveLength(1);
    // Its fire trench has an earth parapet: a parapet ribbon.
    expect(group.children.filter((child) => child.name === 'trench-parapet').length).toBeGreaterThan(0);
    // The map layer draws it; the cover layer leaves its pieces alone.
    const built = map.covers.filter((cover) => cover.kind === 'trench' && !cover.ditch);
    expect(built.length).toBeGreaterThan(0);
    expect(built.every((cover) => cover.drawnBy === 'map')).toBe(true);
  });
});
