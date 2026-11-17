import { ARMIES } from './armies';
import type { Vec2 } from './protocol';
import { nearestWalkable } from './pathfinding';
import { setActiveMap } from './maps/catalog';
import { PATH_GRID } from './maps/runtime';
import type { BattleMap } from './maps/types';
import { pointInPolygon } from './maps/geometry';
import { sizeOfBounds } from './maps/sizes';
import { isPointBlockedByCovers } from './world';
import {
  DEFAULT_ROSTER,
  FORCE_LIMITS,
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
export function deploymentSlots(map: BattleMap, side: Side, count?: number): Vec2[] {
  setActiveMap(map);
  const base = baseSlots(map, side);
  return count === undefined || count <= base.length ? base : [...base, ...extraSlots(map, side, base, count - base.length)];
}

/** The zone's front points, then three rear places behind the first three: the places every roster had. */
function baseSlots(map: BattleMap, side: Side): Vec2[] {
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

/** Added places stand at least this far from every other place (m): a section is up to six men wide. */
export const EXTRA_SLOT_SPACING = 12;

/**
 * scale-forces-by-map-size D3: places past the first ones, for the larger
 * rosters of medium and large maps. In order: the outer flanks of the front,
 * the outer flanks of the rear, a second rear row, a third row and the far
 * flanks; then any free walkable point of the area, nearest the front first.
 * Each is pulled toward the area's middle until it lies inside the area on
 * walkable ground, and kept only EXTRA_SLOT_SPACING from every other place.
 */
function extraSlots(map: BattleMap, side: Side, base: readonly Vec2[], wanted: number): Vec2[] {
  const zone = map.deployment[side];
  const area = zone.area;
  const [a, b, c] = base;
  if (!a || !b || !c || !area || area.length < 3) return [];
  const length = Math.hypot(zone.facing.x, zone.facing.y) || 1;
  const back = { x: -zone.facing.x / length, y: -zone.facing.y / length };
  const across = Math.hypot(c.x - a.x, c.y - a.y) || 1;
  const along = { x: (c.x - a.x) / across, y: (c.y - a.y) / across };
  const spacing = Math.max(EXTRA_SLOT_SPACING, across / 2);
  const at = (from: Vec2, sideways: number, rows: number): Vec2 => ({
    x: from.x + along.x * sideways * spacing + back.x * rows * REAR_SLOT_DEPTH,
    y: from.y + along.y * sideways * spacing + back.y * rows * REAR_SLOT_DEPTH,
  });
  const mid = (p: Vec2, q: Vec2): Vec2 => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const candidates: Vec2[] = [
    at(a, -1, 0), at(c, 1, 0),
    at(a, -1, 1), at(c, 1, 1),
    at(b, 0, 2), at(mid(b, c), 0, 2), at(mid(a, b), 0, 2), at(a, 0, 2), at(c, 0, 2),
    at(mid(a, b), 0, 3), at(mid(b, c), 0, 3), at(b, 0, 3),
    at(a, -2, 0), at(c, 2, 0), at(a, -1, 2), at(c, 1, 2),
  ];
  // Then the rest of the area on a grid, the nearest to the front centre first.
  const xs = area.map((point) => point.x);
  const ys = area.map((point) => point.y);
  const grid: Vec2[] = [];
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += EXTRA_SLOT_SPACING / 2) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += EXTRA_SLOT_SPACING / 2) grid.push({ x, y });
  }
  grid.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
  const centre = { x: xs.reduce((sum, x) => sum + x, 0) / xs.length, y: ys.reduce((sum, y) => sum + y, 0) / ys.length };
  // The whole section must stand inside: ranks of six, RANK_SPACING apart, and the next ranks south (+y).
  const reach = 2.5 * RANK_SPACING + 1;
  const footprint = [{ x: 0, y: 0 }, { x: -reach, y: 0 }, { x: reach, y: 0 }, { x: -reach, y: 2 * RANK_SPACING }, { x: reach, y: 2 * RANK_SPACING }];
  const fits = (point: Vec2) =>
    footprint.every((offset) => pointInPolygon(point.x + offset.x, point.y + offset.y, area)) &&
    !isPointBlockedByCovers(point.x, point.y, map.covers, 0.8);
  const taken: Vec2[] = [...base];
  const added: Vec2[] = [];
  for (const candidate of [...candidates, ...grid]) {
    if (added.length >= wanted) break;
    let place: Vec2 | null = null;
    for (let step = 0; step <= 10 && !place; step += 1) {
      const t = step / 10;
      const point = { x: Math.round(candidate.x + (centre.x - candidate.x) * t), y: Math.round(candidate.y + (centre.y - candidate.y) * t) };
      if (fits(point)) place = point;
    }
    if (place && taken.every((other) => Math.hypot(other.x - place!.x, other.y - place!.y) >= EXTRA_SLOT_SPACING)) {
      taken.push(place);
      added.push(place);
    }
  }
  return added;
}

/**
 * How far behind the front the rear slots stand: REAR_SLOT_DEPTH, or less
 * where the walkable field ends sooner behind a zone facing north or south
 * (a zone 10 m from the edge of the field).
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
 * The troop id of a side's section at `index` in its roster. The first six
 * keep the ids they always had (column 1-6, legalist 11-16); the larger
 * rosters of medium and large maps go on at 101 and 151, clear of each other,
 * of event arrivals (from 20) and of the column's 99 (scale-forces-by-map-size D4).
 */
export function sectionSquadId(side: Side, index: number): number {
  if (index < 6) return (side === 'column' ? 1 : 11) + index;
  return (side === 'column' ? 101 : 151) + index - 6;
}

/**
 * A side's roster on a map, slot by slot in roster order. Makes `map` active
 * (walkable ground is the active map's). A blocked man moves to the nearest
 * walkable point within DEPLOY_SNAP_REACH m.
 */
export function deployRoster(map: BattleMap, side: Side, roster: Roster = DEFAULT_ROSTER): RosterDeployment {
  setActiveMap(map);
  const limit = FORCE_LIMITS[sizeOfBounds(map.bounds)].sections;
  const slots = deploymentSlots(map, side, Math.min(roster.sections.length, limit));
  const facing = map.deployment[side].facing;
  const errors: string[] = [];
  const { minX, minY, maxX, maxY } = map.bounds;
  const sections = roster.sections.slice(0, limit).map((type, index): PlacedSection => {
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
    return { type, squadId: sectionSquadId(side, index), men };
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
  const size = sizeOfBounds(map.bounds);
  if (options.requirePresets && presets.length === 0) errors.push(`${map.id}: no enemy presets`);
  presets.forEach((preset, index) => {
    const check = validateRoster(preset, undefined, size);
    for (const refusal of check.refusals) {
      errors.push(`${map.id}: enemy preset ${index + 1} is refused (${refusal.code} ${JSON.stringify(refusal.values)})`);
    }
    for (const type of preset.sections) {
      if (!SECTION_TYPES[type]) errors.push(`${map.id}: enemy preset ${index + 1} has an unknown section: ${type}`);
      else if (ARMIES[SECTION_TYPES[type].army].side !== 'legalist') errors.push(`${map.id}: enemy preset ${index + 1} has ${type}, not a section of an enemy army`);
    }
  });
  for (const side of ['column', 'legalist'] as const) {
    // scale-forces-by-map-size: the area holds a place for every section the size allows.
    const places = deploymentSlots(map, side, FORCE_LIMITS[size].sections).length;
    if (places < FORCE_LIMITS[size].sections) errors.push(`${map.id}: ${side} deployment area holds ${places} section places of ${FORCE_LIMITS[size].sections}`);
    // A side fields only its armies' types.
    for (const type of SECTION_TYPE_IDS.filter((id) => ARMIES[SECTION_TYPES[id].army].side === side)) {
      const full: Roster = { sections: Array.from({ length: FORCE_LIMITS[size].sections }, () => type) };
      errors.push(...deployRoster(map, side, full).errors);
    }
  }
  return [...new Set(errors)];
}
