/** pre-battle-roster 1.1: the period weapon set (identities in `docs/history/WEAPONS.md`). */
export type WeaponId = 'mauser-7mm' | 'fuzil-automatico-7mm' | 'metralhadora-7mm' | 'winchester-44' | 'revolver';

export type WeaponKind =
  | 'bolt-rifle'
  | 'lever-rifle'
  | 'pistol'
  | 'machine-gun'
  | 'automatic-rifle';

export type HistoricalStatus = 'documented' | 'representative' | 'abstracted';

/**
 * How a weapon fires: one aimed round at a time, short bursts (the automatic
 * rifle) or long bursts from a belt (the crew-served machine gun).
 */
export type FireMode = 'aimed' | 'burst' | 'belt';

/** A burst: rounds drawn within [min, max], ticks between rounds, and the hit chance factor per round. */
export interface BurstProfile {
  rounds: readonly [number, number];
  gapTicks: number;
  hitFactor: number;
}

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
  fire: FireMode;
  burst?: BurstProfile;
  /** The machine gun: ticks standing still before it can fire. */
  setupTicks?: number;
  /** The machine gun: men in its crew. */
  crew?: number;
  /** Locale keys: the name, a short name for the HUD, and a one-line description. */
  nameKey: string;
  shortNameKey: string;
  descriptionKey: string;
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
    fire: 'aimed',
    nameKey: 'weapon.mauser-7mm.name',
    shortNameKey: 'weapon.mauser-7mm.short',
    descriptionKey: 'weapon.mauser-7mm.description',
    historicalIdentity: 'documented',
    historicalStats: 'abstracted',
    sourceRefs: ['macaulay-1974'],
  },
  // The column's few automatic rifles (Macaulay, p. 113); the model is not named.
  'fuzil-automatico-7mm': {
    id: 'fuzil-automatico-7mm',
    kind: 'automatic-rifle',
    caliber: '7 mm Mauser',
    magazine: 20,
    reserve: 40,
    fireIntervalTicks: 10,
    aimedIntervalTicks: [25, 40],
    reactionTicks: [5, 25],
    reloadTicks: 45,
    range: 110,
    accuracy: 0.45,
    damageMin: 35,
    damageMax: 55,
    suppression: 2.5,
    fire: 'burst',
    burst: { rounds: [3, 5], gapTicks: 2, hitFactor: 0.6 },
    nameKey: 'weapon.fuzil-automatico-7mm.name',
    shortNameKey: 'weapon.fuzil-automatico-7mm.short',
    descriptionKey: 'weapon.fuzil-automatico-7mm.description',
    historicalIdentity: 'documented',
    historicalStats: 'abstracted',
    sourceRefs: ['macaulay-1974'],
  },
  // The column's four 7 mm machine guns at the start of the march (p. 113); the model is not named.
  'metralhadora-7mm': {
    id: 'metralhadora-7mm',
    kind: 'machine-gun',
    caliber: '7 mm Mauser',
    magazine: 250,
    reserve: 0,
    fireIntervalTicks: 8,
    aimedIntervalTicks: [15, 25],
    reactionTicks: [8, 30],
    reloadTicks: 80,
    range: 140,
    accuracy: 0.4,
    damageMin: 35,
    damageMax: 55,
    suppression: 3,
    fire: 'belt',
    burst: { rounds: [6, 6], gapTicks: 1, hitFactor: 0.5 },
    setupTicks: 40,
    crew: 4,
    nameKey: 'weapon.metralhadora-7mm.name',
    shortNameKey: 'weapon.metralhadora-7mm.short',
    descriptionKey: 'weapon.metralhadora-7mm.description',
    historicalIdentity: 'documented',
    historicalStats: 'abstracted',
    sourceRefs: ['macaulay-1974'],
  },
  // Lever-action rifles of the irregulars (pp. 54, 152); the model is not named.
  'winchester-44': {
    id: 'winchester-44',
    kind: 'lever-rifle',
    caliber: '.44',
    magazine: 9,
    reserve: 18,
    fireIntervalTicks: 10,
    aimedIntervalTicks: [18, 30],
    reactionTicks: [4, 20],
    reloadTicks: 45,
    range: 80,
    accuracy: 0.5,
    damageMin: 30,
    damageMax: 45,
    suppression: 1,
    fire: 'aimed',
    nameKey: 'weapon.winchester-44.name',
    shortNameKey: 'weapon.winchester-44.short',
    descriptionKey: 'weapon.winchester-44.description',
    historicalIdentity: 'documented',
    historicalStats: 'abstracted',
    sourceRefs: ['macaulay-1974'],
  },
  // Officers' and irregulars' revolvers (p. 54); the model and calibre are not named.
  revolver: {
    id: 'revolver',
    kind: 'pistol',
    caliber: 'not named in the source',
    magazine: 6,
    reserve: 12,
    fireIntervalTicks: 8,
    aimedIntervalTicks: [15, 25],
    reactionTicks: [3, 15],
    reloadTicks: 40,
    range: 25,
    accuracy: 0.45,
    damageMin: 25,
    damageMax: 40,
    suppression: 0.5,
    fire: 'aimed',
    nameKey: 'weapon.revolver.name',
    shortNameKey: 'weapon.revolver.short',
    descriptionKey: 'weapon.revolver.description',
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

/** A weapon's issue for the 3 vs 3: rounds in the weapon, rounds carried, and (the machine gun) the crew's belt pool. */
export interface TrainingLoad {
  magazine: number;
  reserve: number;
  pool?: number;
}

/**
 * pre-battle-roster 1.2: what each weapon is issued for the 3 vs 3. Game
 * abstractions, not sourced figures; the Mauser's is `TRAINING_AMMUNITION`.
 */
const TRAINING_LOADS: Readonly<Record<WeaponId, TrainingLoad>> = {
  'mauser-7mm': TRAINING_AMMUNITION,
  'fuzil-automatico-7mm': { magazine: 20, reserve: 100 },
  'metralhadora-7mm': { magazine: 250, reserve: 0, pool: 750 },
  'winchester-44': { magazine: 9, reserve: 36 },
  revolver: { magazine: 6, reserve: 18 },
};

export function trainingLoad(id: WeaponId): TrainingLoad {
  return TRAINING_LOADS[id];
}

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
    if (!['aimed', 'burst', 'belt'].includes(profile.fire)) errors.push(`weapon without fire mode: ${profile.id}`);
    if (profile.fire !== 'aimed') {
      const burst = profile.burst;
      if (!burst) errors.push(`${profile.fire} weapon without a burst: ${profile.id}`);
      else if (burst.rounds[0] < 1 || burst.rounds[1] < burst.rounds[0] || burst.gapTicks < 1 || burst.hitFactor <= 0 || burst.hitFactor > 1) {
        errors.push(`weapon burst out of range: ${profile.id}`);
      }
    }
    if (profile.fire === 'belt' && (!profile.setupTicks || profile.setupTicks <= 0 || !profile.crew || profile.crew < 2)) {
      errors.push(`crew-served weapon without set-up or crew: ${profile.id}`);
    }
    for (const key of [profile.nameKey, profile.shortNameKey, profile.descriptionKey]) {
      if (!key) errors.push(`weapon without a locale key: ${profile.id}`);
    }
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

