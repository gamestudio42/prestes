/**
 * redo-battle-hud D3: the battle HUD's three panels are docked at the
 * screen's edges and only collapse (Troops toward the top bar, Troop summary
 * and Orders toward the bottom). Which ones are collapsed is a per-viewer
 * convenience kept in localStorage; a blocked or empty storage means all
 * open. The floating-window layout of earlier builds (`prestes.hud.windows.v1`)
 * is not read.
 */
export type DockId = 'troops' | 'summary' | 'orders';

export const DOCK_IDS: readonly DockId[] = ['troops', 'summary', 'orders'];

/** Where each panel is docked, and so which way it collapses. */
export const DOCK_ANCHOR: Readonly<Record<DockId, 'top' | 'bottom'>> = {
  troops: 'top',
  summary: 'bottom',
  orders: 'bottom',
};

export type DockLayout = Readonly<Record<DockId, boolean>>;

export const DOCK_KEY = 'prestes.hud.docks.v1';

export const OPEN_LAYOUT: DockLayout = { troops: false, summary: false, orders: false };

/** Reads the collapsed panels; anything unreadable counts as open. */
export function loadDocks(storage: Pick<Storage, 'getItem'> | null | undefined): DockLayout {
  try {
    const raw = storage?.getItem(DOCK_KEY);
    if (!raw) return OPEN_LAYOUT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      troops: parsed.troops === true,
      summary: parsed.summary === true,
      orders: parsed.orders === true,
    };
  } catch {
    return OPEN_LAYOUT;
  }
}

export function saveDocks(storage: Pick<Storage, 'setItem'> | null | undefined, layout: DockLayout): void {
  try {
    storage?.setItem(DOCK_KEY, JSON.stringify(layout));
  } catch {
    // Storage blocked or full: the panels simply open next time.
  }
}

/** The layout with one panel collapsed or opened. */
export function toggleDock(layout: DockLayout, id: DockId): DockLayout {
  return { ...layout, [id]: !layout[id] };
}
