import { MAX_HP, MAX_MORALE, findPath } from '@prestes/shared';
import type { SimEvent, WoundSeverity } from '@prestes/shared';
import { RECOVERY_TICKS, RESCUE_CARRY_TICKS, RESCUE_CONTACT_DISTANCE, TREAT_TICKS } from './model';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { rescueCover } from './cover';
import { reject } from './commands';

export function incapacitate(
  ctx: SimContext,
  targetId: number,
  tick: number,
  seq: number,
  events: SimEvent[],
): void {
  if (!ctx.sandbox && !ctx.training) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  const target = ctx.units.find((unit) => unit.id === targetId);
  if (
    !target ||
    !target.alive ||
    target.dummy ||
    (target.faction !== 'column' && target.faction !== 'legalist')
  ) {
    reject(ctx, tick, seq, 'invalid_target', events);
    return;
  }
  if (target.incapacitated) {
    reject(ctx, tick, seq, 'invalid_state', events);
    return;
  }
  releaseCarry(ctx, target);
  target.hp = 0;
  target.incapacitated = true;
  target.soldierState = 'incapacitated';
  target.wound = 'severe';
  target.currentOrder = null;
  target.targetId = null;
  target.targetLocked = false;
  target.path = [];
  target.pathIndex = 0;
  events.push({ type: 'unit_incapacitated', tick, unitId: target.id });
}

export function wound(
  ctx: SimContext,
  targetId: number,
  hp: number,
  tick: number,
  seq: number,
  events: SimEvent[],
): void {
  if (!ctx.sandbox && !ctx.training) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  const target = ctx.units.find((unit) => unit.id === targetId);
  if (
    !target ||
    !target.alive ||
    target.dummy ||
    (target.faction !== 'column' && target.faction !== 'legalist')
  ) {
    reject(ctx, tick, seq, 'invalid_target', events);
    return;
  }
  if (target.incapacitated || hp < 1 || hp > 99) {
    reject(ctx, tick, seq, 'invalid_state', events);
    return;
  }
  target.hp = Math.round(hp);
  target.soldierState = 'wounded';
  target.wound = woundFor(ctx, target);
}

export function releaseCarry(ctx: SimContext, unit: MutableUnit): void {
  if (unit.carryingId !== null) {
    const carried = ctx.units.find((entry) => entry.id === unit.carryingId);
    if (carried) {
      carried.beingCarriedBy = null;
      carried.incapacitated = true;
      carried.soldierState = 'incapacitated';
    }
  }
  unit.carryingId = null;
  unit.rescueTargetId = null;
  unit.rescueQueue = [];
  unit.rescueTicks = 0;
  unit.treatTicks = 0;
}

export function startNextRescue(ctx: SimContext, rescuer: MutableUnit): void {
  while (rescuer.rescueQueue.length > 0) {
    const nextId = rescuer.rescueQueue.shift();
    if (nextId === undefined) {
      return;
    }
    const target = ctx.units.find((unit) => unit.id === nextId);
    if (!target || !target.alive || !target.incapacitated || target.beingCarriedBy !== null) {
      continue;
    }
    if (ctx.units.some((unit) => unit.id !== rescuer.id && unit.rescueTargetId === target.id)) {
      continue;
    }
    rescuer.rescueTargetId = target.id;
    rescuer.currentOrder = 'rescue';
    rescuer.path = [];
    rescuer.pathIndex = 0;
    const path = findPath({ x: rescuer.x, y: rescuer.y }, { x: target.x, y: target.y }, ctx.covers);
    if (path.length > 0) {
      rescuer.path = path;
      rescuer.pathIndex = 0;
      rescuer.targetX = target.x;
      rescuer.targetY = target.y;
    }
    return;
  }
}

export function updateRescue(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const rescuer of ctx.units) {
    if (rescuer.rescueTargetId === null) {
      continue;
    }
    if (!rescuer.alive || rescuer.incapacitated) {
      releaseCarry(ctx, rescuer);
      if (rescuer.currentOrder === 'rescue') {
        rescuer.currentOrder = null;
      }
      continue;
    }
    const target = ctx.units.find((unit) => unit.id === rescuer.rescueTargetId);
    if (!target || !target.alive || !target.incapacitated) {
      if (target && rescuer.carryingId === target.id) {
        target.beingCarriedBy = null;
      }
      rescuer.rescueTargetId = null;
      rescuer.carryingId = null;
      rescuer.treatTicks = 0;
      if (rescuer.currentOrder === 'rescue') {
        rescuer.currentOrder = null;
      }
      startNextRescue(ctx, rescuer);
      continue;
    }
    if (rescuer.carryingId === target.id) {
      target.x = rescuer.x;
      target.y = rescuer.y;
      if (rescuer.rescueTicks > 0) {
        rescuer.rescueTicks -= 1;
      } else {
        rescuer.carryingId = null;
        rescuer.treatTicks = TREAT_TICKS;
        rescuer.path = [];
        rescuer.pathIndex = 0;
        target.beingCarriedBy = null;
        target.soldierState = 'treating';
      }
      continue;
    }
    if (rescuer.treatTicks > 0) {
      target.x = rescuer.x;
      target.y = rescuer.y;
      rescuer.treatTicks -= 1;
      if (rescuer.treatTicks === 0) {
        target.beingCarriedBy = null;
        target.incapacitated = false;
        target.alive = false;
        target.routed = true;
        target.soldierState = 'recovering';
        target.recoveryTicks = RECOVERY_TICKS;
        target.path = [];
        target.pathIndex = 0;
        target.currentOrder = null;
        rescuer.rescueTargetId = null;
        rescuer.currentOrder = null;
        rescuer.morale = Math.min(MAX_MORALE, rescuer.morale + 10);
        events.push({ type: 'unit_evacuated', tick, unitId: target.id });
        startNextRescue(ctx, rescuer);
      }
      continue;
    }
    const distance = Math.sqrt((target.x - rescuer.x) ** 2 + (target.y - rescuer.y) ** 2);
    if (distance <= RESCUE_CONTACT_DISTANCE) {
      rescuer.carryingId = target.id;
      rescuer.rescueTicks = RESCUE_CARRY_TICKS;
      rescuer.path = [];
      rescuer.pathIndex = 0;
      const cover = rescueCover(ctx, rescuer);
      if (cover) {
        const path = findPath({ x: rescuer.x, y: rescuer.y }, cover, ctx.covers);
        if (path.length > 0) {
          rescuer.path = path;
          rescuer.pathIndex = 0;
          rescuer.targetX = cover.x;
          rescuer.targetY = cover.y;
        }
      }
      target.beingCarriedBy = rescuer.id;
      target.path = [];
      target.pathIndex = 0;
      target.soldierState = 'being-carried';
      continue;
    }
    if (rescuer.path.length === 0) {
      const path = findPath(
        { x: rescuer.x, y: rescuer.y },
        { x: target.x, y: target.y },
        ctx.covers,
      );
      if (path.length > 0) {
        rescuer.path = path;
        rescuer.pathIndex = 0;
        rescuer.targetX = target.x;
        rescuer.targetY = target.y;
      }
    }
  }
}

export function updateRecovery(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const unit of ctx.units) {
    if (!unit.alive && unit.soldierState === 'recovering' && unit.recoveryTicks > 0) {
      unit.recoveryTicks -= 1;
      if (unit.recoveryTicks === 0) {
        unit.alive = true;
        unit.routed = false;
        unit.incapacitated = false;
        unit.hp = MAX_HP;
        unit.morale = MAX_MORALE;
        unit.soldierState = 'idle';
        unit.wound = 'none';
        events.push({ type: 'unit_recovered', tick, unitId: unit.id });
      }
    }
  }
}

export function woundFor(ctx: SimContext, unit: MutableUnit): WoundSeverity {
  if (unit.soldierState === 'recovering' || unit.incapacitated) {
    return 'severe';
  }
  if (!unit.alive) {
    return 'fatal';
  }
  if (unit.hp >= 100) {
    return 'none';
  }
  if (unit.hp >= 60) {
    return 'light';
  }
  if (unit.hp > 0) {
    return 'moderate';
  }
  return 'severe';
}

export function woundSpeedFactor(ctx: SimContext, unit: MutableUnit): number {
  return unit.wound === 'light' ? 0.9 : unit.wound === 'moderate' ? 0.75 : 1;
}

export function woundAccuracyFactor(ctx: SimContext, unit: MutableUnit): number {
  return unit.wound === 'light' ? 0.9 : unit.wound === 'moderate' ? 0.75 : 1;
}
