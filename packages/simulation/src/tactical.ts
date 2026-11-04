import {
  formationSlots as layoutSlots,
  matchDestinations,
  type UnitKind,
  type Vec2,
} from '@prestes/shared';

export interface ScoringUnit {
  x: number;
  y: number;
}

export interface ScoringTarget extends ScoringUnit {
  cover: number;
  suppressed: boolean;
  kind: UnitKind;
}

export const TARGET_HYSTERESIS = 20;
export const FORMATION_SPACING = 2.8;
export const FLANK_RADIUS = 9;

export function targetScore(
  unit: ScoringUnit,
  target: ScoringTarget,
  alliesTargeting = 0,
): number {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  let score = 140 - distance * 4 - target.cover * 80 - alliesTargeting * 25;
  if (target.suppressed) {
    score += 20;
  }
  if (target.kind === 'officer') {
    score += 15;
  }
  return score;
}

export function flankCandidates(target: Vec2, from: Vec2, radius = FLANK_RADIUS): Vec2[] {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) {
    return [];
  }
  const ux = dx / length;
  const uy = dy / length;
  const cos65 = 0.422618;
  const sin65 = 0.906308;
  const directions = [
    { x: -uy, y: ux },
    { x: uy, y: -ux },
    { x: ux * cos65 - uy * sin65, y: ux * sin65 + uy * cos65 },
    { x: ux * cos65 + uy * sin65, y: -ux * sin65 + uy * cos65 },
  ];
  return directions.map((direction) => ({
    x: target.x + direction.x * radius,
    y: target.y + direction.y * radius,
  }));
}

/**
 * Formation slots for `positions`, each matched to the soldier at the same
 * index by minimum total distance, so their routes do not cross.
 */
export function formationSlots(
  ...args: Parameters<typeof layoutSlots>
): Vec2[] {
  return matchDestinations(args[0], layoutSlots(...args));
}

