import type { CoverPoint, Vec2 } from './protocol';
import { findPath } from './pathfinding';
import { isLineBlockedForMovement, isLineOnWire, isPointBlockedByCovers } from './world';

// route-around-wire D5: shared by the simulation's moves and the order
// preview, so the drawn route is the walked route.

/** Soldiers farther than this from their centroid are not one body. */
const GATHERED_RADIUS = 15;
/** Shorter moves go straight to each soldier's destination. */
const MIN_MARCH_DISTANCE = 12;
/** The body marches compact: offsets are scaled to fit this radius. */
const MARCH_RADIUS = 5;
/** Where the body spreads out to its own destinations, before the centre. */
const SPREAD_DISTANCE = 6;
const CLEARANCE = 0.8;

const centroid = (points: readonly Vec2[]): Vec2 => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});

/**
 * One route for a gathered section: the path from the section's centroid to
 * its destinations' centroid, shifted for each soldier by its current position
 * in the body (compacted to `MARCH_RADIUS`), ending with each soldier's own
 * destination. The soldiers keep their relative places on the march and only
 * spread to their slots at the end.
 *
 * Returns, per soldier, its route, or `null` where it should path on its own
 * (scattered section, short move, or an offset route that would hit cover).
 */
export function sectionRoutes(
  covers: readonly CoverPoint[],
  units: readonly (Vec2 & { squadId?: number })[],
  destinations: readonly Vec2[],
): (Vec2[] | null)[] {
  if (destinations.length !== units.length) return units.map(() => null);
  // route-around-wire D7: each section of the selection marches as its own
  // body (one search per section), as the order preview always drew it.
  const sections = new Map<number, number[]>();
  units.forEach((unit, index) => {
    const key = unit.squadId ?? -1;
    const members = sections.get(key);
    if (members) members.push(index);
    else sections.set(key, [index]);
  });
  if (sections.size === 1) return bodyRoutes(covers, units, destinations);
  const routes: (Vec2[] | null)[] = units.map(() => null);
  for (const members of sections.values()) {
    const body = bodyRoutes(
      covers,
      members.map((index) => units[index]!),
      members.map((index) => destinations[index]!),
    );
    members.forEach((index, at) => {
      routes[index] = body[at] ?? null;
    });
  }
  return routes;
}

function bodyRoutes(
  covers: readonly CoverPoint[],
  units: readonly Vec2[],
  destinations: readonly Vec2[],
): (Vec2[] | null)[] {
  const none = units.map(() => null);
  if (units.length < 3 || destinations.length !== units.length) {
    return none;
  }
  const start = centroid(units);
  if (units.some((unit) => Math.sqrt((unit.x - start.x) ** 2 + (unit.y - start.y) ** 2) > GATHERED_RADIUS)) {
    return none;
  }
  const end = centroid(destinations);
  const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
  if (distance < MIN_MARCH_DISTANCE) {
    return none;
  }
  const base = findPath(start, end, covers);
  if (base.length === 0) {
    return none;
  }
  // Waypoints of the body: the path's corners, then a spread point short of
  // the destination along the last leg.
  const corners = base.slice(0, -1);
  const lastCorner = corners.at(-1) ?? start;
  const legX = end.x - lastCorner.x;
  const legY = end.y - lastCorner.y;
  const legLength = Math.sqrt(legX ** 2 + legY ** 2);
  const waypoints = [...corners];
  if (legLength > SPREAD_DISTANCE + 1) {
    waypoints.push({
      x: end.x - (legX / legLength) * SPREAD_DISTANCE,
      y: end.y - (legY / legLength) * SPREAD_DISTANCE,
    });
  }
  if (waypoints.length === 0) {
    return none;
  }
  const offsets = units.map((unit) => ({ x: unit.x - start.x, y: unit.y - start.y }));
  const widest = Math.max(...offsets.map((offset) => Math.sqrt(offset.x ** 2 + offset.y ** 2)));
  const scale = widest > MARCH_RADIUS ? MARCH_RADIUS / widest : 1;

  const open = (from: Vec2, to: Vec2) =>
    !isPointBlockedByCovers(to.x, to.y, covers, CLEARANCE) &&
    !isLineBlockedForMovement(from.x, from.y, to.x, to.y, covers, CLEARANCE) &&
    // A shifted leg that would cross wire the section's route goes round: the soldier weighs his own.
    !isLineOnWire(from.x, from.y, to.x, to.y, covers, 0.3);

  // A straight leg when it is clear, else a path around what is in the way.
  const legTo = (from: Vec2, to: Vec2): Vec2[] | null => {
    if (isPointBlockedByCovers(to.x, to.y, covers, CLEARANCE)) return null;
    if (open(from, to)) return [{ ...to }];
    const around = findPath(from, to, covers);
    return around.length > 0 ? around : null;
  };

  return units.map((unit, index) => {
    const offset = offsets[index]!;
    const route: Vec2[] = [];
    let from: Vec2 = { x: unit.x, y: unit.y };
    for (const point of waypoints) {
      // Keep the soldier's place in the body; where that point is blocked,
      // close on the section's own path for that stretch.
      const placed = { x: point.x + offset.x * scale, y: point.y + offset.y * scale };
      const leg = legTo(from, placed) ?? legTo(from, point);
      if (!leg) return null;
      route.push(...leg);
      from = leg.at(-1)!;
    }
    const destination = destinations[index]!;
    if (open(from, destination)) {
      return [...route, { ...destination }];
    }
    const lastLeg = findPath(from, destination, covers);
    return lastLeg.length > 0 ? [...route, ...lastLeg] : null;
  });
}

/** The section route when it still ends at `destination`, else `null`. */
export function routeFor(route: Vec2[] | null | undefined, destination: Vec2): Vec2[] | null {
  const last = route?.at(-1);
  if (!route || !last) return null;
  return Math.abs(last.x - destination.x) < 0.01 && Math.abs(last.y - destination.y) < 0.01
    ? route
    : null;
}
