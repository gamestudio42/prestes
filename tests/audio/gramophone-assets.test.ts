import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  clampTrackIndex,
  GRAMOPHONE_TRACKS,
  nextTrackIndex,
  previousTrackIndex,
} from '../../apps/game/src/audio/gramophone-tracks';

const MUSIC_DIR = resolve(process.cwd(), 'apps/game/public/music');
const MAX_FILE_BYTES = 800 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

describe('gramophone program', () => {
  it('starts on Plangente and keeps ids and files unique', () => {
    expect(GRAMOPHONE_TRACKS[0]?.id).toBe('plangente');
    expect(GRAMOPHONE_TRACKS[0]?.file).toBe('plangente.mp3');
    expect(new Set(GRAMOPHONE_TRACKS.map((track) => track.id)).size).toBe(
      GRAMOPHONE_TRACKS.length,
    );
    expect(new Set(GRAMOPHONE_TRACKS.map((track) => track.file)).size).toBe(
      GRAMOPHONE_TRACKS.length,
    );
  });

  it('ships every recording within the size budget', () => {
    const files = readdirSync(MUSIC_DIR).filter((file) => file.endsWith('.mp3'));
    const expected = GRAMOPHONE_TRACKS.map((track) => track.file);
    expect([...files].sort()).toEqual([...expected].sort());

    let total = 0;
    for (const track of GRAMOPHONE_TRACKS) {
      const path = resolve(MUSIC_DIR, track.file);
      expect(existsSync(path), `${track.file} is missing`).toBe(true);
      const size = statSync(path).size;
      expect(size, `${track.file} is too large`).toBeLessThanOrEqual(MAX_FILE_BYTES);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(MAX_TOTAL_BYTES);
  });

  it('records metadata and a Discografia Brasileira source for every track', () => {
    for (const track of GRAMOPHONE_TRACKS) {
      expect(track.title.length).toBeGreaterThan(0);
      expect(track.composer.length).toBeGreaterThan(0);
      expect(track.performer.length).toBeGreaterThan(0);
      expect(track.genre.length).toBeGreaterThan(0);
      expect(track.genreEn.length).toBeGreaterThan(0);
      expect(track.label.length).toBeGreaterThan(0);
      expect(track.catalog.length).toBeGreaterThan(0);
      expect(track.year).toBeGreaterThan(1900);
      expect(track.publicDomainYear).toBeGreaterThanOrEqual(track.year);
      expect(track.source.startsWith('https://discografiabrasileira.com.br/fonograma/')).toBe(
        true,
      );
    }
  });

  it('wraps and clamps track indices', () => {
    const last = GRAMOPHONE_TRACKS.length - 1;
    expect(nextTrackIndex(last)).toBe(0);
    expect(previousTrackIndex(0)).toBe(last);
    expect(clampTrackIndex(-3)).toBe(0);
    expect(clampTrackIndex(last + 10)).toBe(last);
    expect(clampTrackIndex(Number.NaN)).toBe(0);
  });
});
