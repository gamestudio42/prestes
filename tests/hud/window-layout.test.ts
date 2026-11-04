import { describe, expect, it } from 'vitest';
import {
  LAYOUT_KEY,
  TOP_BAR_HEIGHT,
  clampWindow,
  defaultPosition,
  loadLayout,
  saveLayout,
} from '../../apps/game/src/ui/windowLayout';

const view = { w: 1440, h: 900 };

describe('floating window layout', () => {
  it('keeps a window inside the view, below the top bar, on the 2 px grid', () => {
    expect(clampWindow({ x: -40, y: 5 }, { w: 300, h: 200 }, view)).toEqual({ x: 0, y: TOP_BAR_HEIGHT });
    expect(clampWindow({ x: 1300, y: 880 }, { w: 300, h: 200 }, view)).toEqual({ x: 1140, y: 700 });
    expect(clampWindow({ x: 101, y: 203 }, { w: 300, h: 200 }, view)).toEqual({ x: 102, y: 204 });
  });

  it('places Troops bottom left, the summary above it and Orders clear of Troops', () => {
    const troops = { w: 190, h: 110 };
    const placedTroops = defaultPosition('troops', troops, view);
    expect(placedTroops).toEqual({ x: 12, y: 778 });
    const summary = defaultPosition('summary', { w: 300, h: 170 }, view, troops);
    expect(summary.y + 170).toBeLessThanOrEqual(placedTroops.y);
    const orders = defaultPosition('orders', { w: 640, h: 290 }, view, troops);
    expect(orders.x).toBeGreaterThanOrEqual(troops.w + 12);
    expect(orders.y + 290).toBeLessThanOrEqual(view.h);
  });

  it('restores a saved layout and ignores broken or blocked storage', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    saveLayout(storage, { orders: { x: 40, y: 80, minimized: true } });
    expect(loadLayout(storage)).toEqual({ orders: { x: 40, y: 80, minimized: true } });
    store.set(LAYOUT_KEY, '{not json');
    expect(loadLayout(storage)).toEqual({});
    store.set(LAYOUT_KEY, JSON.stringify({ orders: { x: 'a', y: 2, minimized: false } }));
    expect(loadLayout(storage)).toEqual({});
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadLayout(blocked)).toEqual({});
    expect(() => saveLayout(blocked, {})).not.toThrow();
  });
});
