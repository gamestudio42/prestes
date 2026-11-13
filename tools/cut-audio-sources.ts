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
 * fade at each end, since a field recording has air under the call; beds,
 * water and footsteps need none, because the preparation cross-fades their
 * end into their start.
 *
 * Footsteps (4.1, design D4): one man's steps from one set of boots on each
 * ground; a section is the same steps laid over themselves (`layers`),
 * each layer a little later and a touch higher or lower, so many feet fall
 * out of step; a run with no recording of its own is the walk played
 * faster (`tempo`); the wet crawl is the crawl over the mud steps
 * (`under`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { findBinary } from './audio-tools';

const ROOT = resolve(import.meta.dirname, '..');
const FADE = 0.12;
/** Every cut is worked at this rate; the preparation sets each group's own. */
const RATE = 48000;
/** The section's layers: when each comes in (s) and its pitch (a share of the man's). */
const LAYERS: readonly { delay: number; rate: number }[] = [
  { delay: 0, rate: 1 },
  { delay: 0.17, rate: 0.95 },
  { delay: 0.31, rate: 1.04 },
  { delay: 0.09, rate: 1.08 },
  { delay: 0.24, rate: 0.92 },
  { delay: 0.4, rate: 1.01 },
];

export interface Cut {
  id: string;
  group: 'beds' | 'oneshots' | 'water' | 'footsteps';
  /** The Freesound sound number (`docs/assets.md`). */
  freesound: number;
  /** The original's name in `audio-src/raw/` when it is not the id. */
  source?: string;
  /** Seconds into the original; `end` null keeps it to the end. */
  start: number;
  end: number | null;
  /** Played this much faster, pitch kept (a run from a walk). */
  tempo?: number;
  /** Laid over itself this many times, out of step (a section from one man). */
  layers?: number;
  /** Another original mixed under this one, at `volume`. */
  under?: { source: string; start: number; end: number; volume: number };
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
  { id: 'wading', group: 'water', freesound: 342932, start: 0.5, end: 26 },
  { id: 'steps-road-one', group: 'footsteps', freesound: 556002, source: 'steps-road', start: 0.3, end: 12.3 },
  { id: 'steps-road-many', group: 'footsteps', freesound: 556002, source: 'steps-road', start: 0.3, end: 12.3, layers: 6 },
  { id: 'steps-road-run', group: 'footsteps', freesound: 556002, source: 'steps-road', start: 13.5, end: 17.3, layers: 6 },
  { id: 'steps-dirt-one', group: 'footsteps', freesound: 564893, source: 'steps-dirt', start: 3.2, end: 25.4 },
  { id: 'steps-dirt-many', group: 'footsteps', freesound: 564893, source: 'steps-dirt', start: 3.2, end: 25.4, layers: 6 },
  { id: 'steps-dirt-run', group: 'footsteps', freesound: 564893, source: 'steps-dirt', start: 27.1, end: 34.6, layers: 6 },
  { id: 'steps-grass-one', group: 'footsteps', freesound: 556042, source: 'steps-grass', start: 31.3, end: 45.2 },
  { id: 'steps-grass-many', group: 'footsteps', freesound: 556042, source: 'steps-grass', start: 31.3, end: 45.2, layers: 6 },
  { id: 'steps-grass-run', group: 'footsteps', freesound: 556042, source: 'steps-grass', start: 20.6, end: 30.3, layers: 6 },
  { id: 'steps-mud-one', group: 'footsteps', freesound: 548384, source: 'steps-mud', start: 0.9, end: 9.9 },
  { id: 'steps-mud-many', group: 'footsteps', freesound: 548384, source: 'steps-mud', start: 0.9, end: 9.9, layers: 6 },
  { id: 'steps-mud-run', group: 'footsteps', freesound: 548384, source: 'steps-mud', start: 0.9, end: 9.9, tempo: 1.7, layers: 6 },
  { id: 'steps-stone-one', group: 'footsteps', freesound: 558472, source: 'steps-stone-walk', start: 0, end: 18.6 },
  { id: 'steps-stone-many', group: 'footsteps', freesound: 558472, source: 'steps-stone-walk', start: 0, end: 18.6, layers: 6 },
  { id: 'steps-stone-run', group: 'footsteps', freesound: 558471, source: 'steps-stone-run', start: 4.3, end: 18, layers: 6 },
  { id: 'steps-brush-one', group: 'footsteps', freesound: 559082, source: 'steps-brush', start: 0, end: 14.3 },
  { id: 'steps-brush-many', group: 'footsteps', freesound: 559082, source: 'steps-brush', start: 0, end: 14.3, layers: 6 },
  { id: 'steps-brush-run', group: 'footsteps', freesound: 559082, source: 'steps-brush', start: 0, end: 14.3, tempo: 1.5, layers: 6 },
  { id: 'steps-wood-one', group: 'footsteps', freesound: 253090, start: 0.2, end: 10.5 },
  { id: 'steps-wood-many', group: 'footsteps', freesound: 253092, start: 0, end: 13 },
  { id: 'steps-wood-run', group: 'footsteps', freesound: 253092, source: 'steps-wood-many', start: 0, end: 13, tempo: 1.4, layers: 3 },
  { id: 'crawl-dry', group: 'footsteps', freesound: 478381, source: 'crawl', start: 25, end: 47 },
  { id: 'crawl-wet', group: 'footsteps', freesound: 478381, source: 'crawl', start: 5, end: 27, under: { source: 'steps-mud', start: 0.9, end: 9.9, volume: 0.35 } },
  { id: 'rattle', group: 'footsteps', freesound: 480672, start: 0, end: null },
];

const raw = (name: string): string => join(ROOT, 'audio-src/raw', `${name}.wav`);

const trimOf = (start: number, end: number | null): string => [`atrim=start=${start}`, end === null ? null : `end=${end}`].filter(Boolean).join(':');

/** The filter graph for one cut: its inputs, in order, and the chain ending in `[out]`. */
export function cutGraph(entry: Cut): { inputs: string[]; graph: string } {
  const source = raw(entry.source ?? entry.id);
  const base = `aformat=channel_layouts=mono,aresample=${RATE},${trimOf(entry.start, entry.end)},asetpts=PTS-STARTPTS${entry.tempo ? `,atempo=${entry.tempo}` : ''}`;
  const inputs = [source];
  const chains: string[] = [];
  let last = 'main';
  const layers = LAYERS.slice(0, Math.max(1, entry.layers ?? 1));
  if (layers.length > 1) {
    chains.push(`[0:a]${base},asplit=${layers.length}${layers.map((_, index) => `[s${index}]`).join('')}`);
    layers.forEach(({ delay, rate }, index) => {
      chains.push(`[s${index}]asetrate=${Math.round(RATE * rate)},aresample=${RATE},atempo=${(1 / rate).toFixed(4)},adelay=${Math.round(delay * 1000)}[l${index}]`);
    });
    const latest = Math.max(...layers.map((layer) => layer.delay));
    // Mixed without normalising, then down by the square root of the count: many feet, not one man louder.
    chains.push(`${layers.map((_, index) => `[l${index}]`).join('')}amix=inputs=${layers.length}:normalize=0:duration=shortest,volume=${(1 / Math.sqrt(layers.length)).toFixed(3)},atrim=start=${latest},asetpts=PTS-STARTPTS[main]`);
  } else {
    chains.push(`[0:a]${base}[main]`);
  }
  if (entry.under) {
    inputs.push(raw(entry.under.source));
    chains.push(`[1:a]aformat=channel_layouts=mono,aresample=${RATE},${trimOf(entry.under.start, entry.under.end)},asetpts=PTS-STARTPTS,volume=${entry.under.volume}[under]`);
    chains.push(`[${last}][under]amix=inputs=2:normalize=0:duration=shortest[mixed]`);
    last = 'mixed';
  }
  const tail = entry.group === 'oneshots' ? `afade=t=in:d=${FADE},areverse,afade=t=in:d=${FADE},areverse` : 'anull';
  chains.push(`[${last}]${tail}[out]`);
  return { inputs, graph: chains.join(';') };
}

function cut(ffmpeg: string, entry: Cut): void {
  const { inputs, graph } = cutGraph(entry);
  const missing = inputs.find((input) => !existsSync(input));
  if (missing) {
    console.log(`  missing ${missing}`);
    return;
  }
  const output = join(ROOT, 'audio-src', entry.group, `${entry.id}.wav`);
  mkdirSync(join(ROOT, 'audio-src', entry.group), { recursive: true });
  const args = ['-hide_banner', '-loglevel', 'error', '-y', ...inputs.flatMap((input) => ['-i', input]), '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', output];
  const result = spawnSync(ffmpeg, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg could not cut ${entry.id}:
${result.stderr}`);
  console.log(`  ${entry.group}/${entry.id}.wav`);
}

const ffmpeg = findBinary('ffmpeg');
for (const entry of CUTS) cut(ffmpeg, entry);
