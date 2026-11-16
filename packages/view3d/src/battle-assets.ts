import type { BattleMap } from '@prestes/shared';
import { ENVIRONMENT_FILES, loadEnvironmentAtlas, loadEnvironmentFile } from './environment-models';
import { loadGroundAtlas } from './painted-ground';
import { loadSoldierAsset } from './soldier-models';
import { mapModelFiles } from './battle-map-layer';

/**
 * prepare-online-release D2: one file a battle needs before it opens. The
 * soldier entry covers soldier.glb and its uniform textures.
 */
export type BattleAsset =
  | { kind: 'soldier' }
  | { kind: 'environment-atlas' }
  | { kind: 'model'; file: string }
  | { kind: 'ground-atlas' };

export interface PreloadProgress {
  done: number;
  total: number;
  /** Entries that failed twice; the battle opens with their placeholders. */
  failed: number;
}

/** What loads each kind of entry; the browser's go through the shared caches. */
export interface BattleAssetLoaders {
  soldier(): Promise<unknown>;
  environmentAtlas(): Promise<unknown>;
  model(file: string): Promise<unknown>;
  groundAtlas(): Promise<unknown>;
}

/**
 * D2: everything the battle on `map` draws from files, in a stable order:
 * the soldier, the environment atlas, the base environment files, the
 * map's own files (biome trees and stones among them, the rule the scene
 * uses), and the ground atlas when the map is painted.
 */
export function battleAssets(map: BattleMap | null | undefined): BattleAsset[] {
  const base = [...ENVIRONMENT_FILES];
  const own = map ? mapModelFiles(map).filter((file) => !base.includes(file)) : [];
  return [
    { kind: 'soldier' },
    { kind: 'environment-atlas' },
    ...base.map((file): BattleAsset => ({ kind: 'model', file })),
    ...own.map((file): BattleAsset => ({ kind: 'model', file })),
    ...(map?.paint ? [{ kind: 'ground-atlas' } as const] : []),
  ];
}

const loadOne = (asset: BattleAsset, loaders: BattleAssetLoaders): Promise<unknown> => {
  switch (asset.kind) {
    case 'soldier':
      return loaders.soldier();
    case 'environment-atlas':
      return loaders.environmentAtlas();
    case 'model':
      return loaders.model(asset.file);
    case 'ground-atlas':
      return loaders.groundAtlas();
  }
};

/**
 * D2-D3: loads every entry at once, each retried once, and reports progress
 * as entries settle. Never rejects: a file that fails twice counts as failed.
 */
export async function preloadBattle(
  list: readonly BattleAsset[],
  loaders: BattleAssetLoaders,
  onProgress?: (progress: PreloadProgress) => void,
): Promise<PreloadProgress> {
  const progress: PreloadProgress = { done: 0, total: list.length, failed: 0 };
  onProgress?.({ ...progress });
  await Promise.all(
    list.map(async (asset) => {
      try {
        await loadOne(asset, loaders);
      } catch {
        try {
          await loadOne(asset, loaders);
        } catch (error) {
          progress.failed += 1;
          console.warn('battle asset failed twice, its placeholders stay', asset, error);
        }
      }
      progress.done += 1;
      onProgress?.({ ...progress });
    }),
  );
  return progress;
}

/** The ground atlas every painted battle map draws (the scene's own URL). */
export const GROUND_ATLAS_URL = './models/textures/ground-atlas.png';

/** D2: the browser's loaders, through the same shared caches the scene reads. */
export function sharedBattleLoaders(base = './models/'): BattleAssetLoaders {
  return {
    soldier: () => loadSoldierAsset(base),
    environmentAtlas: () => loadEnvironmentAtlas(base),
    model: (file) => loadEnvironmentFile(file, base),
    groundAtlas: () => loadGroundAtlas(`${base}textures/ground-atlas.png`),
  };
}
