import type { MoraleState, RejectionReason, UnitOrder } from '@prestes/shared';

export type OrderPriority = 'primary' | 'interrupt';
export type OrderTask =
  | 'move'
  | 'hold'
  | 'attack'
  | 'suppress'
  | 'cover'
  | 'carry'
  | 'treat'
  | 'evacuate'
  | 'observe'
  | 'flee';

export interface OrderSubject {
  id: number;
  alive: boolean;
  routed: boolean;
  incapacitated: boolean;
  beingCarriedBy: number | null;
  state: MoraleState;
}

export class UnitController<T extends OrderSubject> {
  constructor(public readonly subject: T) {}

  canReceiveOrder(): boolean {
    return (
      this.subject.alive &&
      !this.subject.routed &&
      !this.subject.incapacitated &&
      this.subject.beingCarriedBy === null &&
      this.subject.state !== 'panicked'
    );
  }
}

export interface OrderResolution<T extends OrderSubject> {
  actionable: T[];
  rejection: RejectionReason | null;
}

/**
 * Owns the command-to-soldier boundary. The engine keeps simulation state;
 * this class only decides which soldiers may receive a new order.
 */
export class OrderManager {
  resolve<T extends OrderSubject>(
    unitIds: readonly number[],
    units: readonly T[],
  ): OrderResolution<T> {
    if (unitIds.length === 0) {
      return { actionable: [], rejection: 'empty_units' };
    }
    const targets = unitIds.map((id) => units.find((unit) => unit.id === id));
    if (targets.some((unit) => unit === undefined)) {
      return { actionable: [], rejection: 'unknown_unit' };
    }
    const actionable = targets.filter(
      (unit): unit is T =>
        unit !== undefined && new UnitController(unit).canReceiveOrder(),
    );
    if (actionable.length === 0) {
      return { actionable: [], rejection: 'invalid_state' };
    }
    return { actionable, rejection: null };
  }

  priorityFor(order: UnitOrder | null): OrderPriority {
    return order === 'rescue' ? 'interrupt' : 'primary';
  }

  taskFor(order: UnitOrder | null): OrderTask | null {
    switch (order) {
      case 'move':
      case 'advance':
      case 'withdraw':
      case 'flank':
      case 'regroup':
      case 'protect-officer':
        return 'move';
      case 'attack':
        return 'attack';
      case 'suppress':
        return 'suppress';
      case 'hold':
      case 'defend':
      case 'ambush':
      case 'disperse':
      case 'recon':
      case 'reserve':
        return 'hold';
      case 'pursue':
        return 'observe';
      case 'rescue':
        return 'carry';
      case 'flee':
        return 'flee';
      default:
        return null;
    }
  }
}

