import { EYE_HEIGHTS, type Building, type BuildingModel } from '../world';

/**
 * garrison-and-assault 4.7 (user, 2026-11-09): a building's doors and
 * windows, laid out once in the building's own frame (x along its width,
 * y along its depth, +y toward `front`) so the simulation's ports and the
 * view's windows are the same openings. Houses and businesses have a door
 * at the front and one at the back; the church a wide front portal and a
 * door in each side wall. Windows run on every wall, none where a door is,
 * and on the upper floor of a two-storey building; a loft has windows in
 * its gable ends only (1.3).
 */

export type BuildingWall = 'front' | 'back' | 'left' | 'right';

export interface BuildingDoor {
  wall: BuildingWall;
  /** Local point on the wall's face. */
  x: number;
  y: number;
  /** Local unit vector out of the wall. */
  outX: number;
  outY: number;
  width: number;
  height: number;
}

export interface BuildingWindow {
  wall: BuildingWall;
  x: number;
  y: number;
  outX: number;
  outY: number;
  /** 0 = ground floor. */
  level: number;
  /** The floor's height above the ground (m). */
  elevation: number;
}

export interface BuildingOpenings {
  doors: BuildingDoor[];
  windows: BuildingWindow[];
  /** Height of one storey (m). */
  storey: number;
  storeys: number;
  /** Height of the walls (m); the roof starts there. */
  wall: number;
}

/** The walls reach this share of a building's height; the gable roof the rest. */
export const BUILDING_WALL_SHARE = 0.72;
/**
 * garrison-and-assault 1.3: the raised windows by model and the eye height
 * of a man at them (m, the spec's table). A `storey` is a full upper floor
 * with windows on every wall; a `loft` has windows in the gable ends only.
 * The station armazéns are the railway warehouses.
 */
export const BUILDING_UPPER: Readonly<Partial<Record<BuildingModel, { kind: 'storey' | 'loft'; eye: number }>>> = {
  sobrado: { kind: 'storey', eye: 4.6 },
  factory: { kind: 'storey', eye: 5 },
  warehouse: { kind: 'storey', eye: 5 },
  'casa-sede': { kind: 'loft', eye: 4 },
  engenho: { kind: 'loft', eye: 4 },
};
/** A window every this many metres along a wall. */
export const WINDOW_SPACING = 2.5;
/** A window keeps this far clear of a door's edge (m). */
export const WINDOW_DOOR_CLEARANCE = 0.2;
/** Half a window's width (m). */
export const WINDOW_HALF_WIDTH = 0.4;

/** garrison-and-assault 1.5: the matriz's bell tower over its façade. */
export const TOWER_SIDE = 3.4;
/** The eye of a man in the tower (m, the spec). */
export const TOWER_EYE = 9;
/** Men in the tower at most. */
export const TOWER_CAPACITY = 2;

export interface BuildingTower {
  /** Local centre (building frame). */
  x: number;
  y: number;
  side: number;
  /** Height of the tower's top (m). */
  top: number;
  /** The tower floor's height above the ground (m). */
  elevation: number;
}

/** The church's tower, front-centre over the façade; null for any other model. */
export function buildingTower(building: Pick<Building, 'model' | 'halfDepth' | 'height' | 'front'>): BuildingTower | null {
  if (building.model !== 'church') return null;
  const front = building.front ?? 1;
  return {
    x: 0,
    y: front * (building.halfDepth - TOWER_SIDE / 2),
    side: TOWER_SIDE,
    top: building.height * 1.6,
    elevation: TOWER_EYE - EYE_HEIGHTS.standing,
  };
}

/** A window's height (m). */
export function windowHeight(openings: Pick<BuildingOpenings, 'storey'>, window: Pick<BuildingWindow, 'level'>, model: BuildingModel): number {
  if (model === 'church') return 2.4;
  if (window.level > 0 && BUILDING_UPPER[model]?.kind === 'loft') return 0.8;
  return Math.min(1.3, openings.storey * 0.42);
}

/**
 * A window's middle above the ground, where a man inside aims from (m): a
 * raised window sits just under its eye height, kept below the eaves.
 */
export function windowMiddleHeight(
  openings: Pick<BuildingOpenings, 'storey' | 'wall'>,
  window: Pick<BuildingWindow, 'elevation' | 'level'>,
  model: BuildingModel,
): number {
  if (model === 'church') return Math.min(2.6, openings.storey * 0.5);
  if (window.level === 0) return openings.storey * 0.55;
  const top = BUILDING_UPPER[model]?.kind === 'loft' ? Infinity : openings.wall - windowHeight(openings, window, model) / 2 - 0.15;
  return Math.min(window.elevation + EYE_HEIGHTS.standing - 0.2, top);
}

const SHOP_MODELS: ReadonlySet<BuildingModel> = new Set(['venda', 'armazem']);
const BIG_DOOR_MODELS: ReadonlySet<BuildingModel> = new Set(['barn', 'warehouse', 'armazem', 'factory', 'engenho']);

/** Evenly spread points along a wall of `length`, one per `spacing`, at least one. */
function along(length: number, spacing: number): number[] {
  const count = Math.max(1, Math.floor(length / spacing));
  return Array.from({ length: count }, (_, index) => -length / 2 + (length / count) * (index + 0.5));
}

export function buildingOpenings(building: Pick<Building, 'model' | 'halfWidth' | 'halfDepth' | 'height' | 'front'>): BuildingOpenings {
  const { halfWidth: hw, halfDepth: hd, model } = building;
  const front = building.front ?? 1;
  const upper = BUILDING_UPPER[model];
  const storeys = upper?.kind === 'storey' ? 2 : 1;
  const wall = building.height * BUILDING_WALL_SHARE;
  const storey = wall / storeys;
  const upperElevation = upper ? upper.eye - EYE_HEIGHTS.standing : 0;
  // The ridge runs along the long side, so the gables are the short walls.
  const gables: readonly BuildingWall[] = hw >= hd ? ['left', 'right'] : ['front', 'back'];
  const doorHeight = Math.min(2.2, storey * 0.8);
  const walls: Record<BuildingWall, { cx: number; cy: number; outX: number; outY: number; tx: number; ty: number; length: number }> = {
    front: { cx: 0, cy: front * hd, outX: 0, outY: front, tx: 1, ty: 0, length: hw * 2 },
    back: { cx: 0, cy: -front * hd, outX: 0, outY: -front, tx: 1, ty: 0, length: hw * 2 },
    left: { cx: -hw, cy: 0, outX: -1, outY: 0, tx: 0, ty: 1, length: hd * 2 },
    right: { cx: hw, cy: 0, outX: 1, outY: 0, tx: 0, ty: 1, length: hd * 2 },
  };
  const doors: BuildingDoor[] = [];
  const door = (wall: BuildingWall, t: number, width: number, height = doorHeight) => {
    const w = walls[wall];
    doors.push({ wall, x: w.cx + w.tx * t, y: w.cy + w.ty * t, outX: w.outX, outY: w.outY, width, height });
  };
  if (model === 'church') {
    // A wide portal under the façade, and a door in each side wall toward the front.
    door('front', 0, 2.4, Math.min(3.6, storey * 0.6));
    const sideAt = front * hd * 0.3;
    door('left', sideAt, 1.3);
    door('right', sideAt, 1.3);
  } else {
    const big = BIG_DOOR_MODELS.has(model);
    door('front', 0, big ? 2.6 : SHOP_MODELS.has(model) ? 1.6 : 1.1, big ? Math.min(3.2, storey * 0.85) : doorHeight);
    door('back', 0, big ? 2.2 : 1.0);
  }
  const windows: BuildingWindow[] = [];
  for (const wall of ['front', 'back', 'left', 'right'] as const) {
    const w = walls[wall];
    const onWall = doors.filter((entry) => entry.wall === wall);
    const put = (t: number, level: number) =>
      windows.push({ wall, x: w.cx + w.tx * t, y: w.cy + w.ty * t, outX: w.outX, outY: w.outY, level, elevation: level === 0 ? 0 : upperElevation });
    for (const t of along(w.length, WINDOW_SPACING)) {
      const blocked = onWall.some((entry) => Math.abs(entry.x * w.tx + entry.y * w.ty - t) < entry.width / 2 + WINDOW_DOOR_CLEARANCE + WINDOW_HALF_WIDTH);
      if (!blocked) put(t, 0);
      if (upper?.kind === 'storey') put(t, 1);
    }
    // A loft's windows: half as many, between the ground floor's, in the gable ends.
    if (upper?.kind === 'loft' && gables.includes(wall)) for (const t of along(w.length, WINDOW_SPACING * 2)) put(t, 1);
  }
  return { doors, windows, storey, storeys, wall };
}
