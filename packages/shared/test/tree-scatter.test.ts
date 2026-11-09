import { describe, expect, it } from 'vitest';
import {
  BIOME_MIX,
  createEditableMap,
  isTreeObject,
  TREE_CLEARANCE,
  TREE_SPACING,
  TreeScatter,
  treeSpecies,
  treeStrokeSeed,
  treesUnder,
  type EditableMap,
  type ScatteredTree,
} from '../src';

// refine-map-editor 5.1: the trees tool's seeded Poisson-disc scatter.

function flat(): EditableMap {
  const map = createEditableMap({ id: 'grove', size: 'small', name: { en: 'G', 'pt-BR': 'G' } });
  map.rivers.push({ id: 1, width: 10, points: [{ x: -120, y: 30 }, { x: 120, y: 30 }], kinds: ['deep'] });
  map.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: false, right: false }, points: [{ x: 0, y: -120 }, { x: 0, y: 120 }] });
  map.objects.push({ id: 1, type: 'farmhouse', x: -20, y: 0, rotation: 0 });
  return map;
}

/** A 20 m stroke along y = 10 (the river is 15 m south of it, the road across it). */
function stroke(map: EditableMap, seed: number, density: 'sparse' | 'medium' | 'dense' = 'medium'): ScatteredTree[] {
  const scatter = new TreeScatter(map, { radius: 12, biome: 'cerrado', density, seed });
  for (let x = -10; x <= 10; x += 3) scatter.dab(x, 10);
  return scatter.trees;
}

describe('tree scatter', () => {
  it('spacing: no two trees closer than the density spacing, none in water, on the road or by the house', () => {
    const map = flat();
    for (const density of ['sparse', 'medium', 'dense'] as const) {
      const trees = stroke(map, 7, density);
      expect(trees.length).toBeGreaterThan(density === 'sparse' ? 2 : 8);
      for (let a = 0; a < trees.length; a += 1) {
        for (let b = a + 1; b < trees.length; b += 1) {
          expect(Math.hypot(trees[a]!.x - trees[b]!.x, trees[a]!.y - trees[b]!.y)).toBeGreaterThanOrEqual(Math.max(TREE_CLEARANCE, TREE_SPACING[density]));
        }
      }
      for (const tree of trees) {
        expect(Math.abs(tree.y - 30)).toBeGreaterThan(5);
        expect(Math.abs(tree.x)).toBeGreaterThan(2.5);
        // At least 2 m from the farmhouse's footprint (4.35 x 2.85 m half sizes).
        const away = Math.hypot(Math.max(0, Math.abs(tree.x + 20) - 4.35), Math.max(0, Math.abs(tree.y) - 2.85));
        expect(away).toBeGreaterThanOrEqual(TREE_CLEARANCE);
        expect(BIOME_MIX.cerrado.map((entry) => entry.type)).toContain(tree.type);
      }
    }
  });

  it('seed: the same map id and stroke number give the same trees; another stroke gives others', () => {
    const map = flat();
    expect(treeStrokeSeed('grove', 3)).toBe(treeStrokeSeed('grove', 3));
    expect(treeStrokeSeed('grove', 3)).not.toBe(treeStrokeSeed('grove', 4));
    expect(stroke(map, treeStrokeSeed('grove', 1))).toEqual(stroke(map, treeStrokeSeed('grove', 1)));
    expect(stroke(map, treeStrokeSeed('grove', 1))).not.toEqual(stroke(map, treeStrokeSeed('grove', 2)));
  });

  it('keeps clear of trees already standing, and the eraser finds the trees under the brush', () => {
    const map = flat();
    const first = stroke(map, 11);
    first.forEach((tree, index) => map.objects.push({ id: 10 + index, ...tree }));
    const second = stroke(map, 12);
    for (const tree of second) for (const old of first) expect(Math.hypot(tree.x - old.x, tree.y - old.y)).toBeGreaterThanOrEqual(TREE_SPACING.medium);
    const under = treesUnder(map, 5, 10, 6);
    expect(under.length).toBeGreaterThan(0);
    for (const id of under) {
      const object = map.objects.find((entry) => entry.id === id)!;
      expect(isTreeObject(object)).toBe(true);
      expect(Math.hypot(object.x - 5, object.y - 10)).toBeLessThanOrEqual(6);
    }
    // The house is never erased.
    expect(treesUnder(map, -20, 0, 30)).not.toContain(1);
  });

  it('every biome draws only catalog trees', () => {
    const species = treeSpecies();
    for (const mix of Object.values(BIOME_MIX)) for (const entry of mix) expect(species).toContain(entry.type);
  });
});
