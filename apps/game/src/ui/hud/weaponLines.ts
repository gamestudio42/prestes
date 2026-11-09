import type { UnitSnapshot, WeaponId } from '@prestes/shared';

/** pre-battle-roster 5.2: one line of the weapon card, a weapon and the rounds its men carry. */
export interface WeaponLine {
  weaponId: WeaponId;
  men: number;
  /** Rounds loaded (magazines, or the belt in the gun). */
  magazine: number;
  /** Rounds carried in all: magazines plus reserves. */
  total: number;
  /** A machine gun: whether it is set up; absent for other weapons. */
  gunSet?: boolean;
}

/** The section's weapons in the order its men stand (by id), with their rounds. */
export function weaponLines(units: readonly UnitSnapshot[]): WeaponLine[] {
  const lines = new Map<WeaponId, WeaponLine>();
  for (const unit of [...units].sort((left, right) => left.id - right.id)) {
    const line = lines.get(unit.weaponId) ?? { weaponId: unit.weaponId, men: 0, magazine: 0, total: 0 };
    line.men += 1;
    line.magazine += unit.magazine;
    line.total += unit.magazine + unit.reserve;
    if (unit.gunSet !== undefined) line.gunSet = (line.gunSet ?? false) || unit.gunSet;
    lines.set(unit.weaponId, line);
  }
  return [...lines.values()];
}

/** The section's weapon: a crew's gun, else the one most men carry (the first in line on a tie). */
export function mainWeapon(lines: readonly WeaponLine[]): WeaponLine | null {
  const gun = lines.find((line) => line.gunSet !== undefined);
  if (gun) return gun;
  return lines.reduce<WeaponLine | null>((best, line) => (best === null || line.men > best.men ? line : best), null);
}
