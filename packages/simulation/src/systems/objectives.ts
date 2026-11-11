import { pointInPolygon, type BattleMap, type LocalizedText, type ObjectiveSnapshot, type SimEvent, type Vec2 } from '@prestes/shared';
import type { SimContext } from './context';

/** add-map-objectives D2: ticks a side alone in an objective needs to take it (10 s). */
export const CAPTURE_TICKS = 100;
/** Progress lost each tick while nobody stands in the objective. */
export const CAPTURE_DECAY = 2;
/** add-map-objectives D3: ticks a side must hold every objective to win (2 min). */
export const ALL_HELD_TICKS = 1200;

type Side = 'column' | 'legalist';

export interface ObjectiveState {
  id: number;
  owner: 'neutral' | Side;
  progress: { column: number; legalist: number };
  contested: boolean;
  readonly value: number;
  /** add-map-objectives 3.2: the objective's name, for the HUD (localized). */
  readonly name: LocalizedText;
  /** add-map-objectives D4: where the flag stands, the point the commanders send men to. */
  readonly flag: Vec2;
  readonly area: readonly Vec2[];
}

/** The map's objectives at the start: each with its initial owner and no progress. */
export function createObjectives(map: BattleMap | null): ObjectiveState[] {
  return (map?.objectives ?? []).map((objective) => ({
    id: objective.id,
    owner: objective.owner,
    progress: { column: 0, legalist: 0 },
    contested: false,
    value: objective.value,
    name: objective.name,
    flag: { x: objective.flag.x, y: objective.flag.y },
    area: objective.area,
  }));
}

/** add-map-objectives D3: each side's total objective value (0 without objectives). */
export function objectiveValues(ctx: SimContext): { column: number; legalist: number } {
  const values = { column: 0, legalist: 0 };
  for (const objective of ctx.objectives) {
    if (objective.owner === 'column') values.column += objective.value;
    else if (objective.owner === 'legalist') values.legalist += objective.value;
  }
  return values;
}

/**
 * add-map-objectives 2.2: a side alone in an objective it does not hold
 * gains a tick of progress (the other side's resets) and takes it at
 * CAPTURE_TICKS; both sides in it contest it and progress freezes; nobody in
 * it, progress decays. An owner keeps it until the enemy takes it. Only fit
 * men count: alive, not incapacitated, not routed, no dummies; a garrison
 * counts where its men stand, so only inside this objective.
 */
export function updateObjectives(ctx: SimContext, tick: number, events: SimEvent[]): void {
  for (const objective of ctx.objectives) {
    const present = { column: false, legalist: false };
    for (const unit of ctx.units) {
      if (!unit.alive || unit.incapacitated || unit.routed || unit.dummy) continue;
      if (unit.faction !== 'column' && unit.faction !== 'legalist') continue;
      if (present[unit.faction]) continue;
      if (pointInPolygon(unit.x, unit.y, objective.area)) present[unit.faction] = true;
    }
    const contested = present.column && present.legalist;
    if (contested) {
      if (!objective.contested) events.push({ type: 'objective_contested', tick, id: objective.id });
      objective.contested = true;
      continue;
    }
    objective.contested = false;
    const side: Side | null = present.column ? 'column' : present.legalist ? 'legalist' : null;
    if (!side) {
      objective.progress.column = Math.max(0, objective.progress.column - CAPTURE_DECAY);
      objective.progress.legalist = Math.max(0, objective.progress.legalist - CAPTURE_DECAY);
      continue;
    }
    const other: Side = side === 'column' ? 'legalist' : 'column';
    objective.progress[other] = 0;
    if (objective.owner === side) {
      objective.progress[side] = 0;
      continue;
    }
    objective.progress[side] += 1;
    if (objective.progress[side] >= CAPTURE_TICKS) {
      objective.owner = side;
      objective.progress[side] = 0;
      events.push({ type: 'objective_taken', tick, id: objective.id, side });
    }
  }
}

/** The objectives for the frame and the hash. */
export function objectiveSnapshot(ctx: SimContext): ObjectiveSnapshot[] {
  return ctx.objectives.map((objective) => ({
    id: objective.id,
    owner: objective.owner,
    progress: { ...objective.progress },
    contested: objective.contested,
    value: objective.value,
    name: objective.name,
  }));
}

/**
 * add-map-objectives 3.2: the capture state the engine hashes. Names and values
 * are static map data, so they stay out of the hash (frames still carry them).
 */
export function objectiveHashState(ctx: SimContext): Array<{
  id: number;
  owner: 'neutral' | Side;
  progress: { column: number; legalist: number };
  contested: boolean;
}> {
  return ctx.objectives.map((objective) => ({
    id: objective.id,
    owner: objective.owner,
    progress: { ...objective.progress },
    contested: objective.contested,
  }));
}
