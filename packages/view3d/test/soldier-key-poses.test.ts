import type { Document } from '@gltf-transform/core';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bonePoints, clipNames, clipTimes, readSoldier } from './soldier-glb';

/**
 * improve-soldier-models 1.3: the compressed soldier (`pnpm models`: resample
 * and meshopt) keeps every key pose: the hands, the feet and the muzzle stay
 * within 1 cm of the source model at every key of every clip.
 */
const url = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const SOURCE = url('../../../art-src/characters/soldier.glb');
const SHIPPED = url('../../../apps/game/public/models/soldier.glb');
const TOLERANCE = 0.01;

/** Points fixed in the bones (bone space, metres): the hands, the feet, the muzzle. */
const POINTS = {
  'forearm.L': [0, 0.32, 0],
  'forearm.R': [0, 0.32, 0],
  'shin.L': [0, 0.45, 0],
  'shin.R': [0, 0.45, 0],
  rifle: [0, 0.9, 0],
} as const;

/** The largest distance between the two models' points over every key of every clip. */
function worstDrift(source: Document, other: Document): { metres: number; where: string } {
  let worst = { metres: 0, where: '' };
  for (const clip of clipNames(source)) {
    for (const time of clipTimes(source, clip)) {
      const a = bonePoints(source, clip, time, POINTS);
      const b = bonePoints(other, clip, time, POINTS);
      for (const [bone, point] of a) {
        const metres = point.distanceTo(b.get(bone)!);
        if (metres > worst.metres) worst = { metres, where: `${clip} at ${time.toFixed(3)} s, ${bone}` };
      }
    }
  }
  return worst;
}

describe('compressed soldier key poses (1.3)', () => {
  it('the shipped model has every clip of the source', async () => {
    const [source, shipped] = await Promise.all([readSoldier(SOURCE), readSoldier(SHIPPED)]);
    expect(clipNames(shipped).sort()).toEqual(clipNames(source).sort());
  });

  it('hands, feet and muzzle stay within 1 cm at every key', async () => {
    const [source, shipped] = await Promise.all([readSoldier(SOURCE), readSoldier(SHIPPED)]);
    const drift = worstDrift(source, shipped);
    expect(drift.metres, drift.where).toBeLessThanOrEqual(TOLERANCE);
  });

  it('would catch rotations cut to 8 bits', async () => {
    const [source, coarse] = await Promise.all([readSoldier(SOURCE), readSoldier(SOURCE)]);
    for (const animation of coarse.getRoot().listAnimations()) {
      for (const channel of animation.listChannels()) {
        if (channel.getTargetPath() !== 'rotation') continue;
        const values = channel.getSampler()!.getOutput()!.getArray()!;
        for (let at = 0; at < values.length; at += 1) values[at] = Math.round(values[at]! * 127) / 127;
      }
    }
    expect(worstDrift(source, coarse).metres).toBeGreaterThan(TOLERANCE);
  });
});
