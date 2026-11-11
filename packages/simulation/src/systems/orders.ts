import {
  DEFEND_REGION_RADIUS,
  FIRE_RANGE,
  averageAim,
  averageFacing,
  DEFAULT_SPACING,
  coverAgainst,
  getWeapon,
  findPath,
  isLineBlocked,
  isPointNearCover,
  isPointBlockedByCovers,
  matchDestinations,
  troopFormationOffsets,
} from '@prestes/shared';
import type { Command, SimEvent, TacticalOrder, Vec2 } from '@prestes/shared';
import { FLANK_RADIUS, flankCandidates, formationSlots } from '../tactical';
import { FLANK_COOLDOWN, WITHDRAW_DISTANCE } from './model';

const REGROUP_FILES = 4;
const REGROUP_SPACING = 2;
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import {
  occupied,
  nearestEnemy,
  nearestKnownEnemyAt,
  nearestOpenPoint,
  facingToward,
  clampToRegion,
} from './geometry';
import { queueUnitOrder } from './movement';
import { releaseCarry } from './casualties';
import { matchedDestinations, orderSlots, takeSlot } from './slots';
import { routeFor, sectionRoutes } from './routes';
import { reject } from './commands';

export function applyTacticalOrder(
  ctx: SimContext,
  command: Extract<Command, { type: 'order' }>,
  units: readonly MutableUnit[],
  tick: number,
  seq: number,
  events: SimEvent[],
): void {
  if (units.length === 0) {
    reject(ctx, tick, seq, 'empty_units', events);
    return;
  }
  ctx.orders = ctx.orders.filter(
    (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
  );
  const clear = (unit: MutableUnit): void => {
    unit.path = [];
    unit.pathIndex = 0;
    unit.targetId = null;
    unit.targetLocked = false;
    unit.flankTargetId = null;
    unit.suppress = false;
    unit.currentOrder = null;
    unit.lineMove = false;
    unit.ambush = false;
    unit.reserveMode = false;
    unit.recon = false;
    unit.reconReported = false;
    unit.reconContacts = 0;
    unit.orderDestination = null;
    unit.orderIssued = false;
    unit.orderRegionCenter = null;
    unit.orderRegionRadius = 0;
    releaseCarry(ctx, unit);
  };

  const areaOrders: readonly TacticalOrder[] = [
    'advance',
    'defend',
    'ambush',
    'disperse',
    'recon',
    'reserve',
  ];
  if (areaOrders.includes(command.order)) {
    if (!command.to) {
      reject(ctx, tick, seq, 'invalid_position', events);
      return;
    }
    const spacing =
      command.order === 'disperse' ? Math.max(5, command.spacing ?? 0) : (command.spacing ?? DEFAULT_SPACING);
    const formationThreat =
      command.order === 'defend' || command.order === 'ambush'
        ? // Defend and ambush face the nearest enemy the side knows of: under
          // fog an unseen man gives no facing away. The preview agrees.
          nearestKnownEnemyAt(ctx, command.to, units[0]!.faction)
        : null;
    // The player's facing wins over the direction of the nearest enemy.
    const formationFacing = command.facing ?? (formationThreat
      ? facingToward(ctx, command.to, formationThreat)
      : (averageAim(units) ??
        (isPointNearCover(command.to, ctx.covers) ? averageFacing(units) : undefined)));
    const coverFacing = formationFacing ?? averageFacing(units);
    const slots = formationSlots(
      units.map((unit) => ({ x: unit.x, y: unit.y })),
      command.to,
      spacing,
      units[0]?.formation ?? 'line',
      formationFacing,
    );
    // Dispersal spreads out and recon observes from the ordered point: no slots.
    const takesCover = command.order !== 'disperse' && command.order !== 'recon';
    const regionLimited = command.order === 'defend' || command.order === 'ambush';
    const coverSlots = takesCover
      ? orderSlots(ctx, units, slots, {
          threat: formationThreat ?? nearestKnownEnemyAt(ctx, command.to, units[0]!.faction),
          facing: coverFacing ?? null,
          click: command.to,
          region: regionLimited ? { center: command.to, radius: DEFEND_REGION_RADIUS } : null,
        })
      : new Map();
    const regionRadius = DEFEND_REGION_RADIUS;
    const finals = matchedDestinations(units, slots, coverSlots, command.to, (anchor) =>
      command.order === 'defend' ? clampToRegion(ctx, anchor, command.to!, regionRadius) : anchor,
    );
    // Dispersal scatters on purpose: no shared route.
    const routes = command.order === 'disperse' ? units.map(() => null) : sectionRoutes(ctx, units, finals);
    units.forEach((unit, index) => {
      clear(unit);
      unit.formationSpacing = command.spacing;
      if (command.facing) {
        unit.aimX = command.facing.x;
        unit.aimY = command.facing.y;
      }
      const final = finals[index]!;
      const destination: Vec2 = final.slot ? takeSlot(unit, final.slot) : { x: final.x, y: final.y };
      let path = routeFor(routes[index], destination) ?? findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
      if (path.length === 0) {
        path = findPath({ x: unit.x, y: unit.y }, command.to!, ctx.covers);
      }
      unit.currentOrder = command.order;
      unit.orderIssued = true;
      unit.orderDestination = { ...command.to! };
      if (command.order === 'defend') {
        unit.orderRegionCenter = { ...command.to! };
        unit.orderRegionRadius = regionRadius;
      }
      unit.holdPosition =
        command.order === 'defend' ||
        command.order === 'ambush' ||
        command.order === 'disperse' ||
        command.order === 'recon' ||
        command.order === 'reserve';
      unit.ambush = command.order === 'ambush';
      unit.reserveMode = command.order === 'reserve';
      unit.recon = command.order === 'recon';
      unit.reconFront = undefined;
      if (path.length === 0) {
        unit.path = [];
        unit.pathIndex = 0;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        return;
      }
      unit.path = path;
      unit.pathIndex = 0;
      unit.targetX = destination.x;
      unit.targetY = destination.y;
    });
    return;
  }

  if (command.order === 'regroup' || command.order === 'protect-officer') {
    const officer = ctx.units.find(
      (unit) =>
        unit.alive &&
        !unit.incapacitated &&
        !unit.routed &&
        unit.kind === 'officer' &&
        unit.faction === units[0]?.faction,
    );
    if (!officer) {
      reject(ctx, tick, seq, 'no_officer', events);
      return;
    }
    // Regroup closes the section into a compact block on the officer (four
    // files, 2 m apart), whatever formation it marches in; protect-officer
    // keeps the formation around him.
    const centre = { x: officer.x, y: officer.y };
    const compact = troopFormationOffsets(units.length, REGROUP_FILES, REGROUP_SPACING, 0).map(
      (offset, _index, all) => {
        const rows = Math.ceil(all.length / REGROUP_FILES);
        return nearestOpenPoint(ctx, {
          x: centre.x + offset.x,
          y: centre.y + offset.y - ((rows - 1) * REGROUP_SPACING) / 2,
        });
      },
    );
    const slots =
      command.order === 'regroup'
        ? matchDestinations(units, compact)
        : formationSlots(
            units.map((unit) => ({ x: unit.x, y: unit.y })),
            centre,
            undefined,
            units[0]?.formation ?? 'line',
          );
    units.forEach((unit, index) => {
      clear(unit);
      const destination = slots[index] ?? centre;
      const path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
      unit.currentOrder = command.order;
      unit.orderIssued = true;
      unit.orderDestination = { x: officer.x, y: officer.y };
      unit.holdPosition = true;
      if (path.length > 0) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.targetX = destination.x;
        unit.targetY = destination.y;
      }
    });
    return;
  }

  if (command.order === 'pursue') {
    const target = ctx.units.find((unit) => unit.id === command.targetId);
    if (!target || !target.alive || target.routed || target.incapacitated) {
      reject(ctx, tick, seq, 'invalid_target', events);
      return;
    }
    for (const unit of units) {
      clear(unit);
      unit.targetId = target.id;
      const targetDx = target.x - unit.x;
      const targetDy = target.y - unit.y;
      const targetLength = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
      if (targetLength > 0.001) {
        unit.facingX = targetDx / targetLength;
        unit.facingY = targetDy / targetLength;
      }
      unit.targetLocked = true;
      unit.currentOrder = 'pursue';
      unit.orderIssued = true;
      const path = findPath({ x: unit.x, y: unit.y }, { x: target.x, y: target.y }, ctx.covers);
      if (path.length > 0) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.targetX = target.x;
        unit.targetY = target.y;
      }
    }
    return;
  }

  if (command.order === 'rescue') {
    const target = ctx.units.find((unit) => unit.id === command.targetId);
    if (!target || !target.alive || target.routed || !target.incapacitated) {
      reject(ctx, tick, seq, 'no_rescue_target', events);
      return;
    }
    if (
      target.beingCarriedBy !== null ||
      ctx.units.some((unit) => unit.id !== target.id && unit.rescueTargetId === target.id)
    ) {
      reject(ctx, tick, seq, 'invalid_state', events);
      return;
    }
    const rescuer =
      units.find(
        (unit) =>
          unit.id !== target.id &&
          unit.rescueTargetId === null &&
          unit.carryingId === null &&
          unit.treatTicks === 0,
      ) ?? units.find((unit) => unit.id !== target.id);
    if (!rescuer) {
      reject(ctx, tick, seq, 'no_rescue_target', events);
      return;
    }
    if (rescuer.rescueTargetId !== null || rescuer.carryingId !== null || rescuer.treatTicks > 0) {
      if (!rescuer.rescueQueue.includes(target.id)) {
        rescuer.rescueQueue.push(target.id);
      }
      return;
    }
    clear(rescuer);
    rescuer.rescueTargetId = target.id;
    rescuer.currentOrder = 'rescue';
    const path = findPath({ x: rescuer.x, y: rescuer.y }, { x: target.x, y: target.y }, ctx.covers);
    if (path.length > 0) {
      rescuer.path = path;
      rescuer.pathIndex = 0;
      rescuer.targetX = target.x;
      rescuer.targetY = target.y;
    }
    return;
  }

  reject(ctx, tick, seq, 'invalid_order', events);
}

/** An attack that turns into a pursuit follows at most this far (metres). */
export const PURSUIT_LEASH = 40;

/**
 * Attack follows a target that runs: when the enemy withdraws or flees out of
 * effective range, an attacker that is not defensive goes after him, up to
 * the pursuit leash from where he started.
 */
function followRunningTargets(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (
      unit.currentOrder !== 'attack' ||
      unit.posture === 'defensive' ||
      !unit.alive ||
      unit.incapacitated ||
      unit.targetId === null
    ) {
      continue;
    }
    const target = ctx.units.find((entry) => entry.id === unit.targetId);
    if (!target || !target.alive || target.routed || target.incapacitated) {
      continue;
    }
    const running = target.currentOrder === 'withdraw' || target.currentOrder === 'flee';
    if (!running) {
      continue;
    }
    // Out of the range soldiers actually fire at.
    if (Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2) <= ctx.combatRange * 0.85) {
      continue;
    }
    unit.currentOrder = 'pursue';
    unit.targetLocked = true;
    unit.orderIssued = true;
    unit.pursueOrigin = { x: unit.x, y: unit.y };
  }
}

export function updatePursuit(ctx: SimContext, tick: number, events: SimEvent[]): void {
  followRunningTargets(ctx);
  for (const unit of ctx.units) {
    if (unit.currentOrder !== 'pursue' || !unit.alive || unit.incapacitated) {
      continue;
    }
    const target =
      unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId);
    const stop =
      !target ||
      !target.alive ||
      target.routed ||
      target.incapacitated ||
      unit.state === 'pinned' ||
      unit.state === 'panicked' ||
      unit.fatigue >= 90 ||
      (unit.pursueOrigin != null &&
        (unit.x - unit.pursueOrigin.x) ** 2 + (unit.y - unit.pursueOrigin.y) ** 2 >
          PURSUIT_LEASH * PURSUIT_LEASH);
    if (stop) {
      unit.pursueOrigin = null;
      unit.currentOrder = 'hold';
      unit.orderIssued = false;
      unit.holdPosition = true;
      unit.targetId = null;
      unit.targetLocked = false;
      unit.path = [];
      unit.pathIndex = 0;
      events.push({ type: 'order_interrupted', tick, unitId: unit.id, order: 'pursue' });
      continue;
    }
    if (unit.path.length > 0) {
      continue;
    }
    const weapon = getWeapon(unit.weaponId);
    const range = weapon?.range ?? FIRE_RANGE;
    const distance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
    if (distance <= range * 0.85) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, { x: target.x, y: target.y }, ctx.covers);
    if (path.length > 0) {
      unit.path = path;
      unit.pathIndex = 0;
      unit.targetX = target.x;
      unit.targetY = target.y;
    }
  }
}

/** Recon report reach: 16 m, 15% further for scouts sweeping their front. */
export const RECON_SIGHT = 16 * 1.15;

export function updateRecon(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const unit of ctx.units) {
    if (
      !unit.recon ||
      unit.reconReported ||
      !unit.alive ||
      unit.incapacitated ||
      unit.routed ||
      unit.dummy ||
      unit.path.length > 0
    ) {
      continue;
    }
    const enemies = ctx.units.filter((other) => {
      if (!other.alive || other.routed || other.dummy || other.faction === unit.faction) {
        return false;
      }
      const distance = Math.sqrt((other.x - unit.x) ** 2 + (other.y - unit.y) ** 2);
      return (
        distance <= RECON_SIGHT &&
        !isLineBlocked(unit.x, unit.y, other.x, other.y, ctx.covers, ctx.sightObstacles)
      );
    });
    unit.reconReported = true;
    unit.reconContacts = enemies.length;
    unit.holdPosition = true;
    unit.path = [];
    unit.pathIndex = 0;
    events.push({
      type: 'recon_report',
      tick,
      unitId: unit.id,
      enemyIds: enemies.map((enemy) => enemy.id),
    });
  }
}

export function seekFlank(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (unit.flankCooldown > 0) {
      unit.flankCooldown -= 1;
    }
    if (
      !unit.alive ||
      unit.dummy ||
      unit.routed ||
      unit.incapacitated ||
      unit.reserveMode ||
      unit.recon ||
      unit.state === 'panicked' ||
      unit.suppress ||
      unit.holdPosition ||
      unit.currentOrder !== null ||
      unit.path.length > 0 ||
      unit.targetId === null
    ) {
      continue;
    }
    if (unit.flankCooldown > 0) {
      continue;
    }
    const target =
      unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId);
    if (!target || !target.alive || target.routed) {
      continue;
    }
    if (coverAgainst(target.x, target.y, unit.x, unit.y, target.stance, ctx.covers) < 0.4) {
      continue;
    }
    const allyPinning = ctx.units.some(
      (other) =>
        other !== unit &&
        other.alive &&
        other.faction === unit.faction &&
        other.targetId === target.id &&
        other.path.length === 0,
    );
    if (!allyPinning) {
      continue;
    }
    const reserved = ctx.units.some((other) => other.flankTargetId === target.id && other.alive);
    if (reserved) {
      continue;
    }
    if (assignFlankPath(ctx, unit, target)) {
      unit.flankTargetId = target.id;
      unit.flankCooldown = FLANK_COOLDOWN;
    } else {
      unit.flankCooldown = 60;
    }
  }
}

/** Members of the target's troop this close to it are flanked together. */
const FLANK_TROOP_RADIUS = 15;

/**
 * The point a flank goes around: the centre of the target's troop (its squad
 * members near it), not the one soldier clicked. Flanking a soldier at the end
 * of a line would otherwise put the flankers in front of the rest of it.
 */
export function flankAnchor(ctx: SimContext, target: MutableUnit): Vec2 {
  const members = ctx.units.filter(
    (unit) =>
      unit.alive &&
      !unit.routed &&
      !unit.incapacitated &&
      unit.faction === target.faction &&
      unit.squadId === target.squadId &&
      (unit.x - target.x) ** 2 + (unit.y - target.y) ** 2 <= FLANK_TROOP_RADIUS * FLANK_TROOP_RADIUS,
  );
  if (members.length === 0) {
    return { x: target.x, y: target.y };
  }
  return {
    x: members.reduce((sum, unit) => sum + unit.x, 0) / members.length,
    y: members.reduce((sum, unit) => sum + unit.y, 0) / members.length,
  };
}

export function chooseFlankSide(
  ctx: SimContext,
  units: readonly MutableUnit[],
  target: MutableUnit,
): number {
  const active = units.filter((unit) => unit.alive && !unit.dummy);
  if (active.length === 0) return 1;
  const centroid = active.reduce(
    (sum, unit) => ({ x: sum.x + unit.x / active.length, y: sum.y + unit.y / active.length }),
    { x: 0, y: 0 },
  );
  const anchor = flankAnchor(ctx, target);
  const dx = centroid.x - anchor.x;
  const dy = centroid.y - anchor.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) return 1;
  const perpendicular = { x: -dy / length, y: dx / length };
  let bestSide = 1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const side of [1, -1]) {
    const probe = {
      x: anchor.x + perpendicular.x * FLANK_RADIUS * side,
      y: anchor.y + perpendicular.y * FLANK_RADIUS * side,
    };
    const cover = coverAgainst(probe.x, probe.y, anchor.x, anchor.y, 'crouched', ctx.covers);
    const path = findPath(centroid, probe, ctx.covers);
    const score = cover * 100 + (path.length > 0 ? 20 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestSide = side;
    }
  }
  return bestSide;
}

export function assignFlankPaths(
  ctx: SimContext,
  units: readonly MutableUnit[],
  target: MutableUnit,
): void {
  const active = units.filter((unit) => unit.alive && !unit.dummy);
  if (active.length === 0) return;
  const side = chooseFlankSide(ctx, active, target);
  const centroid = active.reduce(
    (sum, unit) => ({ x: sum.x + unit.x / active.length, y: sum.y + unit.y / active.length }),
    { x: 0, y: 0 },
  );
  for (const unit of active) {
    if (assignFlankPath(ctx, unit, target, side, centroid)) {
      unit.flankTargetId = target.id;
    } else {
      unit.currentOrder = 'attack';
    }
  }
}

export function assignFlankPath(
  ctx: SimContext,
  unit: MutableUnit,
  target: MutableUnit,
  side?: number,
  origin?: Vec2,
): boolean {
  let best: Vec2[] | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  const anchor = flankAnchor(ctx, target);
  for (const candidate of flankCandidates(anchor, { x: unit.x, y: unit.y }, FLANK_RADIUS)) {
    if (isPointBlockedByCovers(candidate.x, candidate.y, ctx.covers, 0.8)) {
      continue;
    }
    if (side !== undefined && origin) {
      const cross =
        (origin.x - anchor.x) * (candidate.y - anchor.y) -
        (origin.y - anchor.y) * (candidate.x - anchor.x);
      if (Math.sign(cross) !== side) {
        continue;
      }
    }
    if (
      isLineBlocked(candidate.x, candidate.y, target.x, target.y, ctx.covers, ctx.sightObstacles)
    ) {
      continue;
    }
    const targetDistance = Math.sqrt((candidate.x - target.x) ** 2 + (candidate.y - target.y) ** 2);
    const weapon = getWeapon(unit.weaponId);
    const range = weapon?.range ?? FIRE_RANGE;
    if (targetDistance > range) {
      continue;
    }
    if (occupied(ctx, candidate.x, candidate.y, unit)) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, candidate, ctx.covers);
    if (path.length === 0) {
      continue;
    }
    const distance = Math.sqrt((unit.x - candidate.x) ** 2 + (unit.y - candidate.y) ** 2);
    const cover = coverAgainst(
      candidate.x,
      candidate.y,
      anchor.x,
      anchor.y,
      'crouched',
      ctx.covers,
    );
    const score = cover * 100 - distance * 0.1;
    if (score > bestScore) {
      best = path;
      bestScore = score;
    }
  }
  if (!best) {
    return false;
  }
  unit.path = best;
  unit.pathIndex = 0;
  unit.targetX = best[best.length - 1]?.x ?? unit.x;
  unit.targetY = best[best.length - 1]?.y ?? unit.y;
  unit.currentOrder = 'flank';
  ctx.orders.push({
    id: ctx.nextOrderId,
    unitIds: [unit.id],
    points: [{ x: unit.x, y: unit.y }, ...best],
    kind: 'flank',
  });
  ctx.nextOrderId += 1;
  return true;
}

export function beginWithdraw(ctx: SimContext, unit: MutableUnit): void {
  unit.targetId = null;
  unit.targetLocked = false;
  unit.suppress = false;
  unit.holdPosition = false;
  unit.flankTargetId = null;
  unit.currentOrder = null;
  unit.lineMove = false;
  // With no enemy left, withdraw against the soldier's facing.
  const enemy = nearestEnemy(ctx, unit) ?? {
    x: unit.x + unit.facingX * 12,
    y: unit.y + unit.facingY * 12,
  };
  let bestCover: Vec2 | null = null;
  let bestCoverScore = Number.NEGATIVE_INFINITY;
  for (const coverPoint of ctx.covers) {
    const vx = coverPoint.x - enemy.x;
    const vy = coverPoint.y - enemy.y;
    const length = Math.sqrt(vx * vx + vy * vy);
    if (length < 0.001) continue;
    const candidate = {
      x: coverPoint.x + (vx / length) * 2.0,
      y: coverPoint.y + (vy / length) * 2.0,
    };
    if (isPointBlockedByCovers(candidate.x, candidate.y, ctx.covers, 0.8)) continue;
    const cover = coverAgainst(candidate.x, candidate.y, enemy.x, enemy.y, 'crouched', ctx.covers);
    if (cover < 0.25) continue;
    const path = findPath({ x: unit.x, y: unit.y }, candidate, ctx.covers);
    if (path.length === 0) continue;
    const distance = Math.sqrt((unit.x - candidate.x) ** 2 + (unit.y - candidate.y) ** 2);
    const score = cover * 100 - distance * 0.15;
    if (score > bestCoverScore) {
      bestCover = candidate;
      bestCoverScore = score;
    }
  }
  if (bestCover) {
    const path = findPath({ x: unit.x, y: unit.y }, bestCover, ctx.covers);
    unit.targetX = bestCover.x;
    unit.targetY = bestCover.y;
    unit.path = path;
    unit.pathIndex = 0;
    unit.currentOrder = 'withdraw';
    queueUnitOrder(ctx, unit, path, 'withdraw');
    return;
  }

  const dx = unit.x - enemy.x;
  const dy = unit.y - enemy.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) {
    return;
  }
  const destination = {
    x: unit.x + (dx / length) * WITHDRAW_DISTANCE,
    y: unit.y + (dy / length) * WITHDRAW_DISTANCE,
  };
  const path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
  if (path.length === 0) {
    unit.targetX = unit.x;
    unit.targetY = unit.y;
    unit.path = [];
    unit.pathIndex = 0;
    return;
  }
  unit.targetX = destination.x;
  unit.targetY = destination.y;
  unit.path = path;
  unit.pathIndex = 0;
  unit.currentOrder = 'withdraw';
  queueUnitOrder(ctx, unit, path, 'withdraw');
}

/** Suppress moves on to squad mates of a fallen target this close to him (m). */
export const SUPPRESS_HANDOVER_RADIUS = 15;

/**
 * The next man of a broken target's squad for a suppressing section: the
 * nearest one still fighting within the hand-over radius of the old target.
 */
function suppressHandover(ctx: SimContext, old: MutableUnit): MutableUnit | null {
  let best: MutableUnit | null = null;
  let bestDistance = SUPPRESS_HANDOVER_RADIUS * SUPPRESS_HANDOVER_RADIUS;
  for (const other of ctx.units) {
    if (
      other === old ||
      !other.alive ||
      other.routed ||
      other.incapacitated ||
      other.dummy ||
      other.faction !== old.faction ||
      other.squadId !== old.squadId
    ) {
      continue;
    }
    const distance = (other.x - old.x) ** 2 + (other.y - old.y) ** 2;
    if (distance < bestDistance || (distance === bestDistance && best !== null && other.id < best.id)) {
      best = other;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Suppressing sections keep on the target's troop: when the target is down or
 * running, the whole section moves on together to the next man of his squad
 * (run before targets are chosen, while the old target is still known).
 */
export function handoverSuppress(ctx: SimContext): void {
  const handovers = new Map<number, MutableUnit | null>();
  for (const unit of ctx.units) {
    if (!unit.suppress || !unit.alive || unit.routed || unit.incapacitated || unit.targetId === null) {
      continue;
    }
    const target = ctx.units.find((entry) => entry.id === unit.targetId);
    if (!target || (target.alive && !target.routed && !target.incapacitated)) {
      continue;
    }
    if (!handovers.has(target.id)) {
      handovers.set(target.id, suppressHandover(ctx, target));
    }
    const next = handovers.get(target.id) ?? null;
    if (next) {
      unit.targetId = next.id;
      unit.targetLocked = true;
    }
  }
}

export function cleanupOrders(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (!unit.alive || unit.routed || unit.dummy || unit.incapacitated) {
      continue;
    }
    const target =
      unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId);
    if (unit.suppress && (!target || !target.alive || target.routed || target.incapacitated)) {
      unit.suppress = false;
      unit.holdPosition = false;
      unit.currentOrder = null;
      unit.targetId = null;
      unit.targetLocked = false;
    }
    if (unit.currentOrder === 'attack' && (!target || !target.alive || target.routed)) {
      unit.currentOrder = null;
      unit.targetId = null;
      unit.targetLocked = false;
    }
    if (unit.currentOrder === 'withdraw' && unit.path.length === 0) {
      unit.currentOrder = 'hold';
      unit.orderIssued = false;
      unit.holdPosition = true;
      unit.flankTargetId = null;
    } else if (
      (unit.currentOrder === 'move' || unit.currentOrder === 'flank') &&
      unit.path.length === 0 &&
      unit.boundTeam === null
    ) {
      unit.currentOrder = null;
      unit.flankTargetId = null;
      unit.holdPosition = true;
    }
    if (unit.flankTargetId !== null && unit.currentOrder !== 'flank') {
      unit.flankTargetId = null;
    }
  }
}

export function clearArrivedOrders(ctx: SimContext): void {
  ctx.orders = ctx.orders.filter((order) => {
    return !order.unitIds.every((id) => {
      const unit = ctx.units.find((entry) => entry.id === id);
      return (
        !unit ||
        !unit.alive ||
        unit.routed ||
        (Math.abs(unit.x - unit.targetX) < 0.0001 && Math.abs(unit.y - unit.targetY) < 0.0001)
      );
    });
  });
}
