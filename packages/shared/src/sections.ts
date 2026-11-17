import type { ArmyId, FightingValues, UniformSetId } from './armies';
import type { WeaponId } from './weapons';
import type { MapSize } from './maps/sizes';

/**
 * pre-battle-roster 2.1, faction-armies 2.2: the section types a force is
 * built from, each of one army. The column keeps the seven ids it had before
 * the armies (saved rosters and goldens name them); the enemy armies' types
 * have ids of their own. Names and sources are in `docs/history/FORCES.md`;
 * a name that is a game organization says so in its compendium note.
 * Weapons follow `docs/history/WEAPONS.md`.
 */
export type SectionTypeId =
  // Coluna Prestes
  | 'comando'
  | 'fuzileiros'
  | 'esquadra-4'
  | 'esquadra-5'
  | 'fuzil-metralhador'
  | 'metralhadora'
  | 'irregulares'
  | 'veteranos-gauchos'
  // Forças legalistas
  | 'comando-companhia'
  | 'infantaria-exercito'
  | 'brigada-militar'
  | 'provisorios'
  | 'metralhadora-legalista'
  | 'fuzil-metralhador-legalista'
  // Batalhões patrióticos
  | 'chefe-capangas'
  | 'jaguncos'
  | 'jaguncos-mauser'
  | 'voluntarios'
  | 'cangaceiros';

export type SectionRole = 'officer' | 'bugler' | 'rifleman' | 'gunner' | 'loader' | 'irregular';

export interface SectionMan {
  role: SectionRole;
  weapon: WeaponId;
  sidearm?: WeaponId;
}

/** Limits shared across types and armies: one command, one machine gun, two automatic rifles. */
export type SectionLimitGroup = 'command' | 'machine-gun' | 'automatic-rifle';

export interface SectionType {
  id: SectionTypeId;
  army: ArmyId;
  /** Locale keys: name and one-line description. */
  nameKey: string;
  descriptionKey: string;
  /** The men in order: the first stands front left; the gunner leads his crew. */
  men: readonly SectionMan[];
  /** Marching speed against a rifleman's (the gun crew carries the gun). */
  speedFactor?: number;
  /** Ammunition carried against the weapon's issue (faction-armies 3.1). */
  ammunitionFactor?: number;
  /** The type's own fighting values over its army's (faction-armies D4). */
  values?: Partial<FightingValues>;
  /** At most this many of the type in a roster. */
  limit?: number;
  /** A limit counted together with other types. */
  limitGroup?: SectionLimitGroup;
  /** The uniform set when the type is dressed apart from its army (improve-soldier-models 4.4). */
  uniform?: UniformSetId;
}

const rifleman: SectionMan = { role: 'rifleman', weapon: 'mauser-7mm' };
const winchester: SectionMan = { role: 'irregular', weapon: 'winchester-44' };
const repeat = (man: SectionMan, count: number): SectionMan[] => Array.from({ length: count }, () => ({ ...man }));
const commandMen = (): SectionMan[] => [{ role: 'officer', weapon: 'revolver' }, { role: 'bugler', weapon: 'mauser-7mm' }, ...repeat(rifleman, 2)];
const gunCrew = (): SectionMan[] => [{ role: 'gunner', weapon: 'metralhadora-7mm' }, ...repeat({ role: 'loader', weapon: 'mauser-7mm' }, 3)];
const rifleTeam = (): SectionMan[] => [{ role: 'gunner', weapon: 'fuzil-automatico-7mm' }, ...repeat({ role: 'loader', weapon: 'mauser-7mm' }, 2)];
const keys = (id: SectionTypeId) => ({ nameKey: `section.${id}.name`, descriptionKey: `section.${id}.description` });

/** At most this many of a group in a roster on a small map, whatever the army (FORCE_LIMITS for every size). */
export const LIMIT_GROUPS: Readonly<Record<SectionLimitGroup, number>> = { command: 1, 'machine-gun': 1, 'automatic-rifle': 2 };

export const SECTION_TYPES: Readonly<Record<SectionTypeId, SectionType>> = {
  // Coluna Prestes (FORCES.md: pp. 111-113, 151-152)
  comando: { id: 'comando', army: 'coluna', ...keys('comando'), men: commandMen(), limitGroup: 'command' },
  fuzileiros: { id: 'fuzileiros', army: 'coluna', ...keys('fuzileiros'), men: repeat(rifleman, 11) },
  'esquadra-4': { id: 'esquadra-4', army: 'coluna', ...keys('esquadra-4'), men: repeat(rifleman, 4) },
  'esquadra-5': {
    id: 'esquadra-5',
    army: 'coluna',
    ...keys('esquadra-5'),
    men: [...repeat(rifleman, 4), { role: 'gunner', weapon: 'fuzil-automatico-7mm' }],
    limitGroup: 'automatic-rifle',
  },
  'fuzil-metralhador': { id: 'fuzil-metralhador', army: 'coluna', ...keys('fuzil-metralhador'), men: rifleTeam(), limitGroup: 'automatic-rifle' },
  metralhadora: { id: 'metralhadora', army: 'coluna', ...keys('metralhadora'), men: gunCrew(), speedFactor: 0.85, limitGroup: 'machine-gun' },
  irregulares: {
    id: 'irregulares',
    army: 'coluna',
    ...keys('irregulares'),
    men: [{ ...winchester, sidearm: 'revolver' }, ...repeat(winchester, 4)],
    speedFactor: 1.1,
    ammunitionFactor: 0.75,
    values: { moraleLoss: 1.15 },
  },
  'veteranos-gauchos': {
    id: 'veteranos-gauchos',
    army: 'coluna',
    ...keys('veteranos-gauchos'),
    men: repeat(rifleman, 8),
    values: { moraleLoss: 0.8, suppressionResistance: 1.25 },
  },
  // Forças legalistas (FORCES.md: pp. 48, 58, 71, 81-82, 90-91, 134, 178, 192)
  'comando-companhia': { id: 'comando-companhia', army: 'legalista', ...keys('comando-companhia'), men: commandMen(), limitGroup: 'command' },
  'infantaria-exercito': {
    id: 'infantaria-exercito',
    army: 'legalista',
    ...keys('infantaria-exercito'),
    men: repeat(rifleman, 11),
    values: { morale: 85, moraleLoss: 1.25 },
  },
  'brigada-militar': {
    id: 'brigada-militar',
    army: 'legalista',
    ...keys('brigada-militar'),
    men: repeat(rifleman, 11),
    values: { morale: 100, moraleLoss: 1, cohesion: 100 },
  },
  provisorios: {
    id: 'provisorios',
    army: 'legalista',
    ...keys('provisorios'),
    men: [...repeat(rifleman, 4), ...repeat({ role: 'rifleman', weapon: 'winchester-44' }, 4)],
    speedFactor: 1.1,
    ammunitionFactor: 0.75,
    values: { morale: 100, moraleLoss: 0.95 },
  },
  'metralhadora-legalista': {
    id: 'metralhadora-legalista',
    army: 'legalista',
    ...keys('metralhadora-legalista'),
    men: gunCrew(),
    speedFactor: 0.85,
    limitGroup: 'machine-gun',
  },
  'fuzil-metralhador-legalista': {
    id: 'fuzil-metralhador-legalista',
    army: 'legalista',
    ...keys('fuzil-metralhador-legalista'),
    men: rifleTeam(),
    limitGroup: 'automatic-rifle',
  },
  // Batalhões patrióticos (FORCES.md: pp. 70-71, 189-192, 205, 218, 228)
  'chefe-capangas': {
    id: 'chefe-capangas',
    army: 'patriotico',
    ...keys('chefe-capangas'),
    men: [{ role: 'officer', weapon: 'winchester-44', sidearm: 'revolver' }, ...repeat(winchester, 3)],
    limitGroup: 'command',
  },
  jaguncos: {
    id: 'jaguncos',
    army: 'patriotico',
    ...keys('jaguncos'),
    uniform: 'jagunco',
    men: [{ ...winchester, sidearm: 'revolver' }, ...repeat(winchester, 5)],
    speedFactor: 1.1,
    ammunitionFactor: 0.85,
    values: { moraleLoss: 0.9, coverResistance: 1.5, cohesion: 65 },
  },
  'jaguncos-mauser': {
    id: 'jaguncos-mauser',
    army: 'patriotico',
    ...keys('jaguncos-mauser'),
    uniform: 'jagunco',
    // The owner, 2026-11-11: federal arms issued to the battalions include an automatic rifle (a game organization).
    men: [...repeat({ role: 'irregular', weapon: 'mauser-7mm' }, 5), { role: 'gunner', weapon: 'fuzil-automatico-7mm' }],
    limitGroup: 'automatic-rifle',
    speedFactor: 1.1,
    ammunitionFactor: 0.85,
    values: { moraleLoss: 0.9, coverResistance: 1.5, cohesion: 65 },
  },
  voluntarios: {
    id: 'voluntarios',
    army: 'patriotico',
    ...keys('voluntarios'),
    men: repeat(rifleman, 10),
    values: { morale: 85, moraleLoss: 1.25 },
  },
  cangaceiros: {
    id: 'cangaceiros',
    army: 'patriotico',
    ...keys('cangaceiros'),
    uniform: 'cangaceiro',
    men: repeat({ role: 'irregular', weapon: 'mauser-7mm', sidearm: 'revolver' }, 6),
    speedFactor: 1.15,
    limit: 1,
    values: { morale: 100, moraleLoss: 0.85, accuracy: 1.15, cohesion: 60 },
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
    if (!type.army) errors.push(`section type without an army: ${id}`);
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

/**
 * scale-forces-by-map-size D1, D2: what a roster may hold at the start of a
 * battle on a map of each size. One table for the setup screen, the editor,
 * the map check and the worker. Sections that arrive by event do not count.
 */
export interface ForceLimits {
  men: number;
  sections: number;
  groups: Readonly<Record<SectionLimitGroup, number>>;
}

export const FORCE_LIMITS: Readonly<Record<MapSize, ForceLimits>> = {
  small: { men: 33, sections: 6, groups: LIMIT_GROUPS },
  medium: { men: 66, sections: 12, groups: { command: 1, 'machine-gun': 2, 'automatic-rifle': 4 } },
  large: { men: 100, sections: 16, groups: { command: 1, 'machine-gun': 3, 'automatic-rifle': 6 } },
};

/** The small map's limits, the ones every roster had before the limits grew with the map. */
export const ROSTER_MAX_MEN = FORCE_LIMITS.small.men;
export const ROSTER_MAX_SECTIONS = FORCE_LIMITS.small.sections;
/** The most sections any map size allows. */
export const ROSTER_MAX_SECTIONS_ANY_SIZE = Math.max(...Object.values(FORCE_LIMITS).map((limits) => limits.sections));

export type RosterRefusal =
  | { code: 'over-men'; values: { men: number; max: number } }
  | { code: 'over-sections'; values: { sections: number; max: number } }
  | { code: 'limit'; values: { type: SectionTypeId | SectionLimitGroup; max: number } }
  | { code: 'foreign'; values: { type: SectionTypeId; army: ArmyId } }
  | { code: 'empty'; values: Record<string, never> };

export interface RosterCheck {
  ok: boolean;
  men: number;
  sections: number;
  refusals: RosterRefusal[];
}

/** The column's default force: three fogões of eleven. */
export const DEFAULT_ROSTER: Readonly<Roster> = { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] };

/** Each army's rifle section: its default roster is three of them, and an id with no successor becomes one. */
export const RIFLE_SECTION: Readonly<Record<ArmyId, SectionTypeId>> = {
  coluna: 'fuzileiros',
  legalista: 'infantaria-exercito',
  patriotico: 'voluntarios',
};

/** Three rifle sections of the army. */
export function defaultRoster(army: ArmyId): Roster {
  const rifle = RIFLE_SECTION[army];
  return { sections: [rifle, rifle, rifle] };
}

export function rosterMen(roster: Roster): number {
  return roster.sections.reduce((sum, id) => sum + (SECTION_TYPES[id]?.men.length ?? 0), 0);
}

/** The armies a roster holds, in catalog order (a map preset may mix the two enemy armies). */
export function rosterArmies(roster: Roster): ArmyId[] {
  const armies = new Set(roster.sections.map((id) => SECTION_TYPES[id]?.army).filter((army) => army !== undefined));
  return (['coluna', 'legalista', 'patriotico'] as const).filter((army) => armies.has(army));
}

/**
 * The roster rules. With `army`, a roster built for that army also refuses a
 * section of another army (faction-armies, "Sections by army").
 */
export function validateRoster(roster: Roster, army?: ArmyId, size: MapSize = 'small'): RosterCheck {
  const limits = FORCE_LIMITS[size];
  const refusals: RosterRefusal[] = [];
  const men = rosterMen(roster);
  const sections = roster.sections.length;
  if (sections === 0) refusals.push({ code: 'empty', values: {} });
  if (army !== undefined) {
    for (const id of new Set(roster.sections)) {
      const type = SECTION_TYPES[id];
      if (type && type.army !== army) refusals.push({ code: 'foreign', values: { type: id, army: type.army } });
    }
  }
  if (sections > limits.sections) refusals.push({ code: 'over-sections', values: { sections, max: limits.sections } });
  if (men > limits.men) refusals.push({ code: 'over-men', values: { men, max: limits.men } });
  for (const id of SECTION_TYPE_IDS) {
    const limit = SECTION_TYPES[id].limit;
    if (limit !== undefined && roster.sections.filter((s) => s === id).length > limit) {
      refusals.push({ code: 'limit', values: { type: id, max: limit } });
    }
  }
  for (const [group, max] of Object.entries(limits.groups) as [SectionLimitGroup, number][]) {
    const count = roster.sections.filter((s) => SECTION_TYPES[s]?.limitGroup === group).length;
    if (count > max) refusals.push({ code: 'limit', values: { type: group, max } });
  }
  return { ok: refusals.length === 0, men, sections, refusals };
}

/** The first reason adding a section of `type` would be refused, or null when it fits. */
export function canAdd(roster: Roster, type: SectionTypeId, army?: ArmyId, size: MapSize = 'small'): RosterRefusal | null {
  const check = validateRoster({ sections: [...roster.sections, type] }, army, size);
  // Another army's section, then a type's own limit, say more than the budget ("só uma metralhadora").
  return (
    check.refusals.find((refusal) => refusal.code === 'foreign') ??
    check.refusals.find((refusal) => refusal.code === 'limit') ??
    check.refusals.find((refusal) => refusal.code !== 'empty') ??
    null
  );
}

/**
 * faction-armies D6: the legalist successor of each id an enemy roster could
 * hold before the armies existed. Maps saved before then and enemy rosters
 * stored by the setup screen are read through it. The column's ids did not
 * change, so a column roster needs no table.
 */
export const LEGALIST_SUCCESSORS: Readonly<Record<string, SectionTypeId>> = {
  comando: 'comando-companhia',
  fuzileiros: 'infantaria-exercito',
  // No legalist type of four riflemen: the smallest team keeps an old preset within 33 men (the owner, 2026-11-11).
  'esquadra-4': 'fuzil-metralhador-legalista',
  'esquadra-5': 'fuzil-metralhador-legalista',
  'fuzil-metralhador': 'fuzil-metralhador-legalista',
  metralhadora: 'metralhadora-legalista',
  irregulares: 'provisorios',
};

export interface MigratedRoster {
  roster: Roster;
  /** True when an id was replaced (by its successor or by the rifle section). */
  changed: boolean;
}

/**
 * A stored roster of `army`: a known id of that army is kept; an id of the
 * time before the armies goes through the successor table (enemy armies);
 * any other id becomes the army's rifle section.
 */
export function migrateRoster(sections: readonly string[], army: ArmyId): MigratedRoster {
  let changed = false;
  const out = sections.map((id): SectionTypeId => {
    if (isSectionTypeId(id) && SECTION_TYPES[id].army === army) return id;
    changed = true;
    const successor = army === 'coluna' ? undefined : LEGALIST_SUCCESSORS[id];
    if (successor && SECTION_TYPES[successor].army === army) return successor;
    return RIFLE_SECTION[army];
  });
  return { roster: { sections: out }, changed };
}

/**
 * A map's enemy preset as saved: ids of an enemy army are kept, so a preset
 * may mix the two; any older id goes through the successor table, and an id
 * with neither becomes the legalist rifle section.
 */
export function migrateEnemyPreset(sections: readonly string[]): MigratedRoster {
  let changed = false;
  const out = sections.map((id): SectionTypeId => {
    if (isSectionTypeId(id) && SECTION_TYPES[id].army !== 'coluna') return id;
    changed = true;
    return LEGALIST_SUCCESSORS[id] ?? RIFLE_SECTION.legalista;
  });
  return { roster: { sections: out }, changed };
}
