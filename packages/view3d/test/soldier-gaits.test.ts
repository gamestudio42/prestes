import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CLIP_GAIT_SPEED, GAIT_SPEED, STANCE_PACE, WOUND_PACE } from '@prestes/shared';
import { describe, expect, it } from 'vitest';
import { CLIP_SPEED } from '../src/soldier-clips';

/**
 * soldier-animation-and-textures 1.4: each moving clip's cycle is keyed so
 * its measured stride covers the speed the shared gaits give it. The art
 * build writes the strides to `soldier-gaits.json`; the clip lengths come
 * from `soldier.glb` itself.
 */
const url = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const GAITS = JSON.parse(readFileSync(url('../../../art-src/characters/soldier-gaits.json'), 'utf8')) as Record<
  string,
  { strideMetres: number; cycleFrames: number; fps: number; speed: number }
>;

/** Each animation's length in seconds, from its keyframe times. */
function clipSeconds(): Map<string, number> {
  const file = readFileSync(url('../../../apps/game/public/models/soldier.glb'));
  const json = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')) as {
    accessors: { min?: number[]; max?: number[] }[];
    animations: { name: string; samplers: { input: number }[] }[];
  };
  return new Map(
    json.animations.map((animation) => {
      const times = animation.samplers.map((sampler) => json.accessors[sampler.input]!);
      const start = Math.min(...times.map((accessor) => accessor.min![0]!));
      const end = Math.max(...times.map((accessor) => accessor.max![0]!));
      return [animation.name, end - start];
    }),
  );
}

describe('soldier gaits (1.4)', () => {
  const seconds = clipSeconds();

  it('the shared table gives each moving clip its speed from the gaits, stance and wound', () => {
    expect(CLIP_GAIT_SPEED.walk).toBe(GAIT_SPEED.walk);
    expect(CLIP_GAIT_SPEED.run).toBe(GAIT_SPEED.run);
    expect(CLIP_GAIT_SPEED['crouch-walk']).toBeCloseTo(GAIT_SPEED.walk * STANCE_PACE.crouched);
    expect(CLIP_GAIT_SPEED.limp).toBeCloseTo(GAIT_SPEED.walk * WOUND_PACE.moderate);
  });

  it.each(Object.keys(CLIP_GAIT_SPEED))('%s: the art build used the shared speed and its stride covers it', (clip) => {
    const gait = GAITS[clip]!;
    const speed = CLIP_GAIT_SPEED[clip as keyof typeof CLIP_GAIT_SPEED];
    expect(gait).toBeDefined();
    expect(gait.speed).toBeCloseTo(speed, 6);
    const cycle = gait.cycleFrames / gait.fps;
    // Whole frames: within half a frame of the exact cycle.
    expect(Math.abs(gait.strideMetres / speed - cycle)).toBeLessThanOrEqual(0.5 / gait.fps + 1e-9);
    expect(seconds.get(clip)).toBeCloseTo(cycle, 3);
  });

  it('steps fall in a natural range: about two a second walking, three running', () => {
    const cadence = (clip: string) => 2 / (GAITS[clip]!.cycleFrames / GAITS[clip]!.fps);
    expect(cadence('walk')).toBeGreaterThan(1.6);
    expect(cadence('walk')).toBeLessThan(2.2);
    expect(cadence('run')).toBeGreaterThan(2.6);
    expect(cadence('run')).toBeLessThan(3.4);
  });

  it('the view plays each moving clip at the speed it was keyed for', () => {
    for (const clip of ['walk', 'walk-ready', 'run', 'crouch-walk'] as const) expect(CLIP_SPEED[clip]).toBe(CLIP_GAIT_SPEED[clip]);
  });
});
