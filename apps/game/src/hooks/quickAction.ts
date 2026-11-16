import type { PositionDef, Vec2 } from '@prestes/shared';

/** The simulation's ASSAULT_RANGE (m): a section farther from the door is refused (checked by a test). */
export const QUICK_ASSAULT_RANGE = 15;

/**
 * hud-icons-and-cursors: what a right-click does where the pointer is, with
 * sections selected and no order armed. One answer drives both the cursor
 * badge and the click, so the cursor never promises one order and the click
 * sends another.
 *
 * - On an enemy: attack his troop; on an enemy inside a building: assault it.
 * - On a wounded comrade: the casualty drill (rescue); on an able one: select.
 * - On a building that can be entered: enter it when it is empty or ours,
 *   assault it when the enemy holds it (marked far when the section stands
 *   beyond the assault range, which the simulation refuses).
 * - On the ground: a move, shown as wading on water, as taking cover on a
 *   cover, as running when the section runs.
 */
export type QuickAction =
  | 'select'
  | 'attack'
  | 'rescue'
  | 'enter'
  | 'assault'
  | 'ford'
  | 'cover'
  | 'run'
  | 'move';

/** The badge beside the pointer; selecting a comrade shows none. */
export type CursorHint = Exclude<QuickAction, 'select'> | 'assault-far';

/** The cursor badge a decision shows. */
export function cursorHint(decision: QuickDecision | null | undefined): CursorHint | null {
  if (!decision || decision.action === 'select') return null;
  return decision.far ? 'assault-far' : decision.action;
}

export type QuickHit =
  | { kind: 'unit'; faction: string; incapacitated?: boolean; garrison?: number }
  | { kind: 'building'; buildingId: number; point: Vec2 }
  | { kind: 'ground'; point: Vec2 };

export interface QuickContext {
  /** The selected sections' side. */
  side: string;
  /** The selection's centre, for the assault range. */
  from?: Vec2;
  positions: readonly PositionDef[];
  garrisons: readonly { positionId: number; side: string }[];
  /** The selection runs (add-run-toggle). */
  hurry: boolean;
  /** 0 dry, 1 ford, 2 deep. */
  waterAt: (x: number, y: number) => number;
  /** A cover (not a building) lies under the point. */
  coverAt: (point: Vec2) => boolean;
}

export interface QuickDecision {
  action: QuickAction;
  /** The building to enter or assault. */
  positionId?: number;
  /** An assault from beyond its range: the order would be refused. */
  far?: boolean;
}

/** Enter a building that is empty or ours; assault it when the enemy holds it. */
export function buildingOrder(
  positionId: number,
  side: string,
  garrisons: QuickContext['garrisons'],
): 'enter' | 'assault' {
  return garrisons.some((garrison) => garrison.positionId === positionId && garrison.side !== side) ? 'assault' : 'enter';
}

function assaultOn(position: PositionDef, context: QuickContext): QuickDecision {
  const from = context.from;
  const far =
    from !== undefined &&
    position.entrances.length > 0 &&
    position.entrances.every((door) => (door.x - from.x) ** 2 + (door.y - from.y) ** 2 > QUICK_ASSAULT_RANGE ** 2);
  return far ? { action: 'assault', positionId: position.id, far: true } : { action: 'assault', positionId: position.id };
}

function groundAction(point: Vec2, context: QuickContext): QuickDecision {
  if (context.waterAt(point.x, point.y) > 0) return { action: 'ford' };
  if (context.coverAt(point)) return { action: 'cover' };
  return { action: context.hurry ? 'run' : 'move' };
}

export function quickAction(hit: QuickHit, context: QuickContext): QuickDecision {
  if (hit.kind === 'unit') {
    if (hit.faction !== context.side) {
      const inside = hit.garrison === undefined ? undefined : context.positions.find((position) => position.id === hit.garrison && position.kind === 'building');
      return inside ? assaultOn(inside, context) : { action: 'attack' };
    }
    return { action: hit.incapacitated ? 'rescue' : 'select' };
  }
  if (hit.kind === 'building') {
    const position = context.positions.find((entry) => entry.id === hit.buildingId && entry.kind === 'building');
    // A building no one can enter (a ruin, a shed) is ground to walk round.
    if (!position || position.capacity <= 0) return groundAction(hit.point, context);
    return buildingOrder(position.id, context.side, context.garrisons) === 'assault'
      ? assaultOn(position, context)
      : { action: 'enter', positionId: position.id };
  }
  return groundAction(hit.point, context);
}
