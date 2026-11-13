import { describe, expect, it } from 'vitest';
import { CATALOG_OBJECTS, bakeMap } from '../src';
import { waterside } from './fixtures/waterside';

// revise-buildings-and-stone 5.1 (D9): a waterside object in water is drawing
// only; on a bank it covers by its size and stuff.
describe('waterside objects', () => {
  it('a boat in water leaves where men can move and the cover unchanged', () => {
    const bare = waterside([]);
    const boats = CATALOG_OBJECTS.filter((entry) => entry.group === 'water').map((entry, index) => [entry.id, 32 + (index % 4) * 4, -8 + Math.floor(index / 4) * 5] as const);
    const afloat = waterside(boats);
    expect(afloat.covers).toEqual(bare.covers);
    expect(afloat.props).toHaveLength(boats.length);
    expect(afloat.props.every((prop) => prop.afloat)).toBe(true);
    expect([...bakeMap(afloat).water]).toEqual([...bakeMap(bare).water]);
  });

  it('the same canoe on the bank is a cover and a block', () => {
    const map = waterside([['dugout-canoe', 10, 0]]);
    expect(map.covers).toHaveLength(1);
    expect(map.covers[0]).toMatchObject({ kind: 'barrel', blocksMovement: true });
    expect(map.props[0]!.afloat).toBeUndefined();
  });
});
