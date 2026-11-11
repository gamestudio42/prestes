import type { CoverPoint, Frame, OrderPath, Outcome, SimEvent, UnitSnapshot } from './protocol';

export interface InterpolatedFrame {
  tick: number;
  units: UnitSnapshot[];
  orders: readonly OrderPath[];
  covers: readonly CoverPoint[];
  events: readonly SimEvent[];
  outcome: Outcome;
  hash: string;
  seen?: Frame['seen'];
  fog?: boolean;
  ferries?: Frame['ferries'];
  /** garrison-and-assault: held positions and close fights, as the frame has them. */
  garrisons?: Frame['garrisons'];
  assaults?: Frame['assaults'];
  /** add-map-objectives 3.1: the objectives and the battle clock, as the frame has them. */
  objectives?: Frame['objectives'];
  clock?: Frame['clock'];
}

/**
 * Read-only mirror of the worker frames. The main thread can only feed frames
 * in; it never gets a mutable simulation handle.
 */
export class ClientMirror {
  private currentFrame: Frame | null = null;
  private previousFrame: Frame | null = null;

  apply(frame: Frame): void {
    this.previousFrame = this.currentFrame;
    this.currentFrame = frame;
  }

  get current(): Frame | null {
    return this.currentFrame;
  }

  get previous(): Frame | null {
    return this.previousFrame;
  }

  interpolate(alpha: number): InterpolatedFrame | null {
    const current = this.currentFrame;
    if (!current) {
      return null;
    }

    const clamped = Math.max(0, Math.min(1, alpha));
    const previous = this.previousFrame;
    if (!previous) {
      return {
        tick: current.tick,
        orders: current.orders,
        covers: current.covers,
        outcome: current.outcome,
        hash: current.hash,
        events: current.events,
        seen: current.seen,
        fog: current.fog,
        ferries: current.ferries,
        ...(current.garrisons ? { garrisons: current.garrisons } : {}),
        ...(current.assaults ? { assaults: current.assaults } : {}),
        ...(current.objectives ? { objectives: current.objectives } : {}),
        ...(current.clock ? { clock: current.clock } : {}),
        units: current.units.map((unit) => ({ ...unit })),
      };
    }

    const previousById = new Map(previous.units.map((unit) => [unit.id, unit]));
    return {
      tick: current.tick,
      orders: current.orders,
      covers: current.covers,
      outcome: current.outcome,
      hash: current.hash,
      events: current.events,
      seen: current.seen,
      fog: current.fog,
      ferries: interpolateFerries(previous.ferries, current.ferries, clamped),
      ...(current.garrisons ? { garrisons: current.garrisons } : {}),
      ...(current.assaults ? { assaults: current.assaults } : {}),
      ...(current.objectives ? { objectives: current.objectives } : {}),
      ...(current.clock ? { clock: current.clock } : {}),
      units: current.units.map((unit) => {
        const previousUnit = previousById.get(unit.id);
        if (!previousUnit) {
          return { ...unit };
        }
        return {
          ...unit,
          x: previousUnit.x + (unit.x - previousUnit.x) * clamped,
          y: previousUnit.y + (unit.y - previousUnit.y) * clamped,
        };
      }),
    };
  }
}






function interpolateFerries(
  previous: Frame['ferries'],
  current: Frame['ferries'],
  alpha: number,
): Frame['ferries'] {
  if (!current) return current;
  return current.map((ferry) => {
    const before = previous?.find((entry) => entry.id === ferry.id);
    return before
      ? { ...ferry, x: before.x + (ferry.x - before.x) * alpha, y: before.y + (ferry.y - before.y) * alpha }
      : ferry;
  });
}
