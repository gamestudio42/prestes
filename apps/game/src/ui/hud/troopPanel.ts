import { SECTION_TYPES, trainingLoad, type ArmyId, type SectionRole, type SectionTypeId, type UnitOrder, type UnitSnapshot } from '@prestes/shared';
import { coverClassOf, healthClassOf, type CoverClass, type HealthClass } from './SoldierFigure';

/**
 * troop-thumbnails-and-panel 3.1-3.2: what the troop panel shows, worked out
 * from the frame's unit snapshots without React, so it is unit-tested: the
 * header's names and counts, each man's role and figure, and their order.
 */

/** A man counts as down when dead or incapacitated; wounded when hurt but fighting. */
export type Condition = 'fit' | 'wounded' | 'down';

export function conditionOf(unit: UnitSnapshot): Condition {
  const health = healthClassOf(unit);
  if (health === 'dead' || health === 'down') return 'down';
  return health === 'fit' ? 'fit' : 'wounded';
}

export interface TroopHeader {
  /** How many sections the selection spans. */
  sections: number;
  /** The section's number, type and army when one section is selected. */
  squadId?: number;
  sectionType?: SectionTypeId;
  army?: ArmyId;
  order: UnitOrder | null;
  fit: number;
  wounded: number;
  down: number;
}

/** 3.1: the header over one section or the totals over several. */
export function troopHeader(units: readonly UnitSnapshot[], order: UnitOrder | null): TroopHeader {
  const men = units.filter((unit) => !unit.dummy);
  const squads = [...new Set(men.map((unit) => unit.squadId))];
  const counts = { fit: 0, wounded: 0, down: 0 };
  for (const unit of men) counts[conditionOf(unit)] += 1;
  const header: TroopHeader = { sections: squads.length, order, ...counts };
  if (squads.length === 1) {
    header.squadId = squads[0]!;
    const sectionType = men.find((unit) => unit.sectionType !== undefined)?.sectionType;
    const army = men.find((unit) => unit.army !== undefined)?.army;
    if (sectionType) header.sectionType = sectionType;
    if (army) header.army = army;
  }
  return header;
}

export interface SoldierPlace {
  role: SectionRole;
  leader: boolean;
}

/**
 * Each man's role in his section: the section type's men in order, the
 * soldiers taken by id (they are deployed in that order). The leader is the
 * officer if there is one, else the first man (the gunner leads his crew).
 */
export function soldierPlaces(units: readonly UnitSnapshot[]): Map<number, SoldierPlace> {
  const places = new Map<number, SoldierPlace>();
  const bySquad = new Map<number, UnitSnapshot[]>();
  for (const unit of units) if (!unit.dummy) bySquad.set(unit.squadId, [...(bySquad.get(unit.squadId) ?? []), unit]);
  for (const men of bySquad.values()) {
    men.sort((left, right) => left.id - right.id);
    const type = men.find((unit) => unit.sectionType !== undefined)?.sectionType;
    const roles = type ? SECTION_TYPES[type].men : null;
    const leaderId = (men.find((unit) => unit.kind === 'officer') ?? men[0])?.id;
    men.forEach((unit, index) => {
      const role: SectionRole = roles?.[index]?.role ?? (unit.kind === 'officer' ? 'officer' : 'rifleman');
      places.set(unit.id, { role, leader: unit.id === leaderId });
    });
  }
  return places;
}

/** 3.2: the leader first, then the men by id, casualties (down, dead or routed) last. */
export function orderSoldiers(units: readonly UnitSnapshot[]): UnitSnapshot[] {
  const places = soldierPlaces(units);
  const casualty = (unit: UnitSnapshot) => !unit.alive || unit.incapacitated || unit.routed;
  return units
    .filter((unit) => !unit.dummy)
    .sort(
      (left, right) =>
        Number(casualty(left)) - Number(casualty(right)) ||
        Number(!places.get(left.id)?.leader) - Number(!places.get(right.id)?.leader) ||
        left.id - right.id,
    );
}

export type FigureMark = 'pinned' | 'routed' | null;

export interface FigureLook {
  cover: CoverClass;
  health: HealthClass;
  mark: FigureMark;
  /** Rounds left over a full load, 0..1. */
  ammo: number;
  /** Cartridges shown in the five-round clip. */
  rounds: number;
  /** He has no round left: the clip is marked. */
  empty: boolean;
  rawRounds: number;
}

/** 3.2: a man's figure from his snapshot (helmet, body, mark and clip). */
export function figureLook(unit: UnitSnapshot, ammoFull: number): FigureLook {
  const rawRounds = unit.magazine + unit.reserve;
  // A rostered man is full at his own weapon's load; the gun's belts are the crew's pool.
  const load = unit.sectionType !== undefined ? trainingLoad(unit.weaponId) : null;
  const full = load ? load.magazine + load.reserve : ammoFull;
  const ammo = full > 0 ? Math.min(1, rawRounds / full) : 0;
  const mark: FigureMark = !unit.alive ? null : unit.routed || unit.state === 'routed' ? 'routed' : unit.state === 'pinned' ? 'pinned' : null;
  return {
    cover: coverClassOf(unit),
    health: healthClassOf(unit),
    mark,
    ammo,
    rounds: rawRounds <= 0 ? 0 : Math.max(1, Math.round(ammo * 5)),
    empty: rawRounds <= 0,
    rawRounds,
  };
}
