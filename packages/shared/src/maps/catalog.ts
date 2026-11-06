import { setActiveTerrain } from '../terrain';
import { setActiveMapRuntime } from './runtime';
import type { BattleMap, BattleMapId } from './types';
import { VILA_MILITAR } from './vila-militar';
import { FAZENDA } from './fazenda';
import { SERRA_RIO } from './serra-rio';
import { BAIRRO } from './bairro';

/** The battle maps, in the order the menu lists them. */
const MAPS = new Map<BattleMapId, BattleMap>(
  [VILA_MILITAR, FAZENDA, SERRA_RIO, BAIRRO].map((map) => [map.id, map]),
);

export const DEFAULT_BATTLE_MAP: BattleMapId = 'vila-militar';

export function battleMap(id: BattleMapId): BattleMap {
  const map = MAPS.get(id);
  if (!map) throw new Error(`unknown battle map ${id}`);
  return map;
}

export function battleMaps(): BattleMap[] {
  return [...MAPS.values()];
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
