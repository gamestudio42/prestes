import { describe, expect, it } from 'vitest';
import { compileMapDocument, createEditableMap, toMapDocument, ROCK_KINDS, type BattleMap } from '../src';

// revise-buildings-and-stone 4.1 (D4): a stone's rock kind is drawing only;
// its cover and sight are its size's.
function field(kind?: string): BattleMap {
  const map = createEditableMap({ id: 'rocks', size: 'small', name: { en: 'R', 'pt-BR': 'R' } });
  const types = ['rock-small', 'boulder', 'matacao', 'outcrop', 'stone-pile'];
  types.forEach((type, index) => map.objects.push({ id: index + 1, type, x: -40 + index * 20, y: 0, rotation: 0.3, variant: kind }));
  return compileMapDocument(toMapDocument(map));
}

describe('rock kinds', () => {
  it('every kind of a stone covers and hides as its size does', () => {
    const granite = field();
    for (const kind of ROCK_KINDS) {
      const map = field(kind);
      expect(map.covers).toEqual(granite.covers);
      expect(map.props.map(({ kind: _kind, ...rest }) => rest)).toEqual(granite.props);
    }
  });

  it('the kind lands on the prop only; granite and unknown kinds are left unset', () => {
    expect(field('basalt').props.every((prop) => prop.kind === 'basalt')).toBe(true);
    expect(field('granite').props.every((prop) => prop.kind === undefined)).toBe(true);
    expect(field('marble').props.every((prop) => prop.kind === undefined)).toBe(true);
  });

  it('a kind kept in the map document survives the round trip', () => {
    const map = createEditableMap({ id: 'rocks', size: 'small', name: { en: 'R', 'pt-BR': 'R' } });
    map.objects.push({ id: 1, type: 'boulder', x: 0, y: 0, rotation: 0, variant: 'sandstone' });
    const doc = JSON.parse(JSON.stringify(toMapDocument(map)));
    expect(compileMapDocument(doc).props[0]!.kind).toBe('sandstone');
  });
});
