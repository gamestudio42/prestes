/**
 * ambient-sound-and-voices 1.3 (D8): prepares the battle's recordings.
 *
 *   pnpm prepare:audio
 *
 * Reads the WAV sources under `audio-src/` (gitignored, like `gramofone/`)
 * and writes `apps/game/public/audio/<group>/<name>.mp3`, committed, so
 * building and testing never need ffmpeg. Per file: level to the group's
 * loudness (two-pass loudnorm), mono at the group's rate, then trim the
 * silence at both ends (speech and one-shots) or cross-fade the end into
 * the start so it loops (beds, water, footsteps), then encode. The same
 * source gives the same bytes on every run.
 *
 * Format: mono MP3, as the gramophone. Measured with
 * `tools/audio-loop-check.ts` (2026-11-13): a looped bed decodes in Chromium
 * to its exact length, with no gap (design D8).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBinary, loopCrossfade, trimSilence } from './audio-tools';

const ROOT = resolve(import.meta.dirname, '..');

export interface AudioGroup {
  /** Integrated loudness to level to (LUFS). */
  loudness: number;
  sampleRate: number;
  bitrate: string;
  /** `trim` the silence at the ends, or make it `loop` with this cross-fade (s). */
  shape: { trim: true } | { loop: number };
}

/** Each top folder of `audio-src/` and how its files are prepared. */
export const GROUPS: Record<string, AudioGroup> = {
  voice: { loudness: -16, sampleRate: 22050, bitrate: '48k', shape: { trim: true } },
  oneshots: { loudness: -20, sampleRate: 32000, bitrate: '64k', shape: { trim: true } },
  beds: { loudness: -24, sampleRate: 32000, bitrate: '64k', shape: { loop: 2 } },
  water: { loudness: -22, sampleRate: 32000, bitrate: '64k', shape: { loop: 2 } },
  footsteps: { loudness: -22, sampleRate: 32000, bitrate: '64k', shape: { loop: 0.5 } },
};

const TRUE_PEAK_DB = -2;
const LOUDNESS_RANGE = 11;

interface Measured {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

function loudnorm(group: AudioGroup, measured?: Measured): string {
  const base = [`loudnorm=I=${group.loudness}`, `TP=${TRUE_PEAK_DB}`, `LRA=${LOUDNESS_RANGE}`];
  if (!measured) return [...base, 'print_format=json'].join(':');
  return [
    ...base,
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    'linear=true',
  ].join(':');
}

function measure(ffmpeg: string, input: string, group: AudioGroup): Measured {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', input, '-ac', '1', '-af', loudnorm(group), '-f', 'null', '-'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`ffmpeg could not measure ${input}:\n${result.stderr}`);
  const block = [...result.stderr.matchAll(/\{[\s\S]*?\}/g)].map((match) => match[0]).reverse().find((text) => text.includes('"input_i"'));
  if (!block) throw new Error(`No loudness measurement for ${input}`);
  return JSON.parse(block) as Measured;
}

/** The source levelled, mono, at the group's rate, as float samples. */
function levelled(ffmpeg: string, input: string, group: AudioGroup): Float32Array {
  const measured = measure(ffmpeg, input, group);
  // loudnorm works at 192 kHz inside; the rate is set after it.
  const filter = `${loudnorm(group, measured)},aresample=${group.sampleRate}`;
  const result = spawnSync(
    ffmpeg,
    ['-hide_banner', '-nostats', '-loglevel', 'error', '-i', input, '-map', '0:a:0', '-ac', '1', '-af', filter, '-ar', String(group.sampleRate), '-f', 'f32le', '-'],
    { maxBuffer: 512 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(`ffmpeg could not level ${input}:\n${result.stderr.toString()}`);
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

/**
 * Encoded to a file, not a pipe: ffmpeg writes the MP3's gapless header (the
 * encoder delay and padding the browser strips) only to a seekable output;
 * piped, a looped bed gained a 60 ms gap (`tools/audio-loop-check.ts`).
 */
function encode(ffmpeg: string, samples: Float32Array, group: AudioGroup): Buffer {
  const dir = mkdtempSync(join(tmpdir(), 'prestes-audio-'));
  const output = join(dir, 'out.mp3');
  try {
    encodeTo(ffmpeg, samples, group, output);
    return readFileSync(output);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function encodeTo(ffmpeg: string, samples: Float32Array, group: AudioGroup, output: string): void {
  const result = spawnSync(
    ffmpeg,
    [
      '-hide_banner', '-nostats', '-loglevel', 'error',
      '-f', 'f32le', '-ar', String(group.sampleRate), '-ac', '1', '-i', '-',
      '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
      '-c:a', 'libmp3lame', '-b:a', group.bitrate, '-write_id3v1', '0', '-id3v2_version', '0',
      '-f', 'mp3', output,
    ],
    { input: Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), maxBuffer: 256 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(`ffmpeg could not encode:\n${result.stderr.toString()}`);
}

/** One source prepared as its group says: the encoded bytes and the length in seconds. */
export function prepareFile(ffmpeg: string, input: string, group: AudioGroup): { bytes: Buffer; seconds: number } {
  const samples = levelled(ffmpeg, input, group);
  const shaped = 'trim' in group.shape ? trimSilence(samples, group.sampleRate) : loopCrossfade(samples, Math.round(group.shape.loop * group.sampleRate));
  if (shaped.length === 0) throw new Error(`${input} is silent`);
  return { bytes: encode(ffmpeg, shaped, group), seconds: shaped.length / group.sampleRate };
}

function wavFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return wavFiles(path);
      return /\.wav$/i.test(name) ? [path] : [];
    });
}

/** Prepares every source under `source` into `output`; returns what it wrote. */
export function prepareAudio(source: string, output: string, ffmpeg = findBinary('ffmpeg')): { file: string; bytes: number; seconds: number }[] {
  const written: { file: string; bytes: number; seconds: number }[] = [];
  for (const [name, group] of Object.entries(GROUPS)) {
    for (const input of wavFiles(join(source, name))) {
      const target = join(output, name, relative(join(source, name), input).replace(/\.wav$/i, '.mp3'));
      const { bytes, seconds } = prepareFile(ffmpeg, input, group);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
      written.push({ file: relative(output, target).replaceAll('\\', '/'), bytes: bytes.length, seconds });
    }
  }
  return written;
}

/**
 * Every prepared sound under `output`, by id: its file name without `.mp3`,
 * except a voice line, whose id keeps its folders under `voice/`
 * (`soldado/man-down-1`, `xingamento/column/1-1`), since speakers share
 * line names (D7).
 */
export function soundFiles(output: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const group of Object.keys(GROUPS)) {
    const root = join(output, group);
    const walk = (dir: string): void => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith('.mp3')) {
          const id = group === 'voice' ? relative(root, path).replaceAll('\\', '/').slice(0, -4) : name.slice(0, -4);
          if (files[id]) throw new Error(`two sounds named ${id}: ${files[id]} and ${relative(output, path)}`);
          files[id] = relative(output, path).replaceAll('\\', '/');
        }
      }
    };
    walk(join(output, group));
  }
  return files;
}

/** The client's list of prepared sounds (`apps/game/src/audio/sound-files.ts`). */
export function soundFilesModule(files: Record<string, string>): string {
  const rows = Object.entries(files).map(([id, path]) => `  '${id}': '${path}',`);
  return [
    '// Generated by `pnpm prepare:audio` (tools/prepare-audio.ts); do not edit.',
    '// The prepared battle sounds under apps/game/public/audio/, by id: the',
    '// client asks only for files that exist (ambient-sound-and-voices 3.2).',
    rows.length ? `export const SOUND_FILES: Readonly<Record<string, string>> = {\n${rows.join('\n')}\n};` : 'export const SOUND_FILES: Readonly<Record<string, string>> = {};',
    '',
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const output = join(ROOT, 'apps/game/public/audio');
  const written = prepareAudio(join(ROOT, 'audio-src'), output);
  writeFileSync(join(ROOT, 'apps/game/src/audio/sound-files.ts'), soundFilesModule(soundFiles(output)));
  if (written.length === 0) console.log('No sources under audio-src/ (voice, oneshots, beds, water, footsteps).');
  for (const entry of written) console.log(`  ${entry.file.padEnd(44)} ${String(Math.round(entry.bytes / 1024)).padStart(5)} KiB  ${entry.seconds.toFixed(1)} s`);
}
