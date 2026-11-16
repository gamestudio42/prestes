import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { compileMapDocument, createEditableMap, setActiveMap, type BattleMap } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { battleAssets, preloadBattle, type BattleAssetLoaders, type PreloadProgress } from '../src/battle-assets';
import { ModelLibrary } from '../src/environment-models';

// prepare-online-release 2.1-2.2: what a battle loads before it opens, and how.

afterEach(() => setActiveMap(TEST_MAP));

function cerradoMap(): BattleMap {
  const map = createEditableMap({ id: 'planalto', size: 'small', name: { en: 'P', 'pt-BR': 'P' } });
  map.objects.push({ id: 1, type: 'aroeira', x: 0, y: 0, rotation: 0 });
  map.objects.push({ id: 2, type: 'rock-small', x: 10, y: 0, rotation: 0 });
  return compileMapDocument(map);
}

const files = (map: BattleMap | null) =>
  battleAssets(map).map((asset) => (asset.kind === 'model' ? asset.file : asset.kind));

describe('battleAssets', () => {
  it('a cerrado map lists the cerrado trees and no other biome', () => {
    const list = files(cerradoMap());
    expect(list).toContain('trees-cerrado');
    expect(list.filter((file) => file.startsWith('trees-'))).toEqual(['trees-cerrado']);
  });

  it('lists the soldier, the atlas and the base files first, in a stable order', () => {
    const map = cerradoMap();
    expect(files(map)).toEqual(files(map));
    expect(files(map).slice(0, 9)).toEqual([
      'soldier',
      'environment-atlas',
      'buildings-rural',
      'buildings-military',
      'fortifications',
      'vegetation',
      'props',
      'trees',
      'stones',
    ]);
    expect(new Set(files(map)).size).toBe(files(map).length);
  });

  it('a painted map waits for the ground atlas; an unpainted one does not', () => {
    const painted = cerradoMap();
    expect(painted.paint).toBeDefined();
    expect(files(painted).at(-1)).toBe('ground-atlas');
    const unpainted: BattleMap = { ...painted, paint: undefined };
    expect(files(unpainted)).not.toContain('ground-atlas');
  });
});

/** Loaders over one model library and request counters, like the browser's shared caches. */
function fakeLoaders(fail: Record<string, number> = {}) {
  const requests: string[] = [];
  const failures = { ...fail };
  const fetch = async (url: string): Promise<THREE.Object3D> => {
    requests.push(url);
    const left = failures[url] ?? 0;
    if (left > 0) {
      failures[url] = left - 1;
      throw new Error(`404 ${url}`);
    }
    return new THREE.Group();
  };
  const library = new ModelLibrary(fetch, './models/');
  const once = new Map<string, Promise<unknown>>();
  const cached = (key: string) => {
    let pending = once.get(key);
    if (!pending) {
      pending = fetch(key);
      pending.catch(() => once.delete(key));
      once.set(key, pending);
    }
    return pending;
  };
  const loaders: BattleAssetLoaders = {
    soldier: () => cached('soldier'),
    environmentAtlas: () => cached('atlas'),
    model: (file) => library.include([file]),
    groundAtlas: () => cached('ground'),
  };
  return { loaders, requests };
}

describe('preloadBattle', () => {
  it('reports progress rising to the total', async () => {
    const { loaders } = fakeLoaders();
    const seen: PreloadProgress[] = [];
    const list = battleAssets(cerradoMap());
    const result = await preloadBattle(list, loaders, (progress) => seen.push(progress));
    expect(result).toEqual({ done: list.length, total: list.length, failed: 0 });
    expect(seen[0]).toEqual({ done: 0, total: list.length, failed: 0 });
    expect(seen.map((progress) => progress.done)).toEqual(Array.from({ length: list.length + 1 }, (_, index) => index));
  });

  it('a file that fails once loads on the retry', async () => {
    const { loaders, requests } = fakeLoaders({ './models/props.glb': 1 });
    const result = await preloadBattle(battleAssets(cerradoMap()), loaders);
    expect(result.failed).toBe(0);
    expect(requests.filter((url) => url === './models/props.glb')).toHaveLength(2);
  });

  it('a file that fails twice counts as failed and never blocks', async () => {
    const { loaders } = fakeLoaders({ './models/trees-cerrado.glb': 2, soldier: 5 });
    const list = battleAssets(cerradoMap());
    const result = await preloadBattle(list, loaders);
    expect(result).toEqual({ done: list.length, total: list.length, failed: 2 });
  });

  it('a second preload of the same list makes no request', async () => {
    const { loaders, requests } = fakeLoaders();
    const list = battleAssets(cerradoMap());
    await preloadBattle(list, loaders);
    const first = requests.length;
    await preloadBattle(list, loaders);
    expect(requests.length).toBe(first);
  });
});
