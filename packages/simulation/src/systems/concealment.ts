import { activeMapRuntime, concealmentDistance, REVEAL_TICKS } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';

/**
 * Concealment (add-battle-maps): a soldier in corn, cane, scrub or tall grass
 * is seen only from within his kind and stance's distance, doubled while he
 * runs, and not at all hidden for REVEAL_TICKS after he fires. It gates
 * sight only; hit chance never reads it.
 */
function running(unit: MutableUnit): boolean {
  return unit.path.length > 0 && unit.gait === 'run';
}

function revealed(ctx: SimContext, unit: MutableUnit): boolean {
  return unit.revealedUntil !== undefined && unit.revealedUntil > ctx.tickCount;
}

/** The distance inside which `unit` is seen, or null when he is not concealed. */
export function concealedWithin(ctx: SimContext, unit: MutableUnit): number | null {
  if (revealed(ctx, unit)) return null;
  return concealmentDistance(activeMapRuntime(), unit.x, unit.y, unit.stance, running(unit));
}

export function isConcealed(ctx: SimContext, unit: MutableUnit): boolean {
  return concealedWithin(ctx, unit) !== null;
}

/** Whether the vegetation hides `target` from `observer` at their distance. */
export function hiddenByVegetation(ctx: SimContext, observer: MutableUnit, target: MutableUnit): boolean {
  const within = concealedWithin(ctx, target);
  if (within === null) return false;
  return (target.x - observer.x) ** 2 + (target.y - observer.y) ** 2 > within * within;
}

/** A shot gives the shooter away (battle maps only, where there is vegetation). */
export function revealShooter(ctx: SimContext, shooter: MutableUnit, tick: number): void {
  if (activeMapRuntime()) shooter.revealedUntil = tick + REVEAL_TICKS;
}
