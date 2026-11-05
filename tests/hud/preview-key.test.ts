import { describe, expect, it } from 'vitest';
import { previewKey } from '../../apps/game/src/hooks/previewKey';

// movement-polish: the preview is recomputed only when its key changes.
describe('order preview key', () => {
  const base = {
    order: 'attack',
    selected: [
      { id: 1, x: 10.2, y: 80.4 },
      { id: 2, x: 13.0, y: 80.4 },
    ],
    hoverPoint: { x: 4.3, y: -60.7 },
    hoverUnitId: 40,
  };

  it('stays the same for a still pointer while soldiers shift within their metre', () => {
    const later = {
      ...base,
      hoverPoint: { x: 4.8, y: -60.2 },
      selected: [
        { id: 1, x: 10.6, y: 80.9 },
        { id: 2, x: 13.4, y: 80.1 },
      ],
    };
    expect(previewKey(later)).toBe(previewKey(base));
  });

  it('changes with the pointer cell, the target, the order or a soldier moving a metre', () => {
    const key = previewKey(base);
    expect(previewKey({ ...base, hoverPoint: { x: 5.1, y: -60.7 } })).not.toBe(key);
    expect(previewKey({ ...base, hoverUnitId: 41 })).not.toBe(key);
    expect(previewKey({ ...base, order: 'flank' })).not.toBe(key);
    expect(previewKey({ ...base, selected: [{ id: 1, x: 11.2, y: 80.4 }, base.selected[1]!] })).not.toBe(key);
  });

  it('follows a facing drag', () => {
    const drag = { from: { x: 0, y: 0 }, to: { x: 3, y: 0 } };
    const key = previewKey({ ...base, drag, dragKind: 'facing' });
    expect(previewKey({ ...base, drag: { ...drag, to: { x: 3.5, y: 0 } }, dragKind: 'facing' })).not.toBe(key);
  });
});
