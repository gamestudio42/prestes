import {
  SUPPRESSION_THRESHOLD,
  coverAgainst,
  getWeapon,
  isLineBlocked,
  eyeHeightForStance,
  isPointInVision,
} from '@prestes/shared';
import type { Outcome, SimEvent } from '@prestes/shared';
import { TARGET_HYSTERESIS, targetScore } from '../tactical';
import { CONTACT_RADIUS, AMBUSH_RADIUS, AWARENESS_RANGE, SUPPRESS_FIRE_INTERVAL, clamp } from './model';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { nearestEnemy } from './geometry';
import { woundAccuracyFactor } from './casualties';
import { markUnderFire, shooterOf } from './fire-reaction';
import { unseenFireMarker } from './vision';

/**
 * Ambush and fire on contact hold their fire beyond their radius: the shooter
 * only takes targets this close.
 */
function withinHoldRange(unit: MutableUnit, target: MutableUnit): boolean {
  const radius = unit.fireOnContact ? CONTACT_RADIUS : unit.ambush ? AMBUSH_RADIUS : Infinity;
  return (target.x - unit.x) ** 2 + (target.y - unit.y) ** 2 <= radius * radius;
}

/** A section on fire-on-contact opens fire all together. */
export function openFireOnContact(ctx: SimContext, unit: MutableUnit): void {
  for (const other of ctx.units) {
    if (other.fireOnContact && other.faction === unit.faction && other.squadId === unit.squadId) {
      other.fireOnContact = false;
    }
  }
}

export function acquireTargets(ctx: SimContext): void {
  const engaged = new Map<number, number>();
  for (const other of ctx.units) {
    if (other.alive && other.targetId !== null) {
      engaged.set(other.targetId, (engaged.get(other.targetId) ?? 0) + 1);
    }
  }
  for (const unit of ctx.units) {
    if (
      !unit.alive ||
      unit.routed ||
      unit.dummy ||
      unit.incapacitated ||
      unit.state === 'panicked'
    ) {
      continue;
    }
    if (unit.reserveMode || unit.recon) {
      continue;
    }
    if (
      (unit.currentOrder === 'pursue' || unit.currentOrder === 'attack') &&
      unit.targetId !== null
    ) {
      continue;
    }
    const current =
      unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId);
    if (unit.suppress && current?.alive) {
      continue;
    }
    if (
      current &&
      current.alive &&
      mayEngage(unit, current) &&
      visible(ctx, unit, current) &&
      withinHoldRange(unit, current)
    ) {
      if (unit.targetLocked) {
        continue;
      }
      const currentScore = targetScore(
        unit,
        {
          x: current.x,
          y: current.y,
          cover: coverAgainst(current.x, current.y, unit.x, unit.y, current.stance, ctx.covers),
          suppressed: current.suppressed,
          kind: current.kind,
        },
        engaged.get(current.id) ?? 0,
      );
      let best: MutableUnit | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const candidate of ctx.units) {
        if (
          !candidate.alive ||
          candidate.dummy ||
          candidate.routed ||
          candidate.incapacitated ||
          candidate.faction === unit.faction ||
          (unit.faction !== 'column' && candidate.faction === 'target') ||
          !mayEngage(unit, candidate)
        ) {
          continue;
        }
        if (!visible(ctx, unit, candidate)) {
          continue;
        }
        if (!withinHoldRange(unit, candidate)) {
          continue;
        }
        const score = targetScore(
          unit,
          {
            x: candidate.x,
            y: candidate.y,
            cover: coverAgainst(
              candidate.x,
              candidate.y,
              unit.x,
              unit.y,
              candidate.stance,
              ctx.covers,
            ),
            suppressed: candidate.suppressed,
            kind: candidate.kind,
          },
          engaged.get(candidate.id) ?? 0,
        );
        if (
          score > bestScore + 0.0001 ||
          (Math.abs(score - bestScore) < 0.0001 && best !== null && candidate.id < best.id)
        ) {
          best = candidate;
          bestScore = score;
        }
      }
      if (best && bestScore > currentScore + TARGET_HYSTERESIS) {
        if (unit.targetId !== null) {
          engaged.set(unit.targetId, Math.max(0, (engaged.get(unit.targetId) ?? 1) - 1));
        }
        unit.targetId = best.id;
        engaged.set(best.id, (engaged.get(best.id) ?? 0) + 1);
        unit.targetLocked = false;
      }
      continue;
    }

    unit.targetLocked = false;
    let best: MutableUnit | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of ctx.units) {
      if (
        !candidate.alive ||
        candidate.dummy ||
        candidate.routed ||
        candidate.incapacitated ||
        candidate.faction === unit.faction ||
        (unit.faction !== 'column' && candidate.faction === 'target') ||
        !mayEngage(unit, candidate)
      ) {
        continue;
      }
      if (!visible(ctx, unit, candidate)) {
        continue;
      }
      const score = targetScore(
        unit,
        {
          x: candidate.x,
          y: candidate.y,
          cover: coverAgainst(
            candidate.x,
            candidate.y,
            unit.x,
            unit.y,
            candidate.stance,
            ctx.covers,
          ),
          suppressed: candidate.suppressed,
          kind: candidate.kind,
        },
        engaged.get(candidate.id) ?? 0,
      );
      if (
        score > bestScore + 0.0001 ||
        (Math.abs(score - bestScore) < 0.0001 && best !== null && candidate.id < best.id)
      ) {
        best = candidate;
        bestScore = score;
      }
    }
    const previous = unit.targetId;
    unit.targetId = best?.id ?? null;
    if (previous !== null) {
      engaged.set(previous, Math.max(0, (engaged.get(previous) ?? 1) - 1));
    }
    if (best) {
      engaged.set(best.id, (engaged.get(best.id) ?? 0) + 1);
    }
  }
}

export function visible(ctx: SimContext, shooter: MutableUnit, target: MutableUnit): boolean {
  const range = ctx.combatRange;
  const dx = target.x - shooter.x;
  const dy = target.y - shooter.y;
  if (dx * dx + dy * dy > range * range) {
    return false;
  }
  if (!isPointInVision(shooter, target)) {
    return false;
  }
  return !isLineBlocked(
    shooter.x,
    shooter.y,
    target.x,
    target.y,
    ctx.covers,
    ctx.sightObstacles,
    eyeHeightForStance(shooter.stance),
    eyeHeightForStance(target.stance),
  );
}

export function fire(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const unit of ctx.units) {
    const weapon = getWeapon(unit.weaponId);
    if (
      !weapon ||
      !unit.alive ||
      unit.reserveMode ||
      unit.recon ||
      unit.dummy ||
      unit.routed ||
      unit.incapacitated ||
      unit.state === 'panicked' ||
      unit.state === 'pinned' ||
      unit.holdFire ||
      unit.reload > 0 ||
      unit.cooldown > 0 ||
      unit.targetId === null
    ) {
      continue;
    }
    if (unit.magazine <= 0) {
      if (unit.reserve > 0) {
        unit.reload = weapon.reloadTicks;
      }
      continue;
    }
    const objective =
      unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId);
    if (!objective || !objective.alive || objective.routed || objective.incapacitated) {
      unit.aimedAt = undefined;
      if (unit.currentOrder !== 'pursue') {
        unit.targetId = null;
      }
      continue;
    }
    let target = objective;
    if (!visible(ctx, unit, objective)) {
      if (unit.currentOrder !== 'attack') {
        if (!unit.suppress && unit.currentOrder !== 'pursue') {
          unit.targetId = null;
        }
        continue;
      }
      // An attacker keeps his objective but fires at the enemy he can see.
      const seen = nearestVisibleEnemy(ctx, unit, objective.faction);
      if (!seen) {
        unit.cooldown = LOOK_AGAIN_TICKS;
        continue;
      }
      target = seen;
    }

    const distance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
    if (!withinHoldRange(unit, target)) {
      continue;
    }
    // Sighting the enemy takes a moment; drawn per soldier, it also keeps a
    // section that sights him together from firing as one. A man already in
    // action shifts to the next target within his aimed rhythm.
    if (unit.aimedAt !== target.id) {
      unit.aimedAt = target.id;
      const inAction = unit.lastShotTick !== undefined && tick - unit.lastShotTick <= IN_ACTION_TICKS;
      if (!inAction) {
        unit.cooldown = drawTicks(ctx, weapon.reactionTicks);
        continue;
      }
    }
    const rangeFactor = Math.max(0.25, 1 - (distance / ctx.combatRange) * 0.55);
    const targetCover = coverAgainst(target.x, target.y, unit.x, unit.y, target.stance, ctx.covers);
    const moraleFactor = unit.morale < SUPPRESSION_THRESHOLD ? 0.55 : 1;
    // A man keeping his head down under fire aims worse.
    const underFireFactor = unit.state === 'suppressed' ? SUPPRESSED_AIM : 1;
    const suppressFactor = unit.suppress ? 0.7 : 1;
    // A man on the move (a rush, a run for cover) is harder to hit.
    const movingFactor = target.path.length > 0 && (target.moveSpeed ?? 0) > 1 ? MOVING_TARGET : 1;
    const chance = clamp(
      weapon.accuracy *
        rangeFactor *
        movingFactor *
        (1 - targetCover) *
        moraleFactor *
        underFireFactor *
        suppressFactor *
        woundAccuracyFactor(ctx, unit),
      0.05,
      0.95,
    );
    const hit = ctx.rng.nextFloat() < chance;

    events.push({
      type: 'shot',
      tick,
      source: unit.id,
      target: target.id,
      x: unit.x,
      y: unit.y,
      x2: target.x,
      y2: target.y,
      hit,
    });
    const marker = unseenFireMarker(ctx, unit, target, tick);
    if (marker) events.push(marker);
    markUnderFire(ctx, unit, target);
    if (unit.fireOnContact) {
      openFireOnContact(ctx, unit);
    }

    if (unit.ambush) {
      unit.ambush = false;
      unit.currentOrder = 'defend';
      unit.holdPosition = true;
    }
    unit.magazine -= 1;
    unit.lastShotTick = tick;
    // Suppressive fire is rapid until the target is pinned, then at the
    // weapon's rapid rate; aimed fire is bolt, aim, fire at a varied interval.
    unit.cooldown = unit.suppress
      ? target.state !== 'pinned'
        ? SUPPRESS_FIRE_INTERVAL
        : weapon.fireIntervalTicks
      : drawTicks(ctx, weapon.aimedIntervalTicks);
    if (unit.magazine === 0 && unit.reserve > 0) {
      unit.reload = weapon.reloadTicks;
    }

    // Cover keeps a man from being hit far more than it keeps his head up:
    // fire at a position suppresses it, and the rounds keep everyone near the
    // man fired at down too (battle-feel-3v3).
    const suppressionGain =
      (hit ? 20 : 12) *
      weapon.suppression *
      (1 - targetCover * 0.3) *
      (unit.nonLethal ? 0.05 : 1);
    target.suppression = clamp(target.suppression + suppressionGain, 0, 100);
    for (const near of ctx.units) {
      if (near === target || near.faction !== target.faction || !near.alive || near.incapacitated) continue;
      if ((near.x - target.x) ** 2 + (near.y - target.y) ** 2 > SUPPRESSION_SPREAD ** 2) continue;
      near.suppression = clamp(near.suppression + suppressionGain * 0.5, 0, 100);
    }

    if (hit) {
      const moraleDamage = Math.round((unit.suppress ? 16 : 10) * weapon.suppression);
      if (unit.nonLethal) {
        target.morale = Math.max(25, target.morale - Math.round(moraleDamage * 0.5));
        continue;
      }
      const spread = weapon.damageMax - weapon.damageMin;
      const base = unit.suppress
        ? Math.max(1, Math.round(weapon.damageMin * 0.5))
        : weapon.damageMin;
      const extra = unit.suppress ? Math.round(spread * 0.5) : spread;
      const damage = base + Math.floor(ctx.rng.nextFloat() * (extra + 1));
      // Two or three hits put a man down: whether he falls wounded or dead is
      // drawn when he goes down (a man already severely wounded dies).
      const severe = target.wound === 'severe';
      target.hp = Math.max(0, target.hp - damage);
      target.morale = Math.max(0, target.morale - moraleDamage);
      events.push({ type: 'unit_hit', tick, unitId: target.id, damage, hp: target.hp });
      if (target.hp === 0) {
        target.targetId = null;
        target.path = [];
        target.pathIndex = 0;
        if (target.dummy) {
          target.alive = false;
          events.push({ type: 'unit_died', tick, unitId: target.id });
        } else if (severe || ctx.rng.nextFloat() < FATAL_SHARE) {
          target.alive = false;
          target.routed = false;
          target.soldierState = 'dead';
          target.wound = 'fatal';
          target.currentOrder = null;
          events.push({ type: 'unit_died', tick, unitId: target.id });
        } else {
          target.incapacitated = true;
          target.soldierState = 'incapacitated';
          target.wound = 'severe';
          target.currentOrder = null;
          events.push({ type: 'unit_incapacitated', tick, unitId: target.id });
        }
        if (!target.dummy) {
          for (const ally of ctx.units) {
            if (!ally.alive || ally.faction !== target.faction || ally.id === target.id) {
              continue;
            }
            const distance = Math.sqrt((ally.x - target.x) ** 2 + (ally.y - target.y) ** 2);
            if (distance <= 12) {
              ally.morale = Math.max(0, ally.morale - 8);
              ally.suppression = clamp(ally.suppression + 8, 0, 100);
            }
          }
        }
      }
    } else {
      const moraleDamage = Math.round(
        (unit.suppress ? 4 : 2) * weapon.suppression * Math.max(0.3, 1 - targetCover * 0.5),
      );
      target.morale = Math.max(unit.nonLethal ? 25 : 0, target.morale - moraleDamage);
    }
  }
}

/** Recon sweep: degrees each way and the cycle in ticks (4 s). */
export const RECON_SWEEP_DEGREES = 50;
export const RECON_SWEEP_TICKS = 40;
/** tan(25 deg): the half-angle of the 50-degree swing. */
const RECON_SWEEP_HALF_TAN = 0.46631;

export function updateFacing(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (!unit.alive || unit.routed || unit.dummy || unit.incapacitated) {
      continue;
    }
    let dx = 0;
    let dy = 0;
    let scanning = false;
    if (unit.targetId !== null) {
      const target =
        unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId);
      if (target?.alive) {
        dx = target.x - unit.x;
        dy = target.y - unit.y;
      }
    } else if (unit.path.length > 0) {
      const point = unit.path[unit.pathIndex];
      if (point) {
        dx = point.x - unit.x;
        dy = point.y - unit.y;
      }
    } else if (shooterOf(ctx, unit)) {
      // Under fire with no target: turn toward whoever is shooting, so he can
      // see him and answer (an ordered aim comes back once the fire stops).
      const shooter = shooterOf(ctx, unit)!;
      dx = shooter.x - unit.x;
      dy = shooter.y - unit.y;
    } else if (unit.aimX !== null && unit.aimY !== null) {
      dx = unit.aimX;
      dy = unit.aimY;
    } else if (unit.currentOrder === 'defend' || unit.currentOrder === 'ambush') {
      const threat = nearestEnemy(ctx, unit);
      if (threat) {
        dx = threat.x - unit.x;
        dy = threat.y - unit.y;
      } else {
        dx = unit.targetX - unit.x;
        dy = unit.targetY - unit.y;
      }
    } else if (unit.currentOrder === null || unit.currentOrder === 'hold') {
      const threat = nearestEnemy(ctx, unit);
      if (
        threat &&
        (threat.x - unit.x) ** 2 + (threat.y - unit.y) ** 2 <= AWARENESS_RANGE * AWARENESS_RANGE
      ) {
        dx = threat.x - unit.x;
        dy = threat.y - unit.y;
        scanning = true;
      } else {
        dx = unit.targetX - unit.x;
        dy = unit.targetY - unit.y;
      }
    } else {
      dx = unit.targetX - unit.x;
      dy = unit.targetY - unit.y;
    }
    // Recon: with nothing to shoot at, the scouts sweep their front left and
    // right (order-tempo-and-facing), each in his own phase.
    if (unit.recon && unit.targetId === null && !shooterOf(ctx, unit)) {
      // The front swept is where he walks, or, halted, where he last walked.
      const walking = unit.path.length > 0 && dx * dx + dy * dy > 0.0001;
      if (walking) {
        const length = Math.sqrt(dx * dx + dy * dy);
        unit.reconFront = { x: dx / length, y: dy / length };
      } else {
        unit.reconFront ??= { x: unit.facingX, y: unit.facingY };
        dx = unit.reconFront.x;
        dy = unit.reconFront.y;
      }
      // Rotation by the half-angle tangent (no trigonometry in the simulation):
      // t eases between -tan(25 deg) and +tan(25 deg), so the front swings
      // 50 degrees each way and lingers at each end, like a man looking round.
      const phase = ((ctx.tickCount + unit.id * 7) % RECON_SWEEP_TICKS) / RECON_SWEEP_TICKS;
      const wave = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      const eased = wave * wave * (3 - 2 * wave);
      const t = RECON_SWEEP_HALF_TAN * (eased * 2 - 1);
      const cos = (1 - t * t) / (1 + t * t);
      const sin = (2 * t) / (1 + t * t);
      const baseX = dx;
      dx = baseX * cos - dy * sin;
      dy = baseX * sin + dy * cos;
    }
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0.0001) {
      if (scanning) {
        const blend = 0.08;
        const fx = unit.facingX + (dx / length - unit.facingX) * blend;
        const fy = unit.facingY + (dy / length - unit.facingY) * blend;
        const facingLength = Math.sqrt(fx * fx + fy * fy) || 1;
        unit.facingX = fx / facingLength;
        unit.facingY = fy / facingLength;
      } else {
        unit.facingX = dx / length;
        unit.facingY = dy / length;
      }
    }
  }
}

/** A soldier who fired this recently (ticks) is in action: no fresh reaction delay. */
const IN_ACTION_TICKS = 100;

/** Hit chance of a shooter who is himself suppressed. */
const SUPPRESSED_AIM = 0.6;
/** Rounds at a man suppress his mates this close to him (m), at half strength. */
const SUPPRESSION_SPREAD = 4;

/** Hit chance against a target moving faster than a walk. */
const MOVING_TARGET = 0.6;

/** Share of the soldiers put down by fire who are killed outright (the rest are incapacitated). */
const FATAL_SHARE = 0.4;

/** An attacker with his objective out of sight looks for another target this often. */
const LOOK_AGAIN_TICKS = 5;

/** The nearest fit enemy of the given faction that the unit can see. */
function nearestVisibleEnemy(ctx: SimContext, unit: MutableUnit, faction: MutableUnit['faction']): MutableUnit | null {
  let best: MutableUnit | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const other of ctx.units) {
    if (other.faction !== faction || !other.alive || other.routed || other.incapacitated) continue;
    const distance = (other.x - unit.x) ** 2 + (other.y - unit.y) ** 2;
    if (distance >= bestDistance || !visible(ctx, unit, other)) continue;
    best = other;
    bestDistance = distance;
  }
  return best;
}

/** A whole number of ticks within [min, max], from the seeded RNG. */
function drawTicks(ctx: SimContext, [min, max]: readonly [number, number]): number {
  return min + Math.floor(ctx.rng.nextFloat() * (max - min + 1));
}

export function updateOutcome(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const columnAlive = ctx.units.some(
    (unit) =>
      unit.faction === 'column' &&
      unit.alive &&
      !unit.routed &&
      // In the 3v3 an incapacitated soldier is out of the fight on both sides.
      !(ctx.scenario === 'battle3v3' && unit.incapacitated),
  );
  const legalistAlive = ctx.units.some(
    (unit) => unit.faction === 'legalist' && unit.alive && !unit.routed && !unit.incapacitated,
  );
  const next: Outcome = !columnAlive
    ? 'defeat'
    : !ctx.opposition
      ? 'playing'
      : !legalistAlive
        ? 'victory'
        : 'playing';
  if (next !== ctx.outcome) {
    ctx.outcome = next;
    events.push({ type: 'outcome', tick, outcome: next });
  }
}

/** Orders that let a soldier engage training enemies (training target discipline). */
const TRAINING_ENGAGE_ORDERS = new Set(['attack', 'suppress', 'flank', 'pursue', 'ambush']);
/** A defender engages a training enemy once it is this close to the defended area. */
const DEFEND_ENGAGE_MARGIN = 12;

/**
 * Training enemies are never picked automatically: only an explicit fire,
 * flank, pursue or ambush order lets a soldier engage them, or a defender once
 * the enemy enters the defended area.
 */
export function mayEngage(unit: MutableUnit, candidate: MutableUnit): boolean {
  if (candidate.role !== 'training-enemy') {
    return true;
  }
  // Fired upon, a soldier answers whoever shoots him (reaction to fire).
  if (unit.underFireTicks && unit.lastShooter === candidate.id) {
    return true;
  }
  if (
    unit.ambush ||
    unit.fireOnContact ||
    (unit.currentOrder !== null && TRAINING_ENGAGE_ORDERS.has(unit.currentOrder))
  ) {
    return true;
  }
  if (unit.currentOrder === 'defend') {
    const center = unit.orderRegionCenter ?? { x: unit.x, y: unit.y };
    const reach = unit.orderRegionRadius + DEFEND_ENGAGE_MARGIN;
    return (candidate.x - center.x) ** 2 + (candidate.y - center.y) ** 2 <= reach * reach;
  }
  return false;
}
