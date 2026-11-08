import type { BattleMapId } from './maps/types';
import type { MapDocument } from './maps/document';
import type { Gait } from './gait';
import type { WeaponId } from './weapons';

export interface Vec2 {
  x: number;
  y: number;
}

export type UnitKind = 'infantry' | 'officer' | 'dummy';

export type Faction = 'column' | 'legalist' | 'cangaceiro' | 'civilian' | 'target';

/**
 * `fence` (add-battle-maps): a wire or rail fence, a hedge or a row of coffee
 * bushes. It stops movement and gives no cover.
 */
export type CoverKind = 'sandbag' | 'stone' | 'trench' | 'barrel' | 'low-wall' | 'building' | 'fence';

export interface CoverPoint {
  id: number;
  kind: CoverKind;
  rotation?: number;
  x: number;
  y: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
  radius: number;
  quality: number;
  blocksMovement: boolean;
  blocksSight: boolean;
  /**
   * add-map-editor: the map layer draws this cover as its object (a boulder,
   * a cart, a wall); the cover layer leaves it alone.
   */
  drawnBy?: 'map';
}

export interface SightObstacle {
  id: number;
  x: number;
  y: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
}

export type OrderKind = 'move' | 'withdraw' | 'flank';

export type FormationKind = 'line' | 'column' | 'wedge' | 'free';

export type TacticalOrder =
  | 'advance'
  | 'defend'
  | 'ambush'
  | 'regroup'
  | 'pursue'
  | 'disperse'
  | 'protect-officer'
  | 'recon'
  | 'reserve'
  | 'rescue';

export type UnitOrder =
  | OrderKind
  | 'attack'
  | 'suppress'
  | 'aim'
  | 'hold'
  | 'flee'
  | TacticalOrder;

export type SoldierState =
  | 'idle'
  | 'moving'
  | 'attacking'
  | 'in-cover'
  | 'supporting'
  | 'flanking'
  | 'retreating'
  | 'rallying'
  | 'wounded'
  | 'incapacitated'
  | 'rescuing'
  | 'being-carried'
  | 'treating'
  | 'evacuating'
  | 'recovering'
  | 'dead';

export type WoundSeverity = 'none' | 'light' | 'moderate' | 'severe' | 'fatal';

export type MoraleState = 'steady' | 'suppressed' | 'pinned' | 'panicked' | 'routed';

export type Stance = 'standing' | 'crouched' | 'prone';

export type Posture = 'balanced' | 'aggressive' | 'defensive' | 'protect-officer';

/** A section's fire control. */
export type FireControl = 'free' | 'contact' | 'hold';

export type Outcome = 'playing' | 'victory' | 'defeat';

export type UnitRole = 'training-enemy';

export interface TrainingPhaseSetup {
  phase: string;
  playerPoint: Vec2;
  officerPoint: Vec2;
  enemyPoint?: Vec2;
  enemyCount?: number;
  enemyRotation?: number;
  releaseTrainingFire?: boolean;
  /** Keep the instructor at its checkpoint instead of following the section. */
  pinInstructor?: boolean;
  /** Player soldiers to start the station incapacitated, for casualty drills. */
  casualtyCount?: number;
  /** Start the station with the instructor incapacitated. */
  instructorOut?: boolean;
}

export interface UnitSnapshot {
  id: number;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  aimX?: number | null;
  aimY?: number | null;
  kind: UnitKind;
  faction: Faction;
  stance: Stance;
  squadId: number;
  hp: number;
  weaponId: WeaponId;
  magazine: number;
  reserve: number;
  morale: number;
  alive: boolean;
  suppressed: boolean;
  suppression: number;
  cohesion: number;
  fatigue: number;
  formation: FormationKind;
  soldierState: SoldierState;
  incapacitated: boolean;
  rescueTargetId: number | null;
  rescueProgress: number;
  reconContacts: number;
  rescueQueueLength: number;
  wound: WoundSeverity;
  state: MoraleState;
  routed: boolean;
  dummy: boolean;
  role?: UnitRole;
  nonLethal?: boolean;
  cover: number;
  order: UnitOrder | null;
  targetId: number | null;
  /** Reserved cover slot, if any. */
  slotId?: number | null;
  holdFire?: boolean;
  fireControl?: FireControl;
  posture?: Posture;
  boundTeam?: 'a' | 'b' | null;
  boundPhase?: 'cover' | 'advance' | null;
  /** The gait while moving (order-tempo-and-facing); absent when halted. */
  gait?: Gait;
  /** add-battle-maps: hidden by the vegetation he is in (the view marks it). */
  concealed?: boolean;
  /** refine-battle-maps 5.14: in the vegetation but given away by his own shot ("Revelado"). */
  revealed?: boolean;
  /** add-battle-maps: aboard a ferry. */
  aboardFerry?: boolean;
  /** refine-battle-maps 5.4: at a landing, waiting for the ferry. */
  waitingFerry?: boolean;
}

export interface RosterRecord {
  id: number;
  hp: number;
  morale: number;
  alive: boolean;
  incapacitated: boolean;
  soldierState: SoldierState;
  wound: WoundSeverity;
  recoveryTicks: number;
}

export interface OrderPath {
  id: number;
  unitIds: readonly number[];
  points: readonly Vec2[];
  kind: OrderKind;
}

export type RejectionReason =
  | 'empty_units'
  | 'unknown_unit'
  | 'invalid_target'
  | 'sandbox_only'
  | 'invalid_cover'
  | 'invalid_position'
  | 'invalid_order'
  | 'invalid_state'
  | 'no_officer'
  | 'no_rescue_target';

export type Command =
  /** `facing`: the way the section faces on arrival, formation kept. */
  | { type: 'move'; unitIds: number[]; to: Vec2; facing?: Vec2; spacing?: number }
  | { type: 'stance'; unitIds: number[]; stance: Stance }
  | { type: 'formation'; unitIds: number[]; formation: FormationKind }
  | { type: 'attack'; unitIds: number[]; targetId: number }
  | { type: 'suppress'; unitIds: number[]; targetId: number }
  | { type: 'flank'; unitIds: number[]; targetId: number }
  | { type: 'withdraw'; unitIds: number[] }
  | {
      type: 'order';
      order: TacticalOrder;
      unitIds: number[];
      to?: Vec2;
      targetId?: number;
      /** Ground orders: the way the section faces on arrival. */
      facing?: Vec2;
      /** Ground orders: metres between soldiers, kept by the section. */
      spacing?: number;
    }
  | { type: 'spawn_cover'; kind: CoverKind; to: Vec2; rotation?: number }
  | { type: 'spawn_dummy'; to: Vec2; rotation?: number }
  | {
      type: 'spawn_troop';
      to: Vec2;
      faction: 'legalist' | 'target' | 'column';
      count?: number;
      dummy?: boolean;
      rotation?: number;
      role?: UnitRole;
      nonLethal?: boolean;
      holdFire?: boolean;
    }
  | { type: 'training_phase'; setup: TrainingPhaseSetup }
  | { type: 'despawn_role'; role: UnitRole }
  | { type: 'incapacitate'; targetId: number }
  | { type: 'wound'; targetId: number; hp: number }
  | { type: 'reinforce'; faction: 'column' | 'legalist' }
  | { type: 'move_line'; unitIds: number[]; from: Vec2; to: Vec2 }
  /** Halt: stop and hold here, taking cover within reach; `facing` turns the section. */
  | { type: 'hold'; unitIds: number[]; facing?: Vec2 }
  | { type: 'hold_fire'; unitIds: number[]; hold: boolean }
  /** Free fire, fire on contact (hold until an enemy is close), or hold fire. */
  | { type: 'fire_control'; unitIds: number[]; mode: FireControl }
  | { type: 'posture'; unitIds: number[]; posture: Posture }
  | { type: 'face'; unitIds: number[]; to: Vec2 }
  | { type: 'set_bounding'; enabled: boolean }
  /** Sandbox: fog of war on or off (fog-of-war). */
  | { type: 'fog'; enabled: boolean }
  | { type: 'noop' };

export interface CommandEnvelope {
  seq: number;
  tick: number;
  command: Command;
}

export type SimEvent =
  | { type: 'command_rejected'; tick: number; seq: number; reason: RejectionReason }
  | { type: 'unit_arrived'; tick: number; unitId: number }
  | {
      type: 'shot';
      tick: number;
      source: number;
      target: number;
      x: number;
      y: number;
      x2: number;
      y2: number;
      hit: boolean;
    }
  | { type: 'unit_hit'; tick: number; unitId: number; damage: number; hp: number }
  | { type: 'unit_died'; tick: number; unitId: number }
  | { type: 'unit_routed'; tick: number; unitId: number }
  | { type: 'unit_incapacitated'; tick: number; unitId: number }
  | { type: 'unit_evacuated'; tick: number; unitId: number }
  | { type: 'unit_recovered'; tick: number; unitId: number }
  | { type: 'recon_report'; tick: number; unitId: number; enemyIds: number[] }
  | { type: 'order_interrupted'; tick: number; unitId: number; order: UnitOrder }
  | { type: 'outcome'; tick: number; outcome: Outcome }
  /**
   * refine-battle-maps: a broken side (under a fifth of its strength, no
   * contact for 60 s) falls back off the field; its fit men rout.
   */
  | { type: 'side_fell_back'; tick: number; side: Faction }
  /**
   * fog-of-war: a shot by a soldier the target's side does not see. The marker
   * lies near the shooter, off by up to `radius` metres; it never names him.
   */
  | { type: 'unseen_fire'; tick: number; side: Faction; target: number; x: number; y: number; radius: number };

export interface Frame {
  tick: number;
  units: readonly UnitSnapshot[];
  orders: readonly OrderPath[];
  covers: readonly CoverPoint[];
  sightObstacles?: readonly SightObstacle[];
  events: readonly SimEvent[];
  outcome: Outcome;
  hash: string;
  /**
   * fog-of-war: the enemy soldiers each side sees (sorted ids), and whether
   * fog of war is on for this battle.
   */
  seen?: { readonly column: readonly number[]; readonly legalist: readonly number[] };
  fog?: boolean;
  /** add-battle-maps: each ferry raft's position. */
  ferries?: readonly { id: number; x: number; y: number; moving: boolean }[];
}

export type WorkerRequest =
  | {
      type: 'start';
      seed: number;
      sandbox?: boolean;
      training?: boolean;
      opposition?: boolean;
      bounding?: boolean;
      scenario?: 'bootcamp' | 'battle3v3';
      /** add-battle-maps: the 3v3's battle map. */
      battleMap?: BattleMapId;
      /**
       * add-map-editor: an unsaved map (the editor's playtest). The worker
       * compiles it itself and registers it under its id, which `battleMap`
       * then names.
       */
      mapDocument?: MapDocument;
    }
  | { type: 'command'; command: Command }
  | { type: 'step'; ticks: number };

export type WorkerResponse =
  | { type: 'ready'; frame: Frame }
  | { type: 'frame'; frame: Frame }
  | { type: 'error'; message: string };

export interface PortLike {
  postMessage(message: WorkerResponse): void;
}





























