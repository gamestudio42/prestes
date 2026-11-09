import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { fileURLToPath } from 'node:url';
import { CATALOG_OBJECTS } from '@prestes/shared';

// refine-map-editor 5.2: the trees adapted from the owner's Refloreste models.
const FILE = fileURLToPath(new URL('../../../apps/game/public/models/trees.glb', import.meta.url));

describe('tree models', () => {
  it('each tree is one vertex-coloured mesh of 300 to 800 triangles (the bush under 300), standing on the origin at its catalog height', async () => {
    const document = await new NodeIO().read(FILE);
    const meshes = new Map<string, { triangles: number; colours: boolean; min: number[]; max: number[]; foot: number[][] }>();
    for (const node of document.getRoot().listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      let triangles = 0;
      let colours = true;
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION')!;
        triangles += (primitive.getIndices()?.getCount() ?? position.getCount()) / 3;
        colours &&= primitive.getAttribute('COLOR_0') !== null;
        const low = position.getMin([]);
        const high = position.getMax([]);
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis]!, low[axis]!);
          max[axis] = Math.max(max[axis]!, high[axis]!);
        }
      }
      // The trunk's foot: the lowest 5% of the tree (hand check 2026-11-09: the buriti stood off its trunk).
      const foot: number[][] = [];
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION')!;
        for (let index = 0; index < position.getCount(); index += 1) {
          const vertex = position.getElement(index, []);
          if (vertex[1]! <= min[1]! + (max[1]! - min[1]!) * 0.05) foot.push(vertex);
        }
      }
      meshes.set(node.getName(), { triangles, colours, min, max, foot });
    }
    expect([...meshes.keys()].sort()).toEqual(['buriti', 'bush', 'cerrado-tree', 'tree-araucaria', 'tree-broad']);
    for (const [name, mesh] of meshes) {
      if (name === 'bush') expect(mesh.triangles).toBeLessThan(300);
      else {
        expect(mesh.triangles).toBeGreaterThanOrEqual(300);
        expect(mesh.triangles).toBeLessThanOrEqual(800);
      }
      expect(mesh.colours).toBe(true);
      // Y up: the base on the ground, the top at the catalog height (within 5%).
      const height = CATALOG_OBJECTS.find((entry) => entry.model === name)!.height;
      expect(mesh.min[1]).toBeCloseTo(0, 2);
      expect(Math.abs(mesh.max[1]! - height) / height).toBeLessThan(0.05);
      // Trees stand on their trunk's foot; the bush on its middle.
      const footX = mesh.foot.reduce((sum, vertex) => sum + vertex[0]!, 0) / mesh.foot.length;
      const footZ = mesh.foot.reduce((sum, vertex) => sum + vertex[2]!, 0) / mesh.foot.length;
      if (name !== 'bush') expect(Math.hypot(footX, footZ)).toBeLessThan(0.05);
      else expect(Math.abs(mesh.min[0]! + mesh.max[0]!)).toBeLessThan(0.5);
      // The bush spreads about 2.6 m, near its 2.8 m footprint (hand check 2026-11-09).
      if (name === 'bush') expect(Math.max(mesh.max[0]! - mesh.min[0]!, mesh.max[2]! - mesh.min[2]!)).toBeCloseTo(2.6, 1);
    }
  });
});
