/**
 * ambient-sound-and-voices 1.3: what the audio tools share. Finding ffmpeg
 * (moved here from `optimize-gramophone.ts`), and the sample work that is
 * done in code rather than in ffmpeg filters so it is exact and testable:
 * trimming silence and making a bed loop seamlessly.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function isExecutable(command: string): boolean {
  const result = spawnSync(command, ['-version'], { encoding: 'utf8' });
  return result.status === 0;
}

/** ffmpeg or ffprobe: from the environment, a known install, or the PATH. */
export function findBinary(name: 'ffmpeg' | 'ffprobe'): string {
  const fromEnv = process.env[name.toUpperCase()];
  if (fromEnv && isExecutable(fromEnv)) return fromEnv;

  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    localAppData && join(localAppData, 'Programs/kdenlive/bin', `${name}.exe`),
    localAppData &&
      join(
        localAppData,
        'Programs/Open Design/resources/app/node_modules/@ffmpeg-installer/win32-x64',
        `${name}.exe`,
      ),
    `C:/ffmpeg/bin/${name}.exe`,
    `C:/Program Files/ffmpeg/bin/${name}.exe`,
  ].filter((path): path is string => Boolean(path));

  for (const candidate of candidates) {
    if (existsSync(candidate) && isExecutable(candidate)) return candidate;
  }
  if (isExecutable(name)) return name;

  throw new Error(
    `${name} not found. Set ${name.toUpperCase()} to its executable, or put it on PATH.`,
  );
}

/** Level in dBFS below which a sample counts as silence when trimming. */
export const SILENCE_DB = -50;
/** Kept before the first and after the last sound when trimming (s). */
export const TRIM_MARGIN = 0.03;

/**
 * The samples without the silence at their two ends, keeping a short margin
 * so a word's breath or a step's tail is not cut. All silence gives an empty
 * result.
 */
export function trimSilence(samples: Float32Array, sampleRate: number, thresholdDb = SILENCE_DB, margin = TRIM_MARGIN): Float32Array {
  const threshold = 10 ** (thresholdDb / 20);
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]!) < threshold) first += 1;
  if (first === samples.length) return new Float32Array(0);
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]!) < threshold) last -= 1;
  const pad = Math.round(margin * sampleRate);
  return samples.slice(Math.max(0, first - pad), Math.min(samples.length, last + 1 + pad));
}

/**
 * A bed made to loop: its last `fade` samples are cross-faded (equal power)
 * into its first ones and then dropped, so the end runs into the start with
 * no step in level or waveform. The result is `fade` samples shorter.
 */
export function loopCrossfade(samples: Float32Array, fade: number): Float32Array {
  const length = samples.length - fade;
  if (fade <= 0 || length < fade) throw new Error(`a loop needs more than twice its ${fade}-sample fade`);
  const out = samples.slice(0, length);
  for (let index = 0; index < fade; index += 1) {
    const t = (index + 0.5) / fade;
    const tail = samples[length + index]!;
    out[index] = out[index]! * Math.sin((t * Math.PI) / 2) + tail * Math.cos((t * Math.PI) / 2);
  }
  return out;
}

/** The largest jump between neighbouring samples, the end wrapped to the start included. */
export function seamStep(samples: Float32Array): { seam: number; inside: number } {
  let inside = 0;
  for (let index = 1; index < samples.length; index += 1) {
    inside = Math.max(inside, Math.abs(samples[index]! - samples[index - 1]!));
  }
  const seam = samples.length > 1 ? Math.abs(samples[0]! - samples[samples.length - 1]!) : 0;
  return { seam, inside };
}

/** A mono 16-bit PCM WAV file of these samples. */
export function wavBytes(samples: Float32Array, sampleRate: number): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index]!));
    data.writeInt16LE(Math.round(value < 0 ? value * 0x8000 : value * 0x7fff), index * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/**
 * A test bed for the loop check: wind, as low-passed noise breathing slowly,
 * from a fixed seed so it is the same on every run. Not a shipped sound.
 */
export function testWind(sampleRate: number, seconds: number, seed = 1925): Float32Array {
  const out = new Float32Array(Math.round(sampleRate * seconds));
  let state = seed >>> 0;
  let low = 0;
  let lower = 0;
  for (let index = 0; index < out.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const white = (state / 4294967296) * 2 - 1;
    low += (white - low) * 0.08;
    lower += (low - lower) * 0.08;
    const time = index / sampleRate;
    const breath = 0.55 + 0.3 * Math.sin(time * 0.7) + 0.15 * Math.sin(time * 2.3 + 1);
    out[index] = lower * 2.2 * breath;
  }
  return out;
}
