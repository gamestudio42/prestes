import { validateRoster } from '../sections';
import { FIGURE_SECTION } from './commander';
import type { Vec2 } from '../protocol';
import { findPath } from '../pathfinding';
import { isPointBlockedByCovers } from '../world';
import { setActiveMap } from './catalog';
import { catalogObject } from './catalog-objects';
import { compileMapDocument, isValidMapId, mapSide, type EditableMap } from './document';
import { pointInPolygon, pointInStrip } from './geometry';
import { maskedVegetation } from './growth-mask';
import { isDeepWater, vegetationAt } from './runtime';
import type { BattleMap } from './types';
import { insideDeploymentArea, polygonsOverlap } from './deployment-areas';
import { checkEvents, type EventProblemCode } from './validate-events';
import { checkWithdrawal, type WithdrawalProblemCode } from './validate-withdrawal';
import { MIN_DEPLOYMENT_GAP, MIN_WALKABLE_AREA_SHARE, walkableShare } from './validate';

/**
 * The editor's map checks (add-map-editor): the battle map rules plus the
 * document's own (names, source note, objects in bounds, overlapping
 * buildings, bridges over water) and a cover-gap warning. Each problem has a
 * locale code (`editor.problem.<code>`), parameters and the spot to jump to.
 */
export type ProblemCode =
  | 'invalid-id'
  | 'name-missing'
  | 'description-missing'
  | 'source-note-missing'
  | 'mission-missing'
  | 'column-force-invalid'
  | 'enemy-preset-invalid'
  | 'commander-not-campaign'
  | 'commander-no-comando'
  | 'section-count'
  | 'section-out-of-bounds'
  | 'section-not-walkable'
  | 'zones-too-close'
  | 'section-outside-area'
  | 'areas-overlap'
  | 'area-not-walkable'
  | 'no-path'
  | 'object-out-of-bounds'
  | 'unknown-object'
  | 'buildings-overlap'
  | 'bridge-not-over-water'
  | 'cover-gap'
  | 'masked-vegetation'
  | 'objective-count'
  | 'objective-name-missing'
  | 'objective-in-deep-water'
  | 'objective-unreachable'
  | 'objectives-overlap'
  | EventProblemCode
  | WithdrawalProblemCode;

export interface MapProblem {
  code: ProblemCode;
  severity: 'error' | 'warning';
  params: Record<string, string | number>;
  at?: Vec2;
  /** What to select when the problem is chosen. */
  target?: { kind: 'object' | 'section' | 'area' | 'bridge' | 'objective' | 'event' | 'event-place' | 'exit' | 'map-properties'; id: number | string };
}

/** Longest stretch without cover on the line between the zones (m) before a warning. */
export const MAX_COVER_GAP = 60;
/** add-map-objectives 1.2: a skirmish or test map holds this many objectives. */
export const OBJECTIVE_COUNT = { min: 3, max: 5 } as const;

function centroid(points: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / Math.max(1, points.length), y: y / Math.max(1, points.length) };
}

function corners(x: number, y: number, halfWidth: number, halfDepth: number, rotation: number): Vec2[] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ].map(([lx, ly]) => ({ x: x + lx! * cos - ly! * sin, y: y + lx! * sin + ly! * cos }));
}

/** Separating-axis test for two rotated rectangles. */
function rectanglesOverlap(a: Vec2[], b: Vec2[]): boolean {
  for (const shape of [a, b]) {
    for (let index = 0; index < 4; index += 1) {
      const p = shape[index]!;
      const q = shape[(index + 1) % 4]!;
      const nx = -(q.y - p.y);
      const ny = q.x - p.x;
      const project = (points: Vec2[]) => points.map((point) => point.x * nx + point.y * ny);
      const pa = project(a);
      const pb = project(b);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false;
    }
  }
  return true;
}

/** Longest run (m) along the segment with no cover, ditch or concealing vegetation within 4 m. */
export function longestCoverGap(map: BattleMap, from: Vec2, to: Vec2): { length: number; at: Vec2 } {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / 2));
  let run = 0;
  let best = { length: 0, at: from };
  let runStart = from;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const covered =
      vegetationAt(point.x, point.y) !== null ||
      map.covers.some((cover) => cover.quality > 0 && Math.hypot(cover.x - point.x, cover.y - point.y) <= Math.max(cover.halfWidth, cover.halfDepth) + 4);
    if (covered) {
      run = 0;
      runStart = point;
    } else {
      run = (step === 0 ? 0 : run + length / steps);
      if (run > best.length) best = { length: run, at: { x: (runStart.x + point.x) / 2, y: (runStart.y + point.y) / 2 } };
    }
  }
  return best;
}

/** Runs every check. Leaves the compiled map active; callers restore their own. */
export function validateEditableMap(map: EditableMap): MapProblem[] {
  const problems: MapProblem[] = [];
  const add = (problem: MapProblem): void => {
    problems.push(problem);
  };
  if (!isValidMapId(map.id)) add({ code: 'invalid-id', severity: 'error', params: { id: map.id } });
  for (const language of ['en', 'pt-BR'] as const) {
    if (!map.name[language].trim()) add({ code: 'name-missing', severity: 'error', params: { language } });
    if (!map.description[language].trim()) add({ code: 'description-missing', severity: 'warning', params: { language } });
  }
  if (!map.setting.sourceNote.trim()) {
    add({ code: 'source-note-missing', severity: map.use === 'campaign' ? 'error' : 'warning', params: {} });
  }
  // author-game-maps D1: a campaign map belongs to one mission.
  if (map.use === 'campaign' && !map.mission) add({ code: 'mission-missing', severity: 'error', params: {} });
  // The column's fixed force keeps the roster rules, the column's army only.
  if (map.columnForce && !validateRoster(map.columnForce, 'coluna', map.size).ok) add({ code: 'column-force-invalid', severity: 'error', params: {} });
  // scale-forces-by-map-size: each enemy preset keeps the limits of the map's size (a map made smaller may break them).
  (map.enemyForces ?? []).forEach((preset, index) => {
    if (preset.sections.length > 0 && !validateRoster(preset, undefined, map.size).ok) add({ code: 'enemy-preset-invalid', severity: 'error', params: { number: index + 1 } });
  });
  // add-historical-commander 1.2: a commander only on campaign maps; on the field he is a Comando's officer.
  if (map.commander && map.use !== 'campaign') add({ code: 'commander-not-campaign', severity: 'error', params: { map: map.id } });
  else if (map.commander?.presence === 'field' && !map.columnForce?.sections.includes(FIGURE_SECTION)) {
    add({ code: 'commander-no-comando', severity: 'error', params: { map: map.id } });
  }

  const compiled = compileMapDocument(map);
  setActiveMap(compiled);
  const half = mapSide(map.size) / 2;

  for (const object of map.objects) {
    const entry = catalogObject(object.type);
    if (!entry) {
      add({ code: 'unknown-object', severity: 'error', params: { type: object.type }, at: { x: object.x, y: object.y }, target: { kind: 'object', id: object.id } });
    } else if (Math.abs(object.x) > half || Math.abs(object.y) > half) {
      add({ code: 'object-out-of-bounds', severity: 'error', params: { type: object.type }, at: { x: object.x, y: object.y }, target: { kind: 'object', id: object.id } });
    }
  }

  const buildings = map.objects
    .map((object) => ({ object, entry: catalogObject(object.type) }))
    .filter(({ entry }) => entry?.footprint.kind === 'building');
  for (let i = 0; i < buildings.length; i += 1) {
    for (let j = i + 1; j < buildings.length; j += 1) {
      const a = buildings[i]!;
      const b = buildings[j]!;
      const sa = a.object.scale ?? 1;
      const sb = b.object.scale ?? 1;
      if (
        rectanglesOverlap(
          corners(a.object.x, a.object.y, a.entry!.halfWidth * sa, a.entry!.halfDepth * sa, a.object.rotation),
          corners(b.object.x, b.object.y, b.entry!.halfWidth * sb, b.entry!.halfDepth * sb, b.object.rotation),
        )
      ) {
        add({ code: 'buildings-overlap', severity: 'error', params: { a: a.object.type, b: b.object.type }, at: { x: a.object.x, y: a.object.y }, target: { kind: 'object', id: a.object.id } });
      }
    }
  }

  for (const bridge of map.bridges) {
    const overWater = compiled.water.some((area) =>
      area.kind === 'deep' && (area.polygon ? pointInPolygon(bridge.x, bridge.y, area.polygon) : area.strip ? pointInStrip(bridge.x, bridge.y, area.strip) : false),
    );
    if (!overWater) add({ code: 'bridge-not-over-water', severity: 'error', params: {}, at: { x: bridge.x, y: bridge.y }, target: { kind: 'bridge', id: bridge.id } });
  }

  for (const side of ['column', 'legalist'] as const) {
    // author-game-maps 8.2: the compiled starts, derived from the area.
    const zone = compiled.deployment[side];
    if (zone.sections.length !== 3) add({ code: 'section-count', severity: 'error', params: { side, count: zone.sections.length } });
    zone.sections.forEach((start, index) => {
      const target = { kind: 'area' as const, id: side };
      let reported = false;
      for (const [dx, dy] of [
        [0, 0],
        [-7, 0],
        [7, 0],
        [-7, 2.8],
        [7, 2.8],
      ] as const) {
        if (reported) break;
        const x = start.x + dx;
        const y = start.y + dy;
        if (Math.abs(x) > half || Math.abs(y) > half) {
          add({ code: 'section-out-of-bounds', severity: 'error', params: { side, section: index + 1 }, at: start, target });
          reported = true;
        } else if (isDeepWater(x, y) || isPointBlockedByCovers(x, y, compiled.covers, 0)) {
          add({ code: 'section-not-walkable', severity: 'error', params: { side, section: index + 1 }, at: start, target });
          reported = true;
        }
      }
    });
  }
  // add-deployment-phase 1.2: each section point inside its side's area, the areas apart and half walkable.
  for (const side of ['column', 'legalist'] as const) {
    const zone = compiled.deployment[side];
    zone.sections.forEach((start, index) => {
      if (!insideDeploymentArea(zone.area, start.x, start.y)) {
        add({ code: 'section-outside-area', severity: 'error', params: { side, section: index + 1 }, at: start, target: { kind: 'area', id: side } });
      }
    });
    const share = zone.area.length >= 3 ? walkableShare(zone.area, compiled.covers) : 0;
    if (share < MIN_WALKABLE_AREA_SHARE) {
      add({ code: 'area-not-walkable', severity: 'error', params: { side, percent: Math.round(share * 100) }, at: centroid(zone.area), target: { kind: 'area', id: side } });
    }
  }
  if (polygonsOverlap(map.deployment.column.area, map.deployment.legalist.area)) {
    add({ code: 'areas-overlap', severity: 'error', params: {}, at: centroid(map.deployment.column.area), target: { kind: 'area', id: 'column' } });
  }
  const column = centroid(compiled.deployment.column.sections);
  const legalist = centroid(compiled.deployment.legalist.sections);
  const gap = Math.hypot(column.x - legalist.x, column.y - legalist.y);
  if (gap < MIN_DEPLOYMENT_GAP) add({ code: 'zones-too-close', severity: 'error', params: { metres: Math.round(gap), minimum: MIN_DEPLOYMENT_GAP }, at: column });
  for (let index = 0; index < 3; index += 1) {
    const from = compiled.deployment.column.sections[index];
    const to = compiled.deployment.legalist.sections[index];
    if (from && to && findPath(from, to, compiled.covers).length === 0) {
      add({ code: 'no-path', severity: 'error', params: { section: index + 1 }, at: from, target: { kind: 'area', id: 'column' } });
    }
  }
  const coverGap = longestCoverGap(compiled, column, legalist);
  if (coverGap.length > MAX_COVER_GAP) {
    add({ code: 'cover-gap', severity: 'warning', params: { metres: Math.round(coverGap.length), maximum: MAX_COVER_GAP }, at: coverGap.at });
  }
  // refine-map-editor D2: plants painted where nothing grows (the compiler clears them).
  const masked = maskedVegetation(map);
  if (masked.count > 0) add({ code: 'masked-vegetation', severity: 'warning', params: { count: masked.count }, ...(masked.at ? { at: masked.at } : {}) });
  checkObjectives(map, compiled, add);
  // add-battle-events 1.3: the events and their places.
  for (const problem of checkEvents(map, compiled)) add(problem);
  // add-withdrawal-exits 6.2: the exits and the requirement.
  for (const problem of checkWithdrawal(map, compiled)) add(problem);
  return problems;
}

/**
 * add-map-objectives 1.2: names in both languages, the flag on dry ground,
 * a walkable point of each area reachable from both deployments, no two
 * areas overlapping; a skirmish or test map holds 3-5 (a warning, so a map
 * saved before objectives still loads).
 */
function checkObjectives(map: EditableMap, compiled: BattleMap, add: (problem: MapProblem) => void): void {
  const objectives = map.objectives ?? [];
  if (map.use !== 'campaign' && (objectives.length < OBJECTIVE_COUNT.min || objectives.length > OBJECTIVE_COUNT.max)) {
    add({ code: 'objective-count', severity: 'warning', params: { count: objectives.length, min: OBJECTIVE_COUNT.min, max: OBJECTIVE_COUNT.max } });
  }
  const starts = [compiled.deployment.column.sections[0], compiled.deployment.legalist.sections[0]].filter((point): point is Vec2 => Boolean(point));
  objectives.forEach((objective, index) => {
    const target = { kind: 'objective' as const, id: objective.id };
    const at = objective.flag;
    for (const language of ['pt-BR', 'en'] as const) {
      if (!objective.name[language].trim()) add({ code: 'objective-name-missing', severity: 'error', params: { language, id: objective.id }, at, target });
    }
    if (isDeepWater(at.x, at.y)) add({ code: 'objective-in-deep-water', severity: 'error', params: { name: objective.name['pt-BR'] }, at, target });
    // The flag, else the first walkable corner or the middle: the place men walk to.
    const candidates = [at, centroid(objective.area), ...objective.area];
    const goal = candidates.find((point) => !isDeepWater(point.x, point.y) && !isPointBlockedByCovers(point.x, point.y, compiled.covers, 0));
    if (!goal || starts.some((start) => findPath(start, goal, compiled.covers).length === 0)) {
      add({ code: 'objective-unreachable', severity: 'error', params: { name: objective.name['pt-BR'] }, at, target });
    }
    for (const other of objectives.slice(index + 1)) {
      if (polygonsOverlap(objective.area, other.area)) {
        add({ code: 'objectives-overlap', severity: 'error', params: { a: objective.name['pt-BR'], b: other.name['pt-BR'] }, at, target });
      }
    }
  });
}
