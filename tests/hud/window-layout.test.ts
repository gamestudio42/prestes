import { describe, expect, it } from 'vitest';
import {
  LAYOUT_KEY,
  MIN_WINDOW,
  TOP_BAR_HEIGHT,
  VERTICAL_WIDTH,
  clampSize,
  clampWindow,
  coversTitle,
  defaultPosition,
  isVertical,
  loadLayout,
  saveLayout,
  toggleVertical,
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

  it('clamps a resized window to its minimum and to the view', () => {
    expect(clampSize({ w: 40, h: 20 }, { x: 100, y: 100 }, view)).toEqual(MIN_WINDOW);
    expect(clampSize({ w: 2000, h: 2000 }, { x: 1000, y: 500 }, view)).toEqual({ w: 440, h: 400 });
    expect(clampSize({ w: 301, h: 403 }, { x: 0, y: 60 }, view)).toEqual({ w: 302, h: 404 });
  });

  it('toggles the Orders window between a tall column and its natural shape', () => {
    const natural = { x: 400, y: 600, minimized: false };
    expect(isVertical(natural)).toBe(false);
    const column = toggleVertical(natural, view);
    expect(isVertical(column)).toBe(true);
    expect(column.w).toBe(VERTICAL_WIDTH);
    expect(column.y).toBeGreaterThanOrEqual(TOP_BAR_HEIGHT);
    expect(column.y + column.h!).toBeLessThanOrEqual(view.h);
    expect(column.x).toBe(400);
    expect(toggleVertical(column, view)).toEqual(natural);
    // The Orders column goes to the right edge, clear of Troops and the summary.
    const right = toggleVertical(natural, view, 'right');
    expect(right.x + right.w!).toBe(view.w - 12);
    // ...and back to where it was before.
    expect(toggleVertical(right, view)).toEqual(natural);
  });

  it('tells when one window lies over another title bar', () => {
    const troopsTitle = { x: 12, y: 656, w: 172, h: 28 };
    expect(coversTitle({ x: 12, y: 514, w: 300, h: 164 }, troopsTitle)).toBe(true);
    expect(coversTitle({ x: 12, y: 480, w: 300, h: 164 }, troopsTitle)).toBe(false);
    expect(coversTitle({ x: 200, y: 600, w: 300, h: 164 }, troopsTitle)).toBe(false);
  });

  it('restores a saved layout and ignores broken or blocked storage', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    saveLayout(storage, { orders: { x: 40, y: 80, minimized: true } });
    expect(loadLayout(storage)).toEqual({ orders: { x: 40, y: 80, minimized: true } });
    saveLayout(storage, { orders: { x: 40, y: 80, minimized: false, w: 176, h: 700 } });
    expect(loadLayout(storage)).toEqual({ orders: { x: 40, y: 80, minimized: false, w: 176, h: 700 } });
    store.set(LAYOUT_KEY, JSON.stringify({ orders: { x: 40, y: 80, minimized: false, w: 'wide', h: -3 } }));
    expect(loadLayout(storage)).toEqual({ orders: { x: 40, y: 80, minimized: false } });
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
