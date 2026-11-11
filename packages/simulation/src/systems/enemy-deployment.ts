import { allCoverSlots, insideDeploymentArea, isDeepWater, isPointBlockedByCovers } from '@prestes/shared';
import type { CommandEnvelope, CoverKind, CoverPoint, SimEvent, Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import { applyDeploymentCommand } from './deployment';

/**
 * add-deployment-phase D4: how much the commander wants each kind of cover
 * as a section's anchor. Trench fire steps first, then walls and hedges.
 * Buildings wait for garrison-and-assault; the objectives it holds are added
 * in `deployEnemy`.
 */
const ANCHOR_SCORE: Partial<Record<CoverKind, number>> = {
  trench: 3,
  'low-wall': 2,
  stone: 2,
  sandbag: 2,
  fence: 1,
};

/**
 * add-map-objectives 2.6: a held objective of value 2 or more is the best
 * anchor there is, so the battle opens with a section on it.
 */
const OBJECTIVE_ANCHOR_SCORE = 4;

/** Two sections' anchors are kept at least this far apart (m). */
export const ANCHOR_SPACING = 25;
/** Each section takes cover only this close to its own start (m), so the line holds together in front. */
export const ANCHOR_REACH = 40;

/** A slot must face the column's area this squarely to count (cosine). */
const FACING_MIN = 0.5;

interface Anchor {
  x: number;
  y: number;
  score: number;
}

function centroid(points: readonly Vec2[]): Vec2 {
  const n = Math.max(1, points.length);
  return { x: points.reduce((sum, p) => sum + p.x, 0) / n, y: points.reduce((sum, p) => sum + p.y, 0) / n };
}

/** The point of segment `a`-`b` nearest to `point`. */
function closestOnSegment(point: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  if (length === 0) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** How far (m) a point lies from the area's boundary. */
function distanceToEdges(area: readonly Vec2[], point: Vec2): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < area.length; index += 1) {
    const closest = closestOnSegment(point, area[index]!, area[(index + 1) % area.length]!);
    best = Math.min(best, (closest.x - point.x) ** 2 + (closest.y - point.y) ** 2);
  }
  return Math.sqrt(best);
}

/** add-map-objectives 2.6: how far inside the area an anchor keeps (m), so a section's line fits. */
const ANCHOR_CLEARANCE = 3;

/**
 * add-map-objectives 2.6: the point of the deployment area nearest to `point`
 * (the point itself when it already lies inside), so an objective just off
 * the area still has a section deployed on its edge. The point is kept clear
 * of the boundary (for the section's line) and of building footprints (the
 * church flag stands on the church).
 */
function nearestInside(area: readonly Vec2[], point: Vec2, covers: readonly CoverPoint[]): Vec2 {
  const inside = insideDeploymentArea(area, point.x, point.y);
  let start = point;
  if (!inside) {
    start = point;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < area.length; index += 1) {
      const closest = closestOnSegment(point, area[index]!, area[(index + 1) % area.length]!);
      const distance = (closest.x - point.x) ** 2 + (closest.y - point.y) ** 2;
      if (distance < bestDistance) {
        start = closest;
        bestDistance = distance;
      }
    }
  }
  // Into the area, on toward its middle: that is where the ground clears the
  // building the flag may stand on.
  const origin = point;
  const middle = centroid(area);
  const dx = middle.x - origin.x;
  const dy = middle.y - origin.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const clear = (at: Vec2) =>
    insideDeploymentArea(area, at.x, at.y) &&
    !isDeepWater(at.x, at.y) &&
    !isPointBlockedByCovers(at.x, at.y, covers, 0) &&
    distanceToEdges(area, at) >= ANCHOR_CLEARANCE;
  for (let step = 0.5; step <= ANCHOR_REACH + 20; step += 0.5) {
    const at = { x: origin.x + (dx / length) * step, y: origin.y + (dy / length) * step };
    if (clear(at)) return at;
  }
  return start;
}

/**
 * The legalist commander's deployment, before the battle's first tick. It
 * reads only the map (its area, the column's area, the covers) and its own
 * sections, never the column's men:
 *
 * 1. Candidate anchors are cover slots inside its area that face the
 *    column's area, scored by ANCHOR_SCORE, and the objectives it holds and
 *    must keep (value 2 or more) scored above them.
 * 2. Sections, in roster order, take the best free anchor at least
 *    ANCHOR_SPACING m from those taken; ties go by the seeded RNG.
 * 3. Each is placed there with the deployment's instant defend order.
 *
 * A section with no anchor left keeps its default place.
 */
export function deployEnemy(ctx: SimContext): void {
  const map = ctx.battleMap;
  if (!map) return;
  const own = map.deployment.legalist.area;
  const towards = centroid(map.deployment.column.area);
  const kinds = new Map(ctx.covers.map((cover) => [cover.id, cover.kind]));
  const anchors: Anchor[] = [];
  // add-map-objectives 2.6: the objectives it holds and must keep are anchors,
  // so the deployment opens with a section already on each of them.
  for (const objective of ctx.objectives) {
    if (objective.owner !== 'legalist' || objective.value < 2) continue;
    const at = nearestInside(own, objective.flag, ctx.covers);
    anchors.push({ x: at.x, y: at.y, score: OBJECTIVE_ANCHOR_SCORE });
  }
  for (const slot of allCoverSlots(ctx.covers)) {
    const score = ANCHOR_SCORE[kinds.get(slot.coverId) ?? 'barrel'];
    if (!score || !insideDeploymentArea(own, slot.x, slot.y)) continue;
    const dx = towards.x - slot.x;
    const dy = towards.y - slot.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    // A slot with no guard (a trench bay with no fire step) shelters from every side.
    if (slot.guard && (slot.guard.x * dx + slot.guard.y * dy) / length < FACING_MIN) continue;
    anchors.push({ x: slot.x, y: slot.y, score });
  }
  if (anchors.length === 0) return;
  const squads = [...new Set(ctx.units.filter((unit) => unit.faction === 'legalist' && unit.alive).map((unit) => unit.squadId))].sort((a, b) => a - b);
  const taken: Anchor[] = [];
  const events: SimEvent[] = [];
  // The planners look for the nearest enemy; the commander must not see the
  // column, so its men are set aside while the legalists are placed.
  const everyone = [...ctx.units];
  ctx.units.splice(0, ctx.units.length, ...everyone.filter((unit) => unit.faction === 'legalist'));
  try {
    placeSections(ctx, squads, anchors, taken, towards, events);
  } finally {
    ctx.units.splice(0, ctx.units.length, ...everyone);
  }
}

function placeSections(ctx: SimContext, squads: readonly number[], anchors: readonly Anchor[], taken: Anchor[], towards: Vec2, events: SimEvent[]): void {
  for (const squadId of squads) {
    const men = ctx.units.filter((unit) => unit.faction === 'legalist' && unit.squadId === squadId && unit.alive);
    const start = centroid(men);
    const free = anchors.filter(
      (anchor) =>
        (anchor.x - start.x) ** 2 + (anchor.y - start.y) ** 2 <= ANCHOR_REACH * ANCHOR_REACH &&
        taken.every((other) => (anchor.x - other.x) ** 2 + (anchor.y - other.y) ** 2 >= ANCHOR_SPACING * ANCHOR_SPACING),
    );
    // No cover in reach: the section keeps its default place.
    if (free.length === 0) continue;
    const best = Math.max(...free.map((anchor) => anchor.score));
    const top = free.filter((anchor) => anchor.score === best);
    const anchor = top[Math.min(top.length - 1, Math.floor(ctx.rng.nextFloat() * top.length))]!;
    taken.push(anchor);
    const unitIds = men.map((unit) => unit.id);
    // Facing the column's area: the planner then needs no enemy to face.
    const dx = towards.x - anchor.x;
    const dy = towards.y - anchor.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const facing = { x: dx / length, y: dy / length };
    const envelope: CommandEnvelope = { seq: 0, tick: ctx.tickCount, command: { type: 'order', order: 'defend', unitIds, to: { x: anchor.x, y: anchor.y }, facing } };
    applyDeploymentCommand(ctx, envelope, events);
  }
}
