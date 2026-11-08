import type { WeaponId } from './weapons';

/**
 * pre-battle-roster 2.1: the section types a player builds a skirmish force
 * from. A game organization, not a reconstruction of the column's order of
 * battle (the compendium entry "Forces in the skirmish" says so). Weapons
 * follow `docs/history/WEAPONS.md`.
 */
export type SectionTypeId =
  | 'comando'
  | 'esquadra-4'
  | 'esquadra-5'
  | 'fuzileiros'
  | 'fuzil-metralhador'
  | 'metralhadora'
  | 'irregulares';

export type SectionRole = 'officer' | 'bugler' | 'rifleman' | 'gunner' | 'loader' | 'irregular';

export interface SectionMan {
  role: SectionRole;
  weapon: WeaponId;
  sidearm?: WeaponId;
}

/** Limits shared across types: at most two automatic rifles in a roster. */
export type SectionLimitGroup = 'automatic-rifle';

export interface SectionType {
  id: SectionTypeId;
  /** Locale keys: name and one-line description. */
  nameKey: string;
  descriptionKey: string;
  /** The men in order: the first stands front left; the gunner leads his crew. */
  men: readonly SectionMan[];
  /** Marching speed against a rifleman's (the gun crew carries the gun). */
  speedFactor?: number;
  /** At most this many of the type in a roster. */
  limit?: number;
  /** A limit counted together with other types. */
  limitGroup?: SectionLimitGroup;
  sides: readonly ('column' | 'legalist')[];
}

const rifleman: SectionMan = { role: 'rifleman', weapon: 'mauser-7mm' };
const repeat = (man: SectionMan, count: number): SectionMan[] => Array.from({ length: count }, () => ({ ...man }));
const BOTH = ['column', 'legalist'] as const;

/** At most this many automatic rifles in a roster (Esquadra de 5 and Fuzil-metralhador together). */
export const LIMIT_GROUPS: Readonly<Record<SectionLimitGroup, number>> = { 'automatic-rifle': 2 };

export const SECTION_TYPES: Readonly<Record<SectionTypeId, SectionType>> = {
  comando: {
    id: 'comando',
    nameKey: 'section.comando.name',
    descriptionKey: 'section.comando.description',
    men: [
      { role: 'officer', weapon: 'revolver' },
      { role: 'bugler', weapon: 'mauser-7mm' },
      ...repeat(rifleman, 2),
    ],
    limit: 1,
    sides: BOTH,
  },
  'esquadra-4': {
    id: 'esquadra-4',
    nameKey: 'section.esquadra-4.name',
    descriptionKey: 'section.esquadra-4.description',
    men: repeat(rifleman, 4),
    sides: BOTH,
  },
  'esquadra-5': {
    id: 'esquadra-5',
    nameKey: 'section.esquadra-5.name',
    descriptionKey: 'section.esquadra-5.description',
    men: [...repeat(rifleman, 4), { role: 'gunner', weapon: 'fuzil-automatico-7mm' }],
    limitGroup: 'automatic-rifle',
    sides: BOTH,
  },
  fuzileiros: {
    id: 'fuzileiros',
    nameKey: 'section.fuzileiros.name',
    descriptionKey: 'section.fuzileiros.description',
    men: repeat(rifleman, 11),
    sides: BOTH,
  },
  'fuzil-metralhador': {
    id: 'fuzil-metralhador',
    nameKey: 'section.fuzil-metralhador.name',
    descriptionKey: 'section.fuzil-metralhador.description',
    men: [{ role: 'gunner', weapon: 'fuzil-automatico-7mm' }, ...repeat({ role: 'loader', weapon: 'mauser-7mm' }, 2)],
    limitGroup: 'automatic-rifle',
    sides: BOTH,
  },
  metralhadora: {
    id: 'metralhadora',
    nameKey: 'section.metralhadora.name',
    descriptionKey: 'section.metralhadora.description',
    men: [{ role: 'gunner', weapon: 'metralhadora-7mm' }, ...repeat({ role: 'loader', weapon: 'mauser-7mm' }, 3)],
    speedFactor: 0.85,
    limit: 1,
    sides: BOTH,
  },
  irregulares: {
    id: 'irregulares',
    nameKey: 'section.irregulares.name',
    descriptionKey: 'section.irregulares.description',
    men: [
      { role: 'irregular', weapon: 'winchester-44', sidearm: 'revolver' },
      ...repeat({ role: 'irregular', weapon: 'winchester-44' }, 4),
    ],
    speedFactor: 1.1,
    sides: BOTH,
  },
};

export const SECTION_TYPE_IDS = Object.keys(SECTION_TYPES) as SectionTypeId[];

export function isSectionTypeId(id: string): id is SectionTypeId {
  return id in SECTION_TYPES;
}

/** Problems with the catalog itself: each type has men, keys and a known weapon. */
export function validateSectionTypes(
  types: Readonly<Record<string, SectionType>> = SECTION_TYPES,
  weaponIds: readonly string[],
): string[] {
  const errors: string[] = [];
  for (const [id, type] of Object.entries(types)) {
    if (type.id !== id) errors.push(`section type ${id} has id ${type.id}`);
    if (type.men.length === 0) errors.push(`section type without men: ${id}`);
    if (!type.nameKey || !type.descriptionKey) errors.push(`section type without a locale key: ${id}`);
    if (type.sides.length === 0) errors.push(`section type without a side: ${id}`);
    for (const man of type.men) {
      if (!weaponIds.includes(man.weapon)) errors.push(`section type ${id} carries an unknown weapon: ${man.weapon}`);
      if (man.sidearm && !weaponIds.includes(man.sidearm)) errors.push(`section type ${id} carries an unknown sidearm: ${man.sidearm}`);
    }
    const gunners = type.men.filter((man) => man.role === 'gunner').length;
    if (gunners > 1) errors.push(`section type with more than one gunner: ${id}`);
  }
  return errors;
}

/** pre-battle-roster 2.2: a force is an ordered list of sections; the first stand at the front. */
export interface Roster {
  sections: SectionTypeId[];
}

export const ROSTER_MAX_MEN = 33;
export const ROSTER_MAX_SECTIONS = 6;

export type RosterRefusal =
  | { code: 'over-men'; values: { men: number; max: number } }
  | { code: 'over-sections'; values: { sections: number; max: number } }
  | { code: 'limit'; values: { type: SectionTypeId | SectionLimitGroup; max: number } }
  | { code: 'empty'; values: Record<string, never> };

export interface RosterCheck {
  ok: boolean;
  men: number;
  sections: number;
  refusals: RosterRefusal[];
}

/** Today's force: three rifle sections of eleven. */
export const DEFAULT_ROSTER: Readonly<Roster> = { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] };

export function rosterMen(roster: Roster): number {
  return roster.sections.reduce((sum, id) => sum + (SECTION_TYPES[id]?.men.length ?? 0), 0);
}

export function validateRoster(roster: Roster): RosterCheck {
  const refusals: RosterRefusal[] = [];
  const men = rosterMen(roster);
  const sections = roster.sections.length;
  if (sections === 0) refusals.push({ code: 'empty', values: {} });
  if (sections > ROSTER_MAX_SECTIONS) refusals.push({ code: 'over-sections', values: { sections, max: ROSTER_MAX_SECTIONS } });
  if (men > ROSTER_MAX_MEN) refusals.push({ code: 'over-men', values: { men, max: ROSTER_MAX_MEN } });
  for (const id of SECTION_TYPE_IDS) {
    const limit = SECTION_TYPES[id].limit;
    if (limit !== undefined && roster.sections.filter((s) => s === id).length > limit) {
      refusals.push({ code: 'limit', values: { type: id, max: limit } });
    }
  }
  for (const [group, max] of Object.entries(LIMIT_GROUPS) as [SectionLimitGroup, number][]) {
    const count = roster.sections.filter((s) => SECTION_TYPES[s]?.limitGroup === group).length;
    if (count > max) refusals.push({ code: 'limit', values: { type: group, max } });
  }
  return { ok: refusals.length === 0, men, sections, refusals };
}

/** The first reason adding a section of `type` would be refused, or null when it fits. */
export function canAdd(roster: Roster, type: SectionTypeId): RosterRefusal | null {
  const check = validateRoster({ sections: [...roster.sections, type] });
  return check.refusals.find((refusal) => refusal.code !== 'empty') ?? null;
}
