import { RNG, TICK_DT, hashString } from '@prestes/kernel';
import {
  BOOTCAMP_COVERS,
  COVER_POINTS,
  DEFAULT_WEAPON_ID,
  DEFEND_REGION_RADIUS,
  MAP_BOUNDS,
  WEAPONS,
  FIRE_RANGE,
  MAX_HP,
  MAX_MORALE,
  SUPPRESSION_THRESHOLD,
  TRAINING_SIGHT_OBSTACLES,
  averageAim,
  averageFacing,
  clampToRegion as clampPointToRegion,
  coverAgainst,
  coverDestinationForSlot,
  coverForStance,
  getWeapon,
  moraleStateFor,
  reloadMagazine,
  SUPPRESSION_DECAY,
  terrainSpeedFactor,
  troopFormationOffsets,
  rotateOffset,
  findPath,
  isLineBlocked,
  isPointNearCover,
  isPointBlockedByCovers,
  eyeHeightForStance,
  isPointInVision,
  lineFacing,
  lineFormationSlots,
} from '@prestes/shared';
import type {
  Command,
  CommandEnvelope,
  CoverKind,
  CoverPoint,
  Faction,
  FormationKind,
  Frame,
  Outcome,
  RejectionReason,
  SimEvent,
  SoldierState,
  Stance,
  TacticalOrder,
  Posture,
  UnitKind,
  MoraleState,
  UnitOrder,
  WeaponId,
  WoundSeverity,
  RosterRecord,
  SightObstacle,
  UnitSnapshot,
  Vec2,
  UnitRole,
  TrainingPhaseSetup,
} from '@prestes/shared';
import { OrderManager } from './order-manager';
import {
  FLANK_RADIUS,
  TARGET_HYSTERESIS,
  flankCandidates,
  formationSlots,
  targetScore,
} from './tactical';

export interface SimulationOptions {
  seed: number;
  scenario?: 'bootcamp' | 'battle3v3';
  combatRange?: number;
  sandbox?: boolean;
  training?: boolean;
  opposition?: boolean;
  bounding?: boolean;
  roster?: readonly RosterRecord[];
}

const OPEN_POINT_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
] as const;

const BOUNDING_ORDERS = new Set<UnitOrder>([
  'move',
  'advance',
  'attack',
  'defend',
  'ambush',
  'disperse',
  'recon',
  'reserve',
  'pursue',
]);

const FLANK_COOLDOWN = 180;
const SUPPRESSION_COOLDOWN = 150;
const SUPPRESS_FIRE_INTERVAL = 8;
const WITHDRAW_DISTANCE = 12;
const FATIGUE_MAX = 100;
const AMBUSH_RADIUS = 14;
const AWARENESS_RANGE = 120;
const RESCUE_CONTACT_DISTANCE = 1.4;
const RESCUE_CARRY_TICKS = 30;
const TREAT_TICKS = 30;
const RECOVERY_TICKS = 300;
const TRAINING_ENEMY_HP = 420;

interface MutableUnit {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
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
  orderDestination: Vec2 | null;
  orderIssued: boolean;
  orderRegionCenter: Vec2 | null;
  orderRegionRadius: number;
  soldierState: SoldierState;
  incapacitated: boolean;
  state: MoraleState;
  routed: boolean;
  panicTicks: number;
  cover: number;
  targetId: number | null;
  cooldown: number;
  reload: number;
  path: Vec2[];
  pathIndex: number;
  facingX: number;
  facingY: number;
  aimX: number | null;
  aimY: number | null;
  stanceLocked: boolean;
  coverSeekCooldown: number;
  flankTargetId: number | null;
  flankCooldown: number;
  suppressionCooldown: number;
  suppress: boolean;
  holdPosition: boolean;
  holdFire: boolean;
  posture: Posture;
  boundTeam: 'a' | 'b' | null;
  boundPhase: 'cover' | 'advance' | null;
  targetLocked: boolean;
  currentOrder: UnitOrder | null;
  lineMove: boolean;
  dummy: boolean;
  role?: UnitRole;
  nonLethal: boolean;
  ambush: boolean;
  reserveMode: boolean;
  recon: boolean;
  reconReported: boolean;
  reconContacts: number;
  rescueTargetId: number | null;
  rescueQueue: number[];
  wound: WoundSeverity;
  rescueTicks: number;
  treatTicks: number;
  carryingId: number | null;
  beingCarriedBy: number | null;
  recoveryTicks: number;
}

interface BoundingGroup {
  squadId: number;
  teamA: number[];
  teamB: number[];
  destination: Vec2;
  targetId: number | null;
  phase: 'a' | 'b';
  mode: 'move' | 'attack';
  targets: Map<number, Vec2>;
}

interface ActiveOrder {
  id: number;
  unitIds: number[];
  points: Vec2[];
  kind: 'move' | 'withdraw' | 'flank';
}

const DEFAULT_UNITS: ReadonlyArray<
  Omit<
    MutableUnit,
    | 'targetX'
    | 'targetY'
    | 'hp'
    | 'weaponId'
    | 'magazine'
    | 'reserve'
    | 'morale'
    | 'alive'
    | 'suppressed'
    | 'suppression'
    | 'cohesion'
    | 'fatigue'
    | 'formation'
    | 'orderDestination'
    | 'orderIssued'
    | 'orderRegionCenter'
    | 'orderRegionRadius'
    | 'soldierState'
    | 'incapacitated'
    | 'state'
    | 'routed'
    | 'panicTicks'
    | 'cover'
    | 'targetId'
    | 'cooldown'
    | 'reload'
    | 'path'
    | 'pathIndex'
    | 'facingX'
    | 'facingY'
    | 'aimX'
    | 'aimY'
    | 'stanceLocked'
    | 'coverSeekCooldown'
    | 'flankTargetId'
    | 'flankCooldown'
    | 'suppressionCooldown'
    | 'suppress'
    | 'holdPosition'
    | 'holdFire'
    | 'posture'
    | 'boundTeam'
    | 'boundPhase'
    | 'targetLocked'
    | 'currentOrder'
    | 'lineMove'
    | 'dummy'
    | 'role'
    | 'nonLethal'
    | 'ambush'
    | 'reserveMode'
    | 'recon'
    | 'reconReported'
    | 'reconContacts'
    | 'rescueTargetId'
    | 'rescueQueue'
    | 'wound'
    | 'rescueTicks'
    | 'treatTicks'
    | 'carryingId'
    | 'beingCarriedBy'
    | 'recoveryTicks'
  >
> = [
  {
    id: 1,
    x: -7,
    y: 7,
    speed: 2,
    kind: 'infantry',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
  },
  {
    id: 2,
    x: 7,
    y: 7,
    speed: 2,
    kind: 'infantry',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
  },
  {
    id: 3,
    x: 10,
    y: 11,
    speed: 2.4,
    kind: 'officer',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
  },
  {
    id: 7,
    x: -2,
    y: 7,
    speed: 2,
    kind: 'infantry',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
  },
  {
    id: 8,
    x: 2,
    y: 8,
    speed: 2,
    kind: 'infantry',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
  },
  {
    id: 9,
    x: 12,
    y: 7,
    speed: 2,
    kind: 'infantry',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
  },
  {
    id: 4,
    x: -10,
    y: -19,
    speed: 2,
    kind: 'infantry',
    faction: 'legalist',
    stance: 'crouched',
    squadId: 3,
  },
  {
    id: 5,
    x: 10,
    y: -19,
    speed: 2,
    kind: 'infantry',
    faction: 'legalist',
    stance: 'crouched',
    squadId: 3,
  },
  {
    id: 6,
    x: 0,
    y: -19,
    speed: 2,
    kind: 'infantry',
    faction: 'legalist',
    stance: 'crouched',
    squadId: 3,
  },
];

const INFANTRY_TEMPLATE = DEFAULT_UNITS[0]!;
const OFFICER_TEMPLATE = DEFAULT_UNITS.find((unit) => unit.kind === 'officer')!;

const BATTLE_UNITS = Array.from({ length: 6 }, (_, squadIndex) => {
  const faction: 'column' | 'legalist' = squadIndex < 3 ? 'column' : 'legalist';
  const group = squadIndex % 3;
  const centerX = -44 + group * 44;
  const centerY = faction === 'column' ? 48 : -48;
  const squadId = faction === 'column' ? group + 1 : 11 + group;
  return Array.from({ length: 11 }, (_, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    return {
      ...INFANTRY_TEMPLATE,
      id: squadIndex * 11 + index + 1,
      x: centerX + (column - 2.5) * 2.8,
      y: centerY + row * 2.8,
      faction,
      squadId,
    };
  });
}).flat() satisfies readonly (typeof DEFAULT_UNITS)[number][];

const TRAINING_UNITS = [
  ...Array.from({ length: 11 }, (_, index) => ({
    ...INFANTRY_TEMPLATE,
    id: index + 1,
    x: -14 + index * 2.8,
    y: 6,
    squadId: 1,
  })),
  {
    ...OFFICER_TEMPLATE,
    id: 12,
    x: 82,
    y: 10,
    squadId: 99,
  },
] satisfies readonly (typeof DEFAULT_UNITS)[number][];

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export class SimulationEngine {
  private tickCount = 0;
  private readonly rng: RNG;
  private readonly units: MutableUnit[];
  private readonly covers: CoverPoint[];
  private readonly sightObstacles: readonly SightObstacle[];
  private readonly sandbox: boolean;
  private readonly training: boolean;
  private readonly opposition: boolean;
  private readonly scenario: 'bootcamp' | 'battle3v3';
  private readonly combatRange: number;
  private boundingEnabled: boolean;
  private readonly queue: CommandEnvelope[] = [];
  private orders: ActiveOrder[] = [];
  private lastEvents: SimEvent[] = [];
  private outcome: Outcome = 'playing';
  private nextSequence = 1;
  private nextOrderId = 1;
  private nextCoverId = COVER_POINTS.length + 1;
  private nextUnitId = 1;
  private nextSquadId = 10;
  private readonly orderManager = new OrderManager();
  private readonly bounding = new Map<number, BoundingGroup>();

  constructor(options: SimulationOptions) {
    this.rng = new RNG(options.seed);
    this.sandbox = options.sandbox === true;
    this.training = options.training === true;
    this.opposition = options.opposition !== false;
    this.scenario = options.scenario ?? 'bootcamp';
    this.combatRange =
      options.combatRange ??
      (this.training || this.scenario === 'battle3v3' ? WEAPONS[DEFAULT_WEAPON_ID].range : 26);
    this.boundingEnabled = options.bounding === true;
    this.covers = (this.training || this.scenario === 'battle3v3' ? BOOTCAMP_COVERS : COVER_POINTS).map((cover) => ({ ...cover }));
    this.sightObstacles = this.training ? TRAINING_SIGHT_OBSTACLES : [];
    const source =
      this.scenario === 'battle3v3'
        ? BATTLE_UNITS
        : this.training && !this.opposition
          ? TRAINING_UNITS
          : DEFAULT_UNITS;
    this.nextUnitId = source.length + 1;
    this.nextSquadId = this.scenario === 'battle3v3' ? 20 : 10;
    this.units = source
      .filter(
        (unit) =>
          this.scenario === 'battle3v3' || this.opposition || unit.faction === 'column',
      )
      .map((unit) => ({
      ...unit,
      targetX: unit.x,
      targetY: unit.y,
      hp: MAX_HP,
      weaponId: DEFAULT_WEAPON_ID,
      magazine: WEAPONS[DEFAULT_WEAPON_ID].magazine,
      reserve: WEAPONS[DEFAULT_WEAPON_ID].reserve,
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
      facingX: 0,
      facingY: unit.faction === 'column' ? -1 : 1,
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
    this.applyRoster(options.roster ?? []);
  }

  private applyRoster(records: readonly RosterRecord[]): void {
    for (const record of records) {
      const unit = this.units.find((entry) => entry.id === record.id);
      if (!unit) {
        continue;
      }
      unit.hp = record.hp;
      unit.morale = record.morale;
      unit.alive = record.alive;
      unit.incapacitated = record.incapacitated;
      unit.soldierState = record.soldierState;
      unit.wound = record.wound;
      unit.recoveryTicks = record.recoveryTicks;
      if (record.soldierState === 'recovering' && record.recoveryTicks > 0) {
        unit.alive = false;
        unit.routed = true;
        unit.hp = 0;
        unit.incapacitated = false;
        unit.recoveryTicks = record.recoveryTicks;
      } else if (!record.alive) {
        unit.routed = record.soldierState === 'evacuating';
      }
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
    const nextTick = this.tickCount + 1;
    const events: SimEvent[] = [];

    if (this.outcome === 'playing') {
      for (const envelope of this.queue.splice(0, this.queue.length)) {
        this.applyCommand(envelope, nextTick, events);
      }

      for (const unit of this.units) {
        this.moveUnit(unit, nextTick, events);
        if (unit.alive) {
          unit.suppression = Math.max(0, unit.suppression - SUPPRESSION_DECAY);
          const target =
            unit.targetId === null
              ? null
              : this.units.find((entry) => entry.id === unit.targetId);
          const threat = target?.alive ? target : this.nearestEnemy(unit);
          unit.cover = threat
            ? coverAgainst(unit.x, unit.y, threat.x, threat.y, unit.stance, this.covers)
            : coverForStance(unit.stance);
        }
        if (unit.alive && !unit.incapacitated) {
          unit.fatigue = Math.max(0, unit.fatigue - 0.03);
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

      this.separateUnits();

      this.acquireTargets();
      this.reactToSuppression();
      this.seekFlank();
      this.seekCover();
      this.updateBounding();
      if (nextTick % 8 === 0) {
        this.repairStalledMovement();
      }
      this.updatePostureMovement();
      this.updateRecon(nextTick, events);
      this.updateRescue(nextTick, events);
      this.fire(nextTick, events);
      this.updatePursuit(nextTick, events);
      this.updateOfficerLoss(nextTick, events);
      this.applyOfficerAura();
      this.updateCohesion();
      this.updateMoraleStates();
      this.updateRecovery(nextTick, events);
      this.updateSoldierStates();
      this.fleePanicked();
      this.checkRouted(nextTick, events);
      this.clearArrivedOrders();
      this.cleanupOrders();
      this.updateFacing();
      this.updateOutcome(nextTick, events);
    } else {
      this.queue.length = 0;
    }

    this.tickCount = nextTick;
    this.lastEvents = events;
    return this.frame();
  }

  runTicks(count: number): Frame {
    let frame = this.frame();
    const safeCount = Math.max(0, Math.floor(count));
    for (let index = 0; index < safeCount; index += 1) {
      frame = this.tick();
    }
    return frame;
  }

  frame(): Frame {
    return {
      tick: this.tickCount,
      units: this.snapshotUnits(),
      orders: this.orders.map((order) => ({
        id: order.id,
        unitIds: [...order.unitIds],
        points: order.points.map((point) => ({ ...point })),
        kind: order.kind,
      })),
      events: this.lastEvents.slice(),
      covers: this.covers.map((cover) => ({ ...cover })),
      sightObstacles: this.sightObstacles,
      outcome: this.outcome,
      hash: this.hashState(),
    };
  }

  hashState(): string {
    return hashString(
      JSON.stringify({
        units: this.units,
        covers: this.covers,
        rng: this.rng.getState(),
        outcome: this.outcome,
      }),
    );
  }

  private snapshotUnits(): UnitSnapshot[] {
    return this.units.map((unit) => ({
      id: unit.id,
      x: unit.x,
      y: unit.y,
      facingX: unit.facingX,
      facingY: unit.facingY,
      aimX: unit.aimX,
      aimY: unit.aimY,
      kind: unit.kind,
      faction: unit.faction,
      stance: unit.stance,
      squadId: unit.squadId,
      hp: unit.hp,
      weaponId: unit.weaponId,
      magazine: unit.magazine,
      reserve: unit.reserve,
      morale: unit.morale,
      alive: unit.alive,
      suppressed: unit.suppressed,
      suppression: unit.suppression,
      cohesion: unit.cohesion,
      fatigue: unit.fatigue,
      formation: unit.formation,
      soldierState: unit.soldierState,
      incapacitated: unit.incapacitated,
      rescueTargetId: unit.rescueTargetId,
      reconContacts: unit.currentOrder === 'recon' || unit.recon ? unit.reconContacts : 0,
      rescueQueueLength: unit.rescueQueue.length,
      wound: unit.wound,
      rescueProgress:
        unit.carryingId !== null
          ? 1 - unit.rescueTicks / RESCUE_CARRY_TICKS
          : unit.treatTicks > 0
            ? 1 - unit.treatTicks / TREAT_TICKS
            : 0,
      state: unit.state,
      routed: unit.routed,
      dummy: unit.dummy,
      cover: unit.cover,
      order: unit.currentOrder,
      targetId: unit.targetId,
      holdFire: unit.holdFire,
      posture: unit.posture,
      boundTeam: unit.boundTeam,
      boundPhase: unit.boundPhase,
      role: unit.role,
      nonLethal: unit.nonLethal,
    }));
  }

  private applyCommand(envelope: CommandEnvelope, tick: number, events: SimEvent[]): void {
    const command = envelope.command;
    if (command.type === 'noop') {
      return;
    }

    if (command.type === 'set_bounding') {
      this.boundingEnabled = command.enabled;
      if (!command.enabled) {
        this.bounding.clear();
        for (const unit of this.units) {
          if (unit.boundTeam === null) {
            continue;
          }
          unit.boundTeam = null;
          unit.boundPhase = null;
          if ((unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 > 1) {
            unit.holdPosition = false;
            unit.currentOrder = 'move';
            unit.lineMove = false;
          }
        }
        this.repairStalledMovement();
      }
      return;
    }

    if (command.type === 'spawn_cover') {
      this.spawnCover(command.kind, command.to, tick, envelope.seq, events, command.rotation ?? 0);
      return;
    }

    if (command.type === 'spawn_dummy') {
      this.spawnDummy(command.to, tick, envelope.seq, events, command.rotation ?? 0);
      return;
    }

    if (command.type === 'spawn_troop') {
      this.spawnTroop(command, tick, envelope.seq, events);
      return;
    }

    if (command.type === 'training_phase') {
      this.setTrainingPhase(command.setup, tick, envelope.seq, events);
      return;
    }

    if (command.type === 'despawn_role') {
      this.despawnRole(command.role, tick, envelope.seq, events);
      return;
    }

    if (command.type === 'incapacitate') {
      this.incapacitate(command.targetId, tick, envelope.seq, events);
      return;
    }

    if (command.type === 'wound') {
      this.wound(command.targetId, command.hp, tick, envelope.seq, events);
      return;
    }

    if (command.type === 'reinforce') {
      this.reinforce(command.faction, tick, envelope.seq, events);
      return;
    }

    const resolution = this.orderManager.resolve(command.unitIds, this.units);
    if (resolution.rejection !== null) {
      this.reject(tick, envelope.seq, resolution.rejection, events);
      return;
    }
    const actionable = resolution.actionable;


    if (command.type === 'order') {
      this.applyTacticalOrder(command, actionable, tick, envelope.seq, events);
      return;
    }

    if (command.type === 'stance') {
      for (const unit of actionable) {
        if (unit.state === 'pinned') {
          continue;
        }
        unit.stance = command.stance;
        unit.stanceLocked = true;
      }
      return;
    }

    if (command.type === 'hold_fire') {
      for (const unit of actionable) {
        unit.holdFire = command.hold;
      }
      return;
    }

    if (command.type === 'posture') {
      for (const unit of actionable) {
        unit.posture = command.posture;
      }
      return;
    }

    if (command.type === 'formation') {
      for (const unit of actionable) {
        unit.formation = command.formation;
      }
      this.reflowFormation(actionable);
      return;
    }

    if (command.type === 'move_line') {
      this.applyLineMove(command, actionable);
      return;
    }

    if (command.type === 'hold') {
      this.orders = this.orders.filter(
        (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
      );
      for (const unit of actionable) {
        this.releaseCarry(unit);
        unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        unit.targetId = null;
        unit.targetLocked = false;
        unit.path = [];
        unit.pathIndex = 0;
        unit.flankTargetId = null;
        unit.suppress = false;
        unit.ambush = false;
        unit.reserveMode = false;
        unit.recon = false;
        unit.rescueTargetId = null;
        unit.holdPosition = true;
        unit.currentOrder = 'hold';
        unit.lineMove = false;
      unit.orderIssued = false;
      }
      return;
    }

    if (command.type === 'face') {
      const center = actionable.reduce(
        (sum, unit) => ({ x: sum.x + unit.x / actionable.length, y: sum.y + unit.y / actionable.length }),
        { x: 0, y: 0 },
      );
      const dx = command.to.x - center.x;
      const dy = command.to.y - center.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.001) {
        this.reject(tick, envelope.seq, 'invalid_position', events);
        return;
      }
      for (const unit of actionable) {
        unit.aimX = dx / length;
        unit.aimY = dy / length;
        unit.facingX = dx / length;
        unit.facingY = dy / length;
      }
      return;
    }

    if (command.type === 'attack' || command.type === 'suppress' || command.type === 'flank') {
      const target = this.units.find((unit) => unit.id === command.targetId);
      if (!target || !target.alive || target.routed || target.faction === actionable[0]?.faction) {
        this.reject(tick, envelope.seq, 'invalid_target', events);
        return;
      }
      this.orders = this.orders.filter(
        (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
      );
      const split = command.type === 'flank' && actionable.length > 1 && this.boundingEnabled;
      const suppressors = split
        ? actionable.slice(0, Math.ceil(actionable.length / 2))
        : [];
      const flankers = split
        ? actionable.slice(Math.ceil(actionable.length / 2))
        : actionable;
      for (const unit of actionable) {
        this.releaseCarry(unit);
        unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
        const suppressing = command.type === 'suppress' || suppressors.includes(unit);
        unit.lineMove = false;
        unit.targetId = target.id;
        const targetDx = target.x - unit.x;
        const targetDy = target.y - unit.y;
        const targetLength = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
        if (targetLength > 0.001) {
          unit.facingX = targetDx / targetLength;
          unit.facingY = targetDy / targetLength;
        }
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        unit.path = [];
        unit.pathIndex = 0;
        unit.flankTargetId = null;
        unit.targetLocked = true;
        unit.suppress = suppressing;
        unit.ambush = false;
        unit.reserveMode = false;
        unit.recon = false;
        unit.rescueTargetId = null;
        unit.holdPosition = suppressing;
        unit.orderIssued = true;
        unit.currentOrder =
          command.type === 'attack'
            ? 'attack'
            : suppressing
              ? 'suppress'
              : 'flank';
      }
      if (command.type === 'flank') {
        this.assignFlankPaths(flankers, target);
      }
      return;
    }

    if (command.type === 'withdraw') {
      this.orders = this.orders.filter(
        (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
      );
      for (const unit of actionable) {
        this.releaseCarry(unit);
        unit.orderDestination = null;
        unit.orderIssued = false;
        unit.orderRegionCenter = null;
        unit.orderRegionRadius = 0;
      }
      const center = actionable.reduce(
        (sum, unit) => ({ x: sum.x + unit.x / actionable.length, y: sum.y + unit.y / actionable.length }),
        { x: 0, y: 0 },
      );
      const enemy = actionable.length > 1 ? this.nearestEnemyAt(center, actionable[0]!.faction) : null;
      if (enemy && actionable.length > 1) {
        const dx = center.x - enemy.x;
        const dy = center.y - enemy.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0.001) {
          const facing = { x: dx / length, y: dy / length };
          const retreat = {
            x: clamp(center.x + facing.x * 12, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
            y: clamp(center.y + facing.y * 12, MAP_BOUNDS.minY, MAP_BOUNDS.maxY),
          };
          const slots = formationSlots(
            actionable.map((unit) => ({ x: unit.x, y: unit.y })),
            retreat,
            2.8,
            actionable[0]?.formation ?? 'line',
            facing,
          );
          actionable.forEach((unit, index) => {
            const destination = slots[index] ?? retreat;
            const path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
            if (path.length === 0) {
              this.beginWithdraw(unit);
              return;
            }
            unit.targetX = destination.x;
            unit.targetY = destination.y;
            unit.path = path;
            unit.pathIndex = 0;
            unit.currentOrder = 'withdraw';
            unit.lineMove = false;
            unit.holdPosition = false;
            this.queueUnitOrder(unit, path, 'withdraw');
          });
          return;
        }
      }
      for (const unit of actionable) {
        this.beginWithdraw(unit);
      }
      return;
    }

    this.orders = this.orders.filter(
      (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
    );
    const living = actionable;
    const aimFacing = averageAim(living);
    const coverFacing = aimFacing ?? averageFacing(living);
    const moveFacing =
      aimFacing ?? (isPointNearCover(command.to, this.covers) ? averageFacing(living) : undefined);
    const slots = formationSlots(
      living.map((unit) => ({ x: unit.x, y: unit.y })),
      command.to,
      undefined,
      living[0]?.formation ?? 'line',
      moveFacing,
    );

    const usedCover: Vec2[] = [];
    living.forEach((unit, index) => {
      this.releaseCarry(unit);
      unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
      unit.targetId = null;
      unit.targetLocked = false;
      unit.suppress = false;
      unit.holdPosition = false;
      unit.flankTargetId = null;
      unit.ambush = false;
      unit.reserveMode = false;
      unit.recon = false;
      unit.rescueTargetId = null;
      unit.currentOrder = null;
      unit.lineMove = false;
      let destination = slots[index] ?? command.to;
      const planned = coverDestinationForSlot(
        unit,
        destination,
        this.nearestEnemy(unit),
        this.covers,
        usedCover,
        command.to,
        coverFacing,
      );
      if (planned.cover) {
        destination = planned.destination;
        usedCover.push(destination);
        if (!unit.stanceLocked) {
          unit.stance = 'crouched';
        }
      }
      if (isPointBlockedByCovers(destination.x, destination.y, this.covers, 0.8)) {
        destination = command.to;
      }
      let path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
      if (path.length === 0 && (destination.x !== command.to.x || destination.y !== command.to.y)) {
        destination = command.to;
        path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
      }
      if (path.length === 0) {
        unit.targetX = destination.x;
        unit.targetY = destination.y;
        unit.path = [];
        unit.pathIndex = 0;
        unit.currentOrder = 'move';
        unit.lineMove = false;
        unit.orderIssued = true;
        unit.holdPosition = false;
        return;
      }
      unit.targetX = destination.x;
      unit.targetY = destination.y;
      unit.path = path;
      unit.pathIndex = 0;
      unit.currentOrder = 'move';
      unit.orderIssued = true;
      unit.orderDestination = { ...command.to };
      this.queueUnitOrder(unit, path, 'move');
    });
  }
  private applyLineMove(
    command: Extract<Command, { type: 'move_line' }>,
    actionable: MutableUnit[],
  ): void {
    this.orders = this.orders.filter(
      (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
    );
    const living = actionable;
    const lineDirection = lineFacing(command.from, command.to);
    const center = {
      x: (command.from.x + command.to.x) / 2,
      y: (command.from.y + command.to.y) / 2,
    };
    const slots = lineFormationSlots(command.from, command.to, living.length);
    const squads = new Set(living.map((unit) => unit.squadId));
    if (this.boundingEnabled && living.length > 1 && squads.size === 1) {
      const sorted = [...living].sort((left, right) => left.id - right.id);
      const targets = new Map<number, Vec2>();
      sorted.forEach((unit, index) => {
        targets.set(unit.id, slots[index] ?? center);
      });
      for (const unit of sorted) {
        this.releaseCarry(unit);
        unit.orderDestination = { ...center };
        unit.orderIssued = true;
        unit.orderRegionCenter = null;
        unit.orderRegionRadius = 0;
        unit.targetId = null;
        unit.targetLocked = false;
        unit.suppress = false;
        unit.flankTargetId = null;
        unit.ambush = false;
        unit.reserveMode = false;
        unit.recon = false;
        unit.rescueTargetId = null;
        unit.currentOrder = 'move';
        unit.lineMove = false;
        unit.aimX = lineDirection.x;
        unit.aimY = lineDirection.y;
        unit.path = [];
        unit.pathIndex = 0;
        unit.holdPosition = false;
      }
      const split = Math.ceil(sorted.length / 2);
      const teamA = sorted.slice(0, split);
      const teamB = sorted.slice(split);
      const group: BoundingGroup = {
        squadId: sorted[0]!.squadId,
        teamA: teamA.map((unit) => unit.id),
        teamB: teamB.map((unit) => unit.id),
        destination: center,
        targetId: null,
        phase: 'b',
        mode: 'move',
        targets,
      };
      this.bounding.set(group.squadId, group);
      for (const unit of teamA) {
        unit.boundTeam = 'a';
        unit.boundPhase = 'cover';
      }
      for (const unit of teamB) {
        unit.boundTeam = 'b';
        unit.boundPhase = 'advance';
      }
      this.setBoundingCover(teamA);
      this.assignBoundingDirect(teamB, center, targets);
      return;
    }
    const usedCover: Vec2[] = [];
    living.forEach((unit, index) => {
      this.releaseCarry(unit);
      unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
      unit.targetId = null;
      unit.targetLocked = false;
      unit.suppress = false;
      unit.holdPosition = false;
      unit.flankTargetId = null;
      unit.ambush = false;
      unit.reserveMode = false;
      unit.recon = false;
      unit.rescueTargetId = null;
      unit.currentOrder = null;
      let destination = slots[index] ?? center;
      const planned = coverDestinationForSlot(
        unit,
        destination,
        this.nearestEnemy(unit),
        this.covers,
        usedCover,
        center,
        lineDirection,
      );
      if (planned.cover) {
        destination = planned.destination;
        usedCover.push(destination);
        if (!unit.stanceLocked) {
          unit.stance = 'crouched';
        }
      }
      destination = this.nearestOpenPoint(destination);
      let path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
      if (path.length === 0) {
        const fallback = this.nearestOpenPoint(center);
        if (fallback.x !== destination.x || fallback.y !== destination.y) {
          destination = fallback;
          path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
        }
      }
      if (path.length === 0) {
        destination = this.nearestOpenPoint({ x: unit.x, y: unit.y });
        path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
      }
      if (path.length === 0) {
        path = [{ ...destination }];
      }
      unit.targetX = destination.x;
      unit.targetY = destination.y;
      unit.path = path;
      unit.pathIndex = 0;
      unit.currentOrder = 'move';
      unit.lineMove = true;
      unit.orderIssued = true;
      unit.orderDestination = { ...center };
      unit.aimX = lineDirection.x;
      unit.aimY = lineDirection.y;
      this.queueUnitOrder(unit, path, 'move');
    });
  }
  private spawnCover(
    kind: CoverKind,
    to: Vec2,
    tick: number,
    seq: number,
    events: SimEvent[],
    rotation = 0,
  ): void {
    if (!this.sandbox && !this.training) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    if (kind !== 'sandbag' && kind !== 'stone' && kind !== 'trench') {
      this.reject(tick, seq, 'invalid_cover', events);
      return;
    }
    if (
      isPointBlockedByCovers(to.x, to.y, this.covers, 1) ||
      to.x < MAP_BOUNDS.minX ||
      to.x > MAP_BOUNDS.maxX ||
      to.y < MAP_BOUNDS.minY ||
      to.y > MAP_BOUNDS.maxY
    ) {
      this.reject(tick, seq, 'invalid_position', events);
      return;
    }
    const dimensions =
      kind === 'stone'
        ? {
            halfWidth: 1.8,
            halfDepth: 0.5,
            height: 1.8,
            quality: 0.55,
            blocksMovement: true,
            blocksSight: true,
          }
        : kind === 'trench'
          ? {
              halfWidth: 2.4,
              halfDepth: 1.2,
              height: 0.25,
              quality: 0.35,
              blocksMovement: false,
              blocksSight: false,
            }
          : {
              halfWidth: 1.7,
              halfDepth: 0.4,
              height: 0.9,
              quality: 0.25,
              blocksMovement: true,
              blocksSight: false,
            };
    this.covers.push({
      id: this.nextCoverId,
      kind,
      x: to.x,
      y: to.y,
      ...dimensions,
      rotation,
      radius: 2.4,
    });
    this.nextCoverId += 1;
  }

  private spawnDummy(
    to: Vec2,
    tick: number,
    seq: number,
    events: SimEvent[],
    rotation = 0,
  ): void {
    if (!this.sandbox && !this.training) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    if (
      isPointBlockedByCovers(to.x, to.y, this.covers, 1) ||
      to.x < MAP_BOUNDS.minX ||
      to.x > MAP_BOUNDS.maxX ||
      to.y < MAP_BOUNDS.minY ||
      to.y > MAP_BOUNDS.maxY
    ) {
      this.reject(tick, seq, 'invalid_position', events);
      return;
    }
    this.units.push({
      id: this.nextUnitId,
      x: to.x,
      y: to.y,
      targetX: to.x,
      targetY: to.y,
      speed: 0,
      kind: 'dummy',
      faction: 'target',
      stance: 'standing',
      squadId: 0,
      hp: MAX_HP * 10,
      weaponId: DEFAULT_WEAPON_ID,
      magazine: 0,
      reserve: 0,
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
      facingX: rotateOffset({ x: 0, y: 1 }, rotation).x,
      facingY: rotateOffset({ x: 0, y: 1 }, rotation).y,
      aimX: null,
      aimY: null,
      stanceLocked: false,
      coverSeekCooldown: 0,
      flankTargetId: null,
      flankCooldown: 0,
      suppressionCooldown: 0,
      suppress: false,
      holdPosition: true,
      holdFire: false,
      posture: 'balanced',
      boundTeam: null,
      boundPhase: null,
      targetLocked: false,
      currentOrder: null,
      lineMove: false,
      dummy: true,
      nonLethal: false,
      ambush: false,
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
    });
    this.nextUnitId += 1;
  }
  private spawnTroop(
    command: Extract<Command, { type: 'spawn_troop' }>,
    tick: number,
    seq: number,
    events: SimEvent[],
  ): void {
    if (!this.sandbox && !this.training) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    const count = Math.max(1, Math.min(16, command.count ?? 11));
    const squadId = this.nextSquadId;
    const spacing = 2.4;
    const rotation = command.rotation ?? 0;
    const offsets = troopFormationOffsets(count, 6, spacing, rotation);
    const formationFacing = rotateOffset({ x: 0, y: 1 }, rotation);
    for (let index = 0; index < count; index += 1) {
      const offset = offsets[index]!;
      const to = {
        x: command.to.x + offset.x,
        y: command.to.y + offset.y,
      };
      if (
        to.x < MAP_BOUNDS.minX ||
        to.x > MAP_BOUNDS.maxX ||
        to.y < MAP_BOUNDS.minY ||
        to.y > MAP_BOUNDS.maxY ||
        isPointBlockedByCovers(to.x, to.y, this.covers, 1)
      ) {
        continue;
      }
      this.units.push({
        id: this.nextUnitId,
        x: to.x,
        y: to.y,
        targetX: to.x,
        targetY: to.y,
        speed: 2,
        kind: 'infantry',
        faction: command.faction,
        stance: 'standing',
        squadId,
        hp: MAX_HP,
        weaponId: DEFAULT_WEAPON_ID,
        magazine: command.dummy ? 0 : WEAPONS[DEFAULT_WEAPON_ID].magazine,
        reserve: command.dummy ? 0 : WEAPONS[DEFAULT_WEAPON_ID].reserve,
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
        facingX: formationFacing.x,
        facingY: formationFacing.y,
        aimX: null,
        aimY: null,
        stanceLocked: false,
        coverSeekCooldown: 0,
        flankTargetId: null,
        flankCooldown: 0,
        suppressionCooldown: 0,
        suppress: false,
        holdPosition: true,
        holdFire: command.holdFire ?? command.dummy === true,
        posture: 'balanced',
        boundTeam: null,
        boundPhase: null,
        targetLocked: false,
        currentOrder: null,
        lineMove: false,
        dummy: command.dummy === true,
        role: command.role,
        nonLethal: command.nonLethal === true,
        ambush: false,
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
      });
      this.nextUnitId += 1;
    }
    this.nextSquadId += 1;
  }
  private setTrainingPhase(
    setup: TrainingPhaseSetup,
    tick: number,
    seq: number,
    events: SimEvent[],
  ): void {
    if (!this.training && !this.sandbox) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    this.despawnRoleUnits('training-enemy');
    this.bounding.clear();
    this.orders = [];
    const player = this.units.filter(
      (unit) => unit.faction === 'column' && !unit.dummy && unit.squadId !== 99,
    );
    const offsets = troopFormationOffsets(player.length, 6, 2.4, 0);
    player.forEach((unit, index) => {
      const offset = offsets[index] ?? { x: 0, y: 0 };
      this.resetTrainingUnit(unit, setup.playerPoint.x + offset.x, setup.playerPoint.y + offset.y, false);
    });
    const officer = this.units.find(
      (unit) => unit.faction === 'column' && unit.kind === 'officer' && !unit.dummy,
    );
    if (officer) {
      this.resetTrainingUnit(officer, setup.officerPoint.x, setup.officerPoint.y, true);
    }
    if (setup.enemyPoint && (setup.enemyCount ?? 0) > 0) {
      this.spawnTroop(
        {
          type: 'spawn_troop',
          to: setup.enemyPoint,
          faction: 'target',
          count: setup.enemyCount ?? 6,
          role: 'training-enemy',
          nonLethal: true,
          holdFire: setup.releaseTrainingFire !== true,
        },
        tick,
        seq,
        events,
      );
      for (const unit of this.units) {
        if (unit.role === 'training-enemy') {
          unit.hp = TRAINING_ENEMY_HP;
          unit.stance = 'crouched';
          unit.stanceLocked = true;
        }
      }
    }
  }

  private despawnRole(role: UnitRole, tick: number, seq: number, events: SimEvent[]): void {
    if (!this.training && !this.sandbox) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    this.despawnRoleUnits(role);
  }

  private despawnRoleUnits(role: UnitRole): void {
    const removed = new Set(
      this.units.filter((unit) => unit.role === role).map((unit) => unit.id),
    );
    if (removed.size === 0) {
      return;
    }
    const remaining = this.units.filter((unit) => !removed.has(unit.id));
    this.units.splice(0, this.units.length, ...remaining);
    this.orders = this.orders.filter(
      (order) => !order.unitIds.some((id) => removed.has(id)),
    );
    for (const unit of this.units) {
      if (unit.targetId !== null && removed.has(unit.targetId)) {
        unit.targetId = null;
        unit.targetLocked = false;
      }
    }
  }

  private resetTrainingUnit(unit: MutableUnit, x: number, y: number, holdFire: boolean): void {
    unit.x = x;
    unit.y = y;
    unit.targetX = x;
    unit.targetY = y;
    unit.hp = MAX_HP;
    unit.magazine = WEAPONS[DEFAULT_WEAPON_ID].magazine;
    unit.reserve = WEAPONS[DEFAULT_WEAPON_ID].reserve;
    unit.morale = MAX_MORALE;
    unit.alive = true;
    unit.suppressed = false;
    unit.suppression = 0;
    unit.cohesion = 100;
    unit.fatigue = 0;
    unit.formation = 'line';
    unit.orderDestination = null;
    unit.orderIssued = false;
    unit.orderRegionCenter = null;
    unit.orderRegionRadius = 0;
    unit.incapacitated = false;
    unit.state = 'steady';
    unit.routed = false;
    unit.panicTicks = 0;
    unit.cover = 0;
    unit.targetId = null;
    unit.cooldown = 0;
    unit.reload = 0;
    unit.path = [];
    unit.pathIndex = 0;
    unit.facingX = 0;
    unit.facingY = -1;
    unit.aimX = null;
    unit.aimY = null;
    unit.stance = 'standing';
    unit.stanceLocked = false;
    unit.coverSeekCooldown = 0;
    unit.flankTargetId = null;
    unit.flankCooldown = 0;
    unit.suppressionCooldown = 0;
    unit.suppress = false;
    unit.holdPosition = true;
    unit.holdFire = holdFire;
    unit.posture = 'balanced';
    unit.boundTeam = null;
    unit.boundPhase = null;
    unit.targetLocked = false;
    unit.currentOrder = null;
    unit.lineMove = false;
    unit.ambush = false;
    unit.reserveMode = false;
    unit.recon = false;
    unit.reconReported = false;
    unit.reconContacts = 0;
    unit.rescueTargetId = null;
    unit.rescueQueue = [];
    unit.wound = 'none';
    unit.soldierState = 'idle';
    unit.rescueTicks = 0;
    unit.treatTicks = 0;
    unit.carryingId = null;
    unit.beingCarriedBy = null;
    unit.recoveryTicks = 0;
  }
  private reinforce(
    faction: 'column' | 'legalist',
    tick: number,
    seq: number,
    events: SimEvent[],
  ): void {
    if (!this.sandbox && !this.training) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    const base = faction === 'column' ? 6 : 3;
    const count = this.units.filter((unit) => unit.faction === faction && !unit.dummy).length;
    const index = Math.max(0, count - base);
    const column = index % 4;
    const row = Math.floor(index / 4);
    const to =
      faction === 'column'
        ? { x: -16 + column * 2.2, y: 16 + row * 2 }
        : { x: -16 + column * 2.2, y: -26 - row * 2 };
    if (
      isPointBlockedByCovers(to.x, to.y, this.covers, 0.8) ||
      to.x < MAP_BOUNDS.minX ||
      to.x > MAP_BOUNDS.maxX ||
      to.y < MAP_BOUNDS.minY ||
      to.y > MAP_BOUNDS.maxY
    ) {
      this.reject(tick, seq, 'invalid_position', events);
      return;
    }
    this.units.push({
      id: this.nextUnitId,
      x: to.x,
      y: to.y,
      targetX: to.x,
      targetY: to.y,
      speed: 2,
      kind: 'infantry',
      faction,
      stance: 'standing',
      squadId: faction === 'column' ? 1 : 3,
      hp: MAX_HP,
      weaponId: DEFAULT_WEAPON_ID,
      magazine: 5,
      reserve: 15,
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
      facingX: faction === 'column' ? 0 : 0,
      facingY: faction === 'column' ? -1 : 1,
      aimX: null,
      aimY: null,
      stanceLocked: false,
      coverSeekCooldown: 0,
      flankTargetId: null,
      flankCooldown: 0,
      suppressionCooldown: 0,
      suppress: false,
      holdPosition: true,
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
    });
    this.nextUnitId += 1;
  }

  private incapacitate(
    targetId: number,
    tick: number,
    seq: number,
    events: SimEvent[],
  ): void {
    if (!this.sandbox && !this.training) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    const target = this.units.find((unit) => unit.id === targetId);
    if (!target || !target.alive || target.dummy || (target.faction !== 'column' && target.faction !== 'legalist')) {
      this.reject(tick, seq, 'invalid_target', events);
      return;
    }
    if (target.incapacitated) {
      this.reject(tick, seq, 'invalid_state', events);
      return;
    }
    this.releaseCarry(target);
    target.hp = 0;
    target.incapacitated = true;
    target.soldierState = 'incapacitated';
    target.wound = 'severe';
    target.currentOrder = null;
    target.targetId = null;
    target.targetLocked = false;
    target.path = [];
    target.pathIndex = 0;
    events.push({ type: 'unit_incapacitated', tick, unitId: target.id });
  }

  private reflowFormation(units: readonly MutableUnit[]): void {
    const active = units.filter(
      (unit) =>
        unit.alive &&
        !unit.incapacitated &&
        unit.currentOrder !== null &&
        unit.orderDestination !== null,
    );
    if (active.length < 2) {
      return;
    }
    const anchor = active[0]?.orderDestination;
    if (!anchor) {
      return;
    }
    const group = active.filter(
      (unit) =>
        unit.orderDestination !== null &&
        Math.abs(unit.orderDestination.x - anchor.x) < 0.01 &&
        Math.abs(unit.orderDestination.y - anchor.y) < 0.01,
    );
    if (group.length < 2) {
      return;
    }
    const spacing = group[0]?.currentOrder === 'disperse' ? 5 : 2.8;
    const slots = formationSlots(
      group.map((unit) => ({ x: unit.x, y: unit.y })),
      anchor,
      spacing,
      group[0]?.formation ?? 'line',
    );
    const ids = new Set(group.map((unit) => unit.id));
    this.orders = this.orders.filter(
      (order) => !order.unitIds.some((id) => ids.has(id)) || order.kind !== 'move',
    );
    group.forEach((unit, index) => {
      let destination = slots[index] ?? anchor;
      if (unit.orderRegionCenter !== null) {
        destination = this.clampToRegion(
          destination,
          unit.orderRegionCenter,
          unit.orderRegionRadius,
        );
      }
      const path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
      if (path.length === 0) {
        return;
      }
      unit.path = path;
      unit.pathIndex = 0;
      unit.targetX = destination.x;
      unit.targetY = destination.y;
      this.queueUnitOrder(unit, path, 'move');
    });
  }

  private wound(
    targetId: number,
    hp: number,
    tick: number,
    seq: number,
    events: SimEvent[],
  ): void {
    if (!this.sandbox && !this.training) {
      this.reject(tick, seq, 'sandbox_only', events);
      return;
    }
    const target = this.units.find((unit) => unit.id === targetId);
    if (!target || !target.alive || target.dummy || (target.faction !== 'column' && target.faction !== 'legalist')) {
      this.reject(tick, seq, 'invalid_target', events);
      return;
    }
    if (target.incapacitated || hp < 1 || hp > 99) {
      this.reject(tick, seq, 'invalid_state', events);
      return;
    }
    target.hp = Math.round(hp);
    target.soldierState = 'wounded';
    target.wound = this.woundFor(target);
  }

  private releaseCarry(unit: MutableUnit): void {
    if (unit.carryingId !== null) {
      const carried = this.units.find((entry) => entry.id === unit.carryingId);
      if (carried) {
        carried.beingCarriedBy = null;
        carried.incapacitated = true;
        carried.soldierState = 'incapacitated';
      }
    }
    unit.carryingId = null;
    unit.rescueTargetId = null;
    unit.rescueQueue = [];
    unit.rescueTicks = 0;
    unit.treatTicks = 0;
  }

  private applyTacticalOrder(
    command: Extract<Command, { type: 'order' }>,
    units: readonly MutableUnit[],
    tick: number,
    seq: number,
    events: SimEvent[],
  ): void {
    if (units.length === 0) {
      this.reject(tick, seq, 'empty_units', events);
      return;
    }
    this.orders = this.orders.filter(
      (order) => !order.unitIds.some((id) => command.unitIds.includes(id)),
    );
    const clear = (unit: MutableUnit): void => {
      unit.path = [];
      unit.pathIndex = 0;
      unit.targetId = null;
      unit.targetLocked = false;
      unit.flankTargetId = null;
      unit.suppress = false;
      unit.currentOrder = null;
      unit.lineMove = false;
      unit.ambush = false;
      unit.reserveMode = false;
      unit.recon = false;
      unit.reconReported = false;
      unit.reconContacts = 0;
      unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
      this.releaseCarry(unit);
    };

    const areaOrders: readonly TacticalOrder[] = [
      'advance',
      'defend',
      'ambush',
      'disperse',
      'recon',
      'reserve',
    ];
    if (areaOrders.includes(command.order)) {
      if (!command.to) {
        this.reject(tick, seq, 'invalid_position', events);
        return;
      }
      const spacing = command.order === 'disperse' ? 5 : 2.8;
      const formationThreat =
        command.order === 'defend' || command.order === 'ambush'
          ? this.nearestEnemyAt(command.to, units[0]!.faction)
          : null;
      const formationFacing = formationThreat
        ? this.facingToward(command.to, formationThreat)
        : (averageAim(units) ??
          (isPointNearCover(command.to, this.covers) ? averageFacing(units) : undefined));
      const coverFacing = formationFacing ?? averageFacing(units);
      const slots = formationSlots(
        units.map((unit) => ({ x: unit.x, y: unit.y })),
        command.to,
        spacing,
        units[0]?.formation ?? 'line',
        formationFacing,
      );
      const usedCover: Vec2[] = [];
      units.forEach((unit, index) => {
        clear(unit);
        const regionRadius = DEFEND_REGION_RADIUS;
        let destination = slots[index] ?? command.to!;
        const planned = coverDestinationForSlot(
          unit,
          destination,
          this.nearestEnemy(unit),
          this.covers,
          usedCover,
          command.to!,
          coverFacing,
        );
        if (planned.cover) {
          destination = planned.destination;
          if (!unit.stanceLocked) {
            unit.stance = 'crouched';
          }
        }
        if (command.order === 'defend') {
          destination = this.clampToRegion(destination, command.to!, regionRadius);
        }
        if (planned.cover) {
          usedCover.push(destination);
        }
        let path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
        if (path.length === 0) {
          path = findPath({ x: unit.x, y: unit.y }, command.to!, this.covers);
        }
        unit.currentOrder = command.order;
        unit.orderIssued = true;
        unit.orderDestination = { ...command.to! };
        if (command.order === 'defend') {
          unit.orderRegionCenter = { ...command.to! };
          unit.orderRegionRadius = regionRadius;
        }
        unit.holdPosition =
          command.order === 'defend' ||
          command.order === 'ambush' ||
          command.order === 'disperse' ||
          command.order === 'recon' ||
          command.order === 'reserve';
        unit.ambush = command.order === 'ambush';
        unit.reserveMode = command.order === 'reserve';
        unit.recon = command.order === 'recon';
        if (path.length === 0) {
          unit.path = [];
          unit.pathIndex = 0;
          unit.targetX = unit.x;
          unit.targetY = unit.y;
          return;
        }
        unit.path = path;
        unit.pathIndex = 0;
        unit.targetX = destination.x;
        unit.targetY = destination.y;
      });
      return;
    }

    if (command.order === 'regroup' || command.order === 'protect-officer') {
      const officer = this.units.find(
        (unit) =>
          unit.alive &&
          !unit.incapacitated &&
          !unit.routed &&
          unit.kind === 'officer' &&
          unit.faction === units[0]?.faction,
      );
      if (!officer) {
        this.reject(tick, seq, 'no_officer', events);
        return;
      }
      const slots = formationSlots(
        units.map((unit) => ({ x: unit.x, y: unit.y })),
        { x: officer.x, y: officer.y },
        undefined,
        units[0]?.formation ?? 'line',
      );
      units.forEach((unit, index) => {
        clear(unit);
        const destination = slots[index] ?? { x: officer.x, y: officer.y };
        const path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
        unit.currentOrder = command.order;
        unit.orderIssued = true;
        unit.orderDestination = { x: officer.x, y: officer.y };
        unit.holdPosition = true;
        if (path.length > 0) {
          unit.path = path;
          unit.pathIndex = 0;
          unit.targetX = destination.x;
          unit.targetY = destination.y;
        }
      });
      return;
    }

    if (command.order === 'pursue') {
      const target = this.units.find((unit) => unit.id === command.targetId);
      if (!target || !target.alive || target.routed || target.incapacitated) {
        this.reject(tick, seq, 'invalid_target', events);
        return;
      }
      for (const unit of units) {
        clear(unit);
        unit.targetId = target.id;
        const targetDx = target.x - unit.x;
        const targetDy = target.y - unit.y;
        const targetLength = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
        if (targetLength > 0.001) {
          unit.facingX = targetDx / targetLength;
          unit.facingY = targetDy / targetLength;
        }
        unit.targetLocked = true;
        unit.currentOrder = 'pursue';
        unit.orderIssued = true;
        const path = findPath({ x: unit.x, y: unit.y }, { x: target.x, y: target.y }, this.covers);
        if (path.length > 0) {
          unit.path = path;
          unit.pathIndex = 0;
          unit.targetX = target.x;
          unit.targetY = target.y;
        }
      }
      return;
    }

    if (command.order === 'rescue') {
      const target = this.units.find((unit) => unit.id === command.targetId);
      if (!target || !target.alive || target.routed || !target.incapacitated) {
        this.reject(tick, seq, 'no_rescue_target', events);
        return;
      }
      if (
        target.beingCarriedBy !== null ||
        this.units.some((unit) => unit.id !== target.id && unit.rescueTargetId === target.id)
      ) {
        this.reject(tick, seq, 'invalid_state', events);
        return;
      }
      const rescuer =
        units.find(
          (unit) =>
            unit.id !== target.id &&
            unit.rescueTargetId === null &&
            unit.carryingId === null &&
            unit.treatTicks === 0,
        ) ?? units.find((unit) => unit.id !== target.id);
      if (!rescuer) {
        this.reject(tick, seq, 'no_rescue_target', events);
        return;
      }
      if (
        rescuer.rescueTargetId !== null ||
        rescuer.carryingId !== null ||
        rescuer.treatTicks > 0
      ) {
        if (!rescuer.rescueQueue.includes(target.id)) {
          rescuer.rescueQueue.push(target.id);
        }
        return;
      }
      clear(rescuer);
      rescuer.rescueTargetId = target.id;
      rescuer.currentOrder = 'rescue';
      const path = findPath({ x: rescuer.x, y: rescuer.y }, { x: target.x, y: target.y }, this.covers);
      if (path.length > 0) {
        rescuer.path = path;
        rescuer.pathIndex = 0;
        rescuer.targetX = target.x;
        rescuer.targetY = target.y;
      }
      return;
    }

    this.reject(tick, seq, 'invalid_order', events);
  }
  private reject(tick: number, seq: number, reason: RejectionReason, events: SimEvent[]): void {
    events.push({ type: 'command_rejected', tick, seq, reason });
  }

  private clampToRegion(point: Vec2, center: Vec2, radius: number): Vec2 {
    return clampPointToRegion(point, center, radius);
  }

  private groupSpeedFactor(unit: MutableUnit): number {
    if (unit.orderDestination === null || unit.currentOrder === null) {
      return 1;
    }
    const peers = this.units.filter(
      (other) =>
        other !== unit &&
        other.alive &&
        !other.incapacitated &&
        other.faction === unit.faction &&
        other.squadId === unit.squadId &&
        other.currentOrder === unit.currentOrder &&
        other.orderDestination !== null &&
        Math.abs(other.orderDestination.x - unit.orderDestination!.x) < 0.01 &&
        Math.abs(other.orderDestination.y - unit.orderDestination!.y) < 0.01 &&
        other.path.length > 0,
    );
    if (peers.length === 0) {
      return 1;
    }
    const remaining = Math.sqrt(
      (unit.targetX - unit.x) ** 2 + (unit.targetY - unit.y) ** 2,
    );
    const average =
      peers.reduce(
        (sum, other) =>
          sum + Math.sqrt((other.targetX - other.x) ** 2 + (other.targetY - other.y) ** 2),
        0,
      ) / peers.length;
    return remaining + 2 < average ? 0.55 : 1;
  }

  private separateUnits(): void {
    const living = this.units
      .filter((unit) => unit.alive && !unit.routed && !unit.dummy && !unit.incapacitated)
      .sort((left, right) => left.id - right.id);
    const minDistance = 1.2;
    for (let leftIndex = 0; leftIndex < living.length; leftIndex += 1) {
      const left = living[leftIndex]!;
      for (let rightIndex = leftIndex + 1; rightIndex < living.length; rightIndex += 1) {
        const right = living[rightIndex]!;
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= minDistance) {
          continue;
        }
        const bothMoving =
          left.currentOrder === 'move' &&
          right.currentOrder === 'move' &&
          left.path.length > 0 &&
          right.path.length > 0 &&
          (left.targetX !== right.targetX || left.targetY !== right.targetY);
        if (bothMoving) {
          continue;
        }
        if (distance < 0.001) {
          dx = 0.001 * ((left.id + right.id) % 2 === 0 ? 1 : -1);
          dy = 0.001;
          distance = Math.sqrt(dx * dx + dy * dy);
        }
        const push = (minDistance - distance) / 2;
        const nx = dx / distance;
        const ny = dy / distance;
        left.x = clamp(left.x - nx * push, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
        left.y = clamp(left.y - ny * push, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
        right.x = clamp(right.x + nx * push, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
        right.y = clamp(right.y + ny * push, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
      }
    }
  }
  private nearestOpenPoint(point: Vec2, maxRadius = 3): Vec2 {
    if (!isPointBlockedByCovers(point.x, point.y, this.covers, 0.8)) {
      return { ...point };
    }
    for (let radius = 0.5; radius <= maxRadius; radius += 0.5) {
      for (const direction of OPEN_POINT_DIRECTIONS) {
        const candidate = {
          x: point.x + direction.x * radius,
          y: point.y + direction.y * radius,
        };
        if (!isPointBlockedByCovers(candidate.x, candidate.y, this.covers, 0.8)) {
          return candidate;
        }
      }
    }
    return { ...point };
  }

  private moveUnit(unit: MutableUnit, tick: number, events: SimEvent[]): void {
    if (
      !unit.alive ||
      unit.routed ||
      unit.dummy ||
      unit.incapacitated ||
      unit.state === 'pinned' ||
      unit.path.length === 0
    ) {
      return;
    }

    const point = unit.path[unit.pathIndex];
    if (!point) {
      unit.path = [];
      unit.pathIndex = 0;
      return;
    }

    const dx = point.x - unit.x;
    const dy = point.y - unit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.0001) {
      unit.pathIndex += 1;
      if (unit.pathIndex >= unit.path.length) {
        unit.path = [];
        unit.pathIndex = 0;
        unit.targetX = point.x;
        unit.targetY = point.y;
        unit.coverSeekCooldown = 0;
        events.push({ type: 'unit_arrived', tick, unitId: unit.id });
      }
      return;
    }

    const stanceFactor = unit.stance === 'prone' ? 0.45 : unit.stance === 'crouched' ? 0.7 : 1;
    const postureFactor = unit.posture === 'defensive' ? 0.65 : 1;
    const step =
      unit.speed *
      stanceFactor *
      postureFactor *
      TICK_DT *
      terrainSpeedFactor(unit.x, unit.y) *
      (0.75 + 0.25 * (unit.cohesion / 100)) *
      (1 - (unit.fatigue / FATIGUE_MAX) * 0.25) *
      this.woundSpeedFactor(unit) *
      this.groupSpeedFactor(unit);
    if (distance <= step) {
      unit.x = point.x;
      unit.y = point.y;
      unit.pathIndex += 1;
      if (unit.pathIndex >= unit.path.length) {
        unit.path = [];
        unit.pathIndex = 0;
        unit.targetX = point.x;
        unit.targetY = point.y;
        unit.coverSeekCooldown = 0;
        events.push({ type: 'unit_arrived', tick, unitId: unit.id });
      }
      return;
    }

    const nextX = unit.x + (dx / distance) * step;
    const nextY = unit.y + (dy / distance) * step;
    const hardBlocked = isPointBlockedByCovers(nextX, nextY, this.covers, 0);
    if (hardBlocked) {
      const detour = findPath(
        { x: unit.x, y: unit.y },
        { x: unit.targetX, y: unit.targetY },
        this.covers,
      );
      if (detour.length > 0) {
        unit.path = detour;
        unit.pathIndex = 0;
        return;
      }
      const order = unit.currentOrder ?? 'move';
      unit.currentOrder = 'hold';
      unit.orderIssued = false;
      unit.holdPosition = true;
      unit.path = [];
      unit.pathIndex = 0;
      events.push({ type: 'order_interrupted', tick, unitId: unit.id, order });
      return;
    }

    const softBlocked = isPointBlockedByCovers(nextX, nextY, this.covers, 0.8);
    if (softBlocked && !isPointBlockedByCovers(unit.x, unit.y, this.covers, 0.8)) {
      const detour = findPath(
        { x: unit.x, y: unit.y },
        { x: unit.targetX, y: unit.targetY },
        this.covers,
      );
      const nextPoint = detour[0];
      const waypoint = unit.path[unit.pathIndex];
      const sameWaypoint =
        nextPoint !== undefined &&
        waypoint !== undefined &&
        (nextPoint.x - waypoint.x) ** 2 + (nextPoint.y - waypoint.y) ** 2 < 0.01;
      const detourNear =
        nextPoint !== undefined &&
        (nextPoint.x - unit.x) ** 2 + (nextPoint.y - unit.y) ** 2 <= 1;
      if (detour.length > 0 && !detourNear && !sameWaypoint) {
        unit.path = detour;
        unit.pathIndex = 0;
        return;
      }
      if (detour.length === 0) {
        const order = unit.currentOrder ?? 'move';
        unit.currentOrder = 'hold';
        unit.orderIssued = false;
        unit.holdPosition = true;
        unit.path = [];
        unit.pathIndex = 0;
        events.push({ type: 'order_interrupted', tick, unitId: unit.id, order });
        return;
      }
    }
    unit.x = nextX;
    unit.y = nextY;    unit.fatigue = Math.min(FATIGUE_MAX, unit.fatigue + 0.8);
  }

  private acquireTargets(): void {
    const engaged = new Map<number, number>();
    for (const other of this.units) {
      if (other.alive && other.targetId !== null) {
        engaged.set(other.targetId, (engaged.get(other.targetId) ?? 0) + 1);
      }
    }
    for (const unit of this.units) {
      if (!unit.alive || unit.routed || unit.dummy || unit.incapacitated || unit.state === 'panicked') {
        continue;
      }
      if (unit.reserveMode || unit.recon) {
        continue;
      }
      if ((unit.currentOrder === 'pursue' || unit.currentOrder === 'attack') && unit.targetId !== null) {
        continue;
      }
      const current =
        unit.targetId === null ? null : this.units.find((entry) => entry.id === unit.targetId);
      if (unit.suppress && current?.alive) {
        continue;
      }
      if (
        current &&
        current.alive &&
        this.visible(unit, current) &&
        (!unit.ambush ||
          (current.x - unit.x) ** 2 + (current.y - unit.y) ** 2 <= AMBUSH_RADIUS * AMBUSH_RADIUS)
      ) {
        if (unit.targetLocked) {
          continue;
        }
        const currentScore = targetScore(
          unit,
          {
            x: current.x,
            y: current.y,
            cover: coverAgainst(current.x, current.y, unit.x, unit.y, current.stance, this.covers),
            suppressed: current.suppressed,
            kind: current.kind,
          },
          engaged.get(current.id) ?? 0,
        );
        let best: MutableUnit | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const candidate of this.units) {
          if (
          !candidate.alive ||
          candidate.dummy ||
          candidate.routed ||
          candidate.incapacitated ||
          candidate.faction === unit.faction ||
          (unit.faction !== 'column' && candidate.faction === 'target')
        ) {
            continue;
          }
          if (!this.visible(unit, candidate)) {
            continue;
          }
          if (
            unit.ambush &&
            (candidate.x - unit.x) ** 2 + (candidate.y - unit.y) ** 2 >
              AMBUSH_RADIUS * AMBUSH_RADIUS
          ) {
            continue;
          }
          const score = targetScore(
            unit,
            {
              x: candidate.x,
              y: candidate.y,
              cover: coverAgainst(candidate.x, candidate.y, unit.x, unit.y, candidate.stance, this.covers),
              suppressed: candidate.suppressed,
              kind: candidate.kind,
            },
            engaged.get(candidate.id) ?? 0,
          );
          if (
            score > bestScore + 0.0001 ||
            (Math.abs(score - bestScore) < 0.0001 && best !== null && candidate.id < best.id)
          ) {
            best = candidate;
            bestScore = score;
          }
        }
        if (best && bestScore > currentScore + TARGET_HYSTERESIS) {
          if (unit.targetId !== null) {
            engaged.set(unit.targetId, Math.max(0, (engaged.get(unit.targetId) ?? 1) - 1));
          }
          unit.targetId = best.id;
          engaged.set(best.id, (engaged.get(best.id) ?? 0) + 1);
          unit.targetLocked = false;
        }
        continue;
      }

      unit.targetLocked = false;
      let best: MutableUnit | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const candidate of this.units) {
        if (
          !candidate.alive ||
          candidate.dummy ||
          candidate.routed ||
          candidate.incapacitated ||
          candidate.faction === unit.faction ||
          (unit.faction !== 'column' && candidate.faction === 'target')
        ) {
          continue;
        }
        if (!this.visible(unit, candidate)) {
          continue;
        }
        const score = targetScore(
          unit,
          {
            x: candidate.x,
            y: candidate.y,
            cover: coverAgainst(candidate.x, candidate.y, unit.x, unit.y, candidate.stance, this.covers),
            suppressed: candidate.suppressed,
            kind: candidate.kind,
          },
          engaged.get(candidate.id) ?? 0,
        );
        if (
          score > bestScore + 0.0001 ||
          (Math.abs(score - bestScore) < 0.0001 && best !== null && candidate.id < best.id)
        ) {
          best = candidate;
          bestScore = score;
        }
      }
      const previous = unit.targetId;
      unit.targetId = best?.id ?? null;
      if (previous !== null) {
        engaged.set(previous, Math.max(0, (engaged.get(previous) ?? 1) - 1));
      }
      if (best) {
        engaged.set(best.id, (engaged.get(best.id) ?? 0) + 1);
      }
    }
  }
  private visible(shooter: MutableUnit, target: MutableUnit): boolean {
    const range = this.combatRange;
    const dx = target.x - shooter.x;
    const dy = target.y - shooter.y;
    if (dx * dx + dy * dy > range * range) {
      return false;
    }
    if (!isPointInVision(shooter, target)) {
      return false;
    }
    return !isLineBlocked(
      shooter.x,
      shooter.y,
      target.x,
      target.y,
      this.covers,
      this.sightObstacles,
      eyeHeightForStance(shooter.stance),
      eyeHeightForStance(target.stance),
    );
  }

  private fire(tick: number, events: SimEvent[]): void {
    for (const unit of this.units) {
      const weapon = getWeapon(unit.weaponId);
      if (
        !weapon ||
        !unit.alive ||
        unit.reserveMode ||
        unit.recon ||
        unit.dummy ||
        unit.routed ||
        unit.incapacitated ||
        unit.state === 'panicked' ||
        unit.state === 'pinned' ||
        unit.holdFire ||
        unit.reload > 0 ||
        unit.cooldown > 0 ||
        unit.targetId === null
      ) {
        continue;
      }
      if (unit.magazine <= 0) {
        if (unit.reserve > 0) {
          unit.reload = weapon.reloadTicks;
        }
        continue;
      }
      const target =
        unit.targetId === null
          ? null
          : this.units.find((entry) => entry.id === unit.targetId);
      if (!target || !target.alive || target.routed || target.incapacitated) {
        if (unit.currentOrder !== 'pursue') {
          unit.targetId = null;
        }
        continue;
      }
      if (!this.visible(unit, target)) {
        if (!unit.suppress && unit.currentOrder !== 'pursue' && unit.currentOrder !== 'attack') {
          unit.targetId = null;
        }
        continue;
      }

      const distance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
      if (unit.ambush && distance > AMBUSH_RADIUS) {
        continue;
      }
      const rangeFactor = Math.max(0.25, 1 - (distance / this.combatRange) * 0.55);
      const targetCover = coverAgainst(target.x, target.y, unit.x, unit.y, target.stance, this.covers);
      const moraleFactor = unit.morale < SUPPRESSION_THRESHOLD ? 0.55 : 1;
      const suppressFactor = unit.suppress ? 0.7 : 1;
      const chance = clamp(
        weapon.accuracy *
          rangeFactor *
          (1 - targetCover) *
          moraleFactor *
          suppressFactor *
          this.woundAccuracyFactor(unit),
        0.05,
        0.95,
      );
      const hit = this.rng.nextFloat() < chance;

      events.push({
        type: 'shot',
        tick,
        source: unit.id,
        target: target.id,
        x: unit.x,
        y: unit.y,
        x2: target.x,
        y2: target.y,
        hit,
      });

      if (unit.ambush) {
        unit.ambush = false;
        unit.currentOrder = 'defend';
        unit.holdPosition = true;
      }
      unit.magazine -= 1;
      unit.cooldown = unit.suppress ? SUPPRESS_FIRE_INTERVAL : weapon.fireIntervalTicks;
      if (unit.magazine === 0 && unit.reserve > 0) {
        unit.reload = weapon.reloadTicks;
      }

      const suppressionGain =
        (hit ? 20 : 12) *
        weapon.suppression *
        Math.max(0.2, 1 - targetCover * 0.8) *
        (unit.nonLethal ? 0.05 : 1);
      target.suppression = clamp(target.suppression + suppressionGain, 0, 100);

      if (hit) {
        const moraleDamage = Math.round((unit.suppress ? 16 : 10) * weapon.suppression);
        if (unit.nonLethal) {
          target.morale = Math.max(25, target.morale - Math.round(moraleDamage * 0.5));
          continue;
        }
        const spread = weapon.damageMax - weapon.damageMin;
        const base = unit.suppress ? Math.max(1, Math.round(weapon.damageMin * 0.5)) : weapon.damageMin;
        const extra = unit.suppress ? Math.round(spread * 0.5) : spread;
        const damage = base + Math.floor(this.rng.nextFloat() * (extra + 1));
        const wasWounded =
          target.wound === 'light' ||
          target.wound === 'moderate' ||
          target.wound === 'severe';
        target.hp = Math.max(0, target.hp - damage);
        target.morale = Math.max(0, target.morale - moraleDamage);
        events.push({ type: 'unit_hit', tick, unitId: target.id, damage, hp: target.hp });
        if (target.hp === 0) {
          target.targetId = null;
          target.path = [];
          target.pathIndex = 0;
          if (target.dummy) {
            target.alive = false;
            events.push({ type: 'unit_died', tick, unitId: target.id });
          } else if (wasWounded) {
            target.alive = false;
            target.routed = false;
            target.soldierState = 'dead';
            target.wound = 'fatal';
            target.currentOrder = null;
            events.push({ type: 'unit_died', tick, unitId: target.id });
          } else {
            target.incapacitated = true;
            target.soldierState = 'incapacitated';
            target.wound = 'severe';
            target.currentOrder = null;
            events.push({ type: 'unit_incapacitated', tick, unitId: target.id });
          }
          if (!target.dummy) {
          for (const ally of this.units) {
            if (!ally.alive || ally.faction !== target.faction || ally.id === target.id) {
              continue;
            }
            const distance = Math.sqrt((ally.x - target.x) ** 2 + (ally.y - target.y) ** 2);
            if (distance <= 12) {
              ally.morale = Math.max(0, ally.morale - 8);
              ally.suppression = clamp(ally.suppression + 8, 0, 100);
            }
          }
          }
        }
      } else {
        const moraleDamage = Math.round((unit.suppress ? 4 : 2) * weapon.suppression * Math.max(0.3, 1 - targetCover * 0.5));
        target.morale = Math.max(unit.nonLethal ? 25 : 0, target.morale - moraleDamage);
      }
    }

  }

  private applyOfficerAura(): void {
    for (const officer of this.units) {
      if (!officer.alive || officer.dummy || officer.routed || officer.incapacitated || officer.kind !== 'officer') {
        continue;
      }
      for (const ally of this.units) {
        if (
          ally === officer ||
          !ally.alive ||
          ally.dummy ||
          ally.routed ||
          ally.faction !== officer.faction
        ) {
          continue;
        }
        if (
          (ally.x - officer.x) ** 2 + (ally.y - officer.y) ** 2 <= 12 * 12
        ) {
          ally.morale = Math.min(MAX_MORALE, ally.morale + 0.25);
        }
      }
    }
  }


  private queueUnitOrder(unit: MutableUnit, path: Vec2[], kind: ActiveOrder['kind']): void {
    this.orders = this.orders.filter((order) => !order.unitIds.includes(unit.id));
    this.orders.push({
      id: this.nextOrderId,
      unitIds: [unit.id],
      points: [{ x: unit.x, y: unit.y }, ...path],
      kind,
    });
    this.nextOrderId += 1;
  }
  private repairStalledMovement(): void {
    for (const unit of this.units) {
      const advancingBounding = unit.boundTeam !== null && unit.boundPhase === 'advance';
      if (
        !unit.alive ||
        unit.routed ||
        unit.dummy ||
        unit.incapacitated ||
        unit.state === 'pinned' ||
        unit.path.length > 0 ||
        (!advancingBounding && (unit.holdPosition || unit.currentOrder !== 'move'))
      ) {
        continue;
      }
      const distance = Math.sqrt(
        (unit.targetX - unit.x) ** 2 + (unit.targetY - unit.y) ** 2,
      );
      if (distance <= 0.8) {
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        continue;
      }
      let destination = { x: unit.targetX, y: unit.targetY };
      let path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
      if (path.length === 0) {
        destination = this.nearestOpenPoint(destination);
        path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
      }
      if (path.length === 0) {
        const escape = this.nearestOpenPoint({ x: unit.x, y: unit.y });
        if (escape.x !== unit.x || escape.y !== unit.y) {
          const rest = findPath(escape, destination, this.covers);
          if (rest.length > 0) {
            path = [escape, ...rest];
          }
        }
      }
      if (path.length === 0) {
        continue;
      }
      this.orders = this.orders.filter(
        (order) => !(order.unitIds.length === 1 && order.unitIds[0] === unit.id && order.kind === 'move'),
      );
      unit.targetX = destination.x;
      unit.targetY = destination.y;
      unit.path = path;
      unit.pathIndex = 0;
      unit.orderIssued = true;
      unit.currentOrder = 'move';
      unit.lineMove = false;
      unit.holdPosition = false;
      this.queueUnitOrder(unit, path, 'move');
    }
  }

  private updateBounding(): void {
    if (!this.boundingEnabled) {
      return;
    }
    const eligible = this.units.filter(
      (unit) =>
        unit.faction === 'column' &&
        unit.alive &&
        !unit.routed &&
        !unit.dummy &&
        !unit.incapacitated &&
        unit.state !== 'pinned' &&
        !unit.lineMove &&
        unit.currentOrder !== null && BOUNDING_ORDERS.has(unit.currentOrder),
    );
    const activeSquads = new Set(eligible.map((unit) => unit.squadId));
    for (const [squadId] of this.bounding) {
      if (!activeSquads.has(squadId)) {
        for (const unit of this.units) {
          if (unit.squadId === squadId) {
            unit.boundTeam = null;
            unit.boundPhase = null;
          }
        }
        this.bounding.delete(squadId);
      }
    }

    for (const squadId of activeSquads) {
      const units = eligible.filter((unit) => unit.squadId === squadId);
      if (units.length < 2) {
        continue;
      }
      let group = this.bounding.get(squadId);
      if (!group) {
        const sorted = [...units].sort((left, right) => left.id - right.id);
        const split = Math.ceil(sorted.length / 2);
        const teamA = sorted.slice(0, split);
        const teamB = sorted.slice(split);
        const first = sorted[0]!;
        const target =
          first.targetId === null
            ? null
            : this.units.find((entry) => entry.id === first.targetId);
        const destination = target
          ? { x: target.x, y: target.y }
          : first.orderDestination ?? {
              x: sorted.reduce((sum, unit) => sum + unit.x, 0) / sorted.length,
              y: sorted.reduce((sum, unit) => sum + unit.y, 0) / sorted.length,
            };
        const slots = formationSlots(
          sorted.map((unit) => ({ x: unit.x, y: unit.y })),
          destination,
          2.8,
          first.formation ?? 'line',
          averageFacing(sorted),
        );
        const targets = new Map<number, Vec2>();
        sorted.forEach((unit, index) => {
          targets.set(unit.id, slots[index] ?? destination);
        });
        group = {
          squadId,
          teamA: teamA.map((unit) => unit.id),
          teamB: teamB.map((unit) => unit.id),
          destination,
          targetId: first.targetId,
          phase: 'b',
          mode: first.currentOrder === 'attack' ? 'attack' : 'move',
          targets,
        };
        this.bounding.set(squadId, group);
        for (const unit of teamA) {
          unit.boundTeam = 'a';
          unit.boundPhase = 'cover';
        }
        for (const unit of teamB) {
          unit.boundTeam = 'b';
          unit.boundPhase = 'advance';
        }
        this.setBoundingCover(teamA);
        if (group.mode === 'attack') {
          this.assignBoundingAdvance(teamB, destination, first.targetId);
        } else {
          this.assignBoundingDirect(teamB, destination, group.targets);
        }
        continue;
      }

      const first = units[0]!;
      const target =
        first.targetId === null
          ? null
          : this.units.find((entry) => entry.id === first.targetId);
      if (target) {
        group.destination = { x: target.x, y: target.y };
      }
      const teamA = units.filter((unit) => group.teamA.includes(unit.id));
      const teamB = units.filter((unit) => group.teamB.includes(unit.id));
      const moving = group.phase === 'a' ? teamA : teamB;
      const waiting = group.phase === 'a' ? teamB : teamA;
      const stillMoving = moving.filter((unit) => unit.path.length > 0);
      if (stillMoving.length > 1) {
        continue;
      }

      this.setBoundingCover(moving.filter((unit) => unit.path.length === 0));
      if (group.mode === 'move') {
        if (group.phase === 'b') {
          this.assignBoundingDirect(teamA, group.destination, group.targets);
          group.phase = 'a';
        } else {
          for (const id of group.teamA.concat(group.teamB)) {
            const unit = this.units.find((entry) => entry.id === id);
            if (!unit) {
              continue;
            }
            unit.boundTeam = null;
            unit.boundPhase = null;
            if ((unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 > 1) {
              unit.holdPosition = false;
              unit.currentOrder = 'move';
              unit.lineMove = false;
            }
          }
          this.bounding.delete(squadId);
        }
        continue;
      }
      if (group.phase === 'b') {
        const centroidB = {
          x: teamB.reduce((sum, unit) => sum + unit.x / Math.max(1, teamB.length), 0),
          y: teamB.reduce((sum, unit) => sum + unit.y / Math.max(1, teamB.length), 0),
        };
        this.assignBoundingAdvance(teamA, group.destination, group.targetId, centroidB);
        group.phase = 'a';
      } else {
        const centroidA = {
          x: teamA.reduce((sum, unit) => sum + unit.x / Math.max(1, teamA.length), 0),
          y: teamA.reduce((sum, unit) => sum + unit.y / Math.max(1, teamA.length), 0),
        };
        this.assignBoundingAdvance(teamB, group.destination, group.targetId, centroidA);
        group.phase = 'b';
      }
      for (const unit of waiting) {
        unit.boundPhase = 'cover';
      }
      for (const unit of moving) {
        unit.boundPhase = 'cover';
      }
      for (const unit of group.phase === 'a' ? teamA : teamB) {
        unit.boundPhase = unit.path.length > 0 ? 'advance' : 'cover';
      }
      if (
        teamA.every((unit) => unit.path.length === 0) &&
        teamB.every((unit) => unit.path.length === 0) &&
        teamA.concat(teamB).every(
          (unit) =>
            (unit.x - group!.destination.x) ** 2 + (unit.y - group!.destination.y) ** 2 < 16,
        )
      ) {
        for (const unit of teamA.concat(teamB)) {
          unit.boundTeam = null;
          unit.boundPhase = null;
        }
        this.bounding.delete(squadId);
      }
    }
  }

  private assignBoundingDirect(
    units: readonly MutableUnit[],
    destination: Vec2,
    targets?: ReadonlyMap<number, Vec2>,
  ): void {
    const slots = formationSlots(
      units.map((unit) => ({ x: unit.x, y: unit.y })),
      destination,
      2.8,
      units[0]?.formation ?? 'line',
      averageFacing(units),
    );
    units.forEach((unit, index) => {
      // A slot inside a cover's clearance has no path; without this the soldier
      // would wait in cover forever while the rest of the team moves on.
      const target = this.nearestOpenPoint(targets?.get(unit.id) ?? slots[index] ?? destination);
      unit.targetX = target.x;
      unit.targetY = target.y;
      unit.holdPosition = false;
      unit.currentOrder = 'move';
      unit.lineMove = false;
      const path = findPath({ x: unit.x, y: unit.y }, target, this.covers);
      if (path.length === 0) {
        unit.path = [];
        unit.pathIndex = 0;
        unit.boundPhase = 'cover';
        return;
      }
      unit.path = path;
      unit.pathIndex = 0;
      unit.boundPhase = 'advance';
      this.queueUnitOrder(unit, path, 'move');
    });
  }

  private setBoundingCover(units: readonly MutableUnit[]): void {
    for (const unit of units) {
      unit.path = [];
      unit.pathIndex = 0;
      unit.holdPosition = true;
      unit.boundPhase = 'cover';
    }
  }

  private assignBoundingAdvance(
    units: readonly MutableUnit[],
    destination: Vec2,
    targetId: number | null,
    aheadOf?: Vec2,
  ): void {
    for (const unit of units) {
      const currentDistance = Math.sqrt(
        (unit.x - destination.x) ** 2 + (unit.y - destination.y) ** 2,
      );
      let best: Vec2 | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const cover of this.covers) {
        const coverDistance = Math.sqrt(
          (cover.x - unit.x) ** 2 + (cover.y - unit.y) ** 2,
        );
        if (coverDistance > 16 || coverDistance < 0.6) {
          continue;
        }
        const destinationDistance = Math.sqrt(
          (cover.x - destination.x) ** 2 + (cover.y - destination.y) ** 2,
        );
        if (destinationDistance >= currentDistance - 1.5) {
          continue;
        }
        if (
          aheadOf &&
          destinationDistance >=
            Math.sqrt((aheadOf.x - destination.x) ** 2 + (aheadOf.y - destination.y) ** 2) - 1
        ) {
          continue;
        }
        if (
          isPointBlockedByCovers(cover.x, cover.y, this.covers, 0.8) ||
          this.occupied(cover.x, cover.y, unit)
        ) {
          continue;
        }
        const path = findPath({ x: unit.x, y: unit.y }, cover, this.covers);
        if (path.length === 0) {
          continue;
        }
        const score = destinationDistance + path.length * 0.15 - cover.quality * 3;
        if (score < bestScore) {
          bestScore = score;
          best = { x: cover.x, y: cover.y };
        }
      }
      if (!best) {
        const dx = destination.x - unit.x;
        const dy = destination.y - unit.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0.001) {
          const distance = Math.min(8, Math.max(2, length * 0.5));
          best = {
            x: unit.x + (dx / length) * distance,
            y: unit.y + (dy / length) * distance,
          };
        }
      }
      if (!best) {
        unit.boundPhase = 'cover';
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, best, this.covers);
      if (path.length === 0) {
        unit.boundPhase = 'cover';
        return;
      }
      unit.path = path;
      unit.pathIndex = 0;
      unit.targetX = best.x;
      unit.targetY = best.y;
      unit.holdPosition = false;
      unit.boundPhase = 'advance';
      this.queueUnitOrder(unit, path, 'move');
    }
  }
  private updatePostureMovement(): void {
    for (const unit of this.units) {
      if (
        !unit.alive ||
        unit.routed ||
        unit.dummy ||
        unit.incapacitated ||
        unit.state === 'panicked' ||
        unit.state === 'pinned' ||
        unit.boundTeam !== null ||
        unit.path.length > 0 ||
        unit.holdPosition
      ) {
        continue;
      }
      if (unit.currentOrder !== null && unit.currentOrder !== 'attack') {
        continue;
      }
      if (unit.currentOrder === 'attack' || unit.posture === 'aggressive') {
        const target =
          (unit.targetId === null
            ? null
            : this.units.find((entry) => entry.id === unit.targetId)) ??
          this.nearestEnemy(unit);
        if (target && target.alive && !target.routed) {
          this.advanceTowardTarget(unit, target);
        }
        continue;
      }
      if (unit.currentOrder === null && unit.posture === 'protect-officer') {
        this.moveTowardOfficer(unit);
      }
    }
  }

  private advanceTowardTarget(unit: MutableUnit, target: MutableUnit): void {
    if (unit.path.length > 0 || !unit.alive || unit.routed || unit.incapacitated) {
      return;
    }
    const weapon = getWeapon(unit.weaponId);
    const range = weapon?.range ?? FIRE_RANGE;
    const currentDistance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
    if (currentDistance <= range * 0.82) {
      return;
    }

    let best: Vec2 | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cover of this.covers) {
      if (isPointBlockedByCovers(cover.x, cover.y, this.covers, 0.8)) {
        continue;
      }
      const coverDistance = Math.sqrt((cover.x - unit.x) ** 2 + (cover.y - unit.y) ** 2);
      if (coverDistance > 18) {
        continue;
      }
      const targetDistance = Math.sqrt((cover.x - target.x) ** 2 + (cover.y - target.y) ** 2);
      if (targetDistance > currentDistance - 2) {
        continue;
      }
      if (this.occupied(cover.x, cover.y, unit)) {
        continue;
      }
      if (coverAgainst(cover.x, cover.y, target.x, target.y, 'crouched', this.covers) < 0.2) {
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, cover, this.covers);
      if (path.length === 0) {
        continue;
      }
      const score = targetDistance + path.length * 0.1 - cover.quality * 4;
      if (score < bestScore) {
        bestScore = score;
        best = { x: cover.x, y: cover.y };
      }
    }

    if (!best) {
      const dx = target.x - unit.x;
      const dy = target.y - unit.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0.001) {
        best = {
          x: target.x - (dx / length) * range * 0.78,
          y: target.y - (dy / length) * range * 0.78,
        };
      }
    }
    if (!best || isPointBlockedByCovers(best.x, best.y, this.covers, 0.8)) {
      return;
    }
    const path = findPath({ x: unit.x, y: unit.y }, best, this.covers);
    if (path.length === 0) {
      return;
    }
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = best.x;
    unit.targetY = best.y;
    this.queueUnitOrder(unit, path, 'move');
  }

  private moveTowardOfficer(unit: MutableUnit): void {
    const officer = this.units.find(
      (entry) =>
        entry.alive &&
        !entry.incapacitated &&
        !entry.routed &&
        entry.kind === 'officer' &&
        entry.faction === unit.faction,
    );
    if (!officer) {
      return;
    }
    const distance = Math.sqrt((officer.x - unit.x) ** 2 + (officer.y - unit.y) ** 2);
    if (distance <= 6) {
      return;
    }
    const offsets = [
      { x: 1.8, y: 0 },
      { x: -1.8, y: 0 },
      { x: 0, y: 1.8 },
      { x: 0, y: -1.8 },
    ];
    for (const offset of offsets) {
      const candidate = { x: officer.x + offset.x, y: officer.y + offset.y };
      if (
        isPointBlockedByCovers(candidate.x, candidate.y, this.covers, 0.8) ||
        this.occupied(candidate.x, candidate.y, unit)
      ) {
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, candidate, this.covers);
      if (path.length === 0) {
        continue;
      }
      unit.path = path;
      unit.pathIndex = 0;
      unit.targetX = candidate.x;
      unit.targetY = candidate.y;
      this.queueUnitOrder(unit, path, 'move');
      return;
    }
  }
  private updatePursuit(tick: number, events: SimEvent[]): void {
    for (const unit of this.units) {
      if (unit.currentOrder !== 'pursue' || !unit.alive || unit.incapacitated) {
        continue;
      }
      const target =
        unit.targetId === null
          ? null
          : this.units.find((entry) => entry.id === unit.targetId);
      const stop =
        !target ||
        !target.alive ||
        target.routed ||
        target.incapacitated ||
        unit.state === 'pinned' ||
        unit.state === 'panicked' ||
        unit.fatigue >= 90;
      if (stop) {
        unit.currentOrder = 'hold';
      unit.orderIssued = false;
        unit.holdPosition = true;
        unit.targetId = null;
        unit.targetLocked = false;
        unit.path = [];
        unit.pathIndex = 0;
        events.push({ type: 'order_interrupted', tick, unitId: unit.id, order: 'pursue' });
        continue;
      }
      if (unit.path.length > 0) {
        continue;
      }
      const weapon = getWeapon(unit.weaponId);
      const range = weapon?.range ?? FIRE_RANGE;
      const distance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
      if (distance <= range * 0.85) {
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, { x: target.x, y: target.y }, this.covers);
      if (path.length > 0) {
        unit.path = path;
        unit.pathIndex = 0;
        unit.targetX = target.x;
        unit.targetY = target.y;
      }
    }
  }

  private rescueCover(rescuer: MutableUnit): Vec2 | null {
    let best: Vec2 | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cover of this.covers) {
      const distance = Math.sqrt((cover.x - rescuer.x) ** 2 + (cover.y - rescuer.y) ** 2);
      if (distance > 12) {
        continue;
      }
      const offsets = [
        { x: 0, y: 0 },
        { x: 1.4, y: 0 },
        { x: -1.4, y: 0 },
        { x: 0, y: 1.4 },
        { x: 0, y: -1.4 },
      ];
      for (const offset of offsets) {
        const candidate = { x: cover.x + offset.x, y: cover.y + offset.y };
        if (isPointBlockedByCovers(candidate.x, candidate.y, this.covers, 0.7)) {
          continue;
        }
        if (this.occupied(candidate.x, candidate.y, rescuer)) {
          continue;
        }
        const path = findPath({ x: rescuer.x, y: rescuer.y }, candidate, this.covers);
        if (path.length === 0) {
          continue;
        }
        const score = distance + path.length * 0.05;
        if (score < bestScore) {
          best = candidate;
          bestScore = score;
        }
        break;
      }
    }
    return best;
  }

  private updateOfficerLoss(tick: number, events: SimEvent[]): void {
    const officers = this.units.filter(
      (unit) =>
        unit.alive && !unit.incapacitated && !unit.routed && unit.kind === 'officer',
    );
    for (const unit of this.units) {
      if (unit.currentOrder !== 'protect-officer' || !unit.alive || unit.incapacitated) {
        continue;
      }
      if (officers.some((officer) => officer.faction === unit.faction)) {
        continue;
      }
      unit.currentOrder = 'hold';
      unit.orderIssued = false;
      unit.holdPosition = true;
      unit.path = [];
      unit.pathIndex = 0;
      events.push({
        type: 'order_interrupted',
        tick,
        unitId: unit.id,
        order: 'protect-officer',
      });
    }
  }

  private updateRecon(tick: number, events: SimEvent[]): void {
    for (const unit of this.units) {
      if (
        !unit.recon ||
        unit.reconReported ||
        !unit.alive ||
        unit.incapacitated ||
        unit.routed ||
        unit.dummy ||
        unit.path.length > 0
      ) {
        continue;
      }
      const enemies = this.units.filter((other) => {
        if (!other.alive || other.routed || other.dummy || other.faction === unit.faction) {
          return false;
        }
        const distance = Math.sqrt((other.x - unit.x) ** 2 + (other.y - unit.y) ** 2);
        return distance <= 16 && !isLineBlocked(unit.x, unit.y, other.x, other.y, this.covers, this.sightObstacles);
      });
      unit.reconReported = true;
      unit.reconContacts = enemies.length;
      unit.holdPosition = true;
      unit.path = [];
      unit.pathIndex = 0;
      events.push({
        type: 'recon_report',
        tick,
        unitId: unit.id,
        enemyIds: enemies.map((enemy) => enemy.id),
      });
    }
  }

  private startNextRescue(rescuer: MutableUnit): void {
    while (rescuer.rescueQueue.length > 0) {
      const nextId = rescuer.rescueQueue.shift();
      if (nextId === undefined) {
        return;
      }
      const target = this.units.find((unit) => unit.id === nextId);
      if (!target || !target.alive || !target.incapacitated || target.beingCarriedBy !== null) {
        continue;
      }
      if (
        this.units.some(
          (unit) => unit.id !== rescuer.id && unit.rescueTargetId === target.id,
        )
      ) {
        continue;
      }
      rescuer.rescueTargetId = target.id;
      rescuer.currentOrder = 'rescue';
      rescuer.path = [];
      rescuer.pathIndex = 0;
      const path = findPath({ x: rescuer.x, y: rescuer.y }, { x: target.x, y: target.y }, this.covers);
      if (path.length > 0) {
        rescuer.path = path;
        rescuer.pathIndex = 0;
        rescuer.targetX = target.x;
        rescuer.targetY = target.y;
      }
      return;
    }
  }

  private updateRescue(tick: number, events: SimEvent[]): void {
    for (const rescuer of this.units) {
      if (rescuer.rescueTargetId === null) {
        continue;
      }
      if (!rescuer.alive || rescuer.incapacitated) {
        this.releaseCarry(rescuer);
        if (rescuer.currentOrder === 'rescue') {
          rescuer.currentOrder = null;
        }
        continue;
      }
      const target = this.units.find((unit) => unit.id === rescuer.rescueTargetId);
      if (!target || !target.alive || !target.incapacitated) {
        if (target && rescuer.carryingId === target.id) {
          target.beingCarriedBy = null;
        }
        rescuer.rescueTargetId = null;
        rescuer.carryingId = null;
        rescuer.treatTicks = 0;
        if (rescuer.currentOrder === 'rescue') {
          rescuer.currentOrder = null;
        }
        this.startNextRescue(rescuer);
        continue;
      }
      if (rescuer.carryingId === target.id) {
        target.x = rescuer.x;
        target.y = rescuer.y;
        if (rescuer.rescueTicks > 0) {
          rescuer.rescueTicks -= 1;
        } else {
          rescuer.carryingId = null;
          rescuer.treatTicks = TREAT_TICKS;
          rescuer.path = [];
          rescuer.pathIndex = 0;
          target.beingCarriedBy = null;
          target.soldierState = 'treating';
        }
        continue;
      }
      if (rescuer.treatTicks > 0) {
        target.x = rescuer.x;
        target.y = rescuer.y;
        rescuer.treatTicks -= 1;
        if (rescuer.treatTicks === 0) {
          target.beingCarriedBy = null;
          target.incapacitated = false;
          target.alive = false;
          target.routed = true;
          target.soldierState = 'recovering';
          target.recoveryTicks = RECOVERY_TICKS;
          target.path = [];
          target.pathIndex = 0;
          target.currentOrder = null;
          rescuer.rescueTargetId = null;
          rescuer.currentOrder = null;
          rescuer.morale = Math.min(MAX_MORALE, rescuer.morale + 10);
          events.push({ type: 'unit_evacuated', tick, unitId: target.id });
          this.startNextRescue(rescuer);
        }
        continue;
      }
      const distance = Math.sqrt((target.x - rescuer.x) ** 2 + (target.y - rescuer.y) ** 2);
      if (distance <= RESCUE_CONTACT_DISTANCE) {
        rescuer.carryingId = target.id;
        rescuer.rescueTicks = RESCUE_CARRY_TICKS;
        rescuer.path = [];
        rescuer.pathIndex = 0;
        const cover = this.rescueCover(rescuer);
        if (cover) {
          const path = findPath(
            { x: rescuer.x, y: rescuer.y },
            cover,
            this.covers,
          );
          if (path.length > 0) {
            rescuer.path = path;
            rescuer.pathIndex = 0;
            rescuer.targetX = cover.x;
            rescuer.targetY = cover.y;
          }
        }
        target.beingCarriedBy = rescuer.id;
        target.path = [];
        target.pathIndex = 0;
        target.soldierState = 'being-carried';
        continue;
      }
      if (rescuer.path.length === 0) {
        const path = findPath(
          { x: rescuer.x, y: rescuer.y },
          { x: target.x, y: target.y },
          this.covers,
        );
        if (path.length > 0) {
          rescuer.path = path;
          rescuer.pathIndex = 0;
          rescuer.targetX = target.x;
          rescuer.targetY = target.y;
        }
      }
    }
  }

  private updateRecovery(tick: number, events: SimEvent[]): void {
    for (const unit of this.units) {
      if (!unit.alive && unit.soldierState === 'recovering' && unit.recoveryTicks > 0) {
        unit.recoveryTicks -= 1;
        if (unit.recoveryTicks === 0) {
          unit.alive = true;
          unit.routed = false;
          unit.incapacitated = false;
          unit.hp = MAX_HP;
          unit.morale = MAX_MORALE;
          unit.soldierState = 'idle';
          unit.wound = 'none';
          events.push({ type: 'unit_recovered', tick, unitId: unit.id });
        }
      }
    }
  }

  private woundFor(unit: MutableUnit): WoundSeverity {
    if (unit.soldierState === 'recovering' || unit.incapacitated) {
      return 'severe';
    }
    if (!unit.alive) {
      return 'fatal';
    }
    if (unit.hp >= 100) {
      return 'none';
    }
    if (unit.hp >= 60) {
      return 'light';
    }
    if (unit.hp > 0) {
      return 'moderate';
    }
    return 'severe';
  }

  private woundSpeedFactor(unit: MutableUnit): number {
    return unit.wound === 'light' ? 0.9 : unit.wound === 'moderate' ? 0.75 : 1;
  }

  private woundAccuracyFactor(unit: MutableUnit): number {
    return unit.wound === 'light' ? 0.9 : unit.wound === 'moderate' ? 0.75 : 1;
  }

  private updateSoldierStates(): void {
    for (const unit of this.units) {
      if (unit.dummy) {
        continue;
      }
      unit.wound = this.woundFor(unit);
      if (!unit.alive) {
        if (unit.soldierState === 'recovering') {
          continue;
        }
        unit.soldierState = unit.routed ? 'evacuating' : 'dead';
        continue;
      }
      if (unit.beingCarriedBy !== null) {
        unit.soldierState = 'being-carried';
      } else if (unit.carryingId !== null || unit.rescueTargetId !== null) {
        unit.soldierState = unit.treatTicks > 0 ? 'treating' : 'rescuing';
      } else if (unit.incapacitated) {
        unit.soldierState = 'incapacitated';
      } else if (unit.currentOrder === 'flank' && unit.path.length > 0) {
        unit.soldierState = 'flanking';
      } else if (unit.currentOrder === 'withdraw' && unit.path.length > 0) {
        unit.soldierState = 'retreating';
      } else if (unit.currentOrder === 'regroup' && unit.path.length > 0) {
        unit.soldierState = 'rallying';
      } else if (unit.path.length > 0) {
        unit.soldierState = 'moving';
      } else if (unit.targetId !== null) {
        unit.soldierState = 'attacking';
      } else if (unit.hp < 35) {
        unit.soldierState = 'wounded';
      } else if (unit.cover >= 0.25) {
        unit.soldierState = 'in-cover';
      } else {
        unit.soldierState = 'idle';
      }
    }
  }
  private updateCohesion(): void {
    for (const unit of this.units) {
      if (!unit.alive || unit.dummy || unit.routed || unit.incapacitated || unit.state === 'panicked') {
        continue;
      }
      const peers = this.units.filter(
        (other) =>
          other.alive &&
          !other.dummy &&
          !other.routed &&
          other.faction === unit.faction &&
          other.squadId === unit.squadId,
      );
      if (peers.length <= 1) {
        unit.cohesion = Math.min(100, unit.cohesion + 0.5);
        continue;
      }
      const centroid = peers.reduce(
        (sum, other) => ({ x: sum.x + other.x / peers.length, y: sum.y + other.y / peers.length }),
        { x: 0, y: 0 },
      );
      const distance = Math.sqrt((unit.x - centroid.x) ** 2 + (unit.y - centroid.y) ** 2);
      const officerNear = this.units.some(
        (other) =>
          other !== unit &&
          other.alive &&
          !other.routed &&
          other.kind === 'officer' &&
          other.faction === unit.faction &&
          (other.x - unit.x) ** 2 + (other.y - unit.y) ** 2 <= 12 * 12,
      );
      const target = clamp(
        100 - Math.max(0, distance - 3) * 10 + (officerNear ? 15 : 0),
        0,
        100,
      );
      unit.cohesion += (target - unit.cohesion) * 0.12;
    }
  }

  private squadCentroid(unit: MutableUnit): Vec2 | null {
    const peers = this.units.filter(
      (other) =>
        other.alive &&
        !other.dummy &&
        !other.routed &&
        other.faction === unit.faction &&
        other.squadId === unit.squadId,
    );
    if (peers.length === 0) return null;
    return peers.reduce(
      (sum, other) => ({ x: sum.x + other.x / peers.length, y: sum.y + other.y / peers.length }),
      { x: 0, y: 0 },
    );
  }

  private updateMoraleStates(): void {
    for (const unit of this.units) {
      if (!unit.alive || unit.dummy) {
        continue;
      }
      if (unit.routed) {
        unit.state = 'routed';
        unit.suppressed = false;
        continue;
      }
      if (unit.state === 'panicked') {
        unit.suppressed = true;
        continue;
      }
      if (unit.suppression >= 65) {
        unit.morale = Math.max(0, unit.morale - 0.5);
      }
      const next = moraleStateFor(unit.morale, unit.suppression);
      if (next === 'panicked') {
        unit.panicTicks = 5;
      }
      if (next === 'pinned') {
        unit.stance = unit.cover >= 0.25 ? 'crouched' : 'prone';
      } else if (unit.state === 'pinned') {
        unit.stanceLocked = false;
      }
      unit.state = next;
      unit.suppressed = next !== 'steady';
    }
  }

  private fleePanicked(): void {
    for (const unit of this.units) {
      if (!unit.alive || unit.routed || unit.state !== 'panicked') {
        continue;
      }
      this.releaseCarry(unit);
      unit.orderDestination = null;
      unit.orderIssued = false;
      unit.orderRegionCenter = null;
      unit.orderRegionRadius = 0;
      unit.targetId = null;
      unit.targetLocked = false;
      unit.suppress = false;
      unit.holdPosition = false;
      unit.currentOrder = 'flee';
      if (unit.panicTicks > 0) {
        unit.stance = 'prone';
        unit.panicTicks -= 1;
        unit.path = [];
        unit.pathIndex = 0;
        continue;
      }
      unit.stance = 'standing';
      if (unit.path.length > 0) {
        continue;
      }
      const edge = this.nearestEdge(unit);
      if (!edge) {
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, edge, this.covers);
      if (path.length === 0) {
        continue;
      }
      unit.targetX = edge.x;
      unit.targetY = edge.y;
      unit.path = path;
      unit.pathIndex = 0;
      this.queueUnitOrder(unit, path, 'withdraw');
    }
  }

  private nearestEdge(unit: MutableUnit): Vec2 | null {
    const candidates: Vec2[] = [
      { x: MAP_BOUNDS.minX, y: unit.y },
      { x: MAP_BOUNDS.maxX, y: unit.y },
      { x: unit.x, y: MAP_BOUNDS.minY },
      { x: unit.x, y: MAP_BOUNDS.maxY },
    ];
    let best: Vec2 | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const distance = (candidate.x - unit.x) ** 2 + (candidate.y - unit.y) ** 2;
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return best;
  }

  private checkRouted(tick: number, events: SimEvent[]): void {
    for (const unit of this.units) {
      if (!unit.alive || unit.routed || unit.state !== 'panicked') {
        continue;
      }
      const atEdge =
        unit.x <= MAP_BOUNDS.minX + 0.01 ||
        unit.x >= MAP_BOUNDS.maxX - 0.01 ||
        unit.y <= MAP_BOUNDS.minY + 0.01 ||
        unit.y >= MAP_BOUNDS.maxY - 0.01;
      if (!atEdge) {
        continue;
      }
      unit.routed = true;
      unit.state = 'routed';
      unit.suppressed = false;
      unit.path = [];
      unit.pathIndex = 0;
      unit.targetId = null;
      unit.currentOrder = null;
      events.push({ type: 'unit_routed', tick, unitId: unit.id });
    }
  }

  private reactToSuppression(): void {
    for (const unit of this.units) {
      if (unit.suppressionCooldown > 0) {
        unit.suppressionCooldown -= 1;
      }
      const pinned = unit.state === 'pinned';
      if (
        !unit.alive ||
        unit.dummy ||
        unit.routed ||
        unit.incapacitated ||
        unit.reserveMode ||
        unit.recon ||
        unit.state === 'panicked' ||
        (unit.state !== 'suppressed' && !pinned) ||
        (!pinned && (unit.suppress || unit.holdPosition || unit.path.length > 0)) ||
        (!pinned &&
          (unit.currentOrder === 'move' ||
            unit.currentOrder === 'withdraw' ||
            unit.currentOrder === 'flank'))
      ) {
        continue;
      }
      if (unit.suppressionCooldown > 0) {
        continue;
      }
      if (unit.cover >= 0.25) {
        if (pinned || !unit.stanceLocked) {
          unit.stance = 'crouched';
        }
        continue;
      }

      const target =
        (unit.targetId === null
          ? null
          : this.units.find((entry) => entry.id === unit.targetId)) ?? this.nearestEnemy(unit);
      if (!target || !target.alive || target.routed) {
        continue;
      }
      const currentDistance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
      let best: Vec2 | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const point of this.covers) {
        const distance = Math.sqrt((point.x - unit.x) ** 2 + (point.y - unit.y) ** 2);
        if (distance > 12) {
          continue;
        }
        const targetDistance = Math.sqrt((point.x - target.x) ** 2 + (point.y - target.y) ** 2);
        if (targetDistance < currentDistance + 3) {
          continue;
        }
        if (this.occupied(point.x, point.y, unit)) {
          continue;
        }
        if (distance < bestDistance) {
          best = { x: point.x, y: point.y };
          bestDistance = distance;
        }
      }

      if (best) {
        const path = findPath({ x: unit.x, y: unit.y }, best, this.covers);
        if (path.length > 0) {
          unit.path = path;
          unit.pathIndex = 0;
          unit.targetX = best.x;
          unit.targetY = best.y;
          if (pinned) {
            unit.stance = 'crouched';
          } else {
            unit.currentOrder = 'withdraw';
            this.queueUnitOrder(unit, path, 'withdraw');
          }
        }
        unit.suppressionCooldown = SUPPRESSION_COOLDOWN;
        continue;
      }

      if (pinned || !unit.stanceLocked) {
        unit.stance = unit.stance === 'standing' ? 'crouched' : 'prone';
      }
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      unit.suppressionCooldown = SUPPRESSION_COOLDOWN;
    }
  }

  private seekFlank(): void {
    for (const unit of this.units) {
      if (unit.flankCooldown > 0) {
        unit.flankCooldown -= 1;
      }
      if (
        !unit.alive ||
        unit.dummy ||
        unit.routed ||
        unit.incapacitated ||
        unit.reserveMode ||
        unit.recon ||
        unit.state === 'panicked' ||
        unit.suppress ||
        unit.holdPosition ||
        unit.currentOrder !== null ||
        unit.path.length > 0 ||
        unit.targetId === null
      ) {
        continue;
      }
      if (unit.flankCooldown > 0) {
        continue;
      }
      const target =
        unit.targetId === null
          ? null
          : this.units.find((entry) => entry.id === unit.targetId);
      if (!target || !target.alive || target.routed) {
        continue;
      }
      if (coverAgainst(target.x, target.y, unit.x, unit.y, target.stance, this.covers) < 0.4) {
        continue;
      }
      const allyPinning = this.units.some(
        (other) =>
          other !== unit &&
          other.alive &&
          other.faction === unit.faction &&
          other.targetId === target.id &&
          other.path.length === 0,
      );
      if (!allyPinning) {
        continue;
      }
      const reserved = this.units.some(
        (other) => other.flankTargetId === target.id && other.alive,
      );
      if (reserved) {
        continue;
      }
      if (this.assignFlankPath(unit, target)) {
        unit.flankTargetId = target.id;
        unit.flankCooldown = FLANK_COOLDOWN;
      } else {
        unit.flankCooldown = 60;
      }
    }
  }

  private chooseFlankSide(units: readonly MutableUnit[], target: MutableUnit): number {
    const active = units.filter((unit) => unit.alive && !unit.dummy);
    if (active.length === 0) return 1;
    const centroid = active.reduce(
      (sum, unit) => ({ x: sum.x + unit.x / active.length, y: sum.y + unit.y / active.length }),
      { x: 0, y: 0 },
    );
    const dx = centroid.x - target.x;
    const dy = centroid.y - target.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.001) return 1;
    const perpendicular = { x: -dy / length, y: dx / length };
    let bestSide = 1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const side of [1, -1]) {
      const probe = {
        x: target.x + perpendicular.x * FLANK_RADIUS * side,
        y: target.y + perpendicular.y * FLANK_RADIUS * side,
      };
      const cover = coverAgainst(probe.x, probe.y, target.x, target.y, 'crouched', this.covers);
      const path = findPath(centroid, probe, this.covers);
      const score = cover * 100 + (path.length > 0 ? 20 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestSide = side;
      }
    }
    return bestSide;
  }

  private assignFlankPaths(units: readonly MutableUnit[], target: MutableUnit): void {
    const active = units.filter((unit) => unit.alive && !unit.dummy);
    if (active.length === 0) return;
    const side = this.chooseFlankSide(active, target);
    const centroid = active.reduce(
      (sum, unit) => ({ x: sum.x + unit.x / active.length, y: sum.y + unit.y / active.length }),
      { x: 0, y: 0 },
    );
    for (const unit of active) {
      if (this.assignFlankPath(unit, target, side, centroid)) {
        unit.flankTargetId = target.id;
      } else {
        unit.currentOrder = 'attack';
      }
    }
  }

  private assignFlankPath(
    unit: MutableUnit,
    target: MutableUnit,
    side?: number,
    origin?: Vec2,
  ): boolean {
    let best: Vec2[] | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of flankCandidates(
      { x: target.x, y: target.y },
      { x: unit.x, y: unit.y },
      FLANK_RADIUS,
    )) {
      if (isPointBlockedByCovers(candidate.x, candidate.y, this.covers, 0.8)) {
        continue;
      }
      if (side !== undefined && origin) {
        const cross =
          (origin.x - target.x) * (candidate.y - target.y) -
          (origin.y - target.y) * (candidate.x - target.x);
        if (Math.sign(cross) !== side) {
          continue;
        }
      }
      if (isLineBlocked(candidate.x, candidate.y, target.x, target.y, this.covers, this.sightObstacles)) {
        continue;
      }
      const targetDistance = Math.sqrt(
        (candidate.x - target.x) ** 2 + (candidate.y - target.y) ** 2,
      );
      const weapon = getWeapon(unit.weaponId);
      const range = weapon?.range ?? FIRE_RANGE;
      if (targetDistance > range) {
        continue;
      }
      if (this.occupied(candidate.x, candidate.y, unit)) {
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, candidate, this.covers);
      if (path.length === 0) {
        continue;
      }
      const distance = Math.sqrt((unit.x - candidate.x) ** 2 + (unit.y - candidate.y) ** 2);
      const cover = coverAgainst(candidate.x, candidate.y, target.x, target.y, 'crouched', this.covers);
      const score = cover * 100 - distance * 0.1;
      if (score > bestScore) {
        best = path;
        bestScore = score;
      }
    }
    if (!best) {
      return false;
    }
    unit.path = best;
    unit.pathIndex = 0;
    unit.targetX = best[best.length - 1]?.x ?? unit.x;
    unit.targetY = best[best.length - 1]?.y ?? unit.y;
    unit.currentOrder = 'flank';
    this.orders.push({
      id: this.nextOrderId,
      unitIds: [unit.id],
      points: [{ x: unit.x, y: unit.y }, ...best],
      kind: 'flank',
    });
    this.nextOrderId += 1;
    return true;
  }

  private beginWithdraw(unit: MutableUnit): void {
    unit.targetId = null;
    unit.targetLocked = false;
    unit.suppress = false;
    unit.holdPosition = false;
    unit.flankTargetId = null;
    unit.currentOrder = null;
    unit.lineMove = false;
    const enemy = this.nearestEnemy(unit);
    if (!enemy) {
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      unit.path = [];
      unit.pathIndex = 0;
      return;
    }
    let bestCover: Vec2 | null = null;
    let bestCoverScore = Number.NEGATIVE_INFINITY;
    for (const coverPoint of this.covers) {
      const vx = coverPoint.x - enemy.x;
      const vy = coverPoint.y - enemy.y;
      const length = Math.sqrt(vx * vx + vy * vy);
      if (length < 0.001) continue;
      const candidate = {
        x: coverPoint.x + (vx / length) * 2.0,
        y: coverPoint.y + (vy / length) * 2.0,
      };
      if (isPointBlockedByCovers(candidate.x, candidate.y, this.covers, 0.8)) continue;
      const cover = coverAgainst(
        candidate.x,
        candidate.y,
        enemy.x,
        enemy.y,
        'crouched',
        this.covers,
      );
      if (cover < 0.25) continue;
      const path = findPath({ x: unit.x, y: unit.y }, candidate, this.covers);
      if (path.length === 0) continue;
      const distance = Math.sqrt((unit.x - candidate.x) ** 2 + (unit.y - candidate.y) ** 2);
      const score = cover * 100 - distance * 0.15;
      if (score > bestCoverScore) {
        bestCover = candidate;
        bestCoverScore = score;
      }
    }
    if (bestCover) {
      const path = findPath({ x: unit.x, y: unit.y }, bestCover, this.covers);
      unit.targetX = bestCover.x;
      unit.targetY = bestCover.y;
      unit.path = path;
      unit.pathIndex = 0;
      unit.currentOrder = 'withdraw';
      this.queueUnitOrder(unit, path, 'withdraw');
      return;
    }

    const dx = unit.x - enemy.x;
    const dy = unit.y - enemy.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.001) {
      return;
    }
    const destination = {
      x: unit.x + (dx / length) * WITHDRAW_DISTANCE,
      y: unit.y + (dy / length) * WITHDRAW_DISTANCE,
    };
    const path = findPath({ x: unit.x, y: unit.y }, destination, this.covers);
    if (path.length === 0) {
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      unit.path = [];
      unit.pathIndex = 0;
      return;
    }
    unit.targetX = destination.x;
    unit.targetY = destination.y;
    unit.path = path;
    unit.pathIndex = 0;
    unit.currentOrder = 'withdraw';
    this.queueUnitOrder(unit, path, 'withdraw');
  }

  private nearestEnemy(unit: MutableUnit): MutableUnit | null {
    return this.nearestEnemyAt(unit, unit.faction);
  }

  private nearestEnemyAt(
    point: { x: number; y: number },
    faction: Faction,
  ): MutableUnit | null {
    let nearest: MutableUnit | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of this.units) {
      if (
        !candidate.alive ||
        candidate.dummy ||
        candidate.routed ||
        candidate.incapacitated ||
        candidate.faction === faction ||
        (faction !== 'column' && candidate.faction === 'target')
      ) {
        continue;
      }
      const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private facingToward(from: { x: number; y: number }, to: { x: number; y: number }): Vec2 {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return length < 0.001 ? { x: 0, y: -1 } : { x: dx / length, y: dy / length };
  }

  private occupied(x: number, y: number, unit: MutableUnit): boolean {
    return this.units.some((other) => {
      if (other === unit || !other.alive || other.routed || other.dummy || other.incapacitated) {
        return false;
      }
      const nearPosition = (other.x - x) ** 2 + (other.y - y) ** 2 < 1.2 * 1.2;
      const nearTarget = (other.targetX - x) ** 2 + (other.targetY - y) ** 2 < 1.2 * 1.2;
      return nearPosition || nearTarget;
    });
  }

  private cleanupOrders(): void {
    for (const unit of this.units) {
      if (!unit.alive || unit.routed || unit.dummy || unit.incapacitated) {
        continue;
      }
      const target =
        unit.targetId === null ? null : this.units.find((entry) => entry.id === unit.targetId);
      if (unit.suppress && (!target || !target.alive || target.routed)) {
        unit.suppress = false;
        unit.holdPosition = false;
        unit.currentOrder = null;
        unit.targetId = null;
        unit.targetLocked = false;
      }
      if (unit.currentOrder === 'attack' && (!target || !target.alive || target.routed)) {
        unit.currentOrder = null;
        unit.targetId = null;
        unit.targetLocked = false;
      }
      if (unit.currentOrder === 'withdraw' && unit.path.length === 0) {
        unit.currentOrder = 'hold';
      unit.orderIssued = false;
        unit.holdPosition = true;
        unit.flankTargetId = null;
      } else if (
        (unit.currentOrder === 'move' || unit.currentOrder === 'flank') &&
        unit.path.length === 0 &&
        unit.boundTeam === null
      ) {
        unit.currentOrder = null;
        unit.flankTargetId = null;
        unit.holdPosition = true;
      }
      if (unit.flankTargetId !== null && unit.currentOrder !== 'flank') {
        unit.flankTargetId = null;
      }
    }
  }
  private nearCoverObject(unit: MutableUnit): boolean {
    return this.covers.some((cover) => {
      const distance = Math.sqrt((cover.x - unit.x) ** 2 + (cover.y - unit.y) ** 2);
      return distance <= Math.max(2.4, cover.halfDepth + 1.4);
    });
  }

  private seekCover(): void {
    for (const unit of this.units) {
      if (!unit.alive || unit.routed || unit.dummy || unit.incapacitated || unit.state === 'panicked') {
        continue;
      }
      if (unit.coverSeekCooldown > 0) {
        unit.coverSeekCooldown -= 1;
      }
      const order = unit.currentOrder;
      if (
        (!unit.orderIssued && unit.posture !== 'defensive') ||
        unit.suppress ||
        unit.path.length > 0 ||
        order === 'hold' ||
        order === 'withdraw' ||
        order === 'flank' ||
        order === 'pursue' ||
        order === 'rescue' ||
        order === 'flee'
      ) {
        continue;
      }
      if (this.nearCoverObject(unit)) {
        if (!unit.stanceLocked) {
          unit.stance = unit.stance === 'standing' ? 'crouched' : unit.stance;
        }
        continue;
      }

      if (unit.coverSeekCooldown > 0) {
        continue;
      }

      const target =
        (unit.targetId === null
          ? null
          : this.units.find((entry) => entry.id === unit.targetId)) ??
        this.nearestEnemy(unit);
      if (!target || !target.alive || target.routed) {
        continue;
      }

      let best: Vec2 | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const point of this.covers) {
        const dx = unit.x - point.x;
        const dy = unit.y - point.y;
        if (dx * dx + dy * dy > 16 * 16) {
          continue;
        }
        const tx = target.x - point.x;
        const ty = target.y - point.y;
        const length = Math.sqrt(tx * tx + ty * ty);
        if (length < 0.001) {
          continue;
        }
        const candidate = {
          x: point.x - (tx / length) * 2.0,
          y: point.y - (ty / length) * 2.0,
        };
        if (
          (unit.x - point.x) * (candidate.x - point.x) +
            (unit.y - point.y) * (candidate.y - point.y) <
          0
        ) {
          continue;
        }
        if (isPointBlockedByCovers(candidate.x, candidate.y, this.covers, 0.8)) {
          continue;
        }
        const center = this.squadCentroid(unit);
        if (
          center &&
          (candidate.x - center.x) ** 2 + (candidate.y - center.y) ** 2 > 9 * 9
        ) {
          continue;
        }
        if (
          unit.orderRegionCenter &&
          (candidate.x - unit.orderRegionCenter.x) ** 2 +
            (candidate.y - unit.orderRegionCenter.y) ** 2 >
            unit.orderRegionRadius * unit.orderRegionRadius
        ) {
          continue;
        }
        const occupied = this.units.some((other) => {
          if (other === unit || !other.alive || other.routed || other.dummy || other.incapacitated) {
            return false;
          }
          const nearPosition =
            (other.x - candidate.x) ** 2 + (other.y - candidate.y) ** 2 < 1.2 * 1.2;
          const nearTarget =
            (other.targetX - candidate.x) ** 2 + (other.targetY - candidate.y) ** 2 < 1.2 * 1.2;
          return nearPosition || nearTarget;
        });
        if (occupied) {
          continue;
        }
        const score = (unit.x - candidate.x) ** 2 + (unit.y - candidate.y) ** 2;
        if (score < bestDistance) {
          bestDistance = score;
          best = candidate;
        }
      }

      if (!best) {
        unit.coverSeekCooldown = 60;
        continue;
      }
      const distance = Math.sqrt((unit.x - best.x) ** 2 + (unit.y - best.y) ** 2);
      if (distance < 0.6) {
        if (!unit.stanceLocked) {
          unit.stance = 'crouched';
        }
        unit.coverSeekCooldown = 120;
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, best, this.covers);
      if (path.length === 0) {
        unit.coverSeekCooldown = 60;
        continue;
      }
      unit.path = path;
      unit.pathIndex = 0;
      unit.targetX = best.x;
      unit.targetY = best.y;
      unit.coverSeekCooldown = 120;
    }
  }

  private updateFacing(): void {
    for (const unit of this.units) {
      if (!unit.alive || unit.routed || unit.dummy || unit.incapacitated) {
        continue;
      }
      let dx = 0;
      let dy = 0;
      let scanning = false;
      if (unit.targetId !== null) {
        const target =
          unit.targetId === null
            ? null
            : this.units.find((entry) => entry.id === unit.targetId);
        if (target?.alive) {
          dx = target.x - unit.x;
          dy = target.y - unit.y;
        }
      } else if (unit.path.length > 0) {
        const point = unit.path[unit.pathIndex];
        if (point) {
          dx = point.x - unit.x;
          dy = point.y - unit.y;
        }
      } else if (unit.aimX !== null && unit.aimY !== null) {
        dx = unit.aimX;
        dy = unit.aimY;
      } else if (unit.currentOrder === 'defend' || unit.currentOrder === 'ambush') {
        const threat = this.nearestEnemy(unit);
        if (threat) {
          dx = threat.x - unit.x;
          dy = threat.y - unit.y;
        } else {
          dx = unit.targetX - unit.x;
          dy = unit.targetY - unit.y;
        }
      } else if (unit.currentOrder === null || unit.currentOrder === 'hold') {
        const threat = this.nearestEnemy(unit);
        if (
          threat &&
          (threat.x - unit.x) ** 2 + (threat.y - unit.y) ** 2 <=
            AWARENESS_RANGE * AWARENESS_RANGE
        ) {
          dx = threat.x - unit.x;
          dy = threat.y - unit.y;
          scanning = true;
        } else {
          dx = unit.targetX - unit.x;
          dy = unit.targetY - unit.y;
        }
      } else {
        dx = unit.targetX - unit.x;
        dy = unit.targetY - unit.y;
      }
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0.0001) {
        if (scanning) {
          const blend = 0.08;
          const fx = unit.facingX + (dx / length - unit.facingX) * blend;
          const fy = unit.facingY + (dy / length - unit.facingY) * blend;
          const facingLength = Math.sqrt(fx * fx + fy * fy) || 1;
          unit.facingX = fx / facingLength;
          unit.facingY = fy / facingLength;
        } else {
          unit.facingX = dx / length;
          unit.facingY = dy / length;
        }
      }
    }
  }

  private clearArrivedOrders(): void {
    this.orders = this.orders.filter((order) => {
      return !order.unitIds.every((id) => {
        const unit = this.units.find((entry) => entry.id === id);
        return (
          !unit ||
          !unit.alive ||
          unit.routed ||
          (Math.abs(unit.x - unit.targetX) < 0.0001 && Math.abs(unit.y - unit.targetY) < 0.0001)
        );
      });
    });
  }

  private updateOutcome(tick: number, events: SimEvent[]): void {
    const columnAlive = this.units.some(
      (unit) => unit.faction === 'column' && unit.alive && !unit.routed,
    );
    const legalistAlive = this.units.some(
      (unit) =>
        unit.faction === 'legalist' &&
        unit.alive &&
        !unit.routed &&
        !unit.incapacitated,
    );
    const next: Outcome = !columnAlive ? 'defeat' : !this.opposition ? 'playing' : !legalistAlive ? 'victory' : 'playing';
    if (next !== this.outcome) {
      this.outcome = next;
      events.push({ type: 'outcome', tick, outcome: next });
    }
  }
}












































































































































































































































