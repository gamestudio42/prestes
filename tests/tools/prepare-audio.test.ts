import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { findBinary, loopCrossfade, seamStep, testWind, trimSilence, wavBytes } from '../../tools/audio-tools';
import { prepareAudio, soundFiles, soundFilesModule } from '../../tools/prepare-audio';

// ambient-sound-and-voices 1.3: the audio preparation tool.

const RATE = 8000;

function ffmpegOrNull(): string | null {
  try {
    return findBinary('ffmpeg');
  } catch {
    return null;
  }
}

describe('trimSilence', () => {
  it('drops the silence at both ends and keeps a short margin', () => {
    const samples = new Float32Array(RATE * 3);
    samples.fill(0.5, RATE, RATE * 2);
    const trimmed = trimSilence(samples, RATE, -50, 0.03);
    expect(trimmed.length).toBe(RATE + 2 * Math.round(0.03 * RATE));
    expect(trimmed[Math.round(0.03 * RATE)]).toBe(0.5);
  });

  it('keeps quiet sound above the threshold and empties pure silence', () => {
    const samples = new Float32Array(100).fill(0.01);
    expect(trimSilence(samples, RATE).length).toBe(100);
    expect(trimSilence(new Float32Array(100), RATE).length).toBe(0);
  });
});

describe('loopCrossfade', () => {
  it('makes the end run into the start with no step bigger than inside the sound', () => {
    const wind = testWind(RATE, 6);
    const raw = seamStep(wind);
    const looped = loopCrossfade(wind, RATE);
    const step = seamStep(looped);
    expect(looped.length).toBe(wind.length - RATE);
    expect(step.seam).toBeLessThanOrEqual(step.inside);
    // The raw cut is a step the loop removes.
    expect(step.seam).toBeLessThan(raw.seam + 1e-9);
  });

  it('keeps the middle untouched', () => {
    const wind = testWind(RATE, 6);
    const looped = loopCrossfade(wind, RATE);
    expect(looped[RATE * 3]).toBe(wind[RATE * 3]);
  });

  it('refuses a sound too short for its fade', () => {
    expect(() => loopCrossfade(new Float32Array(100), 60)).toThrow();
  });
});

describe('wavBytes', () => {
  it('writes a mono 16-bit header and the samples', () => {
    const bytes = wavBytes(new Float32Array([0, 1, -1]), 8000);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.readUInt16LE(22)).toBe(1);
    expect(bytes.readUInt32LE(24)).toBe(8000);
    expect(bytes.readInt16LE(46)).toBe(0x7fff);
    expect(bytes.readInt16LE(48)).toBe(-0x8000);
  });
});

const ffmpeg = ffmpegOrNull();

describe.skipIf(!ffmpeg)('prepareAudio with ffmpeg', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prestes-prepare-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const source = join(dir, 'src');
  mkdirSync(join(source, 'beds'), { recursive: true });
  mkdirSync(join(source, 'voice', 'commander'), { recursive: true });
  writeFileSync(join(source, 'beds', 'wind.wav'), wavBytes(testWind(32000, 8), 32000));
  // A "line": a second of tone between a second of silence on each side.
  const line = new Float32Array(22050 * 3);
  for (let index = 22050; index < 22050 * 2; index += 1) line[index] = 0.4 * Math.sin((index / 22050) * Math.PI * 2 * 220);
  writeFileSync(join(source, 'voice', 'commander', 'avancar-1.wav'), wavBytes(line, 22050));

  it('is repeatable: the same sources give the same bytes', () => {
    const first = prepareAudio(source, join(dir, 'a'), ffmpeg!);
    const second = prepareAudio(source, join(dir, 'b'), ffmpeg!);
    expect(first.map((entry) => entry.file)).toEqual(['voice/commander/avancar-1.mp3', 'beds/wind.mp3']);
    for (const entry of first) {
      expect(readFileSync(join(dir, 'b', entry.file)).equals(readFileSync(join(dir, 'a', entry.file)))).toBe(true);
    }
    expect(second).toEqual(first);
  });

  it('writes the gapless header a looped bed needs (piped, ffmpeg left it out)', () => {
    const written = prepareAudio(source, join(dir, 'd'), ffmpeg!);
    for (const entry of written) {
      const head = readFileSync(join(dir, 'd', entry.file)).subarray(0, 512).toString('latin1');
      expect(/Info|Xing/.test(head), entry.file).toBe(true);
      expect(/lame/i.test(head), entry.file).toBe(true);
    }
  });

  it('trims a line to its sound and shortens a bed by its loop fade', () => {
    const written = prepareAudio(source, join(dir, 'c'), ffmpeg!);
    const voice = written.find((entry) => entry.file.startsWith('voice/'))!;
    const bed = written.find((entry) => entry.file.startsWith('beds/'))!;
    expect(voice.seconds).toBeGreaterThan(0.95);
    expect(voice.seconds).toBeLessThan(1.2);
    expect(bed.seconds).toBeCloseTo(6, 1);
  });
});

describe('soundFiles and the client list', () => {
  it('lists every prepared sound by id, across groups and folders', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prestes-files-'));
    try {
      mkdirSync(join(dir, 'beds'), { recursive: true });
      mkdirSync(join(dir, 'voice', 'commander'), { recursive: true });
      writeFileSync(join(dir, 'beds', 'bed-town.mp3'), '');
      writeFileSync(join(dir, 'voice', 'commander', 'avancar-1.mp3'), '');
      writeFileSync(join(dir, 'beds', 'notes.txt'), '');
      const files = soundFiles(dir);
      expect(files).toEqual({ 'avancar-1': 'voice/commander/avancar-1.mp3', 'bed-town': 'beds/bed-town.mp3' });
      const module = soundFilesModule(files);
      expect(module).toContain("  'bed-town': 'beds/bed-town.mp3',");
      expect(soundFilesModule({})).toContain('= {};');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
