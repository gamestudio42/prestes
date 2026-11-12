import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { missingClips, SOLDIER_CLIPS } from '../src/soldier-clips';

/**
 * soldier-animation-and-textures 2.4: the build (this test, in `pnpm check`)
 * fails when the view asks for a clip the exported soldier lacks.
 */
const FILE = fileURLToPath(new URL('../../../apps/game/public/models/soldier.glb', import.meta.url));

function animationNames(): string[] {
  const file = readFileSync(FILE);
  const json = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')) as { animations: { name: string }[] };
  return json.animations.map((animation) => animation.name);
}

describe('the soldier model has every clip the view plays (2.4)', () => {
  it('soldier.glb lacks none', () => {
    expect(missingClips(animationNames())).toEqual([]);
  });

  it('a model without one clip is caught and the clip is named', () => {
    const fixture = animationNames().filter((name) => name !== 'limp');
    expect(missingClips(fixture)).toEqual(['limp']);
  });

  it('the list names each clip once', () => {
    expect(new Set(SOLDIER_CLIPS).size).toBe(SOLDIER_CLIPS.length);
  });
});
