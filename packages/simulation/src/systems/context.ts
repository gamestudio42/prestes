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
import type { BattleMemory } from './enemy-commander';
import type { VisionState } from './vision';

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
  /** Training: the instructor stays at its station checkpoint. */
  instructorPinned: boolean;
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
  /** The 3v3 battle's commander plans and each section's last contact. */
  readonly battle: BattleMemory;
  /** fog-of-war: whether the player is shown only what his side sees. */
  fog: boolean;
  /** fog-of-war: what each side sees and last saw of the other. */
  readonly vision: VisionState;
}
