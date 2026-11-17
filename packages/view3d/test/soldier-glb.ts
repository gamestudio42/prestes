import { Node, NodeIO, type Animation, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';

/**
 * Reads `soldier.glb` for the tests, compressed or not (improve-soldier-models
 * 1.2: `pnpm models` meshopt-compresses it), and samples its clips.
 */
export async function readSoldier(path: string): Promise<Document> {
  await MeshoptDecoder.ready;
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder }).read(path);
}

export function clipNames(document: Document): string[] {
  return document.getRoot().listAnimations().map((animation) => animation.getName());
}

function animation(document: Document, name: string): Animation {
  const found = document.getRoot().listAnimations().find((entry) => entry.getName() === name);
  if (!found) throw new Error(`no clip ${name}`);
  return found;
}

/** Every key time of a clip, in seconds. */
export function clipTimes(document: Document, name: string): number[] {
  const times = new Set<number>();
  for (const sampler of animation(document, name).listSamplers()) for (const time of sampler.getInput()!.getArray()!) times.add(Math.round(time * 1e5) / 1e5);
  return [...times].sort((a, b) => a - b);
}

type Path = 'translation' | 'rotation' | 'scale';

/** Each channel's value at `time` (seconds), keyed `<node>:<path>`. */
export function poseAt(document: Document, name: string, time: number): Map<string, number[]> {
  const pose = new Map<string, number[]>();
  for (const channel of animation(document, name).listChannels()) {
    const sampler = channel.getSampler()!;
    const input = sampler.getInput()!;
    const output = sampler.getOutput()!;
    const count = input.getCount();
    let after = 0;
    while (after < count - 1 && input.getScalar(after) < time) after += 1;
    const before = Math.max(0, after - 1);
    const t0 = input.getScalar(before);
    const t1 = input.getScalar(after);
    const a = output.getElement(before, [] as number[]);
    const b = output.getElement(after, [] as number[]);
    const k = sampler.getInterpolation() === 'STEP' || t1 <= t0 ? (time >= t1 ? 1 : 0) : Math.min(1, Math.max(0, (time - t0) / (t1 - t0)));
    const path = channel.getTargetPath() as Path;
    let value: number[];
    if (path === 'rotation') {
      const q = new THREE.Quaternion(...(a as [number, number, number, number])).slerp(new THREE.Quaternion(...(b as [number, number, number, number])), k);
      value = [q.x, q.y, q.z, q.w];
    } else {
      value = a.map((v, at) => v + (b[at]! - v) * k);
    }
    pose.set(`${channel.getTargetNode()!.getName()}:${path}`, value);
  }
  return pose;
}

/** The last value of each channel. */
export function lastPose(document: Document, name: string): Map<string, number[]> {
  const times = clipTimes(document, name);
  return poseAt(document, name, times[times.length - 1]!);
}

/**
 * World positions of points fixed in the given bones (bone space offsets),
 * with the clip's pose at `time`, by forward kinematics over the node tree.
 */
export function bonePoints(document: Document, name: string, time: number, points: Readonly<Record<string, readonly [number, number, number]>>): Map<string, THREE.Vector3> {
  const pose = poseAt(document, name, time);
  const nodes = document.getRoot().listNodes();
  const world = new Map<Node, THREE.Matrix4>();
  const worldOf = (node: Node): THREE.Matrix4 => {
    const cached = world.get(node);
    if (cached) return cached;
    const key = node.getName();
    const t = pose.get(`${key}:translation`) ?? node.getTranslation();
    const r = pose.get(`${key}:rotation`) ?? node.getRotation();
    const s = pose.get(`${key}:scale`) ?? node.getScale();
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...(t as [number, number, number])), new THREE.Quaternion(...(r as [number, number, number, number])), new THREE.Vector3(...(s as [number, number, number])));
    const parent = node.listParents().find((entry): entry is Node => entry instanceof Node);
    const matrix = parent ? worldOf(parent).clone().multiply(local) : local;
    world.set(node, matrix);
    return matrix;
  };
  const result = new Map<string, THREE.Vector3>();
  for (const [bone, offset] of Object.entries(points)) {
    const node = nodes.find((entry) => entry.getName() === bone);
    if (!node) throw new Error(`no bone ${bone}`);
    result.set(bone, new THREE.Vector3(...offset).applyMatrix4(worldOf(node)));
  }
  return result;
}
