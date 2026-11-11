import { setActiveTerrain } from '../terrain';
import { setActiveMapRuntime } from './runtime';
import type { BattleMap, BattleMapId } from './types';
import { AUTHORED_MAP_INDEX, AUTHORED_MAP_LOADERS } from './authored';
import { compileMapDocument, type AuthoredMapEntry, type MapDocument } from './document';

/** Authored maps compiled in this thread, by id. */
const MAPS = new Map<BattleMapId, BattleMap>();
/** Authored maps known in this thread, compiled on first use, once `loadAuthoredMap` fetched them. */
const AUTHORED = new Map<BattleMapId, MapDocument>();
/** Maps registered at run time (the editor's playtest), outside the menu's list. */
const TRANSIENT = new Map<BattleMapId, BattleMap>();

/** author-game-maps D3: the test map; tests, tools and the sandbox load it before building an engine. */
export const DEFAULT_BATTLE_MAP: BattleMapId = 'campo-de-provas';

export function battleMap(id: BattleMapId): BattleMap {
  const transient = TRANSIENT.get(id);
  if (transient) return transient;
  let map = MAPS.get(id);
  if (!map) {
    const document = AUTHORED.get(id);
    if (document) {
      map = compileMapDocument(document);
      MAPS.set(id, map);
    }
  }
  if (!map) throw new Error(`unknown battle map ${id}`);
  return map;
}

export function hasBattleMap(id: BattleMapId): boolean {
  return TRANSIENT.has(id) || MAPS.has(id) || AUTHORED.has(id) || id in AUTHORED_MAP_LOADERS;
}

/** The menu's maps: the authored skirmish maps loaded in this thread. */
export function battleMaps(): BattleMap[] {
  return [...AUTHORED.values()].filter((document) => document.use === 'skirmish').map((document) => battleMap(document.id));
}

/**
 * author-game-maps 2.2: the sandbox panel's maps (dev only): the menu's maps
 * and, first, the test map once it is loaded.
 */
export function sandboxMaps(): BattleMap[] {
  const test = AUTHORED.has(DEFAULT_BATTLE_MAP) ? [battleMap(DEFAULT_BATTLE_MAP)] : [];
  return [...test, ...battleMaps().filter((map) => map.id !== DEFAULT_BATTLE_MAP)];
}

/** author-game-maps D2: what the menus know of every authored map (slot, names), without loading any. */
export function authoredMapIndex(): readonly AuthoredMapEntry[] {
  return AUTHORED_MAP_INDEX;
}

/** The ids of every authored map in the project, skirmish and campaign. */
export function authoredMapIds(): readonly BattleMapId[] {
  return Object.keys(AUTHORED_MAP_LOADERS);
}

/**
 * Fetches an authored map (a campaign map's chunk is loaded only now) and
 * makes `battleMap(id)` know it in this thread. Null for an unknown id.
 */
export async function loadAuthoredMap(id: BattleMapId): Promise<MapDocument | null> {
  const known = AUTHORED.get(id);
  if (known) return known;
  const load = AUTHORED_MAP_LOADERS[id];
  if (!load) return null;
  const document = await load();
  AUTHORED.set(id, document);
  return document;
}

/**
 * Registers a compiled map for this thread under its id (the editor's
 * playtest): it wins over a map of the same id until it is unregistered.
 */
export function registerBattleMap(map: BattleMap): void {
  TRANSIENT.set(map.id, map);
}

export function unregisterBattleMap(id: BattleMapId): void {
  TRANSIENT.delete(id);
}

/**
 * Makes `map` the one every terrain, water, vegetation, bounds and path
 * query reads, in this thread. The simulation calls it before every tick and
 * the view when it builds its scene.
 */
export function setActiveMap(map: BattleMap): void {
  setActiveTerrain(map.height.kind === 'features' ? map.height.features : []);
  setActiveMapRuntime(map);
}

/**
 * author-game-maps 5.2: the skirmish desk's maps, authored only, in the
 * index's order: every skirmish map, and the test map when `includeTest`
 * (the dev server and the sandbox). Only maps already loaded are returned;
 * `loadSkirmishMaps` fetches them first.
 */
export function skirmishMaps(options: { includeTest?: boolean } = {}): BattleMap[] {
  return skirmishEntries(options)
    .filter((entry) => AUTHORED.has(entry.id))
    .map((entry) => battleMap(entry.id));
}

export async function loadSkirmishMaps(options: { includeTest?: boolean } = {}): Promise<BattleMap[]> {
  await Promise.all(skirmishEntries(options).map((entry) => loadAuthoredMap(entry.id)));
  return skirmishMaps(options);
}

function skirmishEntries(options: { includeTest?: boolean }): readonly AuthoredMapEntry[] {
  return AUTHORED_MAP_INDEX.filter((entry) => entry.use === 'skirmish' || (options.includeTest === true && entry.use === 'test' && entry.id === DEFAULT_BATTLE_MAP));
}
