/**
 * ambient-sound-and-voices 1.3 (D8): does a bed loop without a gap in the
 * game's browser? Encodes one test bed (a synthesized wind made to loop) in
 * each candidate format, decodes it in Chromium as the game does
 * (`decodeAudioData`), and measures the silence the encoder adds at the
 * start and the end, which a looping source would play as a gap.
 *
 *   pnpm exec tsx tools/audio-loop-check.ts
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { findBinary, loopCrossfade, testWind, wavBytes } from './audio-tools';
import { GROUPS, prepareFile } from './prepare-audio';

const RATE = 32000;
const SECONDS = 32;
const FADE = 2;

export const CANDIDATES: Record<string, string[]> = {
  'mp3 64k': ['-c:a', 'libmp3lame', '-b:a', '64k', '-f', 'mp3'],
  'ogg vorbis q3': ['-c:a', 'libvorbis', '-q:a', '3', '-f', 'ogg'],
  'ogg opus 48k': ['-c:a', 'libopus', '-b:a', '48k', '-f', 'ogg'],
  wav: ['-c:a', 'pcm_s16le', '-f', 'wav'],
};

/** The lag (samples) at which `decoded` best matches the start of `source`. */
function leadOf(source: Float32Array, decoded: Float32Array, maxLag = 4000, window = RATE): number {
  let best = 0;
  let bestScore = -Infinity;
  for (let lag = 0; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let index = 0; index < window; index += 4) score += source[index]! * (decoded[index + lag] ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return best;
}

async function main(): Promise<void> {
  const ffmpeg = findBinary('ffmpeg');
  const bed = loopCrossfade(testWind(RATE, SECONDS), FADE * RATE);
  const dir = mkdtempSync(join(tmpdir(), 'prestes-loop-'));
  const browser = await chromium.launch();
  try {
    const source = join(dir, 'bed.wav');
    writeFileSync(source, wavBytes(bed, RATE));
    const page = await browser.newPage();
    console.log(`test bed: ${bed.length} samples (${(bed.length / RATE).toFixed(2)} s at ${RATE} Hz)`);
    // The bed as the preparation tool makes it: levelled, looped, encoded.
    const unlooped = join(dir, 'unlooped.wav');
    writeFileSync(unlooped, wavBytes(testWind(RATE, SECONDS), RATE));
    const prepared = prepareFile(ffmpeg, unlooped, { ...GROUPS.beds!, sampleRate: RATE, shape: { loop: FADE } }).bytes;
    for (const [name, args] of [...Object.entries(CANDIDATES), ['prepared mp3', null] as const]) {
      let bytes: Buffer;
      if (args) {
        const output = join(dir, `out-${name.replace(/\W+/g, '-')}`);
        const result = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', source, '-ac', '1', '-map_metadata', '-1', ...args, output]);
        if (result.status !== 0) throw new Error(`${name}: ${result.stderr}`);
        bytes = readFileSync(output);
      } else {
        bytes = prepared;
      }
      const decoded = await page.evaluate(
        async ({ data, rate }) => {
          const raw = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
          const context = new OfflineAudioContext({ numberOfChannels: 1, length: 1, sampleRate: rate });
          const buffer = await context.decodeAudioData(raw.buffer);
          const channel = buffer.getChannelData(0);
          let text = '';
          const view = new Uint8Array(channel.buffer, channel.byteOffset, channel.byteLength);
          for (let index = 0; index < view.length; index += 0x8000) text += String.fromCharCode(...view.subarray(index, index + 0x8000));
          return btoa(text);
        },
        { data: bytes.toString('base64'), rate: RATE },
      );
      const raw = Buffer.from(decoded, 'base64');
      const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
      const lead = leadOf(bed, samples);
      const tail = samples.length - bed.length - lead;
      const gapMs = ((lead + Math.max(0, tail)) / RATE) * 1000;
      console.log(
        `${name.padEnd(14)} ${String(bytes.length).padStart(8)} B  decoded ${samples.length} samples  lead ${lead}  tail ${tail}  gap ${gapMs.toFixed(1)} ms`,
      );
    }
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

await main();
