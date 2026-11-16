import type { Vec2 } from '../protocol';
import { pointInPolygon } from './geometry';
import type { LocalizedText } from './types';

/**
 * add-withdrawal-exits D1: a map's exits for the column and what must get out
 * through them. Shared by the editor, the map check, the simulation and the view.
 */

/** A map carries at most this many exits. */
export const MAX_EXITS = 4;
/** An exit has this many corners. */
export const EXIT_CORNERS = { min: 3, max: 16 } as const;
/** An exit further than this (m) from the map edge is reported as a warning. */
export const EXIT_EDGE_DISTANCE = 10;
/** The most sections an "exited" trigger or a requirement may name. */
export const MAX_EXIT_SECTIONS = 6;

export interface MapExit {
  id: number;
  name: LocalizedText;
  polygon: Vec2[];
}

export interface WithdrawalRequirement {
  /** Column sections that must get out, 1 or more. */
  sections: number;
  /** The command section must be one of them. */
  command: boolean;
}

export interface Withdrawal {
  exits: MapExit[];
  requirement: WithdrawalRequirement;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isPoint = (value: unknown): value is Vec2 => isObject(value) && isNumber(value.x) && isNumber(value.y);
const isText = (value: unknown): value is LocalizedText => isObject(value) && isString(value.en) && isString(value['pt-BR']);

export function isMapExit(value: unknown): value is MapExit {
  return isObject(value) && isNumber(value.id) && isText(value.name) && Array.isArray(value.polygon) && value.polygon.length >= EXIT_CORNERS.min && value.polygon.every(isPoint);
}

/** The document's shape check (ranges and reachability are the map check's job). */
export function isWithdrawal(value: unknown): value is Withdrawal {
  return (
    isObject(value) &&
    Array.isArray(value.exits) &&
    value.exits.every(isMapExit) &&
    isObject(value.requirement) &&
    isNumber(value.requirement.sections) &&
    typeof value.requirement.command === 'boolean'
  );
}

const round = (value: number) => Math.round(value * 100) / 100;

/** The withdrawal the battle runs: none without an exit; the requirement at least 1 section. */
export function compileWithdrawal(withdrawal: Withdrawal | undefined): Withdrawal | undefined {
  if (!withdrawal) return undefined;
  const exits = withdrawal.exits
    .filter((exit) => exit.polygon.length >= EXIT_CORNERS.min)
    .slice(0, MAX_EXITS)
    .map((exit) => ({ id: exit.id, name: { ...exit.name }, polygon: exit.polygon.slice(0, EXIT_CORNERS.max).map((p) => ({ x: round(p.x), y: round(p.y) })) }));
  if (exits.length === 0) return undefined;
  return { exits, requirement: { sections: Math.max(1, Math.round(withdrawal.requirement.sections)), command: withdrawal.requirement.command } };
}

/** The exit a point stands in, or null. */
export function exitAt(withdrawal: Withdrawal | undefined, x: number, y: number): MapExit | null {
  if (!withdrawal) return null;
  for (const exit of withdrawal.exits) {
    if (pointInPolygon(x, y, exit.polygon)) return exit;
  }
  return null;
}

/** The middle of an exit (its corners' mean). */
export function exitCentre(exit: MapExit): Vec2 {
  const n = Math.max(1, exit.polygon.length);
  return { x: exit.polygon.reduce((sum, p) => sum + p.x, 0) / n, y: exit.polygon.reduce((sum, p) => sum + p.y, 0) / n };
}

/** The nearest point of an exit's outline to a point (the point itself when inside). */
export function nearestExitPoint(exit: MapExit, point: Vec2): Vec2 {
  if (pointInPolygon(point.x, point.y, exit.polygon)) return { x: point.x, y: point.y };
  let best = exit.polygon[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < exit.polygon.length; index += 1) {
    const a = exit.polygon[index]!;
    const b = exit.polygon[(index + 1) % exit.polygon.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
    const candidate = { x: a.x + dx * t, y: a.y + dy * t };
    const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
