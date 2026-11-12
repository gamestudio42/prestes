import { describe, expect, it } from 'vitest';
import { DOCK_ANCHOR, DOCK_KEY, OPEN_LAYOUT, loadDocks, saveDocks, toggleDock } from '../../apps/game/src/ui/dockLayout';

const memory = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    items,
  };
};

describe('docked HUD panels (redo-battle-hud D3)', () => {
  it('opens every panel when nothing is stored, storage is blocked or the value is broken', () => {
    expect(loadDocks(memory())).toEqual(OPEN_LAYOUT);
    expect(loadDocks(null)).toEqual(OPEN_LAYOUT);
    expect(loadDocks({ getItem: () => { throw new Error('blocked'); } })).toEqual(OPEN_LAYOUT);
    expect(loadDocks(memory({ [DOCK_KEY]: '{not json' }))).toEqual(OPEN_LAYOUT);
  });

  it('ignores the floating-window layout of earlier builds', () => {
    const old = memory({ 'prestes.hud.windows.v1': JSON.stringify({ orders: { x: 10, y: 10, minimized: true } }) });
    expect(loadDocks(old)).toEqual(OPEN_LAYOUT);
  });

  it('keeps which panels are collapsed across a save and a load', () => {
    const storage = memory();
    const layout = toggleDock(toggleDock(OPEN_LAYOUT, 'summary'), 'troops');
    saveDocks(storage, layout);
    expect(loadDocks(storage)).toEqual({ troops: true, summary: true, orders: false });
    expect(toggleDock(layout, 'troops').troops).toBe(false);
  });

  it('survives a storage that refuses writes', () => {
    expect(() => saveDocks({ setItem: () => { throw new Error('full'); } }, OPEN_LAYOUT)).not.toThrow();
  });

  it('collapses Troops up and the other two down', () => {
    expect(DOCK_ANCHOR).toEqual({ troops: 'top', summary: 'bottom', orders: 'bottom' });
  });
});
