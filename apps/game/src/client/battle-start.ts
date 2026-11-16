import type { BattleAsset, BattleAssetLoaders, PreloadProgress } from '@prestes/view3d';
import type { BattleMap } from '@prestes/shared';

/**
 * prepare-online-release D3: battle starts are numbered; leaving to the menu
 * or starting another battle while one loads makes the earlier one stale,
 * and its late result is dropped.
 */
export class BattleStarts {
  private generation = 0;

  /** A new start; every earlier one goes stale. */
  begin(): number {
    this.generation += 1;
    return this.generation;
  }

  /** Leaving to the menu: whatever was loading goes stale. */
  cancel(): void {
    this.generation += 1;
  }

  isCurrent(token: number): boolean {
    return token === this.generation;
  }
}

export interface PrepareBattle {
  starts: BattleStarts;
  token: number;
  /** Fetches the map document when it is a chunk not loaded yet; false when it cannot be had. */
  loadMap(): Promise<boolean>;
  /** The compiled map, once its document is in. */
  mapOf(): BattleMap | null;
  assets(map: BattleMap | null): BattleAsset[];
  preload(list: readonly BattleAsset[], loaders: BattleAssetLoaders, onProgress: (progress: PreloadProgress) => void): Promise<PreloadProgress>;
  loaders: BattleAssetLoaders;
  /** Progress counts the map document as one entry, ahead of the files. */
  onProgress(state: { map: BattleMap | null; done: number; total: number }): void;
}

/**
 * D2-D3: the map document, then every file the battle draws. Resolves with
 * the number of files that failed twice, or null when the start went stale
 * (or its map could not be had) and must not open.
 */
export async function prepareBattle(options: PrepareBattle): Promise<{ failed: number } | null> {
  const { starts, token } = options;
  options.onProgress({ map: null, done: 0, total: 1 });
  const haveMap = await options.loadMap();
  if (!starts.isCurrent(token) || !haveMap) return null;
  const map = options.mapOf();
  const list = options.assets(map);
  const result = await options.preload(list, options.loaders, (progress) => {
    if (starts.isCurrent(token)) options.onProgress({ map, done: progress.done + 1, total: progress.total + 1 });
  });
  if (!starts.isCurrent(token)) return null;
  return { failed: result.failed };
}
