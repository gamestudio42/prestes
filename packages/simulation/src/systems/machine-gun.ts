import { getWeapon, trainingLoad, type WeaponId } from '@prestes/shared';
import type { MutableUnit } from './model';
import type { SimContext } from './context';

/**
 * pre-battle-roster 4.3: the crew-served machine gun. The gun is set when its
 * gunner has stood still for its `setupTicks`; any path step resets it. Its
 * belt is the gunner's magazine; new belts come from the squad's pool
 * (`ctx.gunPools`), not from the man. Loaders near a firing gun feed it
 * instead of firing their rifles. When the gunner falls, the nearest fit
 * mate takes the gun on the next tick and sets it up again.
 */

/** Loaders within this of their firing gunner feed it (m). */
export const FEED_RADIUS = 3;
/** A gun that fired within this many ticks is firing (longer than its pause between bursts). */
export const FIRING_TICKS = 30;
/** What a gunner who takes over carried before: the crew's rifle. */
const CREW_RIFLE: WeaponId = 'mauser-7mm';

const fit = (unit: MutableUnit): boolean => unit.alive && !unit.incapacitated && !unit.routed;

export function isBelt(unit: MutableUnit): boolean {
  return getWeapon(unit.weaponId)?.fire === 'belt';
}

/** The pools of every machine-gun squad in a rostered battle: the crew's belts beyond the one in the gun. */
export function initialGunPools(units: readonly MutableUnit[]): Record<number, number> {
  const pools: Record<number, number> = {};
  for (const unit of units) {
    if (isBelt(unit)) pools[unit.squadId] = trainingLoad(unit.weaponId).pool ?? 0;
  }
  return pools;
}

/** Whether a gunner's gun is set; true for every other weapon. */
export function gunReady(unit: MutableUnit): boolean {
  const weapon = getWeapon(unit.weaponId);
  if (weapon?.fire !== 'belt') return true;
  return (unit.gunStill ?? 0) >= (weapon.setupTicks ?? 0);
}

function moving(unit: MutableUnit): boolean {
  return unit.path.length > 0 && unit.pathIndex < unit.path.length;
}

export function updateMachineGuns(ctx: SimContext): void {
  const pools = ctx.gunPools;
  if (!pools) return;
  for (const key of Object.keys(pools)) {
    const squadId = Number(key);
    const crew = ctx.units.filter((unit) => unit.squadId === squadId);
    let gunner = crew.find((unit) => fit(unit) && isBelt(unit));
    if (!gunner) {
      const fallen = crew.find((unit) => !fit(unit) && isBelt(unit));
      if (!fallen) continue;
      const mates = crew
        .filter(fit)
        .map((unit) => ({ unit, distance: (unit.x - fallen.x) ** 2 + (unit.y - fallen.y) ** 2 }))
        .sort((a, b) => a.distance - b.distance || a.unit.id - b.unit.id);
      const next = mates[0]?.unit;
      if (!next) continue;
      next.weaponId = fallen.weaponId;
      next.magazine = fallen.magazine;
      next.reserve = 0;
      next.reload = 0;
      next.burstLeft = 0;
      next.gunStill = 0;
      // The gun leaves the fallen man.
      fallen.weaponId = CREW_RIFLE;
      fallen.magazine = 0;
      fallen.gunStill = undefined;
      gunner = next;
    }
    gunner.gunStill = moving(gunner) ? 0 : Math.min(getWeapon(gunner.weaponId)?.setupTicks ?? 0, (gunner.gunStill ?? 0) + 1);
  }
}

/** A loader beside his firing gun feeds it and does not fire his rifle. */
export function feedingGun(ctx: SimContext, unit: MutableUnit, tick: number): boolean {
  if (!ctx.gunPools || ctx.gunPools[unit.squadId] === undefined || isBelt(unit)) return false;
  return ctx.units.some(
    (gunner) =>
      gunner.squadId === unit.squadId &&
      fit(gunner) &&
      isBelt(gunner) &&
      gunner.lastShotTick !== undefined &&
      tick - gunner.lastShotTick <= FIRING_TICKS &&
      (gunner.x - unit.x) ** 2 + (gunner.y - unit.y) ** 2 <= FEED_RADIUS * FEED_RADIUS,
  );
}

/** An empty gun takes its next belt from the squad's pool into the gunner's reserve. */
export function drawBelt(ctx: SimContext, unit: MutableUnit): void {
  const pools = ctx.gunPools;
  if (!pools || unit.reserve > 0 || !isBelt(unit)) return;
  const pool = pools[unit.squadId] ?? 0;
  const belt = Math.min(getWeapon(unit.weaponId)?.magazine ?? 0, pool);
  if (belt <= 0) return;
  pools[unit.squadId] = pool - belt;
  unit.reserve = belt;
}
