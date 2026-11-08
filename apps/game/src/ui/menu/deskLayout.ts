/**
 * Layout of the menu desk: where each object sits and how it is kept in view.
 * Pure functions, so the rules are testable without a browser. The layout is a
 * per-viewer convenience kept in localStorage; a blocked or empty storage only
 * means the default arrangement. The desk never reads or writes the audio,
 * locale, gramophone or route keys.
 */
export type DeskObjectId =
  | 'campaign'
  | 'compendium'
  | 'references'
  | 'options'
  | 'maps'
  | 'gramophone'
  | 'editor';

// The map fan is listed first so it sits behind the smaller objects until the
// player touches it; the books, compass and gramophone stay readable on top.
export const DESK_OBJECT_IDS: readonly DeskObjectId[] = [
  'maps',
  'campaign',
  'compendium',
  'references',
  'options',
  'gramophone',
  'editor',
];

export interface DeskPosition {
  x: number;
  y: number;
}

export type DeskLayout = Partial<Record<DeskObjectId, DeskPosition>>;

export interface DeskSize {
  w: number;
  h: number;
}

export const DESK_LAYOUT_KEY = 'prestes.menu.desk.v1';
/** Distance from each viewport edge, in px. */
export const DESK_MARGIN = 12;
/** The desk art is drawn at 2x, so positions sit on a 2 px grid. */
export const DESK_GRID = 2;

const snap = (value: number) => Math.round(value / DESK_GRID) * DESK_GRID;
const floorGrid = (value: number) => Math.floor(value / DESK_GRID) * DESK_GRID;
const ceilGrid = (value: number) => Math.ceil(value / DESK_GRID) * DESK_GRID;

function clampAxis(value: number, max: number): number {
  const lo = ceilGrid(DESK_MARGIN);
  const hi = Math.max(lo, floorGrid(max));
  return Math.min(Math.max(snap(value), lo), hi);
}

/** Keeps an object fully inside the view, on the 2 px grid. */
export function clampDesk(position: DeskPosition, size: DeskSize, view: DeskSize): DeskPosition {
  return {
    x: clampAxis(position.x, view.w - size.w - DESK_MARGIN),
    y: clampAxis(position.y, view.h - size.h - DESK_MARGIN),
  };
}

/**
 * Default places, as fractions of the space left after the object's size. The
 * books and the reference pile sit on the left, the maps at the centre, the
 * compass at the upper right clear of the map fan's active sheet, and the
 * gramophone at the lower right, so a closed desk reads at a glance.
 */
const DEFAULT_SPOTS: Record<DeskObjectId, { x: number; y: number }> = {
  campaign: { x: 0.03, y: 0.02 },
  compendium: { x: 0.03, y: 0.98 },
  references: { x: 0.03, y: 0.5 },
  options: { x: 0.74, y: 0.02 },
  maps: { x: 0.42, y: 0.28 },
  gramophone: { x: 0.86, y: 0.6 },
  // add-map-editor: the theodolite that opens the map editor, under the map fan, above the hint.
  editor: { x: 0.5, y: 0.85 },
};

export function defaultDeskPosition(id: DeskObjectId, size: DeskSize, view: DeskSize): DeskPosition {
  const spot = DEFAULT_SPOTS[id];
  const freeX = Math.max(0, view.w - size.w);
  const freeY = Math.max(0, view.h - size.h);
  return clampDesk({ x: freeX * spot.x, y: freeY * spot.y }, size, view);
}

export function loadDesk(storage: Pick<Storage, 'getItem'> | null | undefined): DeskLayout {
  try {
    const raw = storage?.getItem(DESK_LAYOUT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const layout: DeskLayout = {};
    for (const id of DESK_OBJECT_IDS) {
      const entry = parsed[id] as Partial<DeskPosition> | undefined;
      if (entry && Number.isFinite(entry.x) && Number.isFinite(entry.y)) {
        layout[id] = { x: entry.x!, y: entry.y! };
      }
    }
    return layout;
  } catch {
    return {};
  }
}

export function saveDesk(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  layout: DeskLayout,
): void {
  try {
    storage?.setItem(DESK_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Storage blocked or full: the arrangement simply is not remembered.
  }
}

/** The default arrangement: an empty layout resolves to the default spots. */
export function resetDesk(): DeskLayout {
  return {};
}
