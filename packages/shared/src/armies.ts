import type { Faction } from './protocol';
import { SECTION_TYPES, type SectionTypeId } from './sections';

/**
 * faction-armies D1: an army is a layer under the side. Two sides fight; the
 * column's side has one army, the government's side two. Vision, targeting
 * and the enemy commander keep using the side (`Faction`); the army sets the
 * numbers its sections fight with and the uniform the view draws.
 * The forces are recorded in `docs/history/FORCES.md`.
 */
export type ArmyId = 'coluna' | 'legalista' | 'patriotico';

export type ArmySide = 'column' | 'legalist';

/** The uniform set the view draws for an army (soldier-animation-and-textures draws them). */
export type UniformSetId = 'coluna' | 'legalista' | 'patriotico';

/**
 * Numbers the simulation already has, set by army and adjusted by section
 * type (faction-armies D4). Multipliers are against a fogão's (1).
 */
export interface FightingValues {
  /** Starting morale, 0-100. */
  morale: number;
  /** Morale lost to fire and to losses, against a fogão's. */
  moraleLoss: number;
  /** Suppression is divided by this: above 1 the men keep their heads up longer. */
  suppressionResistance: number;
  /** A further divisor of suppression while the man is in cover (the jagunços). */
  coverResistance: number;
  /** Hit chance, against a fogão's. */
  accuracy: number;
  /** Starting cohesion, 0-100. */
  cohesion: number;
}

export interface Army {
  id: ArmyId;
  /** Locale keys: name and short description. */
  nameKey: string;
  descriptionKey: string;
  side: ArmySide;
  uniform: UniformSetId;
  values: Readonly<FightingValues>;
}

export const BASELINE_VALUES: Readonly<FightingValues> = {
  morale: 100,
  moraleLoss: 1,
  suppressionResistance: 1,
  coverResistance: 1,
  accuracy: 1,
  cohesion: 100,
};

export const ARMIES: Readonly<Record<ArmyId, Army>> = {
  coluna: {
    id: 'coluna',
    nameKey: 'army.coluna.name',
    descriptionKey: 'army.coluna.description',
    side: 'column',
    uniform: 'coluna',
    values: BASELINE_VALUES,
  },
  legalista: {
    id: 'legalista',
    nameKey: 'army.legalista.name',
    descriptionKey: 'army.legalista.description',
    side: 'legalist',
    uniform: 'legalista',
    values: { ...BASELINE_VALUES, morale: 95, moraleLoss: 1.1, cohesion: 90 },
  },
  patriotico: {
    id: 'patriotico',
    nameKey: 'army.patriotico.name',
    descriptionKey: 'army.patriotico.description',
    side: 'legalist',
    uniform: 'patriotico',
    values: { ...BASELINE_VALUES, morale: 95, moraleLoss: 1, cohesion: 80 },
  },
};

export const ARMY_IDS = Object.keys(ARMIES) as ArmyId[];

/** The enemy armies a preset may mix and a built enemy roster picks one of. */
export const ENEMY_ARMY_IDS: readonly ArmyId[] = ARMY_IDS.filter((id) => ARMIES[id].side === 'legalist');

export function isArmyId(id: string): id is ArmyId {
  return id in ARMIES;
}

/** The army a section type belongs to. */
export function armyOf(sectionType: SectionTypeId): ArmyId {
  return SECTION_TYPES[sectionType].army;
}

/**
 * The army of a man: his section type's, or for a man fielded without one
 * (the default battle, the sandbox's plain troops) his side's first army.
 * Targets and civilians belong to none.
 */
export function armyOfUnit(unit: { faction: Faction; sectionType?: SectionTypeId }): ArmyId | undefined {
  if (unit.sectionType !== undefined) return armyOf(unit.sectionType);
  if (unit.faction === 'column') return 'coluna';
  if (unit.faction === 'legalist') return 'legalista';
  return undefined;
}

/** The values a man of this section type fights with: his army's, adjusted by the type. */
export function fightingValues(sectionType: SectionTypeId | undefined, army?: ArmyId): FightingValues {
  if (sectionType === undefined) return { ...(army ? ARMIES[army].values : BASELINE_VALUES) };
  const type = SECTION_TYPES[sectionType];
  return { ...ARMIES[type.army].values, ...type.values };
}

/** Problems with the registry: keys, a side, and at least four section types per army. */
export function validateArmies(): string[] {
  const errors: string[] = [];
  for (const [id, army] of Object.entries(ARMIES)) {
    if (army.id !== id) errors.push(`army ${id} has id ${army.id}`);
    if (!army.nameKey || !army.descriptionKey) errors.push(`army without a locale key: ${id}`);
    if (!army.uniform) errors.push(`army without a uniform set: ${id}`);
    const types = Object.values(SECTION_TYPES).filter((type) => type.army === id).length;
    if (types < 4) errors.push(`army ${id} has ${types} section types (at least 4)`);
  }
  return errors;
}

const SECTION_VALUES = new Map<SectionTypeId, Readonly<FightingValues>>();

/**
 * The values a man fights with, cached by section type. A man fielded
 * without a section type (the default battle, the sandbox's plain troops)
 * fights with the baseline, so those battles hash as before the armies.
 */
export function unitValues(unit: { sectionType?: SectionTypeId }): Readonly<FightingValues> {
  if (unit.sectionType === undefined) return BASELINE_VALUES;
  let values = SECTION_VALUES.get(unit.sectionType);
  if (!values) {
    values = Object.freeze(fightingValues(unit.sectionType));
    SECTION_VALUES.set(unit.sectionType, values);
  }
  return values;
}

/** What suppression on this man is divided by: his resistance, and in cover his cover resistance. */
export function suppressionDivisor(unit: { sectionType?: SectionTypeId; cover: number }): number {
  const values = unitValues(unit);
  return values.suppressionResistance * (unit.cover > 0 ? values.coverResistance : 1);
}
