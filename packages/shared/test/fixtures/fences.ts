import { compileMapDocument, createEditableMap, lineKind, toMapDocument, type BattleMap, type LineKind } from '../../src';

/** revise-buildings-and-stone 5.3: the six fences and walls appended in 5.3. */
export const NEW_LINE_KINDS: readonly LineKind[] = ['rail-fence', 'bamboo-fence', 'wattle-fence', 'adobe-wall', 'coped-wall', 'iron-railing'];

/** The open gates of 5.3. */
export const GATES: readonly string[] = ['farm-gate', 'rail-gate', 'yard-gate', 'iron-gate'];

/**
 * revise-buildings-and-stone 5.3: a hillside (rising 0.4 m a row toward +y)
 * with `kinds` drawn straight down it, 15 m apart from x = -60, each at its
 * default height, and the open gates in a row at y = -60.
 */
export function fences(kinds: readonly LineKind[] = NEW_LINE_KINDS, height?: number): BattleMap {
  const map = createEditableMap({ id: 'fences', size: 'small', name: { en: 'F', 'pt-BR': 'F' } });
  const columns = Math.round(Math.sqrt(map.heights.length));
  for (let row = 0; row < columns; row += 1) for (let column = 0; column < columns; column += 1) map.heights[row * columns + column] = row * 40;
  kinds.forEach((kind, index) => {
    const x = -60 + index * 15;
    map.lines.push({ id: index + 1, kind, height: height ?? lineKind(kind).defaultHeight, points: [{ x, y: -40 }, { x, y: 40 }] });
  });
  GATES.forEach((type, index) => map.objects.push({ id: index + 1, type, x: -45 + index * 15, y: -60, rotation: 0 }));
  return compileMapDocument(toMapDocument(map));
}
