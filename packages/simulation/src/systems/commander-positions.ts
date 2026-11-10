import { PINNED_SUPPRESSION, isPointBlockedByCovers, type Command, type PositionDef, type Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import { ASSAULT_RANGE } from './assault';
import { EXIT_RANGE, holder } from './garrison';
import type { Side } from './vision';

/**
 * garrison-and-assault D7: how the legalist commander uses positions. He
 * garrisons one near his line as he deploys, suppresses an enemy garrison
 * before he assaults it (pinned, or outnumbered 2 to 1), and leaves a
 * position that is lost. He goes by what his side knows.
 */

/** A position this near a section's line may be garrisoned on deployment (m). */
export const GARRISON_NEAR_LINE = 40;
/** The smallest position worth a section. */
export const GARRISON_MIN_CAPACITY = 4;
/** An attacking section deals with a known enemy garrison this near (m). */
export const ASSAULT_NEAR = 80;
/** It closes to this far from the entrance before ordering the assault (m). */
const ASSAULT_STAND_OFF = 10;
/** A surrounded garrison is one with known enemies this near two of its entrances (m)... */
const SURROUNDED_REACH = 15;
/** ...and no friendly section this near (m). */
const SUPPORT_NEAR = 60;

type Issue = (command: Command) => void;

const fit = (unit: MutableUnit | undefined): unit is MutableUnit => unit !== undefined && unit.alive && !unit.incapacitated && !unit.routed;

function squared(a: Vec2, b: Vec2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function nearestEntrance(position: PositionDef, to: Vec2): Vec2 {
  let best = position.entrances[0]!;
  for (const entrance of position.entrances) if (squared(entrance, to) < squared(best, to)) best = entrance;
  return best;
}

/**
 * Deployment: the nearest free position of capacity 4 or more within 40 m of
 * the section's line, if no section of his holds one yet. Returns whether
 * the section was sent in.
 */
export function garrisonOnDeploy(ctx: SimContext, side: Side, ids: readonly number[], line: Vec2, issue: Issue): boolean {
  if ([...ctx.garrisons.values()].some((garrison) => garrison.side === side)) return false;
  if (ctx.units.some((unit) => unit.faction === side && unit.entering !== undefined)) return false;
  let best: PositionDef | null = null;
  for (const position of ctx.positions) {
    if (position.capacity < GARRISON_MIN_CAPACITY || position.entrances.length === 0) continue;
    if (holder(ctx, position.id) !== null) continue;
    if (squared(position, line) > GARRISON_NEAR_LINE * GARRISON_NEAR_LINE) continue;
    if (!best || squared(position, line) < squared(best, line) || (squared(position, line) === squared(best, line) && position.id < best.id)) best = position;
  }
  if (!best) return false;
  issue({ type: 'order', order: 'enter', unitIds: [...ids], positionId: best.id });
  return true;
}

/** What his side knows of an enemy garrison: nothing, held, or its strength. */
function intel(ctx: SimContext, side: Side, positionId: number): 'occupied' | 'counted' | null {
  if (!ctx.fog) return 'counted';
  return ctx.vision.garrisons[side].get(positionId) ?? null;
}

/**
 * An attacking section near a known enemy garrison: suppress it, then close
 * and assault once it is pinned or outnumbered 2 to 1. Returns whether the
 * section was given an order about it (so it does nothing else this think).
 */
export function dealWithGarrison(ctx: SimContext, side: Side, section: readonly MutableUnit[], issue: Issue): boolean {
  const here = { x: section.reduce((sum, unit) => sum + unit.x, 0) / section.length, y: section.reduce((sum, unit) => sum + unit.y, 0) / section.length };
  let target: { position: PositionDef; known: 'occupied' | 'counted' } | null = null;
  for (const garrison of [...ctx.garrisons.values()].sort((a, b) => a.positionId - b.positionId)) {
    if (garrison.side === side) continue;
    const position = ctx.positionById.get(garrison.positionId);
    if (!position || position.entrances.length === 0) continue;
    const known = intel(ctx, side, garrison.positionId);
    if (!known || squared(position, here) > ASSAULT_NEAR * ASSAULT_NEAR) continue;
    if (!target || squared(position, here) < squared(target.position, here)) target = { position, known };
  }
  if (!target) return false;
  const { position, known } = target;
  const garrison = ctx.garrisons.get(position.id)!;
  const defenders = garrison.unitIds.map((id) => ctx.units.find((unit) => unit.id === id)).filter(fit);
  if (defenders.length === 0) return false;
  // Unless he has counted them, he takes the position as full.
  const strength = known === 'counted' ? defenders.length : position.capacity;
  const pinned = garrison.suppression >= PINNED_SUPPRESSION;
  const ids = section.map((unit) => unit.id);
  if (pinned || section.length >= strength * 2) {
    const door = nearestEntrance(position, here);
    if (squared(door, here) <= (ASSAULT_RANGE - 2) ** 2) {
      issue({ type: 'assault', unitIds: ids, positionId: position.id });
      return true;
    }
    // Close to the door first, the way the section stands.
    const dx = here.x - door.x;
    const dy = here.y - door.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const to = { x: door.x + (dx / length) * ASSAULT_STAND_OFF, y: door.y + (dy / length) * ASSAULT_STAND_OFF };
    const moving = section.some((unit) => unit.currentOrder === 'move' && unit.path.length > 0 && squared({ x: unit.targetX, y: unit.targetY }, to) < 25);
    if (!moving) issue({ type: 'move', unitIds: ids, to });
    return true;
  }
  // Suppress it: fire on the position (the man at the port facing the section takes it).
  const suppressing = section.some((unit) => unit.suppress && unit.targetId !== null && garrison.unitIds.includes(unit.targetId));
  if (!suppressing) issue({ type: 'suppress', unitIds: ids, targetId: defenders[0]!.id });
  return true;
}

/**
 * A garrison of his that is lost (one fit man, or known enemies at two
 * entrances and no friendly section within 60 m) leaves toward his side.
 */
export function leaveIfLost(ctx: SimContext, side: Side, section: readonly MutableUnit[], home: Vec2, enemies: readonly Vec2[], issue: Issue): boolean {
  const positionId = section.find((unit) => unit.garrison !== undefined)?.garrison;
  if (positionId === undefined) return false;
  const garrison = ctx.garrisons.get(positionId);
  const position = ctx.positionById.get(positionId);
  if (!garrison || !position) return false;
  const inside = garrison.unitIds.map((id) => ctx.units.find((unit) => unit.id === id)).filter(fit);
  let lost = inside.length <= 1;
  if (!lost && position.entrances.length >= 2) {
    const watched = position.entrances.filter((entrance) => enemies.some((enemy) => squared(enemy, entrance) <= SURROUNDED_REACH * SURROUNDED_REACH)).length;
    const supported = ctx.units.some(
      (unit) => unit.faction === side && fit(unit) && unit.garrison === undefined && squared(unit, position) <= SUPPORT_NEAR * SUPPORT_NEAR,
    );
    lost = watched >= 2 && !supported;
  }
  if (!lost) return false;
  // Out toward his side, at the first open point within the exit range.
  const dx = home.x - position.x;
  const dy = home.y - position.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  for (const distance of [20, 25, 15, EXIT_RANGE - 2, 10]) {
    const to = { x: position.x + (dx / length) * distance, y: position.y + (dy / length) * distance };
    if (isPointBlockedByCovers(to.x, to.y, ctx.covers)) continue;
    issue({ type: 'order', order: 'exit', unitIds: section.map((unit) => unit.id), to });
    return true;
  }
  return false;
}
