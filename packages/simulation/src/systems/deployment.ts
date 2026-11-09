import { allCoverSlots, insideDeploymentArea, isDeepWater, isPointBlockedByCovers } from '@prestes/shared';
import type { Command, CommandEnvelope, CoverPoint, CoverSlot, RejectionReason, SimEvent, TacticalOrder, Vec2 } from '@prestes/shared';
import { applyCommand } from './commands';
import type { SimContext } from './context';
import type { MutableUnit } from './model';

/** The tactical orders that place a section; the others belong to the fight. */
const PLACING_ORDERS: ReadonlySet<TacticalOrder> = new Set(['defend', 'ambush', 'disperse', 'regroup', 'reserve']);

/** A defend order this close to a trench line's fire step fills that trench first (m). */
export const TRENCH_PREFERENCE_RADIUS = 10;

/** The commands that place or set up a section in deployment. */
const PLACING_COMMANDS: ReadonlySet<Command['type']> = new Set([
  'move',
  'move_line',
  'hold',
  'stance',
  'formation',
  'face',
  'hold_fire',
  'fire_control',
  'posture',
]);

function placing(command: Command): boolean {
  if (command.type === 'order') return PLACING_ORDERS.has(command.order);
  return PLACING_COMMANDS.has(command.type);
}

function unitIdsOf(command: Command): readonly number[] {
  return 'unitIds' in command ? command.unitIds : [];
}

/**
 * add-deployment-phase D2/D3: a command given in the deployment phase.
 *
 * A placing order runs the battle's own planners (`applyCommand`), then each
 * man is put straight at the end of his route, as on arrival. If any planned
 * position lies outside his side's area, in deep water or in a footprint,
 * the whole order is undone and refused. Fight orders are refused.
 */
export function applyDeploymentCommand(ctx: SimContext, envelope: CommandEnvelope, events: SimEvent[]): void {
  const command = envelope.command;
  const reject = (reason: RejectionReason) => events.push({ type: 'command_rejected', tick: ctx.tickCount, seq: envelope.seq, reason });
  if (!placing(command)) {
    reject('not_during_deployment');
    return;
  }
  const ids = new Set(unitIdsOf(command));
  const units = ctx.units.filter((unit) => ids.has(unit.id));
  const saved = units.map((unit) => structuredClone(unit));
  const savedOrders = ctx.orders;
  const savedOrderId = ctx.nextOrderId;
  const own: SimEvent[] = [];
  const slots = allCoverSlots(ctx.covers);
  applyCommand(ctx, preferTrench(ctx.covers, slots, envelope), ctx.tickCount, own);
  const refused = own.find((event) => event.type === 'command_rejected');
  if (refused) {
    events.push(refused);
    return;
  }
  const map = ctx.battleMap;
  let reason: RejectionReason | null = null;
  for (const unit of units) {
    if (!unit.alive) continue;
    const area = map?.deployment[unit.faction === 'column' ? 'column' : 'legalist'].area;
    const x = unit.targetX;
    const y = unit.targetY;
    if (area && !insideDeploymentArea(area, x, y)) {
      reason = 'outside_deployment_area';
      break;
    }
    if (isDeepWater(x, y) || isPointBlockedByCovers(x, y, ctx.covers, 0)) {
      reason = 'blocked';
      break;
    }
  }
  if (reason) {
    units.forEach((unit, index) => Object.assign(unit, saved[index]));
    ctx.orders = savedOrders;
    ctx.nextOrderId = savedOrderId;
    reject(reason);
    return;
  }
  for (const unit of units) placeAtOnce(unit, slots);
  ctx.orders = ctx.orders.filter((order) => !order.unitIds.some((id) => ids.has(id)));
}

/**
 * D2 trench preference: a defend order within TRENCH_PREFERENCE_RADIUS of a
 * fire trench's step is given on the nearest step, so the planner's "a click
 * on a cover fills that cover first" puts the section in the trench.
 */
function preferTrench(covers: readonly CoverPoint[], slots: readonly CoverSlot[], envelope: CommandEnvelope): CommandEnvelope {
  const command = envelope.command;
  if (command.type !== 'order' || command.order !== 'defend' || !command.to) return envelope;
  const to = command.to;
  const fireSteps = new Set(covers.filter((cover) => cover.kind === 'trench' && cover.facing && !cover.noSlots).map((cover) => cover.id));
  let best: Vec2 | null = null;
  let bestDistance = TRENCH_PREFERENCE_RADIUS;
  for (const slot of slots) {
    if (!fireSteps.has(slot.coverId)) continue;
    const distance = Math.sqrt((slot.x - to.x) ** 2 + (slot.y - to.y) ** 2);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = { x: slot.x, y: slot.y };
    }
  }
  return best ? { ...envelope, command: { ...command, to: best } } : envelope;
}

/** The man stands where his route ends, as if he had walked there, facing as ordered or as his slot faces. */
function placeAtOnce(unit: MutableUnit, slots: readonly CoverSlot[]): void {
  unit.x = unit.targetX;
  unit.y = unit.targetY;
  unit.path = [];
  unit.pathIndex = 0;
  unit.moveSpeed = 0;
  unit.stuckFrom = undefined;
  unit.coverSeekCooldown = 0;
  const guard = unit.slotId === null ? null : (slots.find((slot) => slot.id === unit.slotId)?.guard ?? null);
  if (unit.aimX !== null && unit.aimY !== null) {
    unit.facingX = unit.aimX;
    unit.facingY = unit.aimY;
  } else if (guard) {
    unit.facingX = guard.x;
    unit.facingY = guard.y;
  }
}
