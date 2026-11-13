/**
 * Builds the menu gramophone recordings from the local source folder.
 *
 *   pnpm optimize:music
 *
 * Sources live in `gramofone/`, which is gitignored. The optimized files are
 * written to `apps/game/public/music/` and committed; building and testing
 * never need ffmpeg. The target is mono 24 kbps MP3 at 22.05 kHz, band-limited
 * to the range the in-game "next room" filter uses, normalized to -20 LUFS.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { findBinary } from './audio-tools';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'gramofone');
const OUTPUT = join(ROOT, 'apps/game/public/music');

const BITRATE = '24k';
const SAMPLE_RATE = 22050;
const CHANNELS = 1;
const HIGHPASS_HZ = 120;
const LOWPASS_HZ = 3500;
const LOUDNESS_LUFS = -20;
const TRUE_PEAK_DB = -2;
const LOUDNESS_RANGE = 11;
const MAX_FILE_BYTES = 800 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

interface LoudnessMeasurement {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

function measureLoudness(ffmpeg: string, input: string): LoudnessMeasurement {
  const filter = [
    `highpass=f=${HIGHPASS_HZ}`,
    `lowpass=f=${LOWPASS_HZ}`,
    `loudnorm=I=${LOUDNESS_LUFS}:TP=${TRUE_PEAK_DB}:LRA=${LOUDNESS_RANGE}:print_format=json`,
  ].join(',');
  const result = spawnSync(
    ffmpeg,
    ['-hide_banner', '-nostats', '-i', input, '-af', filter, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not measure ${input}:\n${result.stderr}`);
  }
  const blocks = [...result.stderr.matchAll(/\{[\s\S]*?\}/g)].map((match) => match[0]);
  const block = blocks.reverse().find((candidate) => candidate.includes('"input_i"'));
  if (!block) {
    throw new Error(`No loudness measurement for ${input}`);
  }
  return JSON.parse(block) as LoudnessMeasurement;
}

function encode(ffmpeg: string, input: string, output: string, measured: LoudnessMeasurement): void {
  const filter = [
    `highpass=f=${HIGHPASS_HZ}`,
    `lowpass=f=${LOWPASS_HZ}`,
    [
      `loudnorm=I=${LOUDNESS_LUFS}`,
      `TP=${TRUE_PEAK_DB}`,
      `LRA=${LOUDNESS_RANGE}`,
      `measured_I=${measured.input_i}`,
      `measured_TP=${measured.input_tp}`,
      `measured_LRA=${measured.input_lra}`,
      `measured_thresh=${measured.input_thresh}`,
      `offset=${measured.target_offset}`,
      'linear=true',
    ].join(':'),
  ].join(',');

  const temporary = `${output}.tmp.mp3`;
  const result = spawnSync(
    ffmpeg,
    [
      '-y',
      '-hide_banner',
      '-nostats',
      '-i',
      input,
      '-map',
      '0:a:0',
      '-map_metadata',
      '-1',
      '-ac',
      String(CHANNELS),
      '-ar',
      String(SAMPLE_RATE),
      '-af',
      filter,
      '-c:a',
      'libmp3lame',
      '-b:a',
      BITRATE,
      '-write_id3v1',
      '0',
      '-id3v2_version',
      '0',
      temporary,
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    rmSync(temporary, { force: true });
    throw new Error(`ffmpeg could not encode ${input}:\n${result.stderr}`);
  }
  rmSync(output, { force: true });
  renameSync(temporary, output);
}

interface ProbeResult {
  codec: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
  duration: number;
}

function probe(ffprobe: string, file: string): ProbeResult {
  const result = spawnSync(
    ffprobe,
    [
      '-v',
      'error',
      '-select_streams',
      'a:0',
      '-show_entries',
      'stream=codec_name,sample_rate,channels,bit_rate',
      '-show_entries',
      'format=duration,size',
      '-of',
      'json',
      file,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`ffprobe could not read ${file}:\n${result.stderr}`);
  }
  const data = JSON.parse(result.stdout) as {
    streams: Array<{
      codec_name: string;
      sample_rate: string;
      channels: number;
      bit_rate: string;
    }>;
    format: { duration: string };
  };
  const stream = data.streams[0];
  if (!stream) throw new Error(`No audio stream in ${file}`);
  return {
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
    bitrate: Number(stream.bit_rate),
    duration: Number(data.format.duration),
  };
}

function main(): void {
  if (!existsSync(SOURCE)) {
    throw new Error(`Source folder ${SOURCE} does not exist.`);
  }
  const files = readdirSync(SOURCE)
    .filter((file) => file.toLowerCase().endsWith('.mp3'))
    .sort();
  if (files.length === 0) {
    throw new Error(`No MP3 files in ${SOURCE}.`);
  }
  mkdirSync(OUTPUT, { recursive: true });

  const ffmpeg = findBinary('ffmpeg');
  const ffprobe = findBinary('ffprobe');
  const sourceBytes = files.reduce((total, file) => total + statSync(join(SOURCE, file)).size, 0);
  let outputBytes = 0;

  console.log(`Encoding ${files.length} recordings with ${ffmpeg}`);
  for (const file of files) {
    const input = join(SOURCE, file);
    const output = join(OUTPUT, file);
    const measured = measureLoudness(ffmpeg, input);
    encode(ffmpeg, input, output, measured);
    const info = probe(ffprobe, output);
    const size = statSync(output).size;
    outputBytes += size;
    if (info.codec !== 'mp3' || info.sampleRate !== SAMPLE_RATE || info.channels !== CHANNELS) {
      throw new Error(
        `${file}: expected mp3 ${SAMPLE_RATE} Hz mono, got ${info.codec} ${info.sampleRate} Hz ${info.channels} ch`,
      );
    }
    if (size > MAX_FILE_BYTES) {
      throw new Error(`${file}: ${size} B is above the ${MAX_FILE_BYTES} B per-file budget`);
    }
    console.log(
      `  ${file.padEnd(34)} ${(size / 1024).toFixed(0).padStart(4)} KiB  ${info.duration.toFixed(1).padStart(6)} s  ${(info.bitrate / 1000).toFixed(0)} kbps`,
    );
  }

  if (outputBytes > MAX_TOTAL_BYTES) {
    throw new Error(
      `Total ${outputBytes} B is above the ${MAX_TOTAL_BYTES} B budget; lower the bitrate.`,
    );
  }
  console.log(
    `\n${(sourceBytes / 1024 / 1024).toFixed(1)} MiB -> ${(outputBytes / 1024 / 1024).toFixed(1)} MiB (${(
      (1 - outputBytes / sourceBytes) *
      100
    ).toFixed(0)}% smaller), ${ffprobe} verified`,
  );
}

main();
