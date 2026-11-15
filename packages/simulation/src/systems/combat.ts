import {
  SUPPRESSION_THRESHOLD,
  coverAgainst,
  getWeapon,
  isLineBlocked,
  eyeHeightForStance,
  isPointInVision,
  suppressionDivisor,
  unitValues,
} from '@prestes/shared';
import type { DecidedBy, Outcome, SimEvent } from '@prestes/shared';
import { TARGET_HYSTERESIS, targetScore } from '../tactical';
import { CONCEALED_CONTACT_RADIUS, CONTACT_RADIUS, AMBUSH_RADIUS, AWARENESS_RANGE, SUPPRESS_FIRE_INTERVAL, clamp } from './model';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { ALL_HELD_TICKS, objectiveValues } from './objectives';
import { nearestEnemy, nearestKnownEnemyAt } from './geometry';
import { woundAccuracyFactor } from './casualties';
import { markUnderFire, shooterOf } from './fire-reaction';
import { VISION_RANGE, unseenFireMarker } from './vision';
import { hiddenByVegetation, revealShooter } from './concealment';
import { drawBelt, feedingGun, gunReady } from './machine-gun';
import { clampFacingToPort, facingDefender, garrisonCover, outsidePortArc } from './garrison';
import {
  AREA_FIRE_ACCURACY,
  AREA_FIRE_MARGIN,
  AREA_FIRE_SUPPRESSION,
  AREA_SELF_DEFENCE,
  endAreaFire,
  updateAreaFire,
} from './area-fire';

/**
 * Ambush and fire on contact hold their fire beyond their radius: the shooter
 * only takes targets this close.
 */
function withinHoldRange(unit: MutableUnit, target: MutableUnit): boolean {
  const contact = unit.autoContact === 'armed' ? CONCEALED_CONTACT_RADIUS : CONTACT_RADIUS;
  const radius = unit.fireOnContact ? contact : unit.ambush ? AMBUSH_RADIUS : Infinity;
  return (target.x - unit.x) ** 2 + (target.y - unit.y) ** 2 <= radius * radius;
}

/** A section on fire-on-contact opens fire all together. */
export function openFireOnContact(ctx: SimContext, unit: MutableUnit): void {
  for (const other of ctx.units) {
    if (other.fireOnContact && other.faction === unit.faction && other.squadId === unit.squadId) {
      other.fireOnContact = false;
      if (other.autoContact === 'armed') other.autoContact = 'spent';
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
    // scrub-concealment-and-area-fire D6: a man firing into an area picks no
    // target, unless an enemy shows inside it or comes within 15 m of him.
    if (unit.areaFire !== undefined) {
      const sighted = areaFireSighting(ctx, unit);
      if (!sighted) continue;
      endAreaFire(unit);
      unit.targetId = sighted.id;
      unit.targetLocked = false;
      engaged.set(sighted.id, (engaged.get(sighted.id) ?? 0) + 1);
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
        currentEngaged(unit, engaged.get(current.id) ?? 0),
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

/**
 * machine-gun-fire-feedback 2.2: the count of men on a gunner's current
 * target leaves him out. Counting himself (25 points, more than the
 * hysteresis) made a lone gunner swap between like targets every tick, and
 * each swap drew a new reaction, so the gun hardly fired. Rifles keep the old
 * count until the general fix is decided (it moves every golden).
 */
function currentEngaged(unit: MutableUnit, count: number): number {
  return getWeapon(unit.weaponId)?.fire === 'belt' ? Math.max(0, count - 1) : count;
}

/**
 * pre-battle-roster 4.1: how far a man can engage, his weapon's range within
 * the battle's combat range (seeing is not shooting: vision keeps its own).
 * The Mauser's range is the 3v3's combat range, so riflemen are unchanged.
 */
export function engageRange(ctx: SimContext, shooter: MutableUnit): number {
  const weapon = getWeapon(shooter.weaponId);
  if (!weapon) return ctx.combatRange;
  // machine-gun-fire-feedback 2.1: the crew-served gun reaches its own range.
  return weapon.fire === 'belt' ? weapon.range : Math.min(ctx.combatRange, weapon.range);
}

export function visible(ctx: SimContext, shooter: MutableUnit, target: MutableUnit): boolean {
  const range = engageRange(ctx, shooter);
  const dx = target.x - shooter.x;
  const dy = target.y - shooter.y;
  if (dx * dx + dy * dy > range * range) {
    return false;
  }
  if (!isPointInVision(shooter, target)) {
    return false;
  }
  // A man at a window fires only out of it, within its arc.
  if (outsidePortArc(ctx, shooter, target.x, target.y)) {
    return false;
  }
  if (!beyondSightSpotted(ctx, shooter, target, dx * dx + dy * dy)) {
    return false;
  }
  return !isLineBlocked(
    shooter.x,
    shooter.y,
    target.x,
    target.y,
    ctx.covers,
    ctx.sightObstacles,
    eyeHeightForStance(shooter.stance) + (shooter.elevation ?? 0),
    eyeHeightForStance(target.stance) + (target.elevation ?? 0),
    shooter.inTower,
    target.inTower,
  ) && !hiddenByVegetation(ctx, shooter, target);
}

/**
 * machine-gun-fire-feedback 2.1: beyond a man's sight (a gun firing to its
 * 140 m) under fog of war, the target must be one his side sees; the gunner
 * still needs his own line of fire.
 */
function beyondSightSpotted(ctx: SimContext, shooter: MutableUnit, target: MutableUnit, squared: number): boolean {
  if (squared <= VISION_RANGE * VISION_RANGE || !ctx.fog) return true;
  if (shooter.faction !== 'column' && shooter.faction !== 'legalist') return true;
  return ctx.vision.seen[shooter.faction].has(target.id);
}

export function fire(ctx: SimContext, tick: number, events: SimEvent[]): void {
  updateAreaFire(ctx, tick);
  for (const unit of ctx.units) {
    const weapon = getWeapon(unit.weaponId);
    // scrub-concealment-and-area-fire D7: area fire is an explicit order, fired under any fire control.
    const area = unit.areaFire !== undefined && unit.targetId === null;
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
      (unit.holdFire && !area) ||
      unit.reload > 0 ||
      unit.cooldown > 0 ||
      (unit.targetId === null && !area) ||
      unit.ferryId !== undefined ||
      // pre-battle-roster 4.3: a gun not yet set does not fire; its loaders feed it.
      !gunReady(unit) ||
      feedingGun(ctx, unit, tick)
    ) {
      continue;
    }
    if (unit.magazine <= 0) {
      if (unit.burstLeft !== undefined) unit.burstLeft = 0;
      drawBelt(ctx, unit);
      if (unit.reserve > 0) {
        unit.reload = weapon.reloadTicks;
      }
      continue;
    }
    if (area) {
      areaFireRound(ctx, unit, weapon, tick, events);
      continue;
    }
    const aimedFor =
      unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId);
    // garrison-and-assault D4: fire at a position meets the man at the port facing the shooter.
    const objective = aimedFor && aimedFor.alive && !aimedFor.incapacitated ? facingDefender(ctx, aimedFor, unit) : aimedFor;
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
    // section that sights him together from firing as one. A man still in his
    // aimed rhythm shifts to the next target at once; one who has waited
    // longer (a pursuit that lost its man) sights afresh, or a whole section
    // waiting on the same enemy would fire as one when he shows.
    if (unit.aimedAt !== target.id) {
      unit.aimedAt = target.id;
      const inAction = unit.lastShotTick !== undefined && tick - unit.lastShotTick <= weapon.aimedIntervalTicks[1];
      if (!inAction) {
        unit.cooldown = drawTicks(ctx, weapon.reactionTicks);
        continue;
      }
    }
    const rangeFactor = Math.max(0.25, 1 - (distance / engageRange(ctx, unit)) * 0.55);
    // pre-battle-roster 4.2: an automatic weapon fires bursts. Its length is
    // drawn when it starts; each round is its own, less accurate, hit roll.
    const burst = weapon.fire !== 'aimed' ? weapon.burst : undefined;
    const burstStart = burst !== undefined && (unit.burstLeft ?? 0) <= 0;
    if (burstStart) {
      unit.burstLeft = burst.rounds[0] + Math.floor(ctx.rng.nextFloat() * (burst.rounds[1] - burst.rounds[0] + 1));
    }
    // garrison-and-assault D4: a man at a port has the position's cover on top of his stance's.
    const targetCover = garrisonCover(ctx, target) ?? coverAgainst(target.x, target.y, unit.x, unit.y, target.stance, ctx.covers);
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
        woundAccuracyFactor(ctx, unit) *
        // faction-armies 3.1: his army's and section's marksmanship.
        unitValues(unit).accuracy *
        (burst ? burst.hitFactor : 1),
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
      ...(burst ? { burstStart } : {}),
    });
    const marker = unseenFireMarker(ctx, unit, target, tick);
    if (marker) events.push(marker);
    revealShooter(ctx, unit, tick);
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
    if (burst) {
      unit.burstLeft = (unit.burstLeft ?? 1) - 1;
      if (unit.magazine === 0) unit.burstLeft = 0;
      // The next round of the burst follows at once; after it, the weapon's rhythm.
      if (unit.burstLeft > 0) unit.cooldown = burst.gapTicks;
    }
    if (unit.magazine === 0) drawBelt(ctx, unit);
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
    // faction-armies 3.1: some men keep their heads up longer (the jagunços in cover).
    target.suppression = clamp(target.suppression + suppressionGain / suppressionDivisor(target), 0, 100);
    for (const near of ctx.units) {
      if (near === target || near.faction !== target.faction || !near.alive || near.incapacitated) continue;
      if ((near.x - target.x) ** 2 + (near.y - target.y) ** 2 > SUPPRESSION_SPREAD ** 2) continue;
      near.suppression = clamp(near.suppression + (suppressionGain * 0.5) / suppressionDivisor(near), 0, 100);
    }

    if (hit) {
      applyHit(ctx, unit, target, weapon, unit.suppress, tick, events);
    } else {
      applyMissMorale(unit, target, weapon, targetCover, unit.suppress);
    }
  }
}

type Weapon = NonNullable<ReturnType<typeof getWeapon>>;

/**
 * A round that hits: damage, morale, and the man going down. `reduced` is
 * suppressive or area fire (half damage, more morale lost).
 */
function applyHit(
  ctx: SimContext,
  unit: MutableUnit,
  target: MutableUnit,
  weapon: Weapon,
  reduced: boolean,
  tick: number,
  events: SimEvent[],
): void {
  // faction-armies 3.1: morale falls at the rate his army and section define.
  const moraleDamage = Math.round((reduced ? 16 : 10) * weapon.suppression * unitValues(target).moraleLoss);
  if (unit.nonLethal) {
    target.morale = Math.max(25, target.morale - Math.round(moraleDamage * 0.5));
    return;
  }
  const spread = weapon.damageMax - weapon.damageMin;
  const base = reduced
    ? Math.max(1, Math.round(weapon.damageMin * 0.5))
    : weapon.damageMin;
  const extra = reduced ? Math.round(spread * 0.5) : spread;
  const damage = base + Math.floor(ctx.rng.nextFloat() * (extra + 1));
  applyDamage(ctx, target, damage, moraleDamage, tick, events);
}

/**
 * Damage and morale on a man, and his going down (add-artillery-bombardment
 * 2.1: shared by rifle hits and shell bursts). Two or three rifle hits put a
 * man down: whether he falls wounded or dead is drawn when he goes down (a
 * man already severely wounded dies).
 */
export function applyDamage(ctx: SimContext, target: MutableUnit, damage: number, moraleDamage: number, tick: number, events: SimEvent[]): void {
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
          ally.morale = Math.max(0, ally.morale - Math.round(8 * unitValues(ally).moraleLoss));
          ally.suppression = clamp(ally.suppression + 8 / suppressionDivisor(ally), 0, 100);
        }
      }
    }
  }
}

/** The morale a round that misses takes from the man it was fired at. */
function applyMissMorale(unit: MutableUnit, target: MutableUnit, weapon: Weapon, targetCover: number, reduced: boolean): void {
  const moraleDamage = Math.round(
    (reduced ? 4 : 2) * weapon.suppression * Math.max(0.3, 1 - targetCover * 0.5) * unitValues(target).moraleLoss,
  );
  target.morale = Math.max(unit.nonLethal ? 25 : 0, target.morale - moraleDamage);
}

/** scrub-concealment-and-area-fire: an enemy a man's area fire can reach. */
function areaEnemy(unit: MutableUnit, other: MutableUnit): boolean {
  return (
    other.alive &&
    !other.incapacitated &&
    !other.routed &&
    !other.dummy &&
    other.faction !== unit.faction &&
    other.faction !== 'civilian' &&
    (unit.faction === 'column' || other.faction !== 'target')
  );
}

/** Rounds of area fire are aimed this high above the ground (m), for the line of fire. */
const AREA_AIM_HEIGHT = 1;
/** Points of the disc a shooter tries for a line before looking again. */
const AREA_AIM_TRIES = 3;

/**
 * scrub-concealment-and-area-fire D6: the nearest enemy a man firing into an
 * area sees inside its disc, or within AREA_SELF_DEFENCE of himself.
 */
function areaFireSighting(ctx: SimContext, unit: MutableUnit): MutableUnit | null {
  const disc = unit.areaFire!;
  let best: MutableUnit | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const other of ctx.units) {
    if (!areaEnemy(unit, other)) continue;
    const distance = (other.x - unit.x) ** 2 + (other.y - unit.y) ** 2;
    const inDisc = (other.x - disc.x) ** 2 + (other.y - disc.y) ** 2 <= disc.radius * disc.radius;
    if (!inDisc && distance > AREA_SELF_DEFENCE * AREA_SELF_DEFENCE) continue;
    if (distance >= bestDistance || !visible(ctx, unit, other)) continue;
    best = other;
    bestDistance = distance;
  }
  return best;
}

/**
 * scrub-concealment-and-area-fire D5: one round of area fire. Aimed at a
 * seeded point of the disc, it rolls against the enemy in the disc nearest
 * that point at AREA_FIRE_ACCURACY of the aimed chance (never above it), does
 * reduced damage on a hit, and puts half a missed round's suppression on
 * every enemy in the disc and AREA_FIRE_MARGIN beyond. It spends the round,
 * gives the shooter away and leaves an unseen-fire marker like any shot.
 */
function areaFireRound(ctx: SimContext, unit: MutableUnit, weapon: Weapon, tick: number, events: SimEvent[]): void {
  const disc = unit.areaFire!;
  const range = engageRange(ctx, unit);
  const toDisc = Math.sqrt((disc.x - unit.x) ** 2 + (disc.y - unit.y) ** 2);
  if (toDisc > range) {
    unit.cooldown = LOOK_AGAIN_TICKS;
    return;
  }
  // A point in the disc the shooter has a line to: the "?" is laid off the
  // true shooter, so its centre may sit behind a crest or a wall while part of
  // the disc is open. Each try draws a point by rejection (no trigonometry in
  // the simulation); with no line to any of them he looks again later.
  const eye = eyeHeightForStance(unit.stance) + (unit.elevation ?? 0);
  let aim: { x: number; y: number } | null = null;
  for (let tryIndex = 0; tryIndex < AREA_AIM_TRIES && aim === null; tryIndex += 1) {
    let offsetX = 0;
    let offsetY = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      offsetX = ctx.rng.nextFloat() * 2 - 1;
      offsetY = ctx.rng.nextFloat() * 2 - 1;
      if (offsetX * offsetX + offsetY * offsetY <= 1) break;
    }
    const x = disc.x + offsetX * disc.radius;
    const y = disc.y + offsetY * disc.radius;
    const blocked = isLineBlocked(
      unit.x,
      unit.y,
      x,
      y,
      ctx.covers,
      ctx.sightObstacles,
      eye,
      AREA_AIM_HEIGHT,
      unit.inTower,
      undefined,
      true,
    );
    if (!blocked && !outsidePortArc(ctx, unit, x, y)) aim = { x, y };
  }
  if (aim === null) {
    unit.cooldown = LOOK_AGAIN_TICKS;
    return;
  }
  const aimX = aim.x;
  const aimY = aim.y;
  const burst = weapon.fire !== 'aimed' ? weapon.burst : undefined;
  const burstStart = burst !== undefined && (unit.burstLeft ?? 0) <= 0;
  if (burstStart) {
    unit.burstLeft = burst.rounds[0] + Math.floor(ctx.rng.nextFloat() * (burst.rounds[1] - burst.rounds[0] + 1));
  }

  let candidate: MutableUnit | null = null;
  let nearest = Number.POSITIVE_INFINITY;
  for (const other of ctx.units) {
    if (!areaEnemy(unit, other)) continue;
    if ((other.x - disc.x) ** 2 + (other.y - disc.y) ** 2 > disc.radius * disc.radius) continue;
    const distance = (other.x - aimX) ** 2 + (other.y - aimY) ** 2;
    if (distance < nearest) {
      candidate = other;
      nearest = distance;
    }
  }
  let hit = false;
  let candidateCover = 0;
  if (candidate) {
    candidateCover =
      garrisonCover(ctx, candidate) ?? coverAgainst(candidate.x, candidate.y, unit.x, unit.y, candidate.stance, ctx.covers);
    const chance = areaHitChance(ctx, unit, candidate, candidateCover);
    hit = ctx.rng.nextFloat() < chance;
  }

  events.push({
    type: 'shot',
    tick,
    source: unit.id,
    target: candidate?.id ?? -1,
    x: unit.x,
    y: unit.y,
    x2: hit && candidate ? candidate.x : aimX,
    y2: hit && candidate ? candidate.y : aimY,
    hit,
    ...(burst ? { burstStart } : {}),
    area: true,
  });
  if (candidate) {
    const marker = unseenFireMarker(ctx, unit, candidate, tick);
    if (marker) events.push(marker);
    markUnderFire(ctx, unit, candidate);
  }
  revealShooter(ctx, unit, tick);
  unit.magazine -= 1;
  unit.lastShotTick = tick;
  unit.cooldown = weapon.fireIntervalTicks;
  if (burst) {
    unit.burstLeft = (unit.burstLeft ?? 1) - 1;
    if (unit.magazine === 0) unit.burstLeft = 0;
    if (unit.burstLeft > 0) unit.cooldown = burst.gapTicks;
  }
  if (unit.magazine === 0) drawBelt(ctx, unit);
  if (unit.magazine === 0 && unit.reserve > 0) {
    unit.reload = weapon.reloadTicks;
  }

  const reach = disc.radius + AREA_FIRE_MARGIN;
  for (const other of ctx.units) {
    if (!areaEnemy(unit, other)) continue;
    if ((other.x - disc.x) ** 2 + (other.y - disc.y) ** 2 > reach * reach) continue;
    const cover =
      other === candidate
        ? candidateCover
        : (garrisonCover(ctx, other) ?? coverAgainst(other.x, other.y, unit.x, unit.y, other.stance, ctx.covers));
    const gain = 12 * weapon.suppression * (1 - cover * 0.3) * AREA_FIRE_SUPPRESSION * (unit.nonLethal ? 0.05 : 1);
    other.suppression = clamp(other.suppression + gain / suppressionDivisor(other), 0, 100);
  }

  if (candidate) {
    if (hit) applyHit(ctx, unit, candidate, weapon, true, tick, events);
    else applyMissMorale(unit, candidate, weapon, candidateCover, false);
  }
}

/**
 * scrub-concealment-and-area-fire D5: a round of area fire's chance to hit
 * the man it rolls against: the weapon's accuracy, the range, his cover, the
 * shooter's marksmanship and burst, times AREA_FIRE_ACCURACY, capped there.
 */
export function areaHitChance(ctx: SimContext, unit: MutableUnit, target: MutableUnit, targetCover: number): number {
  const weapon = getWeapon(unit.weaponId);
  if (!weapon) return 0;
  const distance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
  const rangeFactor = Math.max(0.25, 1 - (distance / engageRange(ctx, unit)) * 0.55);
  const burst = weapon.fire !== 'aimed' ? weapon.burst : undefined;
  return clamp(
    weapon.accuracy * rangeFactor * (1 - targetCover) * unitValues(unit).accuracy * (burst ? burst.hitFactor : 1) * AREA_FIRE_ACCURACY,
    0,
    AREA_FIRE_ACCURACY,
  );
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
    } else if (unit.areaFire !== undefined) {
      // scrub-concealment-and-area-fire: he faces the area he fires into.
      dx = unit.areaFire.x - unit.x;
      dy = unit.areaFire.y - unit.y;
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
      // Only a man his side knows of turns him (fog of war).
      const threat = nearestKnownEnemyAt(ctx, unit, unit.faction);
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
    // A man at a window looks out of it: never past its arc, through his own wall.
    clampFacingToPort(ctx, unit);
  }
}

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
  const hasObjectives = ctx.objectives.length > 0;
  const values = hasObjectives ? objectiveValues(ctx) : undefined;

  // add-map-objectives D3: a side holding every objective starts (and keeps)
  // its two minutes here; losing one clears it.
  if (hasObjectives) {
    for (const side of ['column', 'legalist'] as const) {
      const holdsAll = ctx.objectives.every((objective) => objective.owner === side);
      if (!holdsAll) ctx.allHeldSince[side] = null;
      else if (ctx.allHeldSince[side] === null) ctx.allHeldSince[side] = tick;
    }
  }

  let next: Outcome = 'playing';
  let decidedBy: DecidedBy | undefined;
  const columnBroken = ctx.battle.fellBack.has('column');
  const legalistBroken = ctx.battle.fellBack.has('legalist');

  // A side that fell back off the field is the broken one; reporting
  // `broken` keeps the reason when its last fit men also rout (annihilation
  // would otherwise be chosen first and `broken` would never be reported).
  if (columnBroken) {
    next = 'defeat';
    decidedBy = 'broken';
  } else if (!columnAlive) {
    next = 'defeat';
    decidedBy = 'annihilation';
  } else if (legalistBroken) {
    next = 'victory';
    decidedBy = 'broken';
  } else if (!ctx.opposition) {
    next = 'playing';
  } else if (!legalistAlive) {
    next = 'victory';
    decidedBy = 'annihilation';
  } else if (
    hasObjectives &&
    ctx.allHeldSince.column !== null &&
    // The tick the side was first seen holding all counts as the first of the two minutes.
    tick - ctx.allHeldSince.column + 1 >= ALL_HELD_TICKS
  ) {
    next = 'victory';
    decidedBy = 'all-objectives';
  } else if (
    hasObjectives &&
    ctx.allHeldSince.legalist !== null &&
    tick - ctx.allHeldSince.legalist + 1 >= ALL_HELD_TICKS
  ) {
    next = 'defeat';
    decidedBy = 'all-objectives';
  } else if (hasObjectives && tick - ctx.battleStartTick >= ctx.timeLimitTicks) {
    if (values!.column > values!.legalist) {
      next = 'victory';
      decidedBy = 'objectives';
    } else if (values!.legalist > values!.column) {
      next = 'defeat';
      decidedBy = 'objectives';
    } else {
      next = 'draw';
      decidedBy = 'draw';
    }
  }

  if (next !== ctx.outcome) {
    ctx.outcome = next;
    events.push({
      type: 'outcome',
      tick,
      outcome: next,
      ...(decidedBy ? { decidedBy } : {}),
      ...(values ? { values } : {}),
    });
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
