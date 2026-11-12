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
/** Positions sit on a 2 px grid (the art pixel at the reference size). */
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
 * camp-tent-menu: the camp table drawing the start screen covers, in art
 * pixels, and where the cover crops it (the sky gives way first when the
 * view is wider than the drawing). The desk objects are drawn at the same
 * scale as the table, so they keep the sizes of the owner's layout.
 */
export const CAMP_SCENE = { w: 887, h: 442, anchorX: 0.5, anchorY: 0.82 } as const;

export interface SceneTransform {
  /** Screen px per art pixel. */
  scale: number;
  /** Where the drawing's top-left corner lands, in screen px. */
  x: number;
  y: number;
}

/** How the camp table covers a view: its scale and its top-left corner. */
export function sceneTransform(view: DeskSize): SceneTransform {
  const scale = Math.max(view.w / CAMP_SCENE.w, view.h / CAMP_SCENE.h);
  return {
    scale,
    x: (view.w - CAMP_SCENE.w * scale) * CAMP_SCENE.anchorX,
    y: (view.h - CAMP_SCENE.h * scale) * CAMP_SCENE.anchorY,
  };
}

/**
 * Default places, from the owner's layout (`referencias para hud/Menu
 * Pixelado de São Paulo 1923.png`, 1776 x 886, two reference pixels per art
 * pixel): the centre and the top of each object's art. The map pile is placed
 * by its top card; `lead` is the room the object keeps above its art, in art
 * pixels (the pile's loose cards).
 */
const DEFAULT_SPOTS: Record<DeskObjectId, { cx: number; top: number; lead?: number }> = {
  maps: { cx: 760, top: 135, lead: 28 },
  references: { cx: 400, top: 380 },
  compendium: { cx: 197, top: 535 },
  campaign: { cx: 708, top: 498 },
  gramophone: { cx: 1062, top: 392 },
  // Nudged 35 reference px down from the drawing so its lid clears the glasses' label.
  options: { cx: 1438, top: 460 },
  // add-map-editor: the field glasses that open the map editor.
  editor: { cx: 1352, top: 240 },
};

/** Reference pixels per art pixel in the owner's layout. */
const REFERENCE_PX = 2;

export function defaultDeskPosition(id: DeskObjectId, size: DeskSize, view: DeskSize): DeskPosition {
  const spot = DEFAULT_SPOTS[id];
  const scene = sceneTransform(view);
  const cx = scene.x + (spot.cx / REFERENCE_PX) * scene.scale;
  const top = scene.y + (spot.top / REFERENCE_PX - (spot.lead ?? 0)) * scene.scale;
  return clampDesk({ x: cx - size.w / 2, y: top }, size, view);
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
