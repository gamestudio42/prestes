export type WeaponId = 'mauser-7mm';

export type WeaponKind =
  | 'bolt-rifle'
  | 'lever-rifle'
  | 'pistol'
  | 'machine-gun'
  | 'automatic-rifle';

export type HistoricalStatus = 'documented' | 'representative' | 'abstracted';

export interface WeaponProfile {
  id: WeaponId;
  kind: WeaponKind;
  caliber: string;
  magazine: number;
  reserve: number;
  /** Rapid (suppressive) fire interval. */
  fireIntervalTicks: number;
  /** Aimed fire: ticks between shots, drawn per shot within [min, max]. */
  aimedIntervalTicks: readonly [number, number];
  /** Ticks from laying on a new target to the first shot, drawn within [min, max]. */
  reactionTicks: readonly [number, number];
  reloadTicks: number;
  range: number;
  accuracy: number;
  damageMin: number;
  damageMax: number;
  suppression: number;
  historicalIdentity: HistoricalStatus;
  historicalStats: HistoricalStatus;
  sourceRefs: readonly string[];
}

export const WEAPONS: Readonly<Record<WeaponId, WeaponProfile>> = {
  'mauser-7mm': {
    id: 'mauser-7mm',
    kind: 'bolt-rifle',
    caliber: '7 mm Mauser',
    magazine: 5,
    reserve: 15,
    fireIntervalTicks: 12,
    aimedIntervalTicks: [30, 50],
    reactionTicks: [5, 25],
    reloadTicks: 30,
    range: 120,
    accuracy: 0.55,
    damageMin: 35,
    damageMax: 55,
    suppression: 1,
    historicalIdentity: 'documented',
    historicalStats: 'abstracted',
    sourceRefs: ['macaulay-1974'],
  },
};

export const DEFAULT_WEAPON_ID: WeaponId = 'mauser-7mm';

/**
 * Ammunition issued to the player troop in the training exercise: depot issue to
 * a regular army troop at Vila Militar. A game abstraction, not a sourced figure;
 * the Coluna keeps the Mauser profile's scarcity (Macaulay, p. 113).
 */
export const TRAINING_AMMUNITION: Readonly<{ magazine: number; reserve: number }> = {
  magazine: 5,
  reserve: 45,
};

export function getWeapon(id: string): WeaponProfile | null {
  return id in WEAPONS ? WEAPONS[id as WeaponId] : null;
}

export function totalRounds(unit: { magazine: number; reserve: number }): number {
  return unit.magazine + unit.reserve;
}

export function validateWeapons(
  profiles: Readonly<Record<string, WeaponProfile>> = WEAPONS,
): string[] {
  const errors: string[] = [];
  for (const profile of Object.values(profiles)) {
    if (!profile.id) errors.push('weapon without id');
    if (!profile.kind) errors.push(`weapon without kind: ${profile.id}`);
    if (!profile.caliber) errors.push(`weapon without caliber: ${profile.id}`);
    if (profile.magazine <= 0) errors.push(`weapon without magazine: ${profile.id}`);
    if (profile.reserve < 0) errors.push(`weapon with negative reserve: ${profile.id}`);
    if (profile.fireIntervalTicks <= 0) errors.push(`weapon without fire interval: ${profile.id}`);
    if (profile.reloadTicks <= 0) errors.push(`weapon without reload: ${profile.id}`);
    if (profile.range <= 0) errors.push(`weapon without range: ${profile.id}`);
    if (profile.accuracy <= 0 || profile.accuracy > 1) errors.push(`weapon accuracy out of range: ${profile.id}`);
    if (profile.damageMin <= 0 || profile.damageMax < profile.damageMin) {
      errors.push(`weapon damage out of range: ${profile.id}`);
    }
    if (profile.suppression < 0) errors.push(`weapon with negative suppression: ${profile.id}`);
    if (profile.sourceRefs.length === 0) errors.push(`weapon without source: ${profile.id}`);
  }
  return errors;
}

export function reloadMagazine(
  weapon: WeaponProfile,
  magazine: number,
  reserve: number,
): { magazine: number; reserve: number } {
  const current = Math.max(0, Math.min(weapon.magazine, magazine));
  const loaded = Math.min(Math.max(0, weapon.magazine - current), Math.max(0, reserve));
  return {
    magazine: current + loaded,
    reserve: Math.max(0, reserve - loaded),
  };
}

