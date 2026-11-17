import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CLIP_GAIT_SPEED } from '@prestes/shared';
import { describe, expect, it } from 'vitest';
import { bonePoints, clipNames, clipTimes, readSoldier } from './soldier-glb';

/**
 * improve-soldier-models 5.1-5.3: the clips carry weight. Read from the
 * exported `soldier.glb` (decoded) with forward kinematics:
 * - 5.1 a planted foot stays on its spot on the ground within 5 cm while the
 *   body moves over it at the clip's speed, and the hips rise and fall;
 * - 5.2 raising, aiming and lowering settle within half a second;
 * - 5.3 the prone deaths never lift the body above where it lay.
 */
const url = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const soldier = await readSoldier(url('../../../apps/game/public/models/soldier.glb'));
const GAITS = JSON.parse(readFileSync(url('../../../art-src/characters/soldier-gaits.json'), 'utf8')) as Record<string, { cycleFrames: number; fps: number }>;
const FPS = 24;
/** The ankle (shin tail) in the shin bone's frame, and the head's top. */
const ANKLE = [0, 0.46, 0] as const;
const SLIDE_LIMIT = 0.05;

/**
 * When each foot is planted, as shares of the cycle, from the build's own
 * keys: a walking foot from its contact to the other foot's contact, a
 * running foot from its contact to the flight key, the limp's from its
 * plant to its load.
 */
const WALK = { L: [0, 0.5], R: [0.5, 1] } as const;
const STANCE: Record<string, { L: readonly [number, number]; R: readonly [number, number] }> = {
  walk: WALK,
  'walk-ready': WALK,
  carry: WALK,
  'crouch-walk': WALK,
  run: { L: [0, 0.25], R: [0.5, 0.75] },
  limp: { L: [0, 0.55], R: [0.55, 1] },
};

/** Python's `round` (half to even), as the build places its keys. */
function keyFrame(value: number): number {
  const floor = Math.floor(value);
  const rest = value - floor;
  if (Math.abs(rest - 0.5) > 1e-9) return Math.round(value);
  return floor % 2 === 0 ? floor : floor + 1;
}

/** The worst drift of each planted foot from its spot over one cycle (metres). */
function worstSlide(clip: string, gait: string): number {
  const speed = (CLIP_GAIT_SPEED as Record<string, number>)[gait]!;
  const period = GAITS[gait]!.cycleFrames;
  const start = clipTimes(soldier, clip)[0]!;
  let worst = 0;
  for (const side of ['L', 'R'] as const) {
    const [from, to] = STANCE[gait]![side];
    const spots: number[] = [];
    for (let frame = keyFrame(from * period); frame <= keyFrame(to * period); frame++) {
      const time = frame / FPS;
      const ankle = bonePoints(soldier, clip, start + time, { [`shin.${side}`]: ANKLE }).get(`shin.${side}`)!;
      // The model walks on the spot facing -Z; the ground moves back under it.
      spots.push(-ankle.z + speed * time);
    }
    worst = Math.max(worst, Math.max(...spots) - Math.min(...spots));
  }
  return worst;
}

describe('soldier weight (improve-soldier-models 5)', () => {
  const names = clipNames(soldier);
  const gaitClips = Object.keys(STANCE).flatMap((gait) => [gait, `${gait}-pistol`].filter((clip) => names.includes(clip)).map((clip) => [clip, gait] as const));

  it.each(gaitClips)('5.1 %s keeps each planted foot within 5 cm', (clip, gait) => {
    expect(worstSlide(clip, gait)).toBeLessThanOrEqual(SLIDE_LIMIT);
  });

  it.each([
    ['walk', 0.03],
    ['run', 0.03],
    ['crouch-walk', 0.01],
  ] as const)('5.1 %s rises and falls at the hips', (clip, least) => {
    const times = clipTimes(soldier, clip);
    const end = times[times.length - 1]!;
    const heights: number[] = [];
    for (let frame = 0; frame <= Math.round(end * FPS); frame++) heights.push(bonePoints(soldier, clip, frame / FPS, { hips: [0, 0, 0] }).get('hips')!.y);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThanOrEqual(least);
  });

  const settles = names.filter((name) => /^(raise|lower)-(stand|crouch)(-pistol)?$/.test(name));
  it('5.2 has the raise and lower clips', () => {
    expect(settles).toEqual(expect.arrayContaining(['raise-stand', 'lower-stand', 'raise-crouch', 'lower-crouch']));
  });

  it.each(settles)('5.2 %s comes to rest within half a second', (clip) => {
    const times = clipTimes(soldier, clip);
    expect(times[times.length - 1]! - times[0]!).toBeLessThanOrEqual(0.5 + 1e-3);
  });

  it('5.3 death-prone never rises above the prone body it starts from', () => {
    const times = clipTimes(soldier, 'death-prone');
    const end = times[times.length - 1]!;
    const at = (time: number) => bonePoints(soldier, 'death-prone', time, { hips: [0, 0, 0], head: [0, 0.2, 0] });
    const start = at(0);
    for (let frame = 0; frame <= Math.round(end * FPS); frame++) {
      const points = at(frame / FPS);
      expect(points.get('hips')!.y).toBeLessThanOrEqual(start.get('hips')!.y + 0.01);
      expect(points.get('head')!.y).toBeLessThanOrEqual(start.get('head')!.y + 0.01);
    }
  });

  it.each(['death-stand-front', 'death-stand-back', 'death-stand-flank'])('5.3 %s buckles at the knees before it lands', (clip) => {
    const times = clipTimes(soldier, clip);
    const end = times[times.length - 1]!;
    const hips = (time: number) => bonePoints(soldier, clip, time, { hips: [0, 0, 0] }).get('hips')!.y;
    // Halfway through the fall the hips are already well down from standing.
    expect(hips(0) - hips(end / 2)).toBeGreaterThanOrEqual(0.2);
  });
});
