import { describe, expect, it } from 'vitest';
import {
  DESK_GRID,
  DESK_LAYOUT_KEY,
  DESK_MARGIN,
  DESK_OBJECT_IDS,
  clampDesk,
  defaultDeskPosition,
  loadDesk,
  resetDesk,
  saveDesk,
} from '../../apps/game/src/ui/menu/deskLayout';

const view = { w: 1440, h: 900 };

describe('menu desk layout', () => {
  it('keeps an object inside the view on the 2 px grid', () => {
    expect(clampDesk({ x: -40, y: -10 }, { w: 200, h: 220 }, view)).toEqual({
      x: DESK_MARGIN,
      y: DESK_MARGIN,
    });
    // The far edge rounds inward, so the object never crosses the margin.
    expect(clampDesk({ x: 1400, y: 880 }, { w: 200, h: 220 }, view)).toEqual({
      x: 1228,
      y: 668,
    });
    expect(clampDesk({ x: 101, y: 203 }, { w: 200, h: 220 }, view)).toEqual({ x: 102, y: 204 });
  });

  it('snaps every position, including stored 3 px ones, to the 2 px grid', () => {
    for (const [x, y] of [
      [40, 80],
      [202, 298],
      [517, 611],
      [13, 15],
    ] as const) {
      const at = clampDesk({ x, y }, { w: 288, h: 240 }, view);
      expect(at.x % DESK_GRID).toBe(0);
      expect(at.y % DESK_GRID).toBe(0);
      expect(Math.abs(at.x - x)).toBeLessThanOrEqual(2);
      expect(Math.abs(at.y - y)).toBeLessThanOrEqual(2);
    }
  });

  it('gives every desk object, the reference pile included, a default spot on the grid', () => {
    for (const id of DESK_OBJECT_IDS) {
      const at = defaultDeskPosition(id, { w: 288, h: 192 }, view);
      expect(at.x % DESK_GRID).toBe(0);
      expect(at.y % DESK_GRID).toBe(0);
      expect(at.x + 288).toBeLessThanOrEqual(view.w - DESK_MARGIN);
      expect(at.y + 192).toBeLessThanOrEqual(view.h - DESK_MARGIN);
    }
  });

  it('places every object inside the view, with distinct default spots', () => {
    const spots = DESK_OBJECT_IDS.map((id) => {
      const position = defaultDeskPosition(id, { w: 200, h: 240 }, view);
      expect(position.x).toBeGreaterThanOrEqual(DESK_MARGIN);
      expect(position.y).toBeGreaterThanOrEqual(DESK_MARGIN);
      expect(position.x).toBeLessThanOrEqual(view.w - 200 - DESK_MARGIN);
      expect(position.y).toBeLessThanOrEqual(view.h - 240 - DESK_MARGIN);
      return `${position.x},${position.y}`;
    });
    expect(new Set(spots).size).toBe(DESK_OBJECT_IDS.length);
  });

  it('restores a saved layout and ignores broken or blocked storage', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    saveDesk(storage, { maps: { x: 40, y: 80 }, gramophone: { x: 200, y: 300 } });
    expect(loadDesk(storage)).toEqual({
      maps: { x: 40, y: 80 },
      gramophone: { x: 200, y: 300 },
    });
    store.set(DESK_LAYOUT_KEY, '{not json');
    expect(loadDesk(storage)).toEqual({});
    store.set(DESK_LAYOUT_KEY, JSON.stringify({ maps: { x: 'a', y: 2 } }));
    expect(loadDesk(storage)).toEqual({});
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadDesk(blocked)).toEqual({});
    expect(() => saveDesk(blocked, {})).not.toThrow();
  });

  it('resets to the default arrangement', () => {
    expect(resetDesk()).toEqual({});
  });
});
