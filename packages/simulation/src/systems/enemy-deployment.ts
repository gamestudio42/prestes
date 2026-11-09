import { allCoverSlots, insideDeploymentArea } from '@prestes/shared';
import type { CommandEnvelope, CoverKind, SimEvent, Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import { applyDeploymentCommand } from './deployment';

/**
 * add-deployment-phase D4: how much the commander wants each kind of cover
 * as a section's anchor. Trench fire steps first, then walls and hedges.
 * Buildings wait for garrison-and-assault; objectives for add-map-objectives.
 */
const ANCHOR_SCORE: Partial<Record<CoverKind, number>> = {
  trench: 3,
  'low-wall': 2,
  stone: 2,
  sandbag: 2,
  fence: 1,
};

/** Two sections' anchors are kept at least this far apart (m). */
export const ANCHOR_SPACING = 25;

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

/**
 * The legalist commander's deployment, before the battle's first tick. It
 * reads only the map (its area, the column's area, the covers) and its own
 * sections, never the column's men:
 *
 * 1. Candidate anchors are cover slots inside its area that face the
 *    column's area, scored by ANCHOR_SCORE.
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
  for (const slot of allCoverSlots(ctx.covers)) {
    const score = ANCHOR_SCORE[kinds.get(slot.coverId) ?? 'barrel'];
    if (!score || !insideDeploymentArea(own, slot.x, slot.y)) continue;
    const dx = towards.x - slot.x;
    const dy = towards.y - slot.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    if (!slot.guard || (slot.guard.x * dx + slot.guard.y * dy) / length < FACING_MIN) continue;
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
    const free = anchors.filter((anchor) => taken.every((other) => (anchor.x - other.x) ** 2 + (anchor.y - other.y) ** 2 >= ANCHOR_SPACING * ANCHOR_SPACING));
    if (free.length === 0) break;
    const best = Math.max(...free.map((anchor) => anchor.score));
    const top = free.filter((anchor) => anchor.score === best);
    const anchor = top[Math.min(top.length - 1, Math.floor(ctx.rng.nextFloat() * top.length))]!;
    taken.push(anchor);
    const unitIds = ctx.units.filter((unit) => unit.faction === 'legalist' && unit.squadId === squadId && unit.alive).map((unit) => unit.id);
    // Facing the column's area: the planner then needs no enemy to face.
    const dx = towards.x - anchor.x;
    const dy = towards.y - anchor.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const facing = { x: dx / length, y: dy / length };
    const envelope: CommandEnvelope = { seq: 0, tick: ctx.tickCount, command: { type: 'order', order: 'defend', unitIds, to: { x: anchor.x, y: anchor.y }, facing } };
    applyDeploymentCommand(ctx, envelope, events);
  }
}
