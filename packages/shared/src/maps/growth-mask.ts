import type { Vec2 } from '../protocol';
import { terrainSurfaceAt } from '../terrain';
import { catalogObject } from './catalog-objects';
import { mapSide, roadType, type EditableMap } from './document';
import { distanceToPolyline, pointInPolygon, pointsBox, polygonBox, type Box } from './geometry';
import { bridgePolygon, waterAt } from './runtime';
import { TRENCH } from './trench-lines';
import { smoothCentreline } from './water-outline';
import type { BattleMap } from './types';

/**
 * refine-map-editor D2: where plants may grow. No vegetation stands or
 * conceals in deep water or fords, on bridge decks, on paved or cobbled
 * roads, inside building footprints or in trench channels. The editor's brush
 * skips these cells, the compiler zeroes them and the map check counts them.
 */

/** Surfaces of road types plants never grow through. */
const BARE_ROAD_SURFACES = new Set(['road', 'cobbles']);

type Blocker = { box: Box; inside: (x: number, y: number) => boolean };

/** Everything that keeps plants off an editable map, each with its bounding box. */
function blockers(map: EditableMap): Blocker[] {
  const list: Blocker[] = [];
  for (const river of map.rivers) {
    const half = river.width / 2;
    const points = smoothCentreline(river.points).points;
    list.push({ box: pointsBox(points, half), inside: (x, y) => distanceToPolyline(x, y, points) <= half });
  }
  for (const pond of map.ponds) list.push({ box: polygonBox(pond.polygon), inside: (x, y) => pointInPolygon(x, y, pond.polygon) });
  for (const bridge of map.bridges) {
    const polygon = bridgePolygon(bridge);
    list.push({ box: polygonBox(polygon), inside: (x, y) => pointInPolygon(x, y, polygon) });
  }
  for (const road of map.roads) {
    if (!BARE_ROAD_SURFACES.has(roadType(road.type).surface)) continue;
    const half = road.width / 2;
    list.push({ box: pointsBox(road.points, half), inside: (x, y) => distanceToPolyline(x, y, road.points) <= half });
  }
  for (const object of map.objects) {
    const entry = catalogObject(object.type);
    if (!entry || entry.footprint.kind !== 'building') continue;
    const scale = object.scale ?? 1;
    const halfWidth = entry.halfWidth * scale;
    const halfDepth = entry.halfDepth * scale;
    const cos = Math.cos(object.rotation);
    const sin = Math.sin(object.rotation);
    const reach = Math.hypot(halfWidth, halfDepth);
    list.push({
      box: { minX: object.x - reach, minY: object.y - reach, maxX: object.x + reach, maxY: object.y + reach },
      inside: (x, y) => {
        const dx = x - object.x;
        const dy = y - object.y;
        return Math.abs(dx * cos + dy * sin) <= halfWidth && Math.abs(-dx * sin + dy * cos) <= halfDepth;
      },
    });
  }
  const channel = TRENCH.floor / 2 + TRENCH.wall;
  for (const line of map.trenches) list.push({ box: pointsBox(line.points, channel), inside: (x, y) => distanceToPolyline(x, y, line.points) <= channel });
  return list;
}

/** One byte per 1 m cell, as the vegetation raster: 1 where plants may grow, 0 where not. */
export function growthMask(map: EditableMap): Uint8Array {
  const side = mapSide(map.size);
  const half = side / 2;
  const mask = new Uint8Array(side * side).fill(1);
  for (const blocker of blockers(map)) {
    const fromX = Math.max(0, Math.floor(blocker.box.minX + half));
    const toX = Math.min(side - 1, Math.ceil(blocker.box.maxX + half));
    const fromY = Math.max(0, Math.floor(blocker.box.minY + half));
    const toY = Math.min(side - 1, Math.ceil(blocker.box.maxY + half));
    for (let row = fromY; row <= toY; row += 1) {
      for (let column = fromX; column <= toX; column += 1) {
        const index = row * side + column;
        if (mask[index] && blocker.inside(column - half + 0.5, row - half + 0.5)) mask[index] = 0;
      }
    }
  }
  return mask;
}

/** Whether a plant may grow at a point of an editable map. */
export function growableCell(map: EditableMap, x: number, y: number): boolean {
  return !blockers(map).some((blocker) => blocker.inside(x, y));
}

/** Vegetation cells the mask clears: how many, and the first one's centre. */
export function maskedVegetation(map: EditableMap, mask: Uint8Array = growthMask(map)): { count: number; at: Vec2 | null } {
  const side = mapSide(map.size);
  let count = 0;
  let at: Vec2 | null = null;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] || !map.vegetation[index]) continue;
    count += 1;
    at ??= { x: (index % side) - side / 2 + 0.5, y: Math.floor(index / side) - side / 2 + 0.5 };
  }
  return { count, at };
}

/**
 * The view's test for any battle map, with that map active: hand-written
 * maps' vegetation polygons are clipped by it when plants are placed. Their
 * concealment is the simulation's and stays as it is.
 */
export function plantableAt(map: BattleMap, x: number, y: number): boolean {
  if (waterAt(x, y) !== 0) return false;
  if (map.water.some((area) => (area.polygon && pointInPolygon(x, y, area.polygon)) || (area.strip && distanceToPolyline(x, y, area.strip.points) <= area.strip.width / 2))) return false;
  const surface = terrainSurfaceAt(x, y);
  if (surface === 'road' || surface === 'cobbles' || surface === 'trench-floor' || surface === 'trench') return false;
  if (map.bridges.some((bridge) => pointInPolygon(x, y, bridgePolygon(bridge)))) return false;
  return !map.buildings.some((building) => {
    const cos = Math.cos(building.rotation);
    const sin = Math.sin(building.rotation);
    const dx = x - building.x;
    const dy = y - building.y;
    return Math.abs(dx * cos + dy * sin) <= building.halfWidth && Math.abs(-dx * sin + dy * cos) <= building.halfDepth;
  });
}
