import { describe, expect, it } from 'vitest';
import type { BattleAsset, BattleAssetLoaders, PreloadProgress } from '@prestes/view3d';
import { BattleStarts, prepareBattle, type PrepareBattle } from '../../apps/game/src/client/battle-start';
import { firstSentence, loadingText } from '../../apps/game/src/ui/BattleLoading';

// prepare-online-release 2.3: the start sequence, and 2.4: what the loading screen says.

const LIST: BattleAsset[] = [{ kind: 'soldier' }, { kind: 'environment-atlas' }, { kind: 'model', file: 'props' }];
const loaders: BattleAssetLoaders = {
  soldier: async () => undefined,
  environmentAtlas: async () => undefined,
  model: async () => undefined,
  groundAtlas: async () => undefined,
};

/** A start whose map arrives when `release` is called. */
function gatedStart(starts: BattleStarts, seen: { done: number; total: number }[] = []) {
  let release: (ok: boolean) => void = () => undefined;
  const mapArrives = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  const options: PrepareBattle = {
    starts,
    token: starts.begin(),
    loadMap: () => mapArrives,
    mapOf: () => null,
    assets: () => LIST,
    preload: async (list, _loaders, onProgress) => {
      const progress: PreloadProgress = { done: 0, total: list.length, failed: 0 };
      onProgress({ ...progress });
      list.forEach(() => {
        progress.done += 1;
        onProgress({ ...progress });
      });
      return progress;
    },
    loaders,
    onProgress: (state) => seen.push({ done: state.done, total: state.total }),
  };
  return { options, release };
}

describe('battle start sequence', () => {
  it('opens once the map and the files are in, counting the map as one entry', async () => {
    const starts = new BattleStarts();
    const seen: { done: number; total: number }[] = [];
    const { options, release } = gatedStart(starts, seen);
    const ready = prepareBattle(options);
    release(true);
    expect(await ready).toEqual({ failed: 0 });
    expect(seen[0]).toEqual({ done: 0, total: 1 });
    expect(seen.at(-1)).toEqual({ done: 4, total: 4 });
  });

  it('leaving during loading, then starting again: only the second battle opens', async () => {
    const starts = new BattleStarts();
    const first = gatedStart(starts);
    const firstReady = prepareBattle(first.options);
    starts.cancel(); // back to the menu
    const second = gatedStart(starts);
    const secondReady = prepareBattle(second.options);
    first.release(true);
    second.release(true);
    expect(await firstReady).toBeNull();
    expect(await secondReady).toEqual({ failed: 0 });
  });

  it('a start overtaken by another never opens, even if it finishes last', async () => {
    const starts = new BattleStarts();
    const first = gatedStart(starts);
    const firstReady = prepareBattle(first.options);
    const second = gatedStart(starts);
    const secondReady = prepareBattle(second.options);
    second.release(true);
    expect(await secondReady).toEqual({ failed: 0 });
    first.release(true);
    expect(await firstReady).toBeNull();
  });

  it('a map that cannot be had does not open', async () => {
    const starts = new BattleStarts();
    const { options, release } = gatedStart(starts);
    const ready = prepareBattle(options);
    release(false);
    expect(await ready).toBeNull();
  });
});

describe('battle loading text', () => {
  it('names a chapter by number, title and commander, with its pitch', () => {
    const text = loadingText({ chapterId: 'serra-nova', map: null, done: 0, total: 1 }, 'pt-BR');
    expect(text.kicker).toContain('Capítulo 6');
    expect(text.kicker).toContain('Prestes');
    expect(text.heading).toContain('Serra Nova');
    expect(text.line.length).toBeGreaterThan(10);
  });

  it('keeps the first sentence only', () => {
    expect(firstSentence('One. Two.')).toBe('One.');
    expect(firstSentence('No stop')).toBe('No stop');
  });
});
