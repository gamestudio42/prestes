import {
  battleMap as findBattleMap,
  DEFAULT_BATTLE_MAP,
  DEFAULT_ROSTER,
  DEFAULT_TIME_LIMIT,
  defaultRoster,
  ENEMY_ARMY_IDS,
  hasBattleMap,
  isArmyId,
  migrateRoster,
  TIME_LIMITS,
  validateRoster,
  type ArmyId,
  type BattleMapId,
  type BattleRosters,
  type Roster,
  type RosterRefusal,
} from '@prestes/shared';
import type { MessageKey } from '@prestes/content';

/**
 * pre-battle-roster 5.1, 5.5, 5.6: what the skirmish setup screen chooses.
 * The enemy is drawn from the map's presets by seed, one preset chosen by
 * its index, or a roster the player builds.
 */
export type EnemyChoice = { kind: 'drawn' } | { kind: 'preset'; index: number } | { kind: 'built'; army: ArmyId; roster: Roster };

export interface SkirmishSetup {
  map: BattleMapId;
  roster: Roster;
  enemy: EnemyChoice;
  /** add-map-objectives 3.3: the battle's time limit in ticks (one of TIME_LIMITS). */
  timeLimit: number;
  /**
   * faction-armies 4.3: a stored roster had section types replaced on load
   * (saved before the armies); the screen says so once. Never saved.
   */
  migrated?: boolean;
}

export const SETUP_STORAGE_KEY = 'prestes.roster.v1';

export function defaultSetup(): SkirmishSetup {
  return {
    map: DEFAULT_BATTLE_MAP,
    roster: { sections: [...DEFAULT_ROSTER.sections] },
    enemy: { kind: 'drawn' },
    timeLimit: DEFAULT_TIME_LIMIT,
  };
}

/** The column's default force. */
export const DEFAULT_ARMY: ArmyId = 'coluna';

/**
 * A stored roster of `army`, its ids read through the successor table
 * (faction-armies D6). Null when it is not a roster or breaks the rules.
 */
function readRoster(value: unknown, army: ArmyId): { roster: Roster; changed: boolean } | null {
  if (!value || typeof value !== 'object') return null;
  const sections = (value as { sections?: unknown }).sections;
  if (!Array.isArray(sections) || !sections.every((id) => typeof id === 'string')) return null;
  const { roster, changed } = migrateRoster(sections as string[], army);
  return validateRoster(roster, army).ok ? { roster, changed } : null;
}

/** The saved setup, or the default for anything missing or refused. */
export function parseSetup(raw: string | null): SkirmishSetup {
  const fallback = defaultSetup();
  if (!raw) return fallback;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!data || typeof data !== 'object') return fallback;
  const value = data as { map?: unknown; roster?: unknown; enemy?: unknown; timeLimit?: unknown };
  const map = typeof value.map === 'string' && hasBattleMap(value.map) ? value.map : fallback.map;
  const own = readRoster(value.roster, DEFAULT_ARMY);
  const roster = own?.roster ?? fallback.roster;
  let migrated = own?.changed ?? false;
  // add-map-objectives 3.3: only one of the game's time limits is kept.
  const timeLimit =
    typeof value.timeLimit === 'number' && (TIME_LIMITS as readonly number[]).includes(value.timeLimit)
      ? value.timeLimit
      : fallback.timeLimit;
  let enemy: EnemyChoice = fallback.enemy;
  const saved = value.enemy as { kind?: unknown; index?: unknown; army?: unknown; roster?: unknown } | undefined;
  if (saved?.kind === 'preset' && typeof saved.index === 'number') {
    const presets = findBattleMap(map).enemyForces ?? [];
    if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < presets.length) enemy = { kind: 'preset', index: saved.index };
  } else if (saved?.kind === 'built') {
    // A roster built before the armies has no army: it was legalist.
    const army = typeof saved.army === 'string' && isArmyId(saved.army) && ENEMY_ARMY_IDS.includes(saved.army) ? saved.army : 'legalista';
    const built = readRoster(saved.roster, army);
    if (built) {
      enemy = { kind: 'built', army, roster: built.roster };
      migrated ||= built.changed;
    }
  }
  return { map, roster, enemy, timeLimit, ...(migrated ? { migrated: true } : {}) };
}

export function loadSetup(): SkirmishSetup {
  try {
    return parseSetup(window.localStorage.getItem(SETUP_STORAGE_KEY));
  } catch {
    return defaultSetup();
  }
}

export function saveSetup(setup: SkirmishSetup): void {
  try {
    const stored: SkirmishSetup = { ...setup };
    delete stored.migrated;
    window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Private windows and blocked storage: the setup lasts for this visit only.
  }
}

/** The legalist roster the setup fields, or undefined for "Sorteado". */
export function enemyRoster(setup: SkirmishSetup): Roster | undefined {
  if (setup.enemy.kind === 'built') return setup.enemy.roster;
  if (setup.enemy.kind === 'preset') return findBattleMap(setup.map).enemyForces?.[setup.enemy.index];
  return undefined;
}

export function battleRosters(setup: SkirmishSetup): BattleRosters {
  const legalist = enemyRoster(setup);
  return { column: setup.roster, ...(legalist ? { legalist } : {}) };
}

/** Whether "Combater" may start this setup. */
export function setupReady(setup: SkirmishSetup): boolean {
  if (!validateRoster(setup.roster, DEFAULT_ARMY).ok) return false;
  const legalist = enemyRoster(setup);
  const army = setup.enemy.kind === 'built' ? setup.enemy.army : undefined;
  return setup.enemy.kind === 'drawn' || (legalist !== undefined && validateRoster(legalist, army).ok);
}

/** A built enemy of `army`: its default roster, three rifle sections. */
export function builtEnemy(army: ArmyId): EnemyChoice {
  return { kind: 'built', army, roster: defaultRoster(army) };
}

/** A new map keeps a built enemy but returns a chosen preset to "Sorteado". */
export function withMap(setup: SkirmishSetup, map: BattleMapId): SkirmishSetup {
  if (map === setup.map) return setup;
  return { ...setup, map, enemy: setup.enemy.kind === 'preset' ? { kind: 'drawn' } : setup.enemy };
}

/** The localized reason for a refusal. */
export function refusalMessage(refusal: RosterRefusal): { key: MessageKey; values: Record<string, string | number> } {
  switch (refusal.code) {
    case 'over-men':
      return { key: 'setup.refuse.overMen', values: { max: refusal.values.max } };
    case 'over-sections':
      return { key: 'setup.refuse.overSections', values: { max: refusal.values.max } };
    case 'empty':
      return { key: 'setup.refuse.empty', values: {} };
    case 'foreign':
      return { key: 'setup.refuse.foreign', values: {} };
    case 'limit':
      return { key: `setup.refuse.limit.${refusal.values.type}` as MessageKey, values: { max: refusal.values.max } };
  }
}
