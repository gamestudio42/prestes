import { setActiveTerrain } from '../terrain';
import { setActiveMapRuntime } from './runtime';
import type { BattleMap, BattleMapId } from './types';
import { VILA_MILITAR } from './vila-militar';
import { FAZENDA } from './fazenda';
import { SERRA_RIO } from './serra-rio';
import { BAIRRO } from './bairro';
import { AUTHORED_MAP_LOADERS, AUTHORED_SKIRMISH_DOCUMENTS } from './authored';
import { compileMapDocument, type MapDocument } from './document';

/** The battle maps, in the order the menu lists them: the hand-written ones, then the authored. */
const MAPS = new Map<BattleMapId, BattleMap>(
  [VILA_MILITAR, FAZENDA, SERRA_RIO, BAIRRO].map((map) => [map.id, map]),
);
const BUILTIN = new Set<BattleMapId>(MAPS.keys());
/**
 * Authored maps known in this thread, compiled on first use: the skirmish
 * maps from the start, campaign maps once `loadAuthoredMap` fetched them.
 */
const AUTHORED = new Map<BattleMapId, MapDocument>(AUTHORED_SKIRMISH_DOCUMENTS.map((document) => [document.id, document]));
/** Maps registered at run time (the editor's playtest), outside the menu's list. */
const TRANSIENT = new Map<BattleMapId, BattleMap>();

export const DEFAULT_BATTLE_MAP: BattleMapId = 'vila-militar';

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

/** The menu's maps: the hand-written ones, then the authored skirmish maps. */
export function battleMaps(): BattleMap[] {
  const authored = [...AUTHORED.values()].filter((document) => document.use === 'skirmish' && !BUILTIN.has(document.id));
  return [...[...BUILTIN].map((id) => MAPS.get(id)!), ...authored.map((document) => battleMap(document.id))];
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
 * Hand-written ids cannot be replaced.
 */
export function registerBattleMap(map: BattleMap): void {
  if (BUILTIN.has(map.id)) throw new Error(`cannot replace the hand-written map ${map.id}`);
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
