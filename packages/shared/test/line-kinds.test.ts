import { describe, expect, it } from 'vitest';
import { compileMapDocument, createEditableMap, LINE_KINDS, parseMapDocument, toMapDocument, type LineKind } from '../src';

// revise-buildings-and-stone 5.3 (D10): the new fences and walls are appended
// to the line kinds, so a map saved before them loads with its lines unchanged.
const OLD_KINDS: readonly LineKind[] = ['taipa-wall', 'stone-wall', 'brick-wall', 'wire-fence', 'board-fence', 'picket-fence', 'hedgerow'];

describe('line kinds', () => {
  it('the old kinds keep their places; the new ones come after', () => {
    expect(LINE_KINDS.slice(0, OLD_KINDS.length).map((entry) => entry.kind)).toEqual(OLD_KINDS);
    expect(LINE_KINDS.slice(OLD_KINDS.length).map((entry) => entry.kind)).toEqual(['rail-fence', 'bamboo-fence', 'wattle-fence', 'adobe-wall', 'coped-wall', 'iron-railing']);
  });

  it('a version 7 map loads with its lines unchanged', () => {
    const map = createEditableMap({ id: 'older', size: 'small', name: { en: 'O', 'pt-BR': 'O' } });
    OLD_KINDS.forEach((kind, index) => map.lines.push({ id: index + 1, kind, height: 1.5, points: [{ x: -40 + index * 10, y: -20 }, { x: -40 + index * 10, y: 20 }] }));
    const current = toMapDocument(map);
    const older = JSON.parse(JSON.stringify({ ...current, version: 7 })) as Record<string, unknown>;
    const parsed = parseMapDocument(older);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const before = compileMapDocument(current);
    const after = compileMapDocument(parsed.document);
    expect(after.lines).toEqual(before.lines);
    expect(after.covers).toEqual(before.covers);
    expect(after.lines!.map((line) => line.kind)).toEqual(OLD_KINDS);
  });
});
