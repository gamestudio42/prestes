import { coverSlots } from '../cover-slots';
import type { CoverPoint, Vec2 } from '../protocol';
import { isPointBlockedByCovers, type Building, type BuildingModel } from '../world';
import { buildingOpenings, buildingTower, TOWER_CAPACITY } from './openings';
import type { GarrisonYard } from './types';

/**
 * garrison-and-assault D1: the places a section can occupy. Buildings by
 * their footprint and model; trench lines from the trench covers that touch
 * end to end. Pure data, built from the map at load by the simulation and
 * the view alike.
 */
export interface PositionPort {
  x: number;
  y: number;
  /** Unit, world: the way the port looks out. */
  facing: Vec2;
  arcDeg: number;
  /** A trench's or a yard wall's port is one of its cover slots. */
  slotId?: number;
  /** An upper-floor window: its floor (1 = first floor up) and that floor's height (m). */
  level?: number;
  elevation?: number;
  /** A post in the matriz's tower (1.5): it looks all round, and its own church does not hide it. */
  tower?: boolean;
}

export interface PositionDef {
  /** The building's cover id, or the first trench cover's id of a line. */
  id: number;
  kind: 'building' | 'trench-line' | 'yard';
  /** The building model (buildings only), for the name shown on the cards. */
  model?: BuildingModel;
  capacity: number;
  /** Added to a defender's stance cover (D4). */
  cover: number;
  /** World points just outside the footprint where men go in and out. */
  entrances: Vec2[];
  ports: PositionPort[];
  /** The covers the position is made of (one for a building). */
  coverIds: number[];
  /** Centre, for markers and distances. */
  x: number;
  y: number;
  /** Men in the tower ports at most (the matriz). */
  towerCapacity?: number;
  /** garrison-and-assault 4.0: it has upper, loft or tower ports, so its men pick their posts by what they can see. */
  raisedPorts?: boolean;
}

/** Spec "Enterable positions": men inside by building model; 0 = not enterable. */
export const BUILDING_CAPACITY: Readonly<Record<BuildingModel, number>> = {
  'training-house': 4,
  'colonist-house': 4,
  'ferry-house': 4,
  'terraced-house': 4,
  'terraced-house-wide': 4,
  'casa-terrea': 4,
  farmhouse: 6,
  venda: 5,
  armazem: 6,
  warehouse: 6,
  barn: 6,
  chapel: 6,
  sobrado: 8,
  'casa-sede': 8,
  engenho: 8,
  church: 10,
  factory: 12,
  // A bandstand is open on every side: men there are in the open.
  coreto: 0,
};

export const BUILDING_POSITION_COVER = 0.6;
export const TRENCH_POSITION_COVER = 0.5;
export const YARD_POSITION_COVER = 0.4;
/** Wall ends farther apart than this leave a gate between them (m); farther than the max, the ends belong to other sides. */
export const YARD_GATE_MIN = 1.5;
export const YARD_GATE_MAX = 12;
export const PORT_ARC = 120;
/** Entrances stand this far out of the wall (m). */
export const ENTRANCE_OFFSET = 1.0;
/**
 * A building's port, the defender's place, stands this far out of its wall
 * (m): his lines of sight and fire leave from the wall's face, so his own
 * walls do not cut them; the position's cover shelters him instead.
 */
export const PORT_OUTSET = 0.05;
/** Trench covers whose ends lie this close make one line (m). */
export const TRENCH_JOIN = 1.0;
/** A trench line has a way in every this many metres on its rear side. */
export const TRENCH_ENTRANCE_EVERY = 10;
/** A communication trench holds a man every this many metres. */
export const COMMUNICATION_SPACING = 2;

function rotate(x: number, y: number, rotation: number): Vec2 {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function local(building: Pick<Building, 'x' | 'y' | 'rotation'>, x: number, y: number): Vec2 {
  const point = rotate(x, y, building.rotation);
  return { x: building.x + point.x, y: building.y + point.y };
}

export function buildingPosition(building: Building): PositionDef | null {
  const capacity = BUILDING_CAPACITY[building.model] ?? 0;
  if (capacity <= 0) return null;
  // garrison-and-assault 4.7: the doors are the entrances and the windows the ports.
  const openings = buildingOpenings(building);
  const entrances = openings.doors.map((door) => local(building, door.x + door.outX * ENTRANCE_OFFSET, door.y + door.outY * ENTRANCE_OFFSET));
  const ports: PositionPort[] = openings.windows.map((window) => {
    const at = local(building, window.x + window.outX * PORT_OUTSET, window.y + window.outY * PORT_OUTSET);
    const port: PositionPort = { x: at.x, y: at.y, facing: rotate(window.outX, window.outY, building.rotation), arcDeg: PORT_ARC };
    if (window.level > 0) {
      port.level = window.level;
      port.elevation = window.elevation;
    }
    return port;
  });
  // 1.5: two posts in the tower, each looking all round from its floor.
  const tower = buildingTower(building);
  if (tower) {
    for (const side of [-1, 1]) {
      const at = local(building, tower.x + side * 0.6, tower.y);
      const facing = rotate(0, side * (building.front ?? 1), building.rotation);
      ports.push({ x: at.x, y: at.y, facing, arcDeg: 360, level: 2, elevation: tower.elevation, tower: true });
    }
  }
  return {
    id: building.id,
    kind: 'building',
    model: building.model,
    capacity,
    cover: BUILDING_POSITION_COVER,
    entrances,
    ports,
    coverIds: [building.id],
    x: building.x,
    y: building.y,
    ...(tower ? { towerCapacity: TOWER_CAPACITY } : {}),
    ...(ports.some((port) => port.elevation !== undefined) ? { raisedPorts: true } : {}),
  };
}

/** The two ends of a trench cover's long axis, world. */
function ends(cover: CoverPoint): [Vec2, Vec2] {
  const axis = rotate(cover.halfWidth, 0, cover.rotation ?? 0);
  return [
    { x: cover.x - axis.x, y: cover.y - axis.y },
    { x: cover.x + axis.x, y: cover.y + axis.y },
  ];
}

function near(a: Vec2, b: Vec2, distance: number): boolean {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= distance * distance;
}

/** Trench covers grouped into lines: pieces whose ends touch, in id order. */
export function trenchLineGroups(covers: readonly CoverPoint[]): CoverPoint[][] {
  const trenches = covers.filter((cover) => cover.kind === 'trench' && !cover.ditch).sort((a, b) => a.id - b.id);
  const parent = new Map(trenches.map((cover) => [cover.id, cover.id]));
  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  for (let i = 0; i < trenches.length; i += 1) {
    const a = ends(trenches[i]!);
    for (let j = i + 1; j < trenches.length; j += 1) {
      const b = ends(trenches[j]!);
      if (a.some((end) => b.some((other) => near(end, other, TRENCH_JOIN)))) {
        const ra = find(trenches[i]!.id);
        const rb = find(trenches[j]!.id);
        if (ra !== rb) parent.set(Math.max(ra, rb), Math.min(ra, rb));
      }
    }
  }
  const groups = new Map<number, CoverPoint[]>();
  for (const cover of trenches) {
    const root = find(cover.id);
    groups.set(root, [...(groups.get(root) ?? []), cover]);
  }
  return [...groups.values()];
}

export function trenchLinePosition(pieces: readonly CoverPoint[]): PositionDef {
  const length = pieces.reduce((sum, piece) => sum + piece.halfWidth * 2, 0);
  const ports: PositionPort[] = pieces.flatMap((piece) =>
    coverSlots(piece)
      .filter((slot) => slot.guard !== null || !piece.noSlots)
      .map((slot) => ({ x: slot.x, y: slot.y, facing: slot.guard ?? { x: 0, y: 0 }, arcDeg: slot.guard ? PORT_ARC : 360, slotId: slot.id })),
  );
  const communication = pieces.every((piece) => piece.noSlots);
  const capacity = communication ? Math.max(1, Math.floor(length / COMMUNICATION_SPACING)) : Math.max(1, ports.length);
  // Ways in: the line's two loose ends, and every 10 m on the side away from the parapet.
  const allEnds = pieces.flatMap((piece) => ends(piece));
  const loose = allEnds.filter((end) => allEnds.filter((other) => near(end, other, TRENCH_JOIN)).length === 1);
  const entrances: Vec2[] = [...loose];
  let run = 0;
  for (const piece of pieces) {
    run += piece.halfWidth * 2;
    if (piece.facing && run >= TRENCH_ENTRANCE_EVERY) {
      run = 0;
      entrances.push({ x: piece.x - piece.facing.x * (piece.halfDepth + ENTRANCE_OFFSET), y: piece.y - piece.facing.y * (piece.halfDepth + ENTRANCE_OFFSET) });
    }
  }
  const x = pieces.reduce((sum, piece) => sum + piece.x, 0) / pieces.length;
  const y = pieces.reduce((sum, piece) => sum + piece.y, 0) / pieces.length;
  return {
    id: pieces[0]!.id,
    kind: 'trench-line',
    capacity,
    cover: TRENCH_POSITION_COVER,
    entrances: entrances.length > 0 ? entrances : [{ x, y }],
    ports,
    coverIds: pieces.map((piece) => piece.id),
    x,
    y,
  };
}

export function yardPosition(yard: GarrisonYard, covers: readonly CoverPoint[]): PositionDef | null {
  const walls = yard.wallIds.map((id) => covers.find((cover) => cover.id === id)).filter((wall): wall is CoverPoint => wall !== undefined);
  if (walls.length === 0) return null;
  // Ports: the walls' slots on the yard's side, looking out over the wall.
  const ports: PositionPort[] = walls.flatMap((wall) =>
    coverSlots(wall)
      .filter((slot) => slot.guard !== null)
      .filter((slot) => (slot.x - yard.centre.x) * slot.guard!.x + (slot.y - yard.centre.y) * slot.guard!.y > 0)
      .map((slot) => ({ x: slot.x, y: slot.y, facing: slot.guard!, arcDeg: PORT_ARC, slotId: slot.id })),
  );
  // Entrances: the gaps between one wall's end and the nearest end of another.
  const wallEnds = walls.map((wall) => ends(wall));
  const entrances: Vec2[] = [];
  for (const [index, pair] of wallEnds.entries()) {
    for (const [side, end] of pair.entries()) {
      // An end joined to another wall (the next piece of one line, a corner) is no gate's side.
      if (wallEnds.some((otherPair, other) => other !== index && otherPair.some((candidate) => near(end, candidate, YARD_GATE_MIN)))) continue;
      const far = pair[1 - side]!;
      let best: Vec2 | null = null;
      for (const [other, otherPair] of wallEnds.entries()) {
        if (other === index) continue;
        for (const candidate of otherPair) {
          // Nor is an end at this wall's own far end.
          if (near(far, candidate, YARD_GATE_MIN)) continue;
          if (!best || (candidate.x - end.x) ** 2 + (candidate.y - end.y) ** 2 < (best.x - end.x) ** 2 + (best.y - end.y) ** 2) best = candidate;
        }
      }
      if (best && !near(end, best, YARD_GATE_MIN) && near(end, best, YARD_GATE_MAX)) {
        const gate = { x: (end.x + best.x) / 2, y: (end.y + best.y) / 2 };
        if (!entrances.some((known) => near(known, gate, YARD_GATE_MIN))) entrances.push(gate);
      }
    }
  }
  return {
    id: yard.id,
    kind: 'yard',
    // One man to a port: an authored yard may have fewer than its capacity.
    capacity: Math.min(yard.capacity, ports.length),
    cover: YARD_POSITION_COVER,
    entrances,
    ports,
    coverIds: walls.map((wall) => wall.id),
    x: yard.centre.x,
    y: yard.centre.y,
  };
}

/** Every position of a map, by id. */
export function positionsFor(map: { buildings: readonly Building[]; covers: readonly CoverPoint[]; garrisonYards?: readonly GarrisonYard[] }): PositionDef[] {
  const buildings = map.buildings
    .map(buildingPosition)
    .filter((position): position is PositionDef => position !== null)
    // A window against another work (a wall, a shed) is shut.
    .map((position) => {
      const others = map.covers.filter((cover) => cover.id !== position.id && cover.blocksMovement);
      const ports = position.ports.filter((port) => !isPointBlockedByCovers(port.x, port.y, others, 0));
      // One man to a window: a building holds no more men than its open windows.
      return { ...position, ports, capacity: Math.min(position.capacity, ports.length) };
    });
  const lines = trenchLineGroups(map.covers).map(trenchLinePosition);
  const yards = (map.garrisonYards ?? []).map((yard) => yardPosition(yard, map.covers)).filter((position): position is PositionDef => position !== null);
  return [...buildings, ...lines, ...yards].sort((a, b) => a.id - b.id);
}

/** A click this near a position's middle, port or entrance picks it (m). */
export const POSITION_PICK_REACH = 6;

/**
 * garrison-and-assault 4.1: the position a click on the map means: the one
 * whose middle, a port or an entrance lies nearest the point, within reach.
 * `allowed` narrows the choice (an enemy-held one for an assault).
 */
export function positionNear(
  positions: readonly PositionDef[],
  point: Vec2,
  allowed: (position: PositionDef) => boolean = () => true,
  reach = POSITION_PICK_REACH,
): PositionDef | null {
  let best: PositionDef | null = null;
  let bestDistance = reach * reach;
  for (const position of positions) {
    if (!allowed(position)) continue;
    for (const spot of [position, ...position.ports, ...position.entrances]) {
      const distance = (spot.x - point.x) ** 2 + (spot.y - point.y) ** 2;
      if (distance < bestDistance || (distance === bestDistance && best !== null && position.id < best.id)) {
        best = position;
        bestDistance = distance;
      }
    }
  }
  return best;
}
