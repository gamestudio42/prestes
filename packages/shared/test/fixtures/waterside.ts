import { compileMapDocument, createEditableMap, toMapDocument, type BattleMap } from '../../src';

/**
 * revise-buildings-and-stone 5.1: a deep pond at (40, 0), 24 m across, and
 * the given waterside objects (type, x, y).
 */
export function waterside(objects: readonly (readonly [string, number, number])[]): BattleMap {
  const map = createEditableMap({ id: 'waterside', size: 'small', name: { en: 'W', 'pt-BR': 'W' } });
  map.ponds.push({ id: 1, kind: 'deep', polygon: [{ x: 28, y: -12 }, { x: 52, y: -12 }, { x: 52, y: 12 }, { x: 28, y: 12 }] });
  objects.forEach(([type, x, y], index) => map.objects.push({ id: index + 1, type, x, y, rotation: 0 }));
  return compileMapDocument(toMapDocument(map));
}
