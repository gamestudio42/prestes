import { activeMapRuntime, concealmentDistance, REVEAL_RADIUS, REVEAL_TICKS, runtimeVegetationAt } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';

/**
 * Concealment (add-battle-maps): a soldier in corn, cane, scrub or tall grass
 * is seen only from within his kind and stance's distance, doubled while he
 * runs. For REVEAL_TICKS after he fires he is seen from within REVEAL_RADIUS
 * (refine-battle-maps 5.13: a shot gives him away to the near, not to a
 * line 117 m off). It gates sight only; hit chance never reads it.
 */
function running(unit: MutableUnit): boolean {
  return unit.path.length > 0 && unit.gait === 'run';
}

export function revealed(ctx: SimContext, unit: MutableUnit): boolean {
  return unit.revealedUntil !== undefined && unit.revealedUntil > ctx.tickCount;
}

/** The distance inside which `unit` is seen, or null when he is not concealed. */
export function concealedWithin(ctx: SimContext, unit: MutableUnit): number | null {
  const within = concealmentDistance(activeMapRuntime(), unit.x, unit.y, unit.stance, running(unit));
  if (within === null) return null;
  return revealed(ctx, unit) ? Math.max(within, REVEAL_RADIUS) : within;
}

/** Hidden by the vegetation and not given away by his own fire. */
export function isConcealed(ctx: SimContext, unit: MutableUnit): boolean {
  return !revealed(ctx, unit) && concealedWithin(ctx, unit) !== null;
}

/** Whether the vegetation hides `target` from `observer` at their distance. */
export function hiddenByVegetation(ctx: SimContext, observer: MutableUnit, target: MutableUnit): boolean {
  const within = concealedWithin(ctx, target);
  if (within === null) return false;
  return (target.x - observer.x) ** 2 + (target.y - observer.y) ** 2 > within * within;
}

/**
 * refine-battle-maps 5.14: a section the player has left on its default fire
 * control that settles in concealing vegetation (every fit man halted, most
 * of them in it) holds its fire until an enemy is within 60 m (fire on
 * contact), so a long shot does not give it away. Once it has opened fire it
 * fires freely while it stays there; leaving the vegetation lifts the rule.
 */
/** The fit men of each side's sections, in unit order. */
function fitSections(ctx: SimContext): MutableUnit[][] {
  const sections = new Map<string, MutableUnit[]>();
  for (const unit of ctx.units) {
    if (!unit.alive || unit.incapacitated || unit.routed || unit.dummy) continue;
    if (unit.faction !== 'column' && unit.faction !== 'legalist') continue;
    const key = `${unit.faction}:${unit.squadId}`;
    const list = sections.get(key);
    if (list) list.push(unit);
    else sections.set(key, [unit]);
  }
  return [...sections.values()];
}

export function defaultConcealedFire(ctx: SimContext): void {
  if (!activeMapRuntime()) return;
  for (const section of fitSections(ctx)) {
    const moving = section.some((unit) => unit.path.length > 0);
    const hidden = section.filter(
      (unit) => concealmentDistance(activeMapRuntime(), unit.x, unit.y, unit.stance, false) !== null,
    ).length;
    const inside = hidden * 2 > section.length;
    for (const unit of section) {
      if (!inside) {
        // Out of the vegetation: the rule is lifted.
        if (unit.autoContact === 'armed') unit.fireOnContact = false;
        unit.autoContact = undefined;
      } else if (!moving && unit.autoContact === undefined && !unit.fireControlSet && !unit.holdFire && !unit.fireOnContact) {
        unit.fireOnContact = true;
        unit.autoContact = 'armed';
      }
    }
  }
}

/**
 * scrub-concealment-and-area-fire D2: scrub hides only a man who keeps low,
 * so a section that halts in it (no man moving, most of them inside) crouches
 * every standing man there whose stance the player has not set. A stance the
 * player chose is kept. The same for both sides.
 */
export function settleLowInScrub(ctx: SimContext): void {
  const runtime = activeMapRuntime();
  if (!runtime) return;
  for (const section of fitSections(ctx)) {
    if (section.some((unit) => unit.path.length > 0)) continue;
    const inScrub = section.filter((unit) => runtimeVegetationAt(runtime, unit.x, unit.y) === 'scrub');
    if (inScrub.length * 2 <= section.length) continue;
    for (const unit of inScrub) {
      if (unit.stance === 'standing' && !unit.stanceLocked && unit.state !== 'pinned' && unit.garrison === undefined) {
        unit.stance = 'crouched';
      }
    }
  }
}

/** Whether his own shot has given him away (the view marks him "Revelado"). */
export function isRevealed(ctx: SimContext, unit: MutableUnit): boolean {
  return activeMapRuntime() !== null && revealed(ctx, unit) && concealmentDistance(activeMapRuntime(), unit.x, unit.y, unit.stance, false) !== null;
}

/** A shot gives the shooter away (battle maps only, where there is vegetation). */
export function revealShooter(ctx: SimContext, shooter: MutableUnit, tick: number): void {
  if (activeMapRuntime()) shooter.revealedUntil = tick + REVEAL_TICKS;
}
