/**
 * Layout of the floating HUD windows: where each one sits and whether it is
 * minimized. Pure functions, so the rules are testable without a browser.
 * The layout is a per-viewer convenience kept in localStorage; a blocked or
 * empty storage only means the default layout.
 */
export type WindowId = 'orders' | 'troops' | 'summary';

export const WINDOW_IDS: readonly WindowId[] = ['orders', 'troops', 'summary'];

export interface WindowState {
  x: number;
  y: number;
  minimized: boolean;
}

export type WindowLayout = Partial<Record<WindowId, WindowState>>;

export interface Size {
  w: number;
  h: number;
}

export const LAYOUT_KEY = 'prestes.hud.windows.v1';
/** The top bar's height: windows never cover it. */
export const TOP_BAR_HEIGHT = 56;
const MARGIN = 12;
const GRID = 2;

const snap = (value: number) => Math.round(value / GRID) * GRID;

/** Keeps a window fully inside the view, below the top bar, on the 2 px grid. */
export function clampWindow(position: { x: number; y: number }, size: Size, view: Size) {
  const maxX = Math.max(0, view.w - size.w);
  const maxY = Math.max(TOP_BAR_HEIGHT, view.h - size.h);
  return {
    x: snap(Math.min(Math.max(position.x, 0), maxX)),
    y: snap(Math.min(Math.max(position.y, TOP_BAR_HEIGHT), maxY)),
  };
}

/**
 * Default places: Troops bottom left, Troop summary just above it, Orders at
 * the bottom, centred but right of Troops; the training panel keeps the
 * right-hand side.
 */
export function defaultPosition(id: WindowId, size: Size, view: Size, troops: Size = { w: 0, h: 0 }) {
  const bottom = view.h - MARGIN;
  const troopsHeight = troops.h;
  switch (id) {
    case 'orders':
      // Centred, but never over the Troops window in the bottom-left corner.
      return clampWindow(
        { x: Math.max((view.w - size.w) / 2, troops.w + 2 * MARGIN), y: bottom - size.h },
        size,
        view,
      );
    case 'troops':
      return clampWindow({ x: MARGIN, y: bottom - size.h }, size, view);
    case 'summary':
      return clampWindow({ x: MARGIN, y: bottom - troopsHeight - MARGIN - size.h }, size, view);
  }
}

export function loadLayout(storage: Pick<Storage, 'getItem'> | null | undefined): WindowLayout {
  try {
    const raw = storage?.getItem(LAYOUT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const layout: WindowLayout = {};
    for (const id of WINDOW_IDS) {
      const entry = parsed[id] as Partial<WindowState> | undefined;
      if (
        entry &&
        Number.isFinite(entry.x) &&
        Number.isFinite(entry.y) &&
        typeof entry.minimized === 'boolean'
      ) {
        layout[id] = { x: entry.x!, y: entry.y!, minimized: entry.minimized };
      }
    }
    return layout;
  } catch {
    return {};
  }
}

export function saveLayout(storage: Pick<Storage, 'setItem'> | null | undefined, layout: WindowLayout): void {
  try {
    storage?.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Storage blocked or full: the layout simply is not remembered.
  }
}
