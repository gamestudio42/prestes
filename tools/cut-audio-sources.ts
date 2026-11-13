/**
 * ambient-sound-and-voices 3.2: cuts the excerpts the game uses out of the
 * downloaded CC0 recordings.
 *
 *   pnpm cut:audio && pnpm prepare:audio
 *
 * Reads `audio-src/raw/<id>.wav` (the Freesound originals, gitignored) and
 * writes `audio-src/<group>/<id>.wav`, which `tools/prepare-audio.ts` then
 * levels, loops or trims and encodes. Each cut is chosen by its loudness
 * (the steadiest stretch for a bed, one clear call for a one-shot); the
 * sources and their authors are in `docs/assets.md`. One-shots get a short
 * fade at each end, since a field recording has air under the call; beds
 * and water need none, because the preparation cross-fades their end into
 * their start.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { findBinary } from './audio-tools';

const ROOT = resolve(import.meta.dirname, '..');
const FADE = 0.12;

export interface Cut {
  id: string;
  group: 'beds' | 'oneshots' | 'water';
  /** The Freesound sound number (`docs/assets.md`). */
  freesound: number;
  /** Seconds into the original; `end` null keeps it to the end. */
  start: number;
  end: number | null;
}

export const CUTS: readonly Cut[] = [
  { id: 'bed-cerrado', group: 'beds', freesound: 414413, start: 0.5, end: 46.5 },
  { id: 'bed-forest-edge', group: 'beds', freesound: 516295, start: 50, end: 100 },
  { id: 'bed-caatinga', group: 'beds', freesound: 215853, start: 15, end: 65 },
  { id: 'bed-pasture', group: 'beds', freesound: 414410, start: 0.5, end: 50 },
  { id: 'hour-dawn', group: 'beds', freesound: 426276, start: 30, end: 80 },
  { id: 'hour-day', group: 'beds', freesound: 194851, start: 5, end: 60 },
  { id: 'hour-dusk', group: 'beds', freesound: 559114, start: 145, end: 195 },
  { id: 'hour-night', group: 'beds', freesound: 777702, start: 30, end: 80 },
  { id: 'bird-seriema', group: 'oneshots', freesound: 560319, start: 8, end: 16 },
  { id: 'bird-bem-te-vi', group: 'oneshots', freesound: 591058, start: 20.6, end: 22.4 },
  { id: 'bird-maritaca', group: 'oneshots', freesound: 559294, start: 63.8, end: 66 },
  { id: 'bird-inhambu', group: 'oneshots', freesound: 798321, start: 42.6, end: 45 },
  { id: 'bird-urutau', group: 'oneshots', freesound: 532268, start: 27, end: 35.6 },
  { id: 'dog-far', group: 'oneshots', freesound: 705299, start: 112.5, end: 121 },
  { id: 'ox-cart', group: 'oneshots', freesound: 437078, start: 9, end: 17.5 },
  { id: 'church-bell', group: 'oneshots', freesound: 511681, start: 10, end: 23 },
  { id: 'branch', group: 'oneshots', freesound: 95263, start: 3.5, end: 6 },
  { id: 'gust', group: 'oneshots', freesound: 726319, start: 0, end: null },
  { id: 'cattle', group: 'oneshots', freesound: 513565, start: 0, end: null },
  { id: 'horse', group: 'oneshots', freesound: 347036, start: 1, end: 4.6 },
  { id: 'rooster', group: 'oneshots', freesound: 21711, start: 0, end: null },
  { id: 'water-river', group: 'water', freesound: 831414, start: 10, end: 50 },
  { id: 'water-stream', group: 'water', freesound: 560276, start: 50, end: 90 },
  { id: 'water-ford', group: 'water', freesound: 442478, start: 60, end: 100 },
  { id: 'water-pond', group: 'water', freesound: 376813, start: 15, end: 55 },
];

function cut(ffmpeg: string, entry: Cut): void {
  const input = join(ROOT, 'audio-src/raw', `${entry.id}.wav`);
  if (!existsSync(input)) {
    console.log(`  missing ${input}`);
    return;
  }
  const output = join(ROOT, 'audio-src', entry.group, `${entry.id}.wav`);
  mkdirSync(join(ROOT, 'audio-src', entry.group), { recursive: true });
  const trim = [`atrim=start=${entry.start}`, entry.end === null ? null : `end=${entry.end}`].filter(Boolean).join(':');
  const filters = [trim, 'asetpts=PTS-STARTPTS'];
  if (entry.group === 'oneshots') filters.push(`afade=t=in:d=${FADE}`, `areverse,afade=t=in:d=${FADE},areverse`);
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-af', filters.join(','), '-c:a', 'pcm_f32le', output], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg could not cut ${entry.id}:\n${result.stderr}`);
  console.log(`  ${entry.group}/${entry.id}.wav`);
}

const ffmpeg = findBinary('ffmpeg');
for (const entry of CUTS) cut(ffmpeg, entry);
