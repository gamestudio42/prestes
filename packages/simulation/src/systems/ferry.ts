import { FERRY_CAPACITY, FERRY_CROSSING_TICKS } from '@prestes/shared';
import type { FerryCrossing, Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';

/**
 * The cable ferry (add-battle-maps): the one moving piece of a battle map. A
 * path over the river by the ferry runs landing to landing; a soldier who
 * reaches the near landing waits there, boards when the ferry is docked on
 * his side with room, rides FERRY_CROSSING_TICKS and steps off on the far
 * landing to walk on. The ferry crosses when it has passengers, or empty when
 * it is called from the far landing.
 */
export interface FerryState {
  readonly id: number;
  readonly a: Vec2;
  readonly b: Vec2;
  /** The landing it is at, or crossing from. */
  at: 'a' | 'b';
  moving: boolean;
  /** Ticks into the crossing. */
  progress: number;
  /** Ticks left before it casts off with the men aboard. */
  departIn: number;
  aboard: number[];
}

/** It waits this long (ticks, 2 s) after the first man boards for more. */
export const FERRY_BOARDING_TICKS = 20;
/** A soldier this close (m) to a landing, bound across, is waiting for the ferry. */
const LANDING_REACH = 3;

export function createFerries(crossings: readonly FerryCrossing[]): FerryState[] {
  return crossings.map((crossing) => ({
    id: crossing.id,
    a: { ...crossing.landingA },
    b: { ...crossing.landingB },
    at: 'a',
    moving: false,
    progress: 0,
    departIn: 0,
    aboard: [],
  }));
}

const near = (unit: { x: number; y: number }, point: Vec2, reach: number) =>
  (unit.x - point.x) ** 2 + (unit.y - point.y) ** 2 <= reach * reach;

const same = (left: Vec2, right: Vec2) => Math.abs(left.x - right.x) < 0.01 && Math.abs(left.y - right.y) < 0.01;

/** The landing a soldier is waiting at for this ferry, or null. */
export function waitingSide(ferry: FerryState, unit: MutableUnit): 'a' | 'b' | null {
  if (unit.ferryId !== undefined || !unit.alive || unit.incapacitated || unit.routed) return null;
  const next = unit.path[unit.pathIndex];
  if (!next) return null;
  if (same(next, ferry.b) && near(unit, ferry.a, LANDING_REACH)) return 'a';
  if (same(next, ferry.a) && near(unit, ferry.b, LANDING_REACH)) return 'b';
  return null;
}

/** Whether the soldier is held by a ferry: waiting at a landing or aboard. */
export function heldByFerry(ctx: SimContext, unit: MutableUnit): boolean {
  if (unit.ferryId !== undefined) return true;
  return ctx.ferries.some((ferry) => waitingSide(ferry, unit) !== null);
}

/** Whether the soldier's next waypoint is a ferry landing: he is queuing for it, not stuck. */
export function headingForLanding(ctx: SimContext, unit: MutableUnit): boolean {
  const next = unit.path[unit.pathIndex];
  if (!next) return false;
  return ctx.ferries.some((ferry) => same(next, ferry.a) || same(next, ferry.b));
}

/** A place on the deck (2 x 3 m) for the n-th man aboard. */
function deckOffset(index: number): Vec2 {
  return { x: (index % 2) * 1.2 - 0.6, y: Math.floor(index / 2) * 1.2 - 1.2 };
}

function position(ferry: FerryState): Vec2 {
  const from = ferry.at === 'a' ? ferry.a : ferry.b;
  const to = ferry.at === 'a' ? ferry.b : ferry.a;
  const t = ferry.moving ? ferry.progress / FERRY_CROSSING_TICKS : 0;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

export function updateFerries(ctx: SimContext): void {
  for (const ferry of ctx.ferries) {
    const byId = new Map(ctx.units.map((unit) => [unit.id, unit]));
    if (ferry.moving) {
      ferry.progress += 1;
      if (ferry.progress >= FERRY_CROSSING_TICKS) {
        ferry.moving = false;
        ferry.progress = 0;
        ferry.at = ferry.at === 'a' ? 'b' : 'a';
        const landing = ferry.at === 'a' ? ferry.a : ferry.b;
        // Off on the landing, a little apart, and on along the path.
        ferry.aboard.forEach((id, index) => {
          const unit = byId.get(id);
          if (!unit) return;
          unit.ferryId = undefined;
          const offset = deckOffset(index);
          unit.x = landing.x + offset.x;
          unit.y = landing.y + offset.y;
          unit.targetX = unit.x;
          unit.targetY = unit.y;
        });
        ferry.aboard = [];
      }
    } else {
      const side = ferry.at;
      const waiting = ctx.units
        .filter((unit) => waitingSide(ferry, unit) === side)
        .sort((left, right) => left.id - right.id);
      for (const unit of waiting) {
        if (ferry.aboard.length >= FERRY_CAPACITY) break;
        if (ferry.aboard.length === 0) ferry.departIn = FERRY_BOARDING_TICKS;
        ferry.aboard.push(unit.id);
        unit.ferryId = ferry.id;
        unit.moveSpeed = 0;
      }
      if (ferry.aboard.length > 0) {
        ferry.departIn -= 1;
        if (ferry.aboard.length >= FERRY_CAPACITY || ferry.departIn <= 0) {
          ferry.moving = true;
          ferry.progress = 0;
        }
      } else if (ctx.units.some((unit) => waitingSide(ferry, unit) === (side === 'a' ? 'b' : 'a'))) {
        // Called from the far landing: it crosses empty to fetch them.
        ferry.moving = true;
        ferry.progress = 0;
      }
    }
    // Men aboard ride the deck.
    const deck = position(ferry);
    ferry.aboard.forEach((id, index) => {
      const unit = byId.get(id);
      if (!unit) return;
      const offset = deckOffset(index);
      unit.x = deck.x + offset.x;
      unit.y = deck.y + offset.y;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      unit.moveSpeed = 0;
      if (unit.stance === 'prone') unit.stance = 'crouched';
    });
  }
}

/** The ferries for the frame: where each raft is now. */
export function ferrySnapshot(ctx: SimContext): { id: number; x: number; y: number; moving: boolean }[] {
  return ctx.ferries.map((ferry) => ({ id: ferry.id, ...position(ferry), moving: ferry.moving }));
}
