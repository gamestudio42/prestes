import { armyOfUnit, IN_COVER, MAP_BOUNDS, MAX_MORALE, moraleStateFor, findPath, unitValues } from '@prestes/shared';
import type { SimEvent, Vec2 } from '@prestes/shared';
import { SUPPRESSION_COOLDOWN, clamp } from './model';
import type { MutableUnit } from './model';
import { moraleLossFactor, rallyFactor, type SimContext } from './context';
import { occupied, nearestEnemy } from './geometry';
import { queueUnitOrder } from './movement';
import { woundFor, releaseCarry } from './casualties';

const OFFICER_LOSS_RADIUS = 25;
const OFFICER_LOSS_MORALE = 20;
const OFFICER_LOSS_COHESION = 15;

/** Out of fire a soldier steadies on his own, up to this morale; an officer lifts him past it. */
export const SELF_RALLY_CAP = 60;
/** Morale regained per tick out of fire (0.3 a second). */
const SELF_RALLY_RATE = 0.03;
/** Below this suppression a soldier counts as out of fire. */
const OUT_OF_FIRE = 10;

/** add-historical-commander D3: the field commander's radius (m), the rally cap inside it and its steadying per tick. */
export const COMMAND_RADIUS = 30;
export const COMMAND_RALLY_CAP = 75;
const COMMAND_RATE = 0.1;
/** add-historical-commander D4: losing the figure shakes the column this far (m), by this much, once. */
export const FIGURE_LOSS_RADIUS = 40;
export const FIGURE_LOSS_MORALE = 25;

/** The field commander, fit to command: alive, on his feet, not panicked, not routed. */
function fitFigures(ctx: SimContext): MutableUnit[] {
  return ctx.units.filter((unit) => unit.figure && unit.alive && !unit.dummy && !unit.incapacitated && !unit.routed && unit.state !== 'panicked');
}

function underCommand(figures: readonly MutableUnit[], unit: MutableUnit): boolean {
  return figures.some((figure) => figure.faction === unit.faction && (unit.x - figure.x) ** 2 + (unit.y - figure.y) ** 2 <= COMMAND_RADIUS ** 2);
}

/**
 * A soldier no longer under fire slowly regains his nerve (battle-feel-3v3):
 * without it a man pinned by low morale stayed pinned with no one shooting.
 * Within the field commander's radius he steadies further (add-historical-commander).
 */
export function selfRally(ctx: SimContext): void {
  const figures = fitFigures(ctx);
  for (const unit of ctx.units) {
    if (!unit.alive || unit.dummy || unit.routed || unit.incapacitated) continue;
    const cap = figures.length > 0 && underCommand(figures, unit) ? COMMAND_RALLY_CAP : SELF_RALLY_CAP;
    if (unit.suppression < OUT_OF_FIRE && unit.morale < cap) {
      unit.morale = Math.min(cap, unit.morale + SELF_RALLY_RATE * rallyFactor(ctx, unit));
    }
  }
}

/**
 * add-historical-commander D3: the fit figure steadies every fit man of his
 * side within 30 m, of any of its armies, up to 75 (never past it by itself).
 */
export function applyCommandRadius(ctx: SimContext): void {
  const figures = fitFigures(ctx);
  if (figures.length === 0) return;
  for (const ally of ctx.units) {
    if (!ally.alive || ally.dummy || ally.routed || ally.incapacitated || ally.morale >= COMMAND_RALLY_CAP) continue;
    if (underCommand(figures, ally)) ally.morale = Math.min(COMMAND_RALLY_CAP, ally.morale + COMMAND_RATE * rallyFactor(ctx, ally));
  }
}

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
        ally.faction !== officer.faction ||
        // faction-armies 3.2: an officer steadies only the men of his own army.
        armyOfUnit(ally) !== armyOfUnit(officer)
      ) {
        continue;
      }
      if ((ally.x - officer.x) ** 2 + (ally.y - officer.y) ** 2 <= 12 * 12) {
        ally.morale = Math.min(MAX_MORALE, ally.morale + 0.25 * rallyFactor(ctx, ally));
      }
    }
  }
}

export function updateOfficerLoss(ctx: SimContext, tick: number, events: SimEvent[]): void {
  // A fallen officer (dead or incapacitated) shakes the soldiers around him once
  // per absence; recovery re-arms the consequence.
  for (const officer of ctx.units) {
    if (officer.kind !== 'officer' || officer.dummy) {
      continue;
    }
    const outOfAction = !officer.alive || officer.incapacitated;
    if (!outOfAction) {
      officer.officerLossApplied = false;
      continue;
    }
    if (officer.officerLossApplied) {
      continue;
    }
    officer.officerLossApplied = true;
    // add-historical-commander D4: the figure's loss replaces the ordinary one, heavier and wider.
    const radius = officer.figure ? FIGURE_LOSS_RADIUS : OFFICER_LOSS_RADIUS;
    const loss = officer.figure ? FIGURE_LOSS_MORALE : OFFICER_LOSS_MORALE;
    if (officer.figure) {
      events.push({ type: 'commander_down', tick, unitId: officer.id, cause: officer.alive ? 'incapacitated' : 'killed' });
    }
    for (const ally of ctx.units) {
      if (ally === officer || !ally.alive || ally.dummy || ally.faction !== officer.faction) {
        continue;
      }
      if ((ally.x - officer.x) ** 2 + (ally.y - officer.y) ** 2 <= radius ** 2) {
        ally.morale = Math.max(0, ally.morale - Math.round(loss * moraleLossFactor(ctx, ally)));
      }
      if (ally.squadId === officer.squadId) {
        ally.cohesion = Math.max(0, ally.cohesion - OFFICER_LOSS_COHESION);
      }
    }
  }
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
    } else if (unit.cover >= IN_COVER) {
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
        !other.incapacitated &&
        other.kind === 'officer' &&
        other.faction === unit.faction &&
        armyOfUnit(other) === armyOfUnit(unit) &&
        (other.x - unit.x) ** 2 + (other.y - unit.y) ** 2 <= 12 * 12,
    );
    // faction-armies 3.1: a loose army never closes up beyond its own cohesion.
    const target = clamp(100 - Math.max(0, distance - 3) * 10 + (officerNear ? 15 : 0), 0, unitValues(unit).cohesion);
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
      unit.stance = unit.cover >= IN_COVER ? 'crouched' : 'prone';
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
    if (unit.cover >= IN_COVER) {
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
