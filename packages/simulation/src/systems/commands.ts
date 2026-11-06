import {
  MAP_BOUNDS,
  DEFAULT_SPACING,
  MAX_SPACING,
  averageAim,
  averageFacing,
  clampSpacing,
  findPath,
  isPointNearCover,
  isPointBlockedByCovers,
  lineFacing,
  lineFormationSlots,
  matchDestinations,
  activeMapRuntime,
  isDeepWater,
} from '@prestes/shared';
import type { Command, CommandEnvelope, RejectionReason, SimEvent, Vec2 } from '@prestes/shared';
import { formationSlots } from '../tactical';
import { clamp } from './model';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { nearestOpenPoint, nearestEnemyAt } from './geometry';
import { reflowFormation, reformInPlace } from './formations';
import { queueUnitOrder } from './movement';
import { spawnCover } from './cover';
import { matchedDestinations, orderSlots, takeSlot } from './slots';
import { routeFor, sectionRoutes } from './routes';
import { incapacitate, wound, releaseCarry } from './casualties';
import { applyTacticalOrder, assignFlankPaths, beginWithdraw } from './orders';
import { spawnDummy, spawnTroop, setTrainingPhase, despawnRole, reinforce } from './spawning';

/**
 * A ground point an order may go to on a battle map: inside the bounds and
 * walkable, else the nearest walkable point within 24 m; null if none.
 */
function walkableTarget(to: Vec2): Vec2 | null {
  if (to.x < MAP_BOUNDS.minX || to.x > MAP_BOUNDS.maxX || to.y < MAP_BOUNDS.minY || to.y > MAP_BOUNDS.maxY) {
    return null;
  }
  // Covers are left to the order's own slot search, as on every map.
  const open = (x: number, y: number) =>
    !isDeepWater(x, y) && !isDeepWater(x + 1, y) && !isDeepWater(x - 1, y) && !isDeepWater(x, y + 1) && !isDeepWater(x, y - 1);
  if (open(to.x, to.y)) return to;
  for (let radius = 1; radius <= 24; radius += 1) {
    let best: Vec2 | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = Math.round(to.x) + dx;
        const y = Math.round(to.y) + dy;
        if (!open(x, y)) continue;
        const distance = (x - to.x) ** 2 + (y - to.y) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

export function applyCommand(
  ctx: SimContext,
  envelope: CommandEnvelope,
  tick: number,
  events: SimEvent[],
): void {
  const command = envelope.command;
  if (command.type === 'noop') {
    return;
  }

  // Bounding is part of Advance and Attack now; the old switch is accepted
  // (replays, tests) and has no effect.
  if (command.type === 'set_bounding') {
    return;
  }

  if (command.type === 'spawn_cover') {
    spawnCover(ctx, command.kind, command.to, tick, envelope.seq, events, command.rotation ?? 0);
    return;
  }

  if (command.type === 'spawn_dummy') {
    spawnDummy(ctx, command.to, tick, envelope.seq, events, command.rotation ?? 0);
    return;
  }

  if (command.type === 'spawn_troop') {
    spawnTroop(ctx, command, tick, envelope.seq, events);
    return;
  }

  if (command.type === 'training_phase') {
    setTrainingPhase(ctx, command.setup, tick, envelope.seq, events);
    return;
  }

  if (command.type === 'despawn_role') {
    despawnRole(ctx, command.role, tick, envelope.seq, events);
    return;
  }

  if (command.type === 'incapacitate') {
    incapacitate(ctx, command.targetId, tick, envelope.seq, events);
    return;
  }

  if (command.type === 'wound') {
    wound(ctx, command.targetId, command.hp, tick, envelope.seq, events);
    return;
  }

  if (command.type === 'reinforce') {
    reinforce(ctx, command.faction, tick, envelope.seq, events);
    return;
  }

  // fog-of-war: the sandbox's toggle.
  if (command.type === 'fog') {
    ctx.fog = command.enabled;
    return;
  }

  // Battle maps (add-battle-maps): a ground order outside the map is refused
  // and one in deep water moves to the nearest walkable bank.
  if (
    activeMapRuntime() &&
    (command.type === 'move' || command.type === 'order' || command.type === 'move_line') &&
    command.to
  ) {
    const snapped = walkableTarget(command.to);
    const from = command.type === 'move_line' ? walkableTarget(command.from) : null;
    if (!snapped || (command.type === 'move_line' && !from)) {
      reject(ctx, tick, envelope.seq, 'invalid_position', events);
      return;
    }
    const moved =
      snapped.x !== command.to.x ||
      snapped.y !== command.to.y ||
      (command.type === 'move_line' && from && (from.x !== command.from.x || from.y !== command.from.y));
    if (moved) {
      applyCommand(
        ctx,
        { ...envelope, command: { ...command, to: snapped, ...(from ? { from } : {}) } as Command },
        tick,
        events,
      );
      return;
    }
  }

  const resolution = ctx.orderManager.resolve(command.unitIds, ctx.units);
  if (resolution.rejection !== null) {
    reject(ctx, tick, envelope.seq, resolution.rejection, events);
    return;
  }
  const actionable = resolution.actionable;

  // An ordered facing must be a direction; it is used normalised.
  let facing: Vec2 | undefined;
  if (
    (command.type === 'move' || command.type === 'order' || command.type === 'hold') &&
    command.facing !== undefined
  ) {
    const length = Math.sqrt(command.facing.x * command.facing.x + command.facing.y * command.facing.y);
    if (!Number.isFinite(length) || length < 0.001) {
      reject(ctx, tick, envelope.seq, 'invalid_position', events);
      return;
    }
    facing = { x: command.facing.x / length, y: command.facing.y / length };
  }
  let spacing: number | undefined;
  if ((command.type === 'move' || command.type === 'order') && command.spacing !== undefined) {
    if (!Number.isFinite(command.spacing)) {
      reject(ctx, tick, envelope.seq, 'invalid_position', events);
      return;
    }
    spacing = clampSpacing(command.spacing);
  }

  if (command.type === 'order') {
    // Orders folded into others (compact-orders), still accepted:
    // ambush = defend with fire on contact; reserve = defend with fire held;
    // disperse = an open-order move; pursue = attack (which follows a runner).
    if (command.order === 'ambush' || command.order === 'reserve') {
      applyTacticalOrder(ctx, { ...command, order: 'defend', facing, spacing }, actionable, tick, envelope.seq, events);
      for (const unit of actionable) {
        unit.fireOnContact = command.order === 'ambush';
        unit.holdFire = command.order === 'reserve';
      }
      return;
    }
    if (command.order === 'disperse' && command.to) {
      applyCommand(
        ctx,
        { ...envelope, command: { type: 'move', unitIds: command.unitIds, to: command.to, spacing: MAX_SPACING, ...(facing ? { facing } : {}) } },
        tick,
        events,
      );
      return;
    }
    if (command.order === 'pursue' && command.targetId !== undefined) {
      applyCommand(ctx, { ...envelope, command: { type: 'attack', unitIds: command.unitIds, targetId: command.targetId } }, tick, events);
      return;
    }
    applyTacticalOrder(ctx, { ...command, facing, spacing }, actionable, tick, envelope.seq, events);
    return;
  }

  if (command.type === 'stance') {
    for (const unit of actionable) {
      if (unit.state === 'pinned') {
        continue;
      }
      unit.stance = command.stance;
      unit.stanceLocked = true;
    }
    return;
  }

  if (command.type === 'hold_fire') {
    for (const unit of actionable) {
      unit.holdFire = command.hold;
      unit.fireOnContact = false;
    }
    return;
  }

  if (command.type === 'fire_control') {
    for (const unit of actionable) {
      unit.holdFire = command.mode === 'hold';
      unit.fireOnContact = command.mode === 'contact';
    }
    return;
  }

  if (command.type === 'posture') {
    for (const unit of actionable) {
      // Defensive moves and halts crouched; leaving it stands him back up,
      // unless the player chose a stance himself.
      if (!unit.stanceLocked && unit.state !== 'pinned') {
        if (command.posture === 'defensive' && unit.stance === 'standing') {
          unit.stance = 'crouched';
        } else if (unit.posture === 'defensive' && command.posture !== 'defensive' && unit.stance === 'crouched') {
          unit.stance = 'standing';
        }
      }
      unit.posture = command.posture;
    }
    return;
  }

  if (command.type === 'formation') {
    for (const unit of actionable) {
      unit.formation = command.formation;
    }
    // A moving section re-lays at its destination; a standing one re-forms
    // where it is.
    if (!reflowFormation(ctx, actionable)) {
      reformInPlace(ctx, actionable);
    }
    return;
  }

  if (command.type === 'move_line') {
    applyLineMove(ctx, command, actionable);
    return;
  }

  if (command.type === 'hold') {
    ctx.orders = ctx.orders.filter(
      (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
    );
    for (const unit of actionable) {
      releaseCarry(ctx, unit);
      unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      unit.targetId = null;
      unit.targetLocked = false;
      unit.path = [];
      unit.pathIndex = 0;
      unit.flankTargetId = null;
      unit.suppress = false;
      unit.ambush = false;
      unit.reserveMode = false;
      unit.recon = false;
      unit.rescueTargetId = null;
      unit.holdPosition = true;
      unit.currentOrder = 'hold';
      unit.lineMove = false;
      unit.orderIssued = false;
      if (facing) {
        unit.aimX = facing.x;
        unit.aimY = facing.y;
      }
    }
    haltIntoCover(ctx, actionable, facing);
    return;
  }

  if (command.type === 'face') {
    const center = actionable.reduce(
      (sum, unit) => ({
        x: sum.x + unit.x / actionable.length,
        y: sum.y + unit.y / actionable.length,
      }),
      { x: 0, y: 0 },
    );
    const dx = command.to.x - center.x;
    const dy = command.to.y - center.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.001) {
      reject(ctx, tick, envelope.seq, 'invalid_position', events);
      return;
    }
    for (const unit of actionable) {
      unit.aimX = dx / length;
      unit.aimY = dy / length;
      unit.facingX = dx / length;
      unit.facingY = dy / length;
      // The newest order wins: facing away releases the previous fire target,
      // otherwise the soldier turns straight back to it.
      unit.targetId = null;
      unit.targetLocked = false;
      unit.suppress = false;
      if (unit.currentOrder === 'attack' || unit.currentOrder === 'suppress') {
        unit.currentOrder = null;
      }
    }
    return;
  }

  if (command.type === 'attack' || command.type === 'suppress' || command.type === 'flank') {
    const target = ctx.units.find((unit) => unit.id === command.targetId);
    if (!target || !target.alive || target.routed || target.faction === actionable[0]?.faction) {
      reject(ctx, tick, envelope.seq, 'invalid_target', events);
      return;
    }
    ctx.orders = ctx.orders.filter(
      (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
    );
    // Doctrine: a flank always splits, one half fixing the enemy by fire.
    const split = command.type === 'flank' && actionable.length > 1;
    const suppressors = split ? actionable.slice(0, Math.ceil(actionable.length / 2)) : [];
    const flankers = split ? actionable.slice(Math.ceil(actionable.length / 2)) : actionable;
    for (const unit of actionable) {
      releaseCarry(ctx, unit);
      unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
      const suppressing = command.type === 'suppress' || suppressors.includes(unit);
      unit.lineMove = false;
      unit.targetId = target.id;
      const targetDx = target.x - unit.x;
      const targetDy = target.y - unit.y;
      const targetLength = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
      if (targetLength > 0.001) {
        unit.facingX = targetDx / targetLength;
        unit.facingY = targetDy / targetLength;
      }
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      unit.path = [];
      unit.pathIndex = 0;
      unit.flankTargetId = null;
      unit.targetLocked = true;
      unit.suppress = suppressing;
      unit.ambush = false;
      unit.reserveMode = false;
      unit.recon = false;
      unit.rescueTargetId = null;
      unit.holdPosition = suppressing;
      unit.orderIssued = true;
      unit.currentOrder = command.type === 'attack' ? 'attack' : suppressing ? 'suppress' : 'flank';
    }
    // A section suppressing a position spreads its rifles over the men there,
    // nearest the named man first, rather than all on him (battle-feel-3v3).
    const suppressing = command.type === 'suppress' ? actionable : suppressors;
    if (suppressing.length > 1 && !target.dummy) {
      const position = ctx.units
        .filter(
          (unit) =>
            unit.squadId === target.squadId &&
            unit.faction === target.faction &&
            unit.alive &&
            !unit.routed &&
            !unit.incapacitated,
        )
        .sort(
          (left, right) =>
            (left.x - target.x) ** 2 + (left.y - target.y) ** 2 - ((right.x - target.x) ** 2 + (right.y - target.y) ** 2) ||
            left.id - right.id,
        );
      suppressing.forEach((unit, index) => {
        unit.targetId = position[index % position.length]!.id;
      });
    }
    if (command.type === 'flank') {
      assignFlankPaths(ctx, flankers, target);
    }
    return;
  }

  if (command.type === 'withdraw') {
    ctx.orders = ctx.orders.filter(
      (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
    );
    for (const unit of actionable) {
      releaseCarry(ctx, unit);
      unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
    }
    const center = actionable.reduce(
      (sum, unit) => ({
        x: sum.x + unit.x / actionable.length,
        y: sum.y + unit.y / actionable.length,
      }),
      { x: 0, y: 0 },
    );
    const enemy =
      actionable.length > 1 ? nearestEnemyAt(ctx, center, actionable[0]!.faction) : null;
    // With no enemy left, fall back against the way the section faces.
    const facingNow = averageFacing(actionable);
    const away = enemy
      ? { x: center.x - enemy.x, y: center.y - enemy.y }
      : facingNow
        ? { x: -facingNow.x, y: -facingNow.y }
        : null;
    if (away && actionable.length > 1) {
      const dx = away.x;
      const dy = away.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0.001) {
        const facing = { x: dx / length, y: dy / length };
        const retreat = {
          x: clamp(center.x + facing.x * 12, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
          y: clamp(center.y + facing.y * 12, MAP_BOUNDS.minY, MAP_BOUNDS.maxY),
        };
        const slots = formationSlots(
          actionable.map((unit) => ({ x: unit.x, y: unit.y })),
          retreat,
          actionable[0]?.formationSpacing ?? DEFAULT_SPACING,
          actionable[0]?.formation ?? 'line',
          facing,
        );
        actionable.forEach((unit, index) => {
          const destination = slots[index] ?? retreat;
          const path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
          if (path.length === 0) {
            beginWithdraw(ctx, unit);
            return;
          }
          unit.targetX = destination.x;
          unit.targetY = destination.y;
          unit.path = path;
          unit.pathIndex = 0;
          unit.currentOrder = 'withdraw';
          unit.lineMove = false;
          unit.holdPosition = false;
          queueUnitOrder(ctx, unit, path, 'withdraw');
        });
        return;
      }
    }
    for (const unit of actionable) {
      beginWithdraw(ctx, unit);
    }
    return;
  }

  ctx.orders = ctx.orders.filter(
    (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
  );
  const living = actionable;
  const aimFacing = facing ?? averageAim(living);
  const coverFacing = aimFacing ?? averageFacing(living);
  const moveFacing =
    aimFacing ?? (isPointNearCover(command.to, ctx.covers) ? averageFacing(living) : undefined);
  const slots = formationSlots(
    living.map((unit) => ({ x: unit.x, y: unit.y })),
    command.to,
    spacing,
    living[0]?.formation ?? 'line',
    moveFacing,
  );

  const coverSlots = orderSlots(ctx, living, slots, {
    threat: living[0] ? nearestEnemyAt(ctx, command.to, living[0].faction) : null,
    facing: coverFacing ?? null,
    click: command.to,
  });
  const finals = matchedDestinations(living, slots, coverSlots, command.to);
  const routes = sectionRoutes(ctx, living, finals);
  living.forEach((unit, index) => {
    releaseCarry(ctx, unit);
    unit.orderDestination = null;
    unit.orderIssued = false;
    unit.orderRegionCenter = null;
    unit.orderRegionRadius = 0;
    unit.targetId = null;
    unit.targetLocked = false;
    unit.suppress = false;
    unit.holdPosition = false;
    unit.flankTargetId = null;
    unit.ambush = false;
    unit.reserveMode = false;
    unit.recon = false;
    unit.rescueTargetId = null;
    unit.currentOrder = null;
    unit.lineMove = false;
    // The section keeps the ordered spacing; a move without one resets it.
    unit.formationSpacing = spacing;
    if (facing) {
      // Faced and aimed that way once there, until something changes it.
      unit.aimX = facing.x;
      unit.aimY = facing.y;
    }
    const final = finals[index]!;
    let destination: Vec2 = final.slot ? takeSlot(unit, final.slot) : { x: final.x, y: final.y };
    // A click on cover still moves the soldier: use the nearest open point.
    const fallback = nearestOpenPoint(ctx, command.to);
    if (isPointBlockedByCovers(destination.x, destination.y, ctx.covers, 0.8)) {
      destination = fallback;
    }
    let path = routeFor(routes[index], destination) ?? findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    if (path.length === 0 && (destination.x !== fallback.x || destination.y !== fallback.y)) {
      destination = fallback;
      path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    }
    if (path.length === 0) {
      unit.targetX = destination.x;
      unit.targetY = destination.y;
      unit.path = [];
      unit.pathIndex = 0;
      unit.currentOrder = 'move';
      unit.lineMove = false;
      unit.orderIssued = true;
      unit.holdPosition = false;
      return;
    }
    unit.targetX = destination.x;
    unit.targetY = destination.y;
    unit.path = path;
    unit.pathIndex = 0;
    unit.currentOrder = 'move';
    unit.orderIssued = true;
    unit.orderDestination = { ...command.to };
    queueUnitOrder(ctx, unit, path, 'move');
  });
}

export function applyLineMove(
  ctx: SimContext,
  command: Extract<Command, { type: 'move_line' }>,
  actionable: MutableUnit[],
): void {
  ctx.orders = ctx.orders.filter(
    (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
  );
  const living = actionable;
  const lineDirection = lineFacing(command.from, command.to);
  const center = {
    x: (command.from.x + command.to.x) / 2,
    y: (command.from.y + command.to.y) / 2,
  };
  const slots = matchDestinations(living, lineFormationSlots(command.from, command.to, living.length));
  const coverSlots = orderSlots(ctx, living, slots, {
    threat: living[0] ? nearestEnemyAt(ctx, center, living[0].faction) : null,
    facing: lineDirection,
  });
  const finals = matchedDestinations(living, slots, coverSlots, center);
  const routes = sectionRoutes(ctx, living, finals);
  living.forEach((unit, index) => {
    releaseCarry(ctx, unit);
    unit.orderDestination = null;
    unit.orderIssued = false;
    unit.orderRegionCenter = null;
    unit.orderRegionRadius = 0;
    unit.targetId = null;
    unit.targetLocked = false;
    unit.suppress = false;
    unit.holdPosition = false;
    unit.flankTargetId = null;
    unit.ambush = false;
    unit.reserveMode = false;
    unit.recon = false;
    unit.rescueTargetId = null;
    unit.currentOrder = null;
    const final = finals[index]!;
    let destination: Vec2 = final.slot ? takeSlot(unit, final.slot) : { x: final.x, y: final.y };
    destination = nearestOpenPoint(ctx, destination);
    let path = routeFor(routes[index], destination) ?? findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    if (path.length === 0) {
      const fallback = nearestOpenPoint(ctx, center);
      if (fallback.x !== destination.x || fallback.y !== destination.y) {
        destination = fallback;
        path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
      }
    }
    if (path.length === 0) {
      destination = nearestOpenPoint(ctx, { x: unit.x, y: unit.y });
      path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    }
    if (path.length === 0) {
      path = [{ ...destination }];
    }
    unit.targetX = destination.x;
    unit.targetY = destination.y;
    unit.path = path;
    unit.pathIndex = 0;
    unit.currentOrder = 'move';
    unit.lineMove = true;
    unit.orderIssued = true;
    unit.orderDestination = { ...center };
    unit.aimX = lineDirection.x;
    unit.aimY = lineDirection.y;
    queueUnitOrder(ctx, unit, path, 'move');
  });
}

export function reject(
  ctx: SimContext,
  tick: number,
  seq: number,
  reason: RejectionReason,
  events: SimEvent[],
): void {
  events.push({ type: 'command_rejected', tick, seq, reason });
}

/** Cover a halting soldier will move to, at most (metres). */
const HALT_COVER_RADIUS = 6;

/**
 * Halt: each soldier takes a free cover slot within reach that guards against
 * the nearest enemy (or the ordered facing), then holds there.
 */
function haltIntoCover(ctx: SimContext, units: readonly MutableUnit[], facing: Vec2 | undefined): void {
  const living = units.filter((unit) => unit.alive && !unit.incapacitated && !unit.routed);
  if (living.length === 0) {
    return;
  }
  const centre = {
    x: living.reduce((sum, unit) => sum + unit.x, 0) / living.length,
    y: living.reduce((sum, unit) => sum + unit.y, 0) / living.length,
  };
  const slots = orderSlots(
    ctx,
    living,
    living.map((unit) => ({ x: unit.x, y: unit.y })),
    {
      threat: nearestEnemyAt(ctx, centre, living[0]!.faction),
      facing: facing ?? averageAim(living) ?? averageFacing(living) ?? null,
      click: null,
      maxDistance: HALT_COVER_RADIUS,
    },
  );
  for (const unit of living) {
    const slot = slots.get(unit.id);
    if (!slot) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, slot, ctx.covers);
    if (path.length === 0) {
      continue;
    }
    const destination = takeSlot(unit, slot);
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = destination.x;
    unit.targetY = destination.y;
    queueUnitOrder(ctx, unit, path, 'move');
  }
}
