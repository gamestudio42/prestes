import type { Vec2 } from '../protocol';
import { findPath } from '../pathfinding';
import { SECTION_TYPES, isSectionTypeId, ROSTER_MAX_SECTIONS } from '../sections';
import { isPointBlockedByCovers } from '../world';
import type { EditableMap } from './document';
import { polygonsOverlap } from './deployment-areas';
import { pointInPolygon } from './geometry';
import { isDeepWater } from './runtime';
import type { BattleMap } from './types';
import { EXIT_CORNERS, EXIT_EDGE_DISTANCE, MAX_EXITS, type MapExit } from './withdrawal';

/** add-withdrawal-exits 6.2: the problems the exit checks report (locale `editor.problem.<code>`). */
export type WithdrawalProblemCode =
  | 'exit-corners'
  | 'exit-not-walkable'
  | 'exit-unreachable'
  | 'exit-in-deployment'
  | 'exit-name-missing'
  | 'exit-too-many'
  | 'exit-off-edge'
  | 'withdrawal-requirement-range'
  | 'withdrawal-no-command'
  | 'withdrawal-command-unsure';

export interface WithdrawalProblem {
  code: WithdrawalProblemCode;
  severity: 'error' | 'warning';
  params: Record<string, string | number>;
  at?: Vec2;
  target?: { kind: 'exit' | 'map-properties'; id: number | string };
}

/** The sections the column fields at the start: the map's fixed force, else the largest roster. */
export function columnSectionCount(map: Pick<EditableMap, 'columnForce'>): number {
  const fixed = map.columnForce?.sections.length ?? 0;
  return fixed > 0 ? fixed : ROSTER_MAX_SECTIONS;
}

function centre(points: readonly Vec2[]): Vec2 {
  const n = Math.max(1, points.length);
  return { x: points.reduce((sum, p) => sum + p.x, 0) / n, y: points.reduce((sum, p) => sum + p.y, 0) / n };
}

/** Points inside an exit to walk to: its middle, then a 4 m grid over its box. */
function samplePoints(exit: MapExit): Vec2[] {
  const xs = exit.polygon.map((p) => p.x);
  const ys = exit.polygon.map((p) => p.y);
  const points = [centre(exit.polygon)];
  for (let x = Math.min(...xs) + 2; x < Math.max(...xs); x += 4) {
    for (let y = Math.min(...ys) + 2; y < Math.max(...ys); y += 4) {
      points.push({ x, y });
    }
  }
  return points.filter((p) => pointInPolygon(p.x, p.y, exit.polygon)).slice(0, 200);
}

/**
 * add-withdrawal-exits 6.2: each exit's shape, walkable ground reachable from
 * the column's deployment, away from that deployment, named in both languages;
 * at most four; the requirement within the column's sections and its command
 * section; a warning for an exit away from the edge.
 */
export function checkWithdrawal(map: EditableMap, compiled: BattleMap): WithdrawalProblem[] {
  const withdrawal = map.withdrawal;
  if (!withdrawal) return [];
  const problems: WithdrawalProblem[] = [];
  const add = (problem: WithdrawalProblem) => problems.push(problem);
  if (withdrawal.exits.length > MAX_EXITS) add({ code: 'exit-too-many', severity: 'error', params: { count: withdrawal.exits.length, max: MAX_EXITS } });
  const start = compiled.deployment.column.sections[0];
  const area = compiled.deployment.column.area;
  const { minX, minY, maxX, maxY } = compiled.bounds;
  for (const exit of withdrawal.exits) {
    const target = { kind: 'exit' as const, id: exit.id };
    const name = exit.name['pt-BR'] || exit.name.en || String(exit.id);
    const where = exit.polygon.length > 0 ? { at: centre(exit.polygon) } : {};
    if (exit.polygon.length < EXIT_CORNERS.min || exit.polygon.length > EXIT_CORNERS.max) {
      add({ code: 'exit-corners', severity: 'error', params: { name, min: EXIT_CORNERS.min, max: EXIT_CORNERS.max }, ...where, target });
      continue;
    }
    for (const language of ['pt-BR', 'en'] as const) {
      if (!exit.name[language].trim()) add({ code: 'exit-name-missing', severity: 'error', params: { language, id: exit.id }, ...where, target });
    }
    const walkable = samplePoints(exit).filter((p) => !isDeepWater(p.x, p.y) && !isPointBlockedByCovers(p.x, p.y, compiled.covers, 0));
    if (walkable.length === 0) add({ code: 'exit-not-walkable', severity: 'error', params: { name }, ...where, target });
    else if (start && findPath(start, walkable[0]!, compiled.covers).length === 0) add({ code: 'exit-unreachable', severity: 'error', params: { name }, ...where, target });
    if (area.length >= 3 && polygonsOverlap(exit.polygon, area)) add({ code: 'exit-in-deployment', severity: 'error', params: { name }, ...where, target });
    const fromEdge = Math.min(...exit.polygon.map((p) => Math.min(p.x - minX, maxX - p.x, p.y - minY, maxY - p.y)));
    if (fromEdge > EXIT_EDGE_DISTANCE) add({ code: 'exit-off-edge', severity: 'warning', params: { name, metres: EXIT_EDGE_DISTANCE }, ...where, target });
  }
  const sections = columnSectionCount(map);
  const properties = { kind: 'map-properties' as const, id: 'withdrawal' };
  const required = withdrawal.requirement.sections;
  if (required < 1 || required > sections) add({ code: 'withdrawal-requirement-range', severity: 'error', params: { required, sections }, target: properties });
  if (withdrawal.requirement.command) {
    const fixed = map.columnForce?.sections ?? [];
    if (fixed.length === 0) add({ code: 'withdrawal-command-unsure', severity: 'warning', params: {}, target: properties });
    else if (!fixed.some((id) => isSectionTypeId(id) && SECTION_TYPES[id].limitGroup === 'command')) add({ code: 'withdrawal-no-command', severity: 'error', params: {}, target: properties });
  }
  return problems;
}
