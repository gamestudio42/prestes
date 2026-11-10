import type { MessageKey } from '@prestes/content';
import { activeMapGeneration, activeMapRuntime, positionsFor, type CoverPoint, type PositionDef } from '@prestes/shared';
import type { Translate } from './orderMeta';

/**
 * garrison-and-assault 4.4: a position's name for the HUD: the building
 * model's name (the editor's catalog names), "trench line" or "factory
 * yard". The positions are numbered over the frame's covers (trenches dug
 * in the editor included), so they are rebuilt when the map or the covers
 * change.
 */
let cachedMap = -1;
let cachedCovers = -1;
let cached = new Map<number, PositionDef>();

function positionsById(covers: readonly CoverPoint[]): Map<number, PositionDef> {
  const generation = activeMapGeneration();
  // Covers are only ever added (trenches dug), so their count marks a change.
  if (generation !== cachedMap || covers.length !== cachedCovers) {
    cachedMap = generation;
    cachedCovers = covers.length;
    const map = activeMapRuntime()?.map;
    const positions = map ? positionsFor({ buildings: map.buildings, covers, garrisonYards: map.garrisonYards }) : [];
    cached = new Map(positions.map((position) => [position.id, position]));
  }
  return cached;
}

export function positionName(t: Translate, positionId: number, covers: readonly CoverPoint[]): string {
  const position = positionsById(covers).get(positionId);
  if (!position) return t('hud.position.building');
  if (position.kind === 'trench-line') return t('hud.position.trench');
  if (position.kind === 'yard') return t('hud.position.yard');
  const key = `editor.object.${position.model}` as MessageKey;
  const name = position.model ? t(key) : '';
  return name && name !== key ? name : t('hud.position.building');
}
