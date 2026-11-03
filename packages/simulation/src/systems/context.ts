import type { RNG } from '@prestes/kernel';
import type {
  CommandEnvelope,
  CoverPoint,
  Outcome,
  SightObstacle,
  SimEvent,
} from '@prestes/shared';
import type { OrderManager } from '../order-manager';
import type { ActiveOrder, BoundingGroup, MutableUnit } from './model';

/**
 * The mutable simulation state every system reads and writes. The engine
 * implements it and passes itself, so systems share one state object and run
 * in the engine's tick order.
 */
export interface SimContext {
  tickCount: number;
  readonly rng: RNG;
  readonly units: MutableUnit[];
  readonly covers: CoverPoint[];
  readonly sightObstacles: readonly SightObstacle[];
  readonly sandbox: boolean;
  readonly training: boolean;
  readonly opposition: boolean;
  readonly scenario: 'bootcamp' | 'battle3v3';
  readonly combatRange: number;
  boundingEnabled: boolean;
  readonly queue: CommandEnvelope[];
  orders: ActiveOrder[];
  lastEvents: SimEvent[];
  outcome: Outcome;
  nextSequence: number;
  nextOrderId: number;
  nextCoverId: number;
  nextUnitId: number;
  nextSquadId: number;
  readonly orderManager: OrderManager;
  readonly bounding: Map<number, BoundingGroup>;
}
