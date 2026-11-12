import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEATH_POSE } from '../src/soldier-clips';

/**
 * soldier-animation-and-textures 1.2: every death clip of the exported
 * soldier ends in one of the corpse poses, and there are at least four.
 * Reads the glTF animation channels straight from `soldier.glb`.
 */
const FILE = fileURLToPath(new URL('../../../apps/game/public/models/soldier.glb', import.meta.url));

interface Accessor {
  bufferView: number;
  byteOffset?: number;
  count: number;
  type: 'SCALAR' | 'VEC3' | 'VEC4';
}
interface Gltf {
  accessors: Accessor[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
  animations: { name: string; channels: { sampler: number; target: { node: number; path: string } }[]; samplers: { output: number }[] }[];
}

function load(): { json: Gltf; bin: Buffer } {
  const file = readFileSync(FILE);
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')) as Gltf;
  const binStart = 20 + jsonLength + 8;
  return { json, bin: file.subarray(binStart) };
}

const WIDTH = { SCALAR: 1, VEC3: 3, VEC4: 4 } as const;

/** The last value of each channel (node and path), as numbers. */
function lastPose({ json, bin }: { json: Gltf; bin: Buffer }, name: string): Map<string, number[]> {
  const animation = json.animations.find((entry) => entry.name === name);
  if (!animation) throw new Error(`no clip ${name}`);
  const pose = new Map<string, number[]>();
  for (const channel of animation.channels) {
    const accessor = json.accessors[animation.samplers[channel.sampler]!.output]!;
    const view = json.bufferViews[accessor.bufferView]!;
    const width = WIDTH[accessor.type];
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + (accessor.count - 1) * width * 4;
    const values = Array.from({ length: width }, (_, at) => bin.readFloatLE(start + at * 4));
    pose.set(`${channel.target.node}:${channel.target.path}`, values);
  }
  return pose;
}

/** Whether two poses agree on every channel they share (quaternion sign ignored). */
function samePose(a: Map<string, number[]>, b: Map<string, number[]>): boolean {
  for (const [key, values] of a) {
    const other = b.get(key);
    if (!other) continue;
    const direct = values.every((value, at) => Math.abs(value - other[at]!) < 1e-3);
    const flipped = key.endsWith(':rotation') && values.every((value, at) => Math.abs(value + other[at]!) < 1e-3);
    if (!direct && !flipped) return false;
  }
  return true;
}

describe('soldier death clips (1.2)', () => {
  const gltf = load();
  const names = gltf.json.animations.map((entry) => entry.name);
  const corpses = names.filter((name) => name === 'corpse' || name.startsWith('corpse-'));
  const deaths = names.filter((name) => name.startsWith('death-'));

  it('has at least four corpse poses and a death clip for each stance and direction', () => {
    expect(corpses.length).toBeGreaterThanOrEqual(4);
    expect(deaths).toEqual(expect.arrayContaining(['death-stand-front', 'death-stand-back', 'death-stand-flank', 'death-crouch', 'death-prone']));
  });

  it.each(['death-stand-front', 'death-stand-back', 'death-stand-flank', 'death-crouch', 'death-prone'])('%s ends in a corpse pose', (death) => {
    const end = lastPose(gltf, death);
    expect(corpses.filter((corpse) => samePose(end, lastPose(gltf, corpse)))).not.toHaveLength(0);
    // 2.2: the view's table names the pose it ends in.
    expect(samePose(end, lastPose(gltf, DEATH_POSE[death as keyof typeof DEATH_POSE]))).toBe(true);
  });

  it('the death clips together reach four different corpse poses', () => {
    const reached = new Set(deaths.flatMap((death) => corpses.filter((corpse) => samePose(lastPose(gltf, death), lastPose(gltf, corpse)))));
    expect(reached.size).toBeGreaterThanOrEqual(4);
  });
});
