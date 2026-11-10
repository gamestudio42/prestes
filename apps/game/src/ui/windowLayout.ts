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
  /** A size the player gave the window by resizing it; absent, it fits its content. */
  w?: number;
  h?: number;
  /** Where the window sat before it became a column, to go back there. */
  before?: { x: number; y: number };
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

/** The smallest a resized window may get: one column of order buttons. */
export const MIN_WINDOW: Size = { w: 168, h: 160 };
/** The width of the Orders window laid out as a column. */
export const VERTICAL_WIDTH = 176;

/**
 * Clamps a size the player drags to: never below the minimum, never past the
 * right or bottom edge of the view from where the window sits.
 */
export function clampSize(size: Size, at: { x: number; y: number }, view: Size, min: Size = MIN_WINDOW): Size {
  const maxW = Math.max(min.w, view.w - at.x);
  const maxH = Math.max(min.h, view.h - at.y);
  return {
    w: snap(Math.min(Math.max(size.w, min.w), maxW)),
    h: snap(Math.min(Math.max(size.h, min.h), maxH)),
  };
}

/** A sized window taller than it is wide is laid out as a column. */
export function isVertical(state: WindowState | undefined): boolean {
  return state?.w !== undefined && state.h !== undefined && state.h > state.w;
}

/** Where a window turned into a column goes: where it sits, or the right edge of the view. */
export type ColumnEdge = 'keep' | 'right';

/**
 * Toggles a window between a narrow, tall column (full height below the top
 * bar) and its natural, content-sized shape. The column keeps the window's
 * left edge, or goes to the right edge of the view, clear of the windows in
 * the bottom-left corner.
 */
export function toggleVertical(state: WindowState, view: Size, edge: ColumnEdge = 'keep'): WindowState {
  if (isVertical(state)) {
    // Back where it was; its natural size then keeps it inside the view.
    return { ...(state.before ?? { x: state.x, y: state.y }), minimized: state.minimized };
  }
  const y = TOP_BAR_HEIGHT + MARGIN;
  const x = edge === 'right' ? view.w - VERTICAL_WIDTH - MARGIN : state.x;
  const size = clampSize({ w: VERTICAL_WIDTH, h: view.h - y - MARGIN }, { x, y }, view);
  return {
    ...clampWindow({ x, y }, size, view),
    minimized: state.minimized,
    ...size,
    before: { x: state.x, y: state.y },
  };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Whether one window lies over another's title bar, the only handle that
 * moves it: then the covered window can no longer be dragged or minimized.
 */
export function coversTitle(cover: Rect, title: Rect): boolean {
  return (
    cover.x < title.x + title.w &&
    title.x < cover.x + cover.w &&
    cover.y < title.y + title.h &&
    title.y < cover.y + cover.h
  );
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
        const sized =
          Number.isFinite(entry.w) && Number.isFinite(entry.h) && entry.w! > 0 && entry.h! > 0
            ? { w: entry.w!, h: entry.h! }
            : {};
        const before =
          entry.before && Number.isFinite(entry.before.x) && Number.isFinite(entry.before.y)
            ? { before: { x: entry.before.x, y: entry.before.y } }
            : {};
        layout[id] = { x: entry.x!, y: entry.y!, minimized: entry.minimized, ...sized, ...before };
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
