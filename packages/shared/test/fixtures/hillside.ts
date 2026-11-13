import { compileMapDocument, createEditableMap, toMapDocument, type BattleMap } from '../../src';

/**
 * revise-buildings-and-stone 4.2: a dry stone wall drawn straight down a
 * hillside (x = 0, y -40 to 40, rising 0.4 m a row toward +y), in a rock
 * kind, and a stone corral of the same kind at (60, 0).
 */
export function hillside(kind?: string): BattleMap {
  const map = createEditableMap({ id: 'hillside', size: 'small', name: { en: 'H', 'pt-BR': 'H' } });
  const columns = Math.round(Math.sqrt(map.heights.length));
  for (let row = 0; row < columns; row += 1) for (let column = 0; column < columns; column += 1) map.heights[row * columns + column] = row * 40;
  map.lines.push({ id: 1, kind: 'stone-wall', height: 1.2, points: [{ x: 0, y: -40 }, { x: 0, y: 40 }], variant: kind });
  map.objects.push({ id: 1, type: 'stone-corral', x: 60, y: 0, rotation: 0, variant: kind });
  return compileMapDocument(toMapDocument(map));
}
