import { RNG, hashString } from '@prestes/kernel';
import {
  BOOTCAMP_COVERS,
  COVER_POINTS,
  DEFAULT_WEAPON_ID,
  WEAPONS,
  TRAINING_AMMUNITION,
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
} from '@prestes/shared';
import type {
  BattleMap,
  BattleMapId,
  TerrainFeature,
  Command,
  CommandEnvelope,
  CoverPoint,
  Frame,
  Outcome,
  SimEvent,
  RosterRecord,
  SightObstacle,
} from '@prestes/shared';
import { OrderManager } from './order-manager';
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
import { applyCommand } from './systems/commands';
import { createBattleMemory, updateBattleFlow } from './systems/enemy-commander';
import { createVisionState, seenSnapshot, updateVision } from './systems/vision';
import { createFerries, ferrySnapshot, heldByFerry, updateFerries } from './systems/ferry';
import type { FerryState } from './systems/ferry';
import { applyRoster } from './systems/spawning';
import { reactToFire, screenOfficers } from './systems/fire-reaction';
import { handoverSuppress } from './systems/orders';

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
  readonly bounding = new Map<number, BoundingGroup>();
  readonly battle = createBattleMemory();
  readonly vision = createVisionState();
  readonly ferries: FerryState[];
  fog: boolean;

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
    this.selectTerrain();
    const source =
      this.battleMap
        ? battleUnits(this.battleMap.deployment)
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
        weaponId: DEFAULT_WEAPON_ID,
        // The 3v3 is a training battle: both sides draw the depot issue.
        ...((this.training && unit.faction === 'column') || this.scenario === 'battle3v3'
          ? TRAINING_AMMUNITION
          : {
              magazine: WEAPONS[DEFAULT_WEAPON_ID].magazine,
              reserve: WEAPONS[DEFAULT_WEAPON_ID].reserve,
            }),
        morale: MAX_MORALE,
        alive: true,
        suppressed: false,
        suppression: 0,
        cohesion: 100,
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
    applyRoster(this, options.roster ?? []);
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
    // Engines can share a thread (tests, tools): select this map's terrain.
    this.selectTerrain();
    const nextTick = this.tickCount + 1;
    const events: SimEvent[] = [];

    if (this.outcome === 'playing') {
      for (const envelope of this.queue.splice(0, this.queue.length)) {
        applyCommand(this, envelope, nextTick, events);
      }

      maintainSlots(this);
      for (const unit of this.units) {
        // A soldier at a ferry landing or aboard is moved by the ferry.
        if (this.ferries.length > 0 && heldByFerry(this, unit)) {
          unit.moveSpeed = 0;
        } else {
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
      separateUnits(this);
      if (this.battleMap?.height.kind === 'field') keepOutOfDeepWater(this);
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
      fire(this, nextTick, events);
      updatePursuit(this, nextTick, events);
      updateBattleFlow(this, nextTick, events);
      updateOfficerLoss(this, nextTick, events);
      applyOfficerAura(this);
      selfRally(this);
      updateCohesion(this);
      updateMoraleStates(this);
      updateRecovery(this, nextTick, events);
      updateSoldierStates(this);
      fleePanicked(this);
      checkRouted(this, nextTick, events);
      clearArrivedOrders(this);
      cleanupOrders(this);
      updateFacing(this);
      if (this.battleMap?.height.kind === 'field') keepOffFordFloor(this);
      updateOutcome(this, nextTick, events);
    } else {
      this.queue.length = 0;
    }

    this.tickCount = nextTick;
    this.lastEvents = events;
    return this.frame();
  }

  /**
   * Runs several ticks and returns the last frame carrying the events of
   * every tick run. The client steps two ticks at 1x: dropping the earlier
   * ticks' events lost whole volleys (a section fires on the same tick), so
   * their shots had no sound, tracer or effect.
   */
  runTicks(count: number): Frame {
    let frame = this.frame();
    const safeCount = Math.max(0, Math.floor(count));
    const events: SimEvent[] = [];
    for (let index = 0; index < safeCount; index += 1) {
      frame = this.tick();
      events.push(...frame.events);
    }
    return safeCount > 1 ? { ...frame, events } : frame;
  }

  frame(): Frame {
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
      outcome: this.outcome,
      hash: this.hashState(),
    };
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
      }),
    );
  }
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
