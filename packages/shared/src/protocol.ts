import type { BattleMapId, LocalizedText } from './maps/types';
import type { MapDocument } from './maps/document';
import type { Gait } from './gait';
import type { WeaponId } from './weapons';
import type { ArmyId } from './armies';
import type { Roster, SectionTypeId } from './sections';

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
  /** refine-battle-controls: a barbed-wire fence: crossable, at a health cost. */
  wire?: boolean;
  /**
   * add-map-editor: the map layer draws this cover as its object (a boulder,
   * a cart, a wall); the cover layer leaves it alone.
   */
  drawnBy?: 'map';
  /**
   * refine-map-editor D6: a fire trench's forward normal (unit, world). The
   * piece shelters only from threats on that side; its slots face it.
   */
  facing?: Vec2;
  /** refine-map-editor D6: a piece that offers no slots (a communication trench, a parapet's sandbags). */
  noSlots?: boolean;
  /** garrison-and-assault D1: a road ditch, shelter like a shallow trench but no position. */
  ditch?: boolean;
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
  | 'rescue'
  /** garrison-and-assault: go into a position (`positionId`); leave it toward `to`; close assault. */
  | 'enter'
  | 'exit'
  | 'assault';

export type UnitOrder =
  | OrderKind
  | 'attack'
  | 'suppress'
  /** scrub-concealment-and-area-fire: firing into the area of a suspected contact. */
  | 'area-fire'
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

export type Outcome = 'playing' | 'victory' | 'defeat' | 'draw';

/** add-map-objectives: how a battle was decided. */
export type DecidedBy = 'annihilation' | 'broken' | 'all-objectives' | 'objectives' | 'draw';

/** add-map-objectives: the battle's time limits (ticks at 10 a second): 15, 20 and 30 minutes. */
export const TIME_LIMITS = [9000, 12000, 18000] as const;
export const DEFAULT_TIME_LIMIT = 12000;

/** add-map-objectives: an objective's state in the frame. */
export interface ObjectiveSnapshot {
  id: number;
  owner: 'neutral' | 'column' | 'legalist';
  /** Capture progress of each side, 0-100 ticks. */
  progress: { column: number; legalist: number };
  contested: boolean;
  /** add-map-objectives 3.2: the objective's worth (1-3) and its localized name, for the HUD. */
  value: number;
  name: LocalizedText;
}

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
  /** add-run-toggle: the player set this soldier's pace to Run. */
  hurry?: boolean;
  /** garrison-and-assault: the position he is inside. */
  garrison?: number;
  /** garrison-and-assault 4.2: the position he is walking into. */
  entering?: number;
  /** garrison-and-assault 4.7: at an upper-floor window, that floor's height (m). */
  elevation?: number;
  /** add-battle-maps: hidden by the vegetation he is in (the view marks it). */
  concealed?: boolean;
  /** refine-battle-maps 5.14: in the vegetation but given away by his own shot ("Revelado"). */
  revealed?: boolean;
  /** add-battle-maps: aboard a ferry. */
  aboardFerry?: boolean;
  /** refine-battle-maps 5.4: at a landing, waiting for the ferry. */
  waitingFerry?: boolean;
  /** pre-battle-roster 5.2: the section type of a rostered man (absent in the default battle). */
  sectionType?: SectionTypeId;
  /** faction-armies 2.1: his army (his section type's, or his side's first); absent for targets. */
  army?: ArmyId;
  /** pre-battle-roster 5.2: a machine gunner's gun is set up ("pronta"); absent for other weapons. */
  gunSet?: boolean;
  /** machine-gun-fire-feedback 3.1: the gun moving, setting up or set; absent for other weapons (not hashed). */
  gunState?: GunState;
  /** machine-gun-fire-feedback 3.1: ticks of set-up left while setting up (0 once set). */
  gunSetupLeft?: number;
  /** scrub-concealment-and-area-fire: the disc he is firing into, while area fire lasts. */
  areaFire?: AreaFireDisc;
}

/** scrub-concealment-and-area-fire: the ground an area-fire order is laid on. */
export interface AreaFireDisc {
  x: number;
  y: number;
  radius: number;
}

/** machine-gun-fire-feedback 3.1: what a machine gun is doing. */
export type GunState = 'moving' | 'setting' | 'set';

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
  | 'no_rescue_target'
  /** add-deployment-phase: a fight order given in the deployment phase. */
  | 'not_during_deployment'
  /** add-deployment-phase: a deployment order whose positions leave the side's area. */
  | 'outside_deployment_area'
  /** add-deployment-phase: a deployment order whose positions fall in deep water or a footprint. */
  | 'blocked'
  /** garrison-and-assault: a position held by the enemy (assault it instead), or full. */
  | 'position_held'
  | 'position_full'
  /** garrison-and-assault: an exit point over 30 m from the position, or an assault from over 15 m. */
  | 'too_far'
  /** garrison-and-assault: an exit for men not inside, or an assault on a position the enemy does not hold. */
  | 'not_garrisoned'
  /** refine-battle-controls: a section already holds three queued orders. */
  | 'queue_full'
  /** scrub-concealment-and-area-fire: area fire on a point near no contact the side holds. */
  | 'no_suspected_contact'
  /** add-battle-events 2.5: firing an event by hand belongs to the editor's playtest. */
  | 'playtest_only';

export type Command =
  /** `facing`: the way the section faces on arrival, formation kept. */
  | { type: 'move'; unitIds: number[]; to: Vec2; facing?: Vec2; spacing?: number; queue?: boolean }
  | { type: 'stance'; unitIds: number[]; stance: Stance }
  | { type: 'formation'; unitIds: number[]; formation: FormationKind }
  | { type: 'attack'; unitIds: number[]; targetId: number; queue?: boolean }
  | { type: 'suppress'; unitIds: number[]; targetId: number; queue?: boolean }
  | { type: 'flank'; unitIds: number[]; targetId: number; queue?: boolean }
  /** scrub-concealment-and-area-fire: fire into the area of a suspected contact at `to`. */
  | { type: 'area_fire'; unitIds: number[]; to: Vec2 }
  | { type: 'withdraw'; unitIds: number[]; queue?: boolean }
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
      /** garrison-and-assault: the position an `enter` order goes into. */
      positionId?: number;
      /** refine-battle-controls: Shift queues the order behind the current one. */
      queue?: boolean;
    }
  /** garrison-and-assault: a close assault on an enemy-held position. */
  | { type: 'assault'; unitIds: number[]; positionId: number }
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
      /** pre-battle-roster 5.3: a troop of this section type (its men, weapons and speed); `count` is ignored. */
      section?: SectionTypeId;
    }
  | { type: 'training_phase'; setup: TrainingPhaseSetup }
  | { type: 'despawn_role'; role: UnitRole }
  | { type: 'incapacitate'; targetId: number }
  | { type: 'wound'; targetId: number; hp: number }
  | { type: 'reinforce'; faction: 'column' | 'legalist' }
  | { type: 'move_line'; unitIds: number[]; from: Vec2; to: Vec2 }
  /** Halt: stop and hold here, taking cover within reach; `facing` turns the section. */
  | { type: 'hold'; unitIds: number[]; facing?: Vec2; queue?: boolean }
  | { type: 'hold_fire'; unitIds: number[]; hold: boolean }
  /** add-run-toggle: the section's pace, Run (true) or Walk (false). */
  | { type: 'hurry'; unitIds: number[]; hurry: boolean }
  /** Free fire, fire on contact (hold until an enemy is close), or hold fire. */
  | { type: 'fire_control'; unitIds: number[]; mode: FireControl }
  | { type: 'posture'; unitIds: number[]; posture: Posture }
  | { type: 'face'; unitIds: number[]; to: Vec2 }
  | { type: 'set_bounding'; enabled: boolean }
  /** Sandbox: fog of war on or off (fog-of-war). */
  | { type: 'fog'; enabled: boolean }
  /** add-deployment-phase: ends the deployment phase; the next tick is the battle's first. */
  | { type: 'start_battle' }
  /** add-deployment-phase: puts the player's sections back at their default places. */
  | { type: 'reset_deployment' }
  /** add-battle-events 2.5: the editor's playtest fires a map event now, its delay skipped. */
  | { type: 'fire_battle_event'; eventId: number }
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
      /**
       * pre-battle-roster 5.4: an automatic weapon's round: true for the first
       * of its burst, false for the rest (the view draws one tracer and plays
       * one sound per burst). Absent for aimed fire.
       */
      burstStart?: boolean;
      /**
       * scrub-concealment-and-area-fire: a round of area fire. `x2/y2` is its
       * aim point in the disc (the man's place on a hit); `target` the man it
       * rolled against, or -1 when the disc held no one.
       */
      area?: true;
    }
  | { type: 'unit_hit'; tick: number; unitId: number; damage: number; hp: number }
  | { type: 'unit_died'; tick: number; unitId: number }
  | { type: 'unit_routed'; tick: number; unitId: number }
  | { type: 'unit_incapacitated'; tick: number; unitId: number }
  | { type: 'unit_evacuated'; tick: number; unitId: number }
  | { type: 'unit_recovered'; tick: number; unitId: number }
  | { type: 'recon_report'; tick: number; unitId: number; enemyIds: number[] }
  | { type: 'order_interrupted'; tick: number; unitId: number; order: UnitOrder }
  | {
      type: 'outcome';
      tick: number;
      outcome: Outcome;
      /** add-map-objectives: how it was decided, and each side's objective value at the end (battles with objectives). */
      decidedBy?: DecidedBy;
      values?: { column: number; legalist: number };
    }
  /** add-map-objectives: a side took an objective. */
  | { type: 'objective_taken'; tick: number; id: number; side: 'column' | 'legalist' }
  /** add-map-objectives: the first tick both sides stand in an objective. */
  | { type: 'objective_contested'; tick: number; id: number }
  /**
   * refine-battle-maps: a broken side (under a fifth of its strength, no
   * contact for 60 s) falls back off the field; its fit men rout.
   */
  | { type: 'side_fell_back'; tick: number; side: Faction }
  /**
   * fog-of-war: a shot by a soldier the target's side does not see. The marker
   * lies near the shooter, off by up to `radius` metres; it never names him.
   */
  | { type: 'unseen_fire'; tick: number; side: Faction; target: number; x: number; y: number; radius: number }
  /** add-deployment-phase: the deployment phase ended at `tick`; ticks run from here. */
  | { type: 'battle_started'; tick: number }
  | { type: 'unit_entered'; tick: number; unitId: number; positionId: number }
  | { type: 'unit_left'; tick: number; unitId: number; positionId: number }
  | { type: 'assault_started'; tick: number; positionId: number }
  | { type: 'assault_ended'; tick: number; positionId: number; winner: 'column' | 'legalist' }
  /** add-battle-events: a map event fired; `cards` are its narrative cards, in order. */
  | { type: 'battle_event_fired'; tick: number; eventId: number; cards?: Array<{ title: LocalizedText; text: LocalizedText }> };

/** add-battle-events 2.5: a map event's state, for the editor's playtest panel. */
export interface BattleEventState {
  id: number;
  label: string;
  state: 'waiting' | 'triggered' | 'fired';
  /** Battle ticks from the start when it fired. */
  firedAt?: number;
}

/** pre-battle-roster 5.4: whether a shot is drawn and heard: aimed fire, or the first round of a burst. */
export function shotShown(event: { burstStart?: boolean }): boolean {
  return event.burstStart !== false;
}

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
  /** pre-battle-roster 5.2: each machine-gun squad's belt pool, by squad id. */
  gunPools?: Readonly<Record<number, number>>;
  /** add-deployment-phase: the battle's phase, in battles started with one. */
  phase?: BattlePhase;
  /** garrison-and-assault: the held positions (absent when none is held). */
  garrisons?: readonly GarrisonSnapshot[];
  /** garrison-and-assault: the close fights under way, for the bars. */
  assaults?: readonly AssaultSnapshot[];
  /** add-map-objectives: the objectives' owners and capture (maps with objectives). */
  objectives?: readonly ObjectiveSnapshot[];
  /** add-map-objectives: the battle clock: ticks since the battle started, and the limit. */
  clock?: { tick: number; limit: number };
  /** refine-battle-controls: the orders queued with Shift, one entry per waiting order. */
  queuedOrders?: readonly QueuedOrderSnapshot[];
  /** add-battle-events 2.5: the map events' states, in the editor's playtest only. */
  battleEvents?: readonly BattleEventState[];
}

/** refine-battle-controls: an order waiting behind a section's current one. */
export interface QueuedOrderSnapshot {
  squadId: number;
  order: UnitOrder;
  targetId?: number;
  /** route-around-wire: a ground order's point, facing and spacing, so the view can draw its route (not hashed). */
  to?: Vec2;
  facing?: Vec2;
  spacing?: number;
}

/** garrison-and-assault: a position and the men inside it. */
export interface GarrisonSnapshot {
  positionId: number;
  side: 'column' | 'legalist';
  unitIds: readonly number[];
  /** Shared suppression of the whole garrison (0-100). */
  suppression: number;
  /**
   * 3.3: what the other side knows of it: held (fired on from it) or its
   * strength too (a man seen at a port). Absent while it is unknown.
   */
  known?: 'occupied' | 'counted';
  /** Set by the player's fog view: the garrison is known held, its strength not ("?"). */
  strengthUnknown?: true;
}

/** garrison-and-assault: a close fight's fit fighters, now and at its start. */
export interface AssaultSnapshot {
  positionId: number;
  attackers: number;
  defenders: number;
  attackersStart: number;
  defendersStart: number;
  attackerSide: 'column' | 'legalist';
}

/** add-deployment-phase: before the battle (no time passes) or the battle itself. */
export type BattlePhase = 'deployment' | 'battle';

/** pre-battle-roster 3.1: the forces of a 3v3. */
export interface BattleRosters {
  column: Roster;
  legalist?: Roster;
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
      /**
       * pre-battle-roster 3.1: the 3v3's forces. Absent: the default roster on
       * both sides. A `legalist` roster is fielded as is; without one the
       * engine draws one of the map's presets.
       */
      rosters?: BattleRosters;
      /** add-deployment-phase: open in the deployment phase (skirmishes); absent, the battle starts at once. */
      deployment?: boolean;
      /** add-map-objectives: the battle's time limit (one of TIME_LIMITS); absent, DEFAULT_TIME_LIMIT. */
      timeLimitTicks?: number;
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





























