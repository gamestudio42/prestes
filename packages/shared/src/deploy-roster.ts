import type { Vec2 } from './protocol';
import { nearestWalkable } from './pathfinding';
import { setActiveMap } from './maps/catalog';
import { PATH_GRID } from './maps/runtime';
import type { BattleMap } from './maps/types';
import {
  DEFAULT_ROSTER,
  ROSTER_MAX_SECTIONS,
  SECTION_TYPE_IDS,
  SECTION_TYPES,
  validateRoster,
  type Roster,
  type SectionMan,
  type SectionTypeId,
} from './sections';

/** Spacing between men in a rank, and between ranks (m). */
export const RANK_SPACING = 2.8;
/** Rear slots stand this far behind the front ones (m). */
export const REAR_SLOT_DEPTH = 14;
/** A man on blocked ground moves to the nearest walkable point within this (m). */
export const DEPLOY_SNAP_REACH = 6;

export type Side = 'column' | 'legalist';

export interface PlacedMan extends SectionMan {
  x: number;
  y: number;
}

export interface PlacedSection {
  type: SectionTypeId;
  /** Column 1-6, legalist 11-16, in roster order. */
  squadId: number;
  men: PlacedMan[];
}

/**
 * pre-battle-roster 3.2 (shared so the content check can use it): the six
 * slots of a side. The zone's three section starts are the front; the rear
 * three stand REAR_SLOT_DEPTH m behind, at the midpoints and the centre.
 */
export function deploymentSlots(map: BattleMap, side: Side): Vec2[] {
  setActiveMap(map);
  const zone = map.deployment[side];
  const front = zone.sections.map((point) => ({ x: point.x, y: point.y }));
  const length = Math.sqrt(zone.facing.x * zone.facing.x + zone.facing.y * zone.facing.y) || 1;
  const depth = rearDepth(map, side);
  const back = { x: (-zone.facing.x / length) * depth, y: (-zone.facing.y / length) * depth };
  const [a, b, c] = front;
  if (!a || !b || !c) return front;
  const rear = [
    { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    { x: b.x, y: b.y },
    { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 },
  ].map((point) => ({ x: point.x + back.x, y: point.y + back.y }));
  return [...front, ...rear];
}

/**
 * How far behind the front the rear slots stand: REAR_SLOT_DEPTH, or less
 * where the walkable field ends sooner behind a zone facing north or south
 * (the Vila Militar's zones stand 10 m from the edge of its ±100 m field).
 * A rear section's second rank (+y) must stay one cell inside the field.
 */
function rearDepth(map: BattleMap, side: Side): number {
  const zone = map.deployment[side];
  if (zone.facing.x !== 0 || zone.facing.y === 0 || zone.sections.length === 0) return REAR_SLOT_DEPTH;
  const frontY = zone.sections.reduce((sum, point) => sum + point.y, 0) / zone.sections.length;
  if (zone.facing.y < 0) {
    const edge = Math.min(PATH_GRID.max, map.bounds.maxY) - 1;
    return Math.min(REAR_SLOT_DEPTH, edge - RANK_SPACING - frontY);
  }
  const edge = Math.max(PATH_GRID.min, map.bounds.minY) + 1;
  return Math.min(REAR_SLOT_DEPTH, frontY - edge);
}

/**
 * Where the men of one section stand around `slot`, before snapping. Ranks of
 * up to six, RANK_SPACING apart, the first rank centred on the slot and the
 * next ranks south of it (+y, as the 3 vs 3 has always stood: the default
 * battle's units are unchanged). A gun crew stands with the gunner on the
 * slot and his loaders one rank behind him.
 */
export function sectionOffsets(type: SectionTypeId, facing: Vec2): Vec2[] {
  const men = SECTION_TYPES[type].men;
  const gunner = men.findIndex((man) => man.role === 'gunner');
  if (gunner >= 0 && men.every((man) => man.role === 'gunner' || man.role === 'loader')) {
    const length = Math.sqrt(facing.x * facing.x + facing.y * facing.y) || 1;
    const behind = { x: (-facing.x / length) * RANK_SPACING, y: (-facing.y / length) * RANK_SPACING };
    const loaders = men.length - 1;
    let loader = 0;
    return men.map((_, index) => {
      if (index === gunner) return { x: 0, y: 0 };
      const offset = (loader - (loaders - 1) / 2) * RANK_SPACING;
      loader += 1;
      return { x: behind.x + offset, y: behind.y };
    });
  }
  const width = Math.min(men.length, 6);
  return men.map((_, index) => ({
    x: ((index % 6) - (width - 1) / 2) * RANK_SPACING,
    y: Math.floor(index / 6) * RANK_SPACING,
  }));
}

export interface RosterDeployment {
  sections: PlacedSection[];
  /** Men who found no walkable ground within DEPLOY_SNAP_REACH, or left the bounds. */
  errors: string[];
}

/**
 * A side's roster on a map, slot by slot in roster order. Makes `map` active
 * (walkable ground is the active map's). A blocked man moves to the nearest
 * walkable point within DEPLOY_SNAP_REACH m.
 */
export function deployRoster(map: BattleMap, side: Side, roster: Roster = DEFAULT_ROSTER): RosterDeployment {
  setActiveMap(map);
  const slots = deploymentSlots(map, side);
  const facing = map.deployment[side].facing;
  const errors: string[] = [];
  const { minX, minY, maxX, maxY } = map.bounds;
  const sections = roster.sections.slice(0, ROSTER_MAX_SECTIONS).map((type, index): PlacedSection => {
    const slot = slots[index] ?? slots[slots.length - 1]!;
    const offsets = sectionOffsets(type, facing);
    const men = SECTION_TYPES[type].men.map((man, manIndex): PlacedMan => {
      const offset = offsets[manIndex]!;
      const want = { x: slot.x + offset.x, y: slot.y + offset.y };
      const at = nearestWalkable(want, map.covers, DEPLOY_SNAP_REACH);
      if (!at) errors.push(`${map.id}: ${side} ${type} in slot ${index + 1} has a man on blocked ground at (${want.x.toFixed(1)}, ${want.y.toFixed(1)})`);
      const place = at ?? want;
      if (place.x < minX || place.x > maxX || place.y < minY || place.y > maxY) {
        errors.push(`${map.id}: ${side} ${type} in slot ${index + 1} leaves the bounds`);
      }
      return { ...man, x: place.x, y: place.y };
    });
    return { type, squadId: (side === 'column' ? 1 : 11) + index, men };
  });
  return { sections, errors };
}

/**
 * pre-battle-roster 2.3: a map's enemy presets are valid rosters, and every
 * section type deploys on walkable ground in every slot of both sides (so any
 * valid roster of up to six sections fits). Leaves `map` active.
 */
export function validateMapRosters(map: BattleMap, options: { requirePresets?: boolean } = {}): string[] {
  const errors: string[] = [];
  const presets = map.enemyForces ?? [];
  if (options.requirePresets && presets.length === 0) errors.push(`${map.id}: no enemy presets`);
  presets.forEach((preset, index) => {
    const check = validateRoster(preset);
    for (const refusal of check.refusals) {
      errors.push(`${map.id}: enemy preset ${index + 1} is refused (${refusal.code} ${JSON.stringify(refusal.values)})`);
    }
    for (const type of preset.sections) {
      if (!SECTION_TYPES[type]) errors.push(`${map.id}: enemy preset ${index + 1} has an unknown section: ${type}`);
      else if (!SECTION_TYPES[type].sides.includes('legalist')) errors.push(`${map.id}: enemy preset ${index + 1} has ${type}, not a legalist section`);
    }
  });
  for (const side of ['column', 'legalist'] as const) {
    for (const type of SECTION_TYPE_IDS) {
      const full: Roster = { sections: Array.from({ length: ROSTER_MAX_SECTIONS }, () => type) };
      errors.push(...deployRoster(map, side, full).errors);
    }
  }
  return [...new Set(errors)];
}
