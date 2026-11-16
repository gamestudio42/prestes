import { RNG, hashString } from '@prestes/kernel';
import {
  BOOTCAMP_COVERS,
  COVER_POINTS,
  DEFAULT_WEAPON_ID,
  WEAPONS,
  TRAINING_AMMUNITION,
  trainingLoad,
  isSectionTypeId,
  SECTION_TYPES,
  unitValues,
  MAX_HP,
  MAX_MORALE,
  SANDBOX_TERRAIN,
  TRAINING_GROUND,
  TRAINING_SIGHT_OBSTACLES,
  setActiveTerrain,
  setActiveMap,
  setActiveMapRuntime,
  waterAt,
  isDeepWater,
  sameCovers,
  battleMap,
  DEFAULT_BATTLE_MAP,
  coverAgainst,
  coverForStance,
  getWeapon,
  reloadMagazine,
  SUPPRESSION_DECAY,
  DEFAULT_TIME_LIMIT,
  DIFFICULTY_FACTORS,
  resolveDifficulty,
  type Difficulty,
  type DifficultyFactors,
} from '@prestes/shared';
import type {
  BattlePhase,
  BattleMap,
  BattleMapId,
  BattleRosters,
  Roster,
  WeaponId,
  TerrainFeature,
  Command,
  CommandEnvelope,
  CoverPoint,
  Frame,
  Outcome,
  PositionDef,
  SimEvent,
  RosterRecord,
  SightObstacle,
} from '@prestes/shared';
import { OrderManager } from './order-manager';
import { applyDeploymentCommand } from './systems/deployment';
import { deployEnemy } from './systems/enemy-deployment';
import { initialGunPools, updateMachineGuns } from './systems/machine-gun';
import { DEFAULT_UNITS, FATIGUE_REST, TRAINING_UNITS, battleUnits } from './systems/model';
import type { ActiveOrder, BoundingGroup, MutableUnit } from './systems/model';
import type { SimContext } from './systems/context';
import { snapshotUnits } from './systems/snapshot';
import { nearestEnemy, nearestOpenPoint } from './systems/geometry';
import {
  moveUnit,
  separateUnits,
  repairStalledMovement,
  repositionForSight,
  updateInstructorFollow,
  updatePostureMovement,
} from './systems/movement';
import { updateBounding } from './systems/bounding';
import { seekCover } from './systems/cover';
import { maintainSlots } from './systems/slots';
import { acquireTargets, fire, updateFacing, updateOutcome } from './systems/combat';
import {
  updateMoraleStates,
  reactToSuppression,
  fleePanicked,
  checkRouted,
  applyOfficerAura,
  applyCommandRadius,
  selfRally,
  updateCohesion,
  updateSoldierStates,
  updateOfficerLoss,
} from './systems/morale';
import { updateRescue, updateRecovery } from './systems/casualties';
import {
  updatePursuit,
  updateRecon,
  seekFlank,
  cleanupOrders,
  clearArrivedOrders,
} from './systems/orders';
import { applyCommand, applyQueuedOrders, queuedOrdersSnapshot } from './systems/commands';
import { createBattleMemory, updateBattleFlow } from './systems/enemy-commander';
import { createObjectives, objectiveHashState, objectiveSnapshot, updateObjectives, type ObjectiveState } from './systems/objectives';
import { createWithdrawalState, updateWithdrawal, withdrawalHashState, withdrawalSnapshot, type WithdrawalState } from './systems/withdrawal';
import { createScriptedState, scriptedHashState, scriptedSnapshot, updateBattleEvents, type ScriptedState } from './systems/battle-events';
import { createVisionState, seenSnapshot, updateVision } from './systems/vision';
import { createFerries, ferrySnapshot, headingForLanding, heldByFerry, updateFerries } from './systems/ferry';
import { defaultConcealedFire, settleLowInScrub } from './systems/concealment';
import type { FerryState } from './systems/ferry';
import { createPositions, garrisonSnapshot, pinGarrisons, updateGarrisons, type Garrison } from './systems/garrison';
import { assaultSnapshot, updateAssaults, type Assault } from './systems/assault';
import { applyRoster, levelReserve } from './systems/spawning';
import { reactToFire, screenOfficers } from './systems/fire-reaction';
import { handoverSuppress } from './systems/orders';

/**
 * refine-battle-maps: `hash: false` leaves the frame's state hash empty. The
 * game never reads it (tests and tools do), and on a town map it was about a
 * fifth of a tick's time.
 */
export interface FrameOptions {
  hash?: boolean;
}

export interface SimulationOptions {
  seed: number;
  scenario?: 'bootcamp' | 'battle3v3';
  /** fog-of-war: on by default in the 3v3, off elsewhere. */
  fog?: boolean;
  combatRange?: number;
  sandbox?: boolean;
  training?: boolean;
  opposition?: boolean;
  /**
   * The map a training engine runs on: the training ground (the bootcamp and
   * its sandbox tools) or the earlier training kit around the origin, which
   * the battle lab and the mechanics tests are laid out on.
   */
  map?: 'training-ground' | 'training-kit';
  bounding?: boolean;
  roster?: readonly RosterRecord[];
  /** The 3v3's battle map (add-battle-maps); the Vila Militar field by default. Tests may pass a map. */
  battleMap?: BattleMapId | BattleMap;
  /** pre-battle-roster 3.1: the 3v3's forces; absent, the default roster on both sides. */
  rosters?: BattleRosters;
  /** add-deployment-phase: open in the deployment phase. Headless tools and tests skip it unless they ask. */
  deployment?: boolean;
  /**
   * add-deployment-phase D4: the legalist commander places its sections on
   * the map's anchors before the first tick. Independent of the phase, so an
   * untouched deployment equals a battle without one.
   */
  enemyDeployment?: boolean;
  /** add-map-objectives: the battle's time limit in ticks; absent, DEFAULT_TIME_LIMIT (used from 2.3). */
  timeLimitTicks?: number;
  /** add-battle-events 2.5: the editor's playtest; map events can be fired by hand and their states ride the frame. */
  playtest?: boolean;
  /** add-difficulty-levels: the level the 3v3 is fought at; absent, Soldado. */
  difficulty?: Difficulty;
  /**
   * add-difficulty-levels 4.3: factors over the level's, for tests that pin the
   * balance before the levels and for the tuning tools. Never sent by the game.
   */
  factors?: Partial<DifficultyFactors>;
}

/** faction-armies 3.1: a section short of ammunition carries less in reserve. */
function sectionReserve(unit: object, reserve: number): number {
  const type = 'sectionType' in unit && typeof unit.sectionType === 'string' && isSectionTypeId(unit.sectionType) ? SECTION_TYPES[unit.sectionType] : undefined;
  return type?.ammunitionFactor === undefined ? reserve : Math.round(reserve * type.ammunitionFactor);
}

/** pre-battle-roster 3.2: the weapon a rostered battle names for a soldier (others carry the default). */
function rosteredWeapon(unit: object): WeaponId | undefined {
  return (unit as { weaponId?: WeaponId }).weaponId;
}

/**
 * pre-battle-roster 3.3: the forces a 3v3 fields. A `legalist` roster is used
 * as is. With only the player's, the enemy draws one of the map's presets with
 * the engine RNG (the default on a map without presets, with no draw). With
 * none, both sides field the default and the RNG is not drawn.
 */
export function resolveRosters(map: BattleMap, rosters: BattleRosters | undefined, rng: RNG): BattleRosters | undefined {
  // The map's fixed column force wins over the player's (a campaign mission).
  if (map.columnForce && map.columnForce.sections.length > 0) rosters = { ...rosters, column: { sections: [...map.columnForce.sections] } };
  if (!rosters) return undefined;
  // A scene without an enemy fields no legalist, whatever the roster brought.
  if (map.noEnemy) return { column: rosters.column };
  if (rosters.legalist) return { column: rosters.column, legalist: rosters.legalist };
  const presets = map.enemyForces ?? [];
  if (presets.length === 0) return { column: rosters.column };
  const legalist: Roster = presets[Math.min(presets.length - 1, Math.floor(rng.nextFloat() * presets.length))]!;
  return { column: rosters.column, legalist: { sections: [...legalist.sections] } };
}

export class SimulationEngine implements SimContext {
  tickCount = 0;
  readonly rng: RNG;
  readonly units: MutableUnit[];
  readonly covers: CoverPoint[];
  readonly sightObstacles: readonly SightObstacle[];
  readonly sandbox: boolean;
  readonly training: boolean;
  readonly opposition: boolean;
  private readonly terrain: readonly TerrainFeature[];
  /** The battle map, in the 3v3 only; other engines keep their own terrain. */
  readonly battleMap: BattleMap | null;
  readonly scenario: 'bootcamp' | 'battle3v3';
  /** The forces fielded, after the enemy's draw (rostered 3v3 only). */
  readonly rosters: BattleRosters | undefined;
  readonly combatRange: number;
  boundingEnabled: boolean;
  instructorPinned = false;
  readonly queue: CommandEnvelope[] = [];
  orders: ActiveOrder[] = [];
  lastEvents: SimEvent[] = [];
  outcome: Outcome = 'playing';
  nextSequence = 1;
  nextOrderId = 1;
  nextCoverId = COVER_POINTS.length + 1;
  nextUnitId = 1;
  nextSquadId = 10;
  readonly orderManager = new OrderManager();
  /** refine-battle-controls: the orders each section queued with Shift. */
  readonly orderQueues = new Map<number, Command[]>();
  readonly bounding = new Map<number, BoundingGroup>();
  readonly battle = createBattleMemory();
  readonly vision = createVisionState();
  readonly ferries: FerryState[];
  /** garrison-and-assault: the map's positions and the held ones. */
  readonly positions: readonly PositionDef[];
  readonly positionById: ReadonlyMap<number, PositionDef>;
  readonly garrisons = new Map<number, Garrison>();
  readonly assaults = new Map<number, Assault>();
  /** add-map-objectives: the map's objectives; capture runs in the battle phase. */
  readonly objectives: ObjectiveState[];
  /** add-map-objectives D3: the battle's time limit in ticks. */
  readonly timeLimitTicks: number;
  /** add-map-objectives D3: the tick the battle started (0 without a deployment phase). */
  battleStartTick = 0;
  /** add-map-objectives D3: the tick each side first held every objective. */
  readonly allHeldSince: { column: number | null; legalist: number | null } = { column: null, legalist: null };
  /** pre-battle-roster 4.3: the machine-gun squads' belt pools (rostered battles with a gun only). */
  gunPools?: Record<number, number>;
  /** add-battle-events: the map's events and their state (battle maps with events only). */
  readonly scripted?: ScriptedState;
  readonly withdrawal?: WithdrawalState;
  /** add-battle-events 2.5: the editor's playtest. */
  readonly playtest: boolean;
  /** add-difficulty-levels D2: the battle's level and its factors, fixed for the battle. */
  readonly difficulty: Difficulty;
  readonly factors: DifficultyFactors;
  private readonly factorOverride: boolean;
  fog: boolean;
  /** add-deployment-phase D1: no tick passes in deployment; `start_battle` begins the battle. */
  phase: BattlePhase;
  /** Whether this battle opened with a deployment phase (its frames then carry `phase`). */
  readonly hasDeployment: boolean;
  /** The player's men as the phase opened, for `reset_deployment`. */
  private deploymentStart: DeploymentPlace[] = [];

  constructor(options: SimulationOptions) {
    this.rng = new RNG(options.seed);
    this.sandbox = options.sandbox === true;
    this.training = options.training === true;
    this.opposition = options.opposition !== false;
    this.scenario = options.scenario ?? 'bootcamp';
    this.fog = options.fog ?? this.scenario === 'battle3v3';
    this.combatRange =
      options.combatRange ??
      (this.training || this.scenario === 'battle3v3' ? WEAPONS[DEFAULT_WEAPON_ID].range : 26);
    this.boundingEnabled = options.bounding === true;
    // The bootcamp runs on the training ground; the battle lab keeps the old
    // training kit and the default engine its sandbox map.
    const trainingGround =
      this.training && (options.map ?? 'training-ground') === 'training-ground';
    this.battleMap =
      this.scenario === 'battle3v3'
        ? typeof options.battleMap === 'object'
          ? options.battleMap
          : battleMap(options.battleMap ?? DEFAULT_BATTLE_MAP)
        : null;
    this.covers = (
      trainingGround
        ? TRAINING_GROUND.covers
        : this.battleMap
          ? this.battleMap.covers
          : this.training
            ? BOOTCAMP_COVERS
            : COVER_POINTS
    ).map((cover) => ({ ...cover }));
    this.sightObstacles = trainingGround
      ? TRAINING_GROUND.sightObstacles
      : this.battleMap
        ? this.battleMap.id === DEFAULT_BATTLE_MAP && this.training
          ? TRAINING_SIGHT_OBSTACLES
          : this.battleMap.sightObstacles
        : this.training
          ? TRAINING_SIGHT_OBSTACLES
          : [];
    this.terrain = trainingGround ? TRAINING_GROUND.terrain : SANDBOX_TERRAIN;
    this.ferries = createFerries(this.battleMap?.ferries ?? []);
    const positions = createPositions(this.battleMap ? { ...this.battleMap, covers: this.covers } : null);
    this.positions = positions.positions;
    this.objectives = createObjectives(this.battleMap);
    this.timeLimitTicks = options.timeLimitTicks ?? DEFAULT_TIME_LIMIT;
    this.playtest = options.playtest === true;
    this.difficulty = resolveDifficulty(options.difficulty);
    this.factors = { ...DIFFICULTY_FACTORS[this.difficulty], ...options.factors };
    this.factorOverride = options.factors !== undefined;
    if (this.battleMap?.events && this.battleMap.events.length > 0) this.scripted = createScriptedState(this.battleMap.events, this.battleMap.eventPlaces);
    this.withdrawal = createWithdrawalState(this.battleMap?.withdrawal);
    this.positionById = positions.byId;
    this.selectTerrain();
    this.rosters = this.battleMap ? resolveRosters(this.battleMap, options.rosters, this.rng) : undefined;
    const source =
      this.battleMap
        ? battleUnits(this.battleMap, this.rosters)
        : this.training && !this.opposition
          ? TRAINING_UNITS
          : DEFAULT_UNITS;
    this.nextUnitId = source.length + 1;
    this.nextSquadId = this.scenario === 'battle3v3' ? 20 : 10;
    this.units = source
      .filter(
        (unit) => this.scenario === 'battle3v3' || this.opposition || unit.faction === 'column',
      )
      .map((unit) => ({
        ...unit,
        targetX: unit.x,
        targetY: unit.y,
        hp: MAX_HP,
        weaponId: rosteredWeapon(unit) ?? DEFAULT_WEAPON_ID,
        // The 3v3 is a training battle: both sides draw the depot issue
        // (pre-battle-roster 1.2: each weapon its own).
        ...(rosteredWeapon(unit)
          ? { magazine: trainingLoad(rosteredWeapon(unit)!).magazine, reserve: sectionReserve(unit, trainingLoad(rosteredWeapon(unit)!).reserve) }
          : (this.training && unit.faction === 'column') || this.scenario === 'battle3v3'
          ? TRAINING_AMMUNITION
          : {
              magazine: WEAPONS[DEFAULT_WEAPON_ID].magazine,
              reserve: WEAPONS[DEFAULT_WEAPON_ID].reserve,
            }),
        // faction-armies 3.1: a rostered man starts with his army's and section's morale and cohesion.
        morale: 'sectionType' in unit && unit.sectionType !== undefined ? unitValues(unit).morale : MAX_MORALE,
        alive: true,
        suppressed: false,
        suppression: 0,
        cohesion: 'sectionType' in unit && unit.sectionType !== undefined ? unitValues(unit).cohesion : 100,
        fatigue: 0,
        formation: 'line',
        orderDestination: null,
        orderIssued: false,
        orderRegionCenter: null,
        orderRegionRadius: 0,
        soldierState: 'idle',
        incapacitated: false,
        state: 'steady',
        routed: false,
        panicTicks: 0,
        cover: 0,
        targetId: null,
        cooldown: 0,
        reload: 0,
        path: [],
        pathIndex: 0,
        facingX: this.battleMap ? this.battleMap.deployment[unit.faction === 'column' ? 'column' : 'legalist'].facing.x : 0,
        facingY: this.battleMap
          ? this.battleMap.deployment[unit.faction === 'column' ? 'column' : 'legalist'].facing.y
          : unit.faction === 'column'
            ? -1
            : 1,
        aimX: null,
        aimY: null,
        stanceLocked: false,
        coverSeekCooldown: 0,
        flankTargetId: null,
        flankCooldown: 0,
        suppressionCooldown: 0,
        suppress: false,
        holdPosition: false,
        holdFire: false,
        posture: 'balanced',
        boundTeam: null,
        boundPhase: null,
        targetLocked: false,
        currentOrder: null,
        lineMove: false,
        dummy: false,
        nonLethal: false,
        ambush: false,
        officerLossApplied: false,
        slotId: null,
        reserveMode: false,
        recon: false,
        reconReported: false,
        reconContacts: 0,
        rescueTargetId: null,
        rescueQueue: [],
        wound: 'none',
        rescueTicks: 0,
        treatTicks: 0,
        carryingId: null,
        beingCarriedBy: null,
        recoveryTicks: 0,
      }));
    // add-difficulty-levels: the player's side carries the level's share of its reserve.
    if (this.scenario === 'battle3v3') {
      for (const unit of this.units) unit.reserve = levelReserve(this, unit.faction, unit.reserve);
    }
    applyRoster(this, options.roster ?? []);
    if (this.rosters) {
      const pools = initialGunPools(this.units);
      if (Object.keys(pools).length > 0) this.gunPools = pools;
    }
    if (options.enemyDeployment && this.battleMap) deployEnemy(this);
    this.hasDeployment = options.deployment === true && this.battleMap !== null;
    this.phase = this.hasDeployment ? 'deployment' : 'battle';
    if (this.hasDeployment) this.deploymentStart = this.units.filter((unit) => unit.faction === 'column').map(placeOf);
  }

  /** Makes this engine's terrain and map the ones the shared queries read. */
  selectTerrain(): void {
    if (this.battleMap) {
      setActiveMap(this.battleMap);
    } else {
      setActiveTerrain(this.terrain);
      setActiveMapRuntime(null);
    }
  }

  roster(): RosterRecord[] {
    return this.units
      .filter((unit) => unit.faction === 'column' && !unit.dummy)
      .map((unit) => ({
        id: unit.id,
        hp: unit.hp,
        morale: unit.morale,
        alive: unit.alive,
        incapacitated: unit.incapacitated,
        soldierState: unit.soldierState,
        wound: unit.wound,
        recoveryTicks: unit.recoveryTicks,
      }));
  }

  enqueue(command: Command): number {
    const seq = this.nextSequence;
    this.nextSequence += 1;
    this.queue.push({ seq, tick: this.tickCount + 1, command });
    return seq;
  }

  tick(): Frame {
    this.step();
    return this.frame();
  }

  /**
   * Advances the state one tick; `tick` adds the frame. refine-battle-maps:
   * `runTicks` steps and builds one frame at the end, instead of a frame (and
   * its state hash) on every tick it then dropped.
   */
  private step(): void {
    // Engines can share a thread (tests, tools): select this map's terrain.
    this.selectTerrain();
    if (this.phase === 'deployment') {
      this.stepDeployment();
      return;
    }
    const nextTick = this.tickCount + 1;
    const events: SimEvent[] = [];

    if (this.outcome === 'playing') {
      for (const envelope of this.queue.splice(0, this.queue.length)) {
        applyCommand(this, envelope, nextTick, events);
      }
      // refine-battle-controls: a section with no order of its own takes the
      // oldest queued one.
      applyQueuedOrders(this, nextTick, events);

      maintainSlots(this);
      for (const unit of this.units) {
        // A soldier at a ferry landing or aboard is moved by the ferry.
        if (this.ferries.length > 0 && heldByFerry(this, unit)) {
          unit.moveSpeed = 0;
          unit.stuckFrom = undefined;
        } else {
          // A man queuing for a landing waits his turn without giving up.
          if (this.ferries.length > 0 && headingForLanding(this, unit)) unit.stuckFrom = undefined;
          moveUnit(this, unit, nextTick, events);
        }
        if (unit.alive) {
          unit.suppression = Math.max(0, unit.suppression - SUPPRESSION_DECAY);
          const target =
            unit.targetId === null ? null : this.units.find((entry) => entry.id === unit.targetId);
          const threat = target?.alive ? target : nearestEnemy(this, unit);
          unit.cover = threat
            ? coverAgainst(unit.x, unit.y, threat.x, threat.y, unit.stance, this.covers)
            : coverForStance(unit.stance);
        }
        if (unit.alive && !unit.incapacitated) {
          unit.fatigue = Math.max(0, unit.fatigue - FATIGUE_REST);
        }
        if (unit.cooldown > 0) {
          unit.cooldown -= 1;
        }
        if (unit.reload > 0) {
          unit.reload -= 1;
          if (unit.reload === 0) {
            const weapon = getWeapon(unit.weaponId);
            if (weapon) {
              const reloaded = reloadMagazine(weapon, unit.magazine, unit.reserve);
              unit.magazine = reloaded.magazine;
              unit.reserve = reloaded.reserve;
            }
          }
        }
      }

      if (this.ferries.length > 0) updateFerries(this);
      // garrison-and-assault: men at an entrance go in; men leaving go out on their turn.
      if (this.positions.length > 0) updateGarrisons(this, nextTick, events);
      if (this.positions.length > 0) updateAssaults(this, nextTick, events);
      separateUnits(this);
      if (this.battleMap?.height.kind === 'field') keepOutOfDeepWater(this);
      // add-withdrawal-exits D2: men in an exit leave before anyone looks or shoots.
      if (this.withdrawal) updateWithdrawal(this, nextTick, events);
      // Vision before targets and fire: a side shoots with what it knows.
      updateVision(this, nextTick);

      handoverSuppress(this);
      acquireTargets(this);
      // The officer's guards are placed before each soldier's own reaction.
      screenOfficers(this);
      reactToFire(this);
      reactToSuppression(this);
      seekFlank(this);
      seekCover(this);
      updateBounding(this);
      if (nextTick % 8 === 0) {
        repairStalledMovement(this);
        repositionForSight(this);
      }
      updatePostureMovement(this);
      if (nextTick % 8 === 0) {
        updateInstructorFollow(this);
      }
      updateRecon(this, nextTick, events);
      updateRescue(this, nextTick, events);
      updateMachineGuns(this);
      fire(this, nextTick, events);
      updatePursuit(this, nextTick, events);
      updateBattleFlow(this, nextTick, events);
      settleLowInScrub(this);
      defaultConcealedFire(this);
      updateOfficerLoss(this, nextTick, events);
      applyOfficerAura(this);
      applyCommandRadius(this);
      selfRally(this);
      updateCohesion(this);
      updateMoraleStates(this);
      updateRecovery(this, nextTick, events);
      updateSoldierStates(this);
      fleePanicked(this);
      checkRouted(this, nextTick, events);
      clearArrivedOrders(this);
      cleanupOrders(this);
      // garrison-and-assault: no other system moves a man inside; he stands at his port.
      if (this.garrisons.size > 0) pinGarrisons(this, nextTick);
      updateFacing(this);
      if (this.battleMap?.height.kind === 'field') keepOffFordFloor(this);
      if (this.objectives.length > 0) updateObjectives(this, nextTick, events);
      // add-battle-events D3: after objectives and casualties, before the outcome.
      if (this.scripted) updateBattleEvents(this, nextTick, events);
      updateOutcome(this, nextTick, events);
    } else {
      this.queue.length = 0;
    }

    this.tickCount = nextTick;
    this.lastEvents = events;
  }

  /**
   * Runs several ticks and returns the last frame carrying the events of
   * every tick run. The client steps two ticks at 1x: dropping the earlier
   * ticks' events lost whole volleys (a section fires on the same tick), so
   * their shots had no sound, tracer or effect.
   */
  runTicks(count: number, options?: FrameOptions): Frame {
    // add-deployment-phase D1: in deployment one step applies the queue and no time passes.
    const asked = Math.max(0, Math.floor(count));
    const safeCount = this.phase === 'deployment' ? Math.min(1, asked) : asked;
    const events: SimEvent[] = [];
    for (let index = 0; index < safeCount; index += 1) {
      this.step();
      events.push(...this.lastEvents);
    }
    const frame = this.frame(options);
    return safeCount > 1 ? { ...frame, events } : frame;
  }

  frame(options?: FrameOptions): Frame {
    return {
      tick: this.tickCount,
      units: snapshotUnits(this),
      orders: this.orders.map((order) => ({
        id: order.id,
        unitIds: [...order.unitIds],
        points: order.points.map((point) => ({ ...point })),
        kind: order.kind,
      })),
      events: this.lastEvents.slice(),
      covers: this.frameCovers(),
      sightObstacles: this.sightObstacles,
      seen: seenSnapshot(this),
      fog: this.fog,
      ...(this.ferries.length > 0 ? { ferries: ferrySnapshot(this) } : {}),
      ...(this.gunPools ? { gunPools: { ...this.gunPools } } : {}),
      outcome: this.outcome,
      ...(this.hasDeployment ? { phase: this.phase } : {}),
      ...(this.garrisons.size > 0 ? { garrisons: garrisonSnapshot(this) } : {}),
      ...(this.assaults.size > 0 ? { assaults: assaultSnapshot(this) } : {}),
      ...(this.objectives.length > 0 ? { objectives: objectiveSnapshot(this) } : {}),
      ...(this.scenario === 'battle3v3' ? { difficulty: this.difficulty } : {}),
      ...(this.withdrawal ? { withdrawal: withdrawalSnapshot(this.withdrawal) } : {}),
      ...(this.objectives.length > 0 || this.withdrawal
        ? { clock: { tick: this.tickCount - this.battleStartTick, limit: this.timeLimitTicks } }
        : {}),
      ...(this.orderQueues.size > 0 ? { queuedOrders: queuedOrdersSnapshot(this) } : {}),
      ...(this.playtest && this.scripted ? { battleEvents: scriptedSnapshot(this) } : {}),
      hash: options?.hash === false ? '' : this.hashState(),
    };
  }

  /**
   * add-deployment-phase D1/D2: the deployment phase's step. Commands take
   * effect at once and the tick does not advance; `start_battle` ends the
   * phase, and commands queued after it wait for the battle's first tick.
   */
  private stepDeployment(): void {
    const events: SimEvent[] = [];
    while (this.queue.length > 0 && this.phase === 'deployment') {
      const envelope = this.queue.shift()!;
      const command = envelope.command;
      if (command.type === 'noop') continue;
      if (command.type === 'start_battle') {
        this.phase = 'battle';
        this.battleStartTick = this.tickCount;
        events.push({ type: 'battle_started', tick: this.tickCount });
      } else if (command.type === 'reset_deployment') {
        this.resetDeployment();
      } else {
        applyDeploymentCommand(this, envelope, events);
      }
    }
    this.lastEvents = events;
  }

  /** Puts the player's men back where the phase opened them. */
  private resetDeployment(): void {
    for (const place of this.deploymentStart) {
      const unit = this.units.find((entry) => entry.id === place.id);
      if (unit) restorePlace(unit, place);
    }
  }

  /**
   * Battle maps carry hundreds of walls and fences that rarely change: their
   * copy for the frame and their digest for the hash are kept until a cover
   * is added, removed or moved (add-battle-maps).
   */
  private coverCache: {
    length: number;
    first: CoverPoint | undefined;
    last: CoverPoint | undefined;
    copy: CoverPoint[];
    digest: string;
  } | null = null;

  private coverCacheFor(): { copy: CoverPoint[]; digest: string } {
    if (!this.coverCache || !sameCovers(this.coverCache, this.covers)) {
      this.coverCache = {
        length: this.covers.length,
        first: this.covers[0],
        last: this.covers[this.covers.length - 1],
        copy: this.covers.map((cover) => ({ ...cover })),
        digest: hashString(JSON.stringify(this.covers)),
      };
    }
    return this.coverCache;
  }

  private frameCovers(): CoverPoint[] {
    if (this.battleMap?.height.kind !== 'field') return this.covers.map((cover) => ({ ...cover }));
    return this.coverCacheFor().copy;
  }

  private coversDigest(): string {
    return this.coverCacheFor().digest;
  }

  hashState(): string {
    return hashString(
      JSON.stringify({
        units: this.units,
        covers: this.battleMap?.height.kind === 'field' ? this.coversDigest() : this.covers,
        rng: this.rng.getState(),
        outcome: this.outcome,
        ...(this.ferries.length > 0 ? { ferries: this.ferries } : {}),
        ...(this.gunPools ? { gunPools: this.gunPools } : {}),
        // add-deployment-phase D1: hashed only during the phase, so a battle hashes as before.
        ...(this.phase === 'deployment' ? { phase: this.phase } : {}),
        // garrison-and-assault: hashed only while a position is held.
        ...(this.garrisons.size > 0 ? { garrisons: garrisonSnapshot(this) } : {}),
        ...(this.assaults.size > 0 ? { assaults: [...this.assaults.values()] } : {}),
        // add-map-objectives: hashed on maps with objectives (capture state only).
        ...(this.objectives.length > 0 ? { objectives: objectiveHashState(this) } : {}),
        // refine-battle-controls: the queued orders are state too.
        ...(this.orderQueues.size > 0 ? { orderQueues: [...this.orderQueues] } : {}),
        // add-difficulty-levels D2: the level is part of a 3v3's state.
        ...(this.scenario === 'battle3v3' ? { difficulty: this.difficulty } : {}),
        // An override (tests, tuning) is state too.
        ...(this.factorOverride ? { factors: this.factors } : {}),
        // add-battle-events D3: hashed only on maps with events, so other maps hash as before.
        ...(this.scripted ? { scripted: scriptedHashState(this.scripted) } : {}),
        // add-withdrawal-exits D8: hashed only on maps with a withdrawal.
        ...(this.withdrawal ? { withdrawal: withdrawalHashState(this.withdrawal) } : {}),
      }),
    );
  }
}

/** A man's place, facing and stance as the deployment phase opened. */
interface DeploymentPlace {
  id: number;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  stance: MutableUnit['stance'];
  formation: MutableUnit['formation'];
}

function placeOf(unit: MutableUnit): DeploymentPlace {
  return { id: unit.id, x: unit.x, y: unit.y, facingX: unit.facingX, facingY: unit.facingY, stance: unit.stance, formation: unit.formation };
}

function restorePlace(unit: MutableUnit, place: DeploymentPlace): void {
  unit.x = place.x;
  unit.y = place.y;
  unit.targetX = place.x;
  unit.targetY = place.y;
  unit.facingX = place.facingX;
  unit.facingY = place.facingY;
  unit.stance = place.stance;
  unit.formation = place.formation;
  unit.path = [];
  unit.pathIndex = 0;
  unit.slotId = null;
}

/**
 * No one stands in deep water (add-battle-maps): a soldier pushed or slotted
 * into the river steps back onto the nearest bank. Men aboard a ferry ride it.
 */
function keepOutOfDeepWater(ctx: SimulationEngine): void {
  for (const unit of ctx.units) {
    if (!unit.alive || unit.ferryId !== undefined || !isDeepWater(unit.x, unit.y)) continue;
    const bank = nearestOpenPoint(ctx, { x: unit.x, y: unit.y }, 14);
    if (isDeepWater(bank.x, bank.y)) continue;
    unit.x = bank.x;
    unit.y = bank.y;
    if (unit.path.length === 0) {
      unit.targetX = bank.x;
      unit.targetY = bank.y;
    }
  }
}

/** No one lies down in a ford (add-battle-maps). */
function keepOffFordFloor(ctx: SimulationEngine): void {
  for (const unit of ctx.units) {
    if (unit.alive && unit.stance === 'prone' && waterAt(unit.x, unit.y) === 1) unit.stance = 'crouched';
  }
}
