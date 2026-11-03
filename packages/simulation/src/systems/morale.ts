import { MAP_BOUNDS, MAX_MORALE, moraleStateFor, findPath } from '@prestes/shared';
import type { SimEvent, Vec2 } from '@prestes/shared';
import { SUPPRESSION_COOLDOWN, clamp } from './model';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { occupied, nearestEnemy } from './geometry';
import { queueUnitOrder } from './movement';
import { woundFor, releaseCarry } from './casualties';

export function applyOfficerAura(ctx: SimContext): void {
  for (const officer of ctx.units) {
    if (
      !officer.alive ||
      officer.dummy ||
      officer.routed ||
      officer.incapacitated ||
      officer.kind !== 'officer'
    ) {
      continue;
    }
    for (const ally of ctx.units) {
      if (
        ally === officer ||
        !ally.alive ||
        ally.dummy ||
        ally.routed ||
        ally.faction !== officer.faction
      ) {
        continue;
      }
      if ((ally.x - officer.x) ** 2 + (ally.y - officer.y) ** 2 <= 12 * 12) {
        ally.morale = Math.min(MAX_MORALE, ally.morale + 0.25);
      }
    }
  }
}

export function updateOfficerLoss(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const officers = ctx.units.filter(
    (unit) => unit.alive && !unit.incapacitated && !unit.routed && unit.kind === 'officer',
  );
  for (const unit of ctx.units) {
    if (unit.currentOrder !== 'protect-officer' || !unit.alive || unit.incapacitated) {
      continue;
    }
    if (officers.some((officer) => officer.faction === unit.faction)) {
      continue;
    }
    unit.currentOrder = 'hold';
    unit.orderIssued = false;
    unit.holdPosition = true;
    unit.path = [];
    unit.pathIndex = 0;
    events.push({
      type: 'order_interrupted',
      tick,
      unitId: unit.id,
      order: 'protect-officer',
    });
  }
}

export function updateSoldierStates(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (unit.dummy) {
      continue;
    }
    unit.wound = woundFor(ctx, unit);
    if (!unit.alive) {
      if (unit.soldierState === 'recovering') {
        continue;
      }
      unit.soldierState = unit.routed ? 'evacuating' : 'dead';
      continue;
    }
    if (unit.beingCarriedBy !== null) {
      unit.soldierState = 'being-carried';
    } else if (unit.carryingId !== null || unit.rescueTargetId !== null) {
      unit.soldierState = unit.treatTicks > 0 ? 'treating' : 'rescuing';
    } else if (unit.incapacitated) {
      unit.soldierState = 'incapacitated';
    } else if (unit.currentOrder === 'flank' && unit.path.length > 0) {
      unit.soldierState = 'flanking';
    } else if (unit.currentOrder === 'withdraw' && unit.path.length > 0) {
      unit.soldierState = 'retreating';
    } else if (unit.currentOrder === 'regroup' && unit.path.length > 0) {
      unit.soldierState = 'rallying';
    } else if (unit.path.length > 0) {
      unit.soldierState = 'moving';
    } else if (unit.targetId !== null) {
      unit.soldierState = 'attacking';
    } else if (unit.hp < 35) {
      unit.soldierState = 'wounded';
    } else if (unit.cover >= 0.25) {
      unit.soldierState = 'in-cover';
    } else {
      unit.soldierState = 'idle';
    }
  }
}

export function updateCohesion(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (
      !unit.alive ||
      unit.dummy ||
      unit.routed ||
      unit.incapacitated ||
      unit.state === 'panicked'
    ) {
      continue;
    }
    const peers = ctx.units.filter(
      (other) =>
        other.alive &&
        !other.dummy &&
        !other.routed &&
        other.faction === unit.faction &&
        other.squadId === unit.squadId,
    );
    if (peers.length <= 1) {
      unit.cohesion = Math.min(100, unit.cohesion + 0.5);
      continue;
    }
    const centroid = peers.reduce(
      (sum, other) => ({ x: sum.x + other.x / peers.length, y: sum.y + other.y / peers.length }),
      { x: 0, y: 0 },
    );
    const distance = Math.sqrt((unit.x - centroid.x) ** 2 + (unit.y - centroid.y) ** 2);
    const officerNear = ctx.units.some(
      (other) =>
        other !== unit &&
        other.alive &&
        !other.routed &&
        other.kind === 'officer' &&
        other.faction === unit.faction &&
        (other.x - unit.x) ** 2 + (other.y - unit.y) ** 2 <= 12 * 12,
    );
    const target = clamp(100 - Math.max(0, distance - 3) * 10 + (officerNear ? 15 : 0), 0, 100);
    unit.cohesion += (target - unit.cohesion) * 0.12;
  }
}

export function updateMoraleStates(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (!unit.alive || unit.dummy) {
      continue;
    }
    if (unit.routed) {
      unit.state = 'routed';
      unit.suppressed = false;
      continue;
    }
    if (unit.state === 'panicked') {
      unit.suppressed = true;
      continue;
    }
    if (unit.suppression >= 65) {
      unit.morale = Math.max(0, unit.morale - 0.5);
    }
    const next = moraleStateFor(unit.morale, unit.suppression);
    if (next === 'panicked') {
      unit.panicTicks = 5;
    }
    if (next === 'pinned') {
      unit.stance = unit.cover >= 0.25 ? 'crouched' : 'prone';
    } else if (unit.state === 'pinned') {
      unit.stanceLocked = false;
    }
    unit.state = next;
    unit.suppressed = next !== 'steady';
  }
}

export function fleePanicked(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (!unit.alive || unit.routed || unit.state !== 'panicked') {
      continue;
    }
    releaseCarry(ctx, unit);
    unit.orderDestination = null;
    unit.orderIssued = false;
    unit.orderRegionCenter = null;
    unit.orderRegionRadius = 0;
    unit.targetId = null;
    unit.targetLocked = false;
    unit.suppress = false;
    unit.holdPosition = false;
    unit.currentOrder = 'flee';
    if (unit.panicTicks > 0) {
      unit.stance = 'prone';
      unit.panicTicks -= 1;
      unit.path = [];
      unit.pathIndex = 0;
      continue;
    }
    unit.stance = 'standing';
    if (unit.path.length > 0) {
      continue;
    }
    const edge = nearestEdge(ctx, unit);
    if (!edge) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, edge, ctx.covers);
    if (path.length === 0) {
      continue;
    }
    unit.targetX = edge.x;
    unit.targetY = edge.y;
    unit.path = path;
    unit.pathIndex = 0;
    queueUnitOrder(ctx, unit, path, 'withdraw');
  }
}

export function nearestEdge(ctx: SimContext, unit: MutableUnit): Vec2 | null {
  const candidates: Vec2[] = [
    { x: MAP_BOUNDS.minX, y: unit.y },
    { x: MAP_BOUNDS.maxX, y: unit.y },
    { x: unit.x, y: MAP_BOUNDS.minY },
    { x: unit.x, y: MAP_BOUNDS.maxY },
  ];
  let best: Vec2 | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = (candidate.x - unit.x) ** 2 + (candidate.y - unit.y) ** 2;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function checkRouted(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const unit of ctx.units) {
    if (!unit.alive || unit.routed || unit.state !== 'panicked') {
      continue;
    }
    const atEdge =
      unit.x <= MAP_BOUNDS.minX + 0.01 ||
      unit.x >= MAP_BOUNDS.maxX - 0.01 ||
      unit.y <= MAP_BOUNDS.minY + 0.01 ||
      unit.y >= MAP_BOUNDS.maxY - 0.01;
    if (!atEdge) {
      continue;
    }
    unit.routed = true;
    unit.state = 'routed';
    unit.suppressed = false;
    unit.path = [];
    unit.pathIndex = 0;
    unit.targetId = null;
    unit.currentOrder = null;
    events.push({ type: 'unit_routed', tick, unitId: unit.id });
  }
}

export function reactToSuppression(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (unit.suppressionCooldown > 0) {
      unit.suppressionCooldown -= 1;
    }
    const pinned = unit.state === 'pinned';
    if (
      !unit.alive ||
      unit.dummy ||
      unit.routed ||
      unit.incapacitated ||
      unit.reserveMode ||
      unit.recon ||
      unit.state === 'panicked' ||
      (unit.state !== 'suppressed' && !pinned) ||
      (!pinned && (unit.suppress || unit.holdPosition || unit.path.length > 0)) ||
      (!pinned &&
        (unit.currentOrder === 'move' ||
          unit.currentOrder === 'withdraw' ||
          unit.currentOrder === 'flank'))
    ) {
      continue;
    }
    if (unit.suppressionCooldown > 0) {
      continue;
    }
    if (unit.cover >= 0.25) {
      if (pinned || !unit.stanceLocked) {
        unit.stance = 'crouched';
      }
      continue;
    }

    const target =
      (unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId)) ??
      nearestEnemy(ctx, unit);
    if (!target || !target.alive || target.routed) {
      continue;
    }
    const currentDistance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
    let best: Vec2 | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const point of ctx.covers) {
      const distance = Math.sqrt((point.x - unit.x) ** 2 + (point.y - unit.y) ** 2);
      if (distance > 12) {
        continue;
      }
      const targetDistance = Math.sqrt((point.x - target.x) ** 2 + (point.y - target.y) ** 2);
      if (targetDistance < currentDistance + 3) {
        continue;
      }
      if (occupied(ctx, point.x, point.y, unit)) {
        continue;
      }
      if (distance < bestDistance) {
        best = { x: point.x, y: point.y };
        bestDistance = distance;
      }
    }

    if (best) {
      const path = findPath({ x: unit.x, y: unit.y }, best, ctx.covers);
      if (path.length > 0) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.targetX = best.x;
        unit.targetY = best.y;
        if (pinned) {
          unit.stance = 'crouched';
        } else {
          unit.currentOrder = 'withdraw';
          queueUnitOrder(ctx, unit, path, 'withdraw');
        }
      }
      unit.suppressionCooldown = SUPPRESSION_COOLDOWN;
      continue;
    }

    if (pinned || !unit.stanceLocked) {
      unit.stance = unit.stance === 'standing' ? 'crouched' : 'prone';
    }
    unit.targetX = unit.x;
    unit.targetY = unit.y;
    unit.suppressionCooldown = SUPPRESSION_COOLDOWN;
  }
}
