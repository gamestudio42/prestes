import type { Document, Mesh, Node } from '@gltf-transform/core';
import { cloneDocument, prune } from '@gltf-transform/functions';

/**
 * revise-buildings-and-stone 6.1: the model files split by group, and the
 * buildings' strategic-band meshes (D8), made from the built files when
 * `tools/prepare-models.ts` prepares them for the game.
 */

/** The model a node of a built file belongs to: `armazem.door.front.0` and `boulder@basalt` are `armazem` and `boulder`. */
export const ownerOf = (name: string): string => name.split(/[.@]/)[0]!;

/** The variant a node's name carries (`boulder@basalt` is `basalt`), or null. */
export const variantOf = (name: string): string | null => name.split('@')[1] ?? null;

/**
 * A copy of a document with only the scene nodes `keep` accepts, the rest
 * and whatever only they used pruned away (`keepLeaves`: the buildings'
 * marker empties).
 */
export async function subset(document: Document, keep: (name: string) => boolean, keepLeaves: boolean): Promise<Document> {
  const copy = cloneDocument(document);
  for (const node of copy.getRoot().listNodes()) {
    if (!node.getParentNode() && !keep(node.getName())) node.dispose();
  }
  await copy.transform(prune({ keepLeaves }));
  return copy;
}

/** A piece smaller than this (m) along its second-longest side, or this long at most, is a small feature. */
const THIN = 0.25;
const SHORT = 0.45;

/**
 * D8: each building's strategic-band mesh, `<model>.far`, beside its own:
 * the same model without its small features (frames, trims, bars, sills),
 * the pieces whose welded island is thin or short. The full mesh stays for
 * the tactical band. Returns the triangles before and after, per model.
 */
export function addFarMeshes(document: Document, models: readonly string[]): Map<string, [number, number]> {
  const counts = new Map<string, [number, number]>();
  const root = document.getRoot();
  const scene = root.listScenes()[0]!;
  for (const node of root.listNodes()) {
    const name = node.getName();
    const mesh = node.getMesh();
    if (node.getParentNode() || !mesh || !models.includes(name)) continue;
    const far = farMesh(document, mesh, name);
    if (!far) continue;
    const copy = document.createNode(`${name}.far`).setMesh(far.mesh).setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale());
    scene.addChild(copy as Node);
    counts.set(name, [far.before, far.after]);
  }
  return counts;
}

function farMesh(document: Document, mesh: Mesh, name: string): { mesh: Mesh; before: number; after: number } | null {
  const far = document.createMesh(`${name}.far`);
  let before = 0;
  let after = 0;
  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute('POSITION');
    const indices = primitive.getIndices();
    if (!position || !indices) return null;
    const triangles = indices.getCount() / 3;
    before += triangles;
    const keep = keptTriangles(position.getArray() as Float32Array, indices.getArray() as Uint16Array | Uint32Array);
    const kept: number[] = [];
    for (let t = 0; t < triangles; t += 1) if (keep[t]) kept.push(indices.getScalar(t * 3), indices.getScalar(t * 3 + 1), indices.getScalar(t * 3 + 2));
    after += kept.length / 3;
    const copy = primitive.clone();
    const ArrayType = position.getCount() > 65535 ? Uint32Array : Uint16Array;
    copy.setIndices(document.createAccessor().setType('SCALAR').setArray(new ArrayType(kept)).setBuffer(indices.getBuffer()));
    far.addPrimitive(copy);
  }
  return { mesh: far, before, after };
}

/** Which triangles stand in welded islands large enough to see from far off. */
function keptTriangles(positions: Float32Array, indices: ArrayLike<number>): boolean[] {
  const count = positions.length / 3;
  // Weld vertices at the same place (flat-shaded faces each have their own).
  const weld = new Map<string, number>();
  const parent = new Int32Array(count);
  const welded = new Int32Array(count);
  for (let v = 0; v < count; v += 1) {
    const key = `${positions[v * 3]!.toFixed(4)},${positions[v * 3 + 1]!.toFixed(4)},${positions[v * 3 + 2]!.toFixed(4)}`;
    let id = weld.get(key);
    if (id === undefined) weld.set(key, (id = v));
    welded[v] = id;
    parent[v] = v;
  }
  const find = (v: number): number => {
    while (parent[v] !== v) v = parent[v] = parent[parent[v]!]!;
    return v;
  };
  const join = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const triangles = indices.length / 3;
  for (let t = 0; t < triangles; t += 1) {
    const a = welded[indices[t * 3]!]!;
    join(a, welded[indices[t * 3 + 1]!]!);
    join(a, welded[indices[t * 3 + 2]!]!);
  }
  const boxes = new Map<number, number[]>();
  for (let v = 0; v < count; v += 1) {
    const island = find(welded[v]!);
    const box = boxes.get(island) ?? [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let axis = 0; axis < 3; axis += 1) {
      box[axis] = Math.min(box[axis]!, positions[v * 3 + axis]!);
      box[axis + 3] = Math.max(box[axis + 3]!, positions[v * 3 + axis]!);
    }
    boxes.set(island, box);
  }
  const large = new Map<number, boolean>();
  for (const [island, box] of boxes) {
    const sides = [box[3]! - box[0]!, box[4]! - box[1]!, box[5]! - box[2]!].sort((a, b) => b - a);
    large.set(island, sides[0]! > SHORT && sides[1]! > THIN);
  }
  const keep: boolean[] = [];
  for (let t = 0; t < triangles; t += 1) keep.push(large.get(find(welded[indices[t * 3]!]!)) ?? true);
  return keep;
}
