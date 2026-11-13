import { Document } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { addFarMeshes, ownerOf, subset } from '../../tools/model-split';

// revise-buildings-and-stone 6.1: the built files split by group; each
// building's strategic-band mesh drops its small features (D8).

/** Boxes as one flat-shaded primitive: each face its own four vertices. */
function boxes(document: Document, name: string, list: [number, number, number, number, number, number][]) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [x0, y0, z0, x1, y1, z1] of list) {
    const corners = (axis: number, at: number): number[][] => {
      const [a, b] = [0, 1, 2].filter((other) => other !== axis) as [number, number];
      const lo = [x0, y0, z0];
      const hi = [x1, y1, z1];
      return [[lo[a]!, lo[b]!], [hi[a]!, lo[b]!], [hi[a]!, hi[b]!], [lo[a]!, hi[b]!]].map(([u, v]) => {
        const point = [0, 0, 0];
        point[axis] = at;
        point[a] = u!;
        point[b] = v!;
        return point;
      });
    };
    for (const axis of [0, 1, 2]) {
      for (const at of [[x0, y0, z0][axis]!, [x1, y1, z1][axis]!]) {
        const base = positions.length / 3;
        for (const point of corners(axis, at)) positions.push(...point);
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }
  const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer();
  const primitive = document
    .createPrimitive()
    .setAttribute('POSITION', document.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer))
    .setIndices(document.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer));
  const node = document.createNode(name).setMesh(document.createMesh(name).addPrimitive(primitive));
  document.getRoot().listScenes()[0]!.addChild(node);
  return node;
}

describe('model split', () => {
  it("a building's far mesh keeps its walls and roof and drops its frames and bars", () => {
    const document = new Document();
    document.createScene();
    boxes(document, 'venda', [
      [-4, 0, -3, 4, 4, 3], // the walls
      [-4.2, 4, -3.2, 4.2, 4.3, 3.2], // the roof slab, apart from the walls
      [-1, 1, 3, 1, 1.08, 3.08], // a sill
      [-0.5, 1, 3.02, -0.44, 2.2, 3.08], // a window bar
    ]);
    const counts = addFarMeshes(document, ['venda']);
    expect(counts.get('venda')).toEqual([48, 24]);
    const far = document.getRoot().listNodes().find((node) => node.getName() === 'venda.far')!;
    expect(far.getMesh()!.listPrimitives()[0]!.getIndices()!.getCount()).toBe(24 * 3);
  });

  it('a group file keeps only its models, with their markers', async () => {
    const document = new Document();
    document.createScene();
    boxes(document, 'venda', [[-4, 0, -3, 4, 4, 3]]);
    boxes(document, 'barn', [[-4, 0, -3, 4, 4, 3]]);
    document.getRoot().listScenes()[0]!.addChild(document.createNode('venda.door.front.0'));
    const town = await subset(document, (name) => ownerOf(name) === 'venda', true);
    expect(town.getRoot().listNodes().map((node) => node.getName()).sort()).toEqual(['venda', 'venda.door.front.0']);
    expect(town.getRoot().listMeshes()).toHaveLength(1);
    // The source document is left whole.
    expect(document.getRoot().listNodes()).toHaveLength(3);
  });
});
