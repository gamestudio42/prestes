import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEATH_POSE } from '../src/soldier-clips';
import { clipNames, lastPose, readSoldier } from './soldier-glb';

/**
 * soldier-animation-and-textures 1.2: every death clip of the exported
 * soldier ends in one of the corpse poses, and there are at least four.
 * Reads the glTF animation channels from `soldier.glb` (decoded, since
 * improve-soldier-models 1.2 compresses it).
 */
const FILE = fileURLToPath(new URL('../../../apps/game/public/models/soldier.glb', import.meta.url));
const soldier = await readSoldier(FILE);

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
  const names = clipNames(soldier);
  const corpses = names.filter((name) => name === 'corpse' || name.startsWith('corpse-'));
  const deaths = names.filter((name) => name.startsWith('death-'));

  it('has at least four corpse poses and a death clip for each stance and direction', () => {
    expect(corpses.length).toBeGreaterThanOrEqual(4);
    expect(deaths).toEqual(expect.arrayContaining(['death-stand-front', 'death-stand-back', 'death-stand-flank', 'death-crouch', 'death-prone']));
  });

  it.each(['death-stand-front', 'death-stand-back', 'death-stand-flank', 'death-crouch', 'death-prone'])('%s ends in a corpse pose', (death) => {
    const end = lastPose(soldier, death);
    expect(corpses.filter((corpse) => samePose(end, lastPose(soldier, corpse)))).not.toHaveLength(0);
    // 2.2: the view's table names the pose it ends in.
    expect(samePose(end, lastPose(soldier, DEATH_POSE[death as keyof typeof DEATH_POSE]))).toBe(true);
  });

  it('the death clips together reach four different corpse poses', () => {
    const reached = new Set(deaths.flatMap((death) => corpses.filter((corpse) => samePose(lastPose(soldier, death), lastPose(soldier, corpse)))));
    expect(reached.size).toBeGreaterThanOrEqual(4);
  });
});
