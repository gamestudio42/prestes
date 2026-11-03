import { RNG, hashString } from '@prestes/kernel';
import {
  BOOTCAMP_COVERS,
  COVER_POINTS,
  DEFAULT_WEAPON_ID,
  WEAPONS,
  MAX_HP,
  MAX_MORALE,
  TRAINING_SIGHT_OBSTACLES,
  coverAgainst,
  coverForStance,
  getWeapon,
  reloadMagazine,
  SUPPRESSION_DECAY,
} from '@prestes/shared';
import type {
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
import { BATTLE_UNITS, DEFAULT_UNITS, TRAINING_UNITS } from './systems/model';
import type { ActiveOrder, BoundingGroup, MutableUnit } from './systems/model';
import type { SimContext } from './systems/context';
import { snapshotUnits } from './systems/snapshot';
import { nearestEnemy } from './systems/geometry';
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
import { acquireTargets, fire, updateFacing, updateOutcome } from './systems/combat';
import {
  updateMoraleStates,
  reactToSuppression,
  fleePanicked,
  checkRouted,
  applyOfficerAura,
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
import { applyRoster } from './systems/spawning';

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

export class SimulationEngine implements SimContext {
  tickCount = 0;
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
    this.covers = (
      this.training || this.scenario === 'battle3v3' ? BOOTCAMP_COVERS : COVER_POINTS
    ).map((cover) => ({ ...cover }));
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
        (unit) => this.scenario === 'battle3v3' || this.opposition || unit.faction === 'column',
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
        officerLossApplied: false,
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
        applyCommand(this, envelope, nextTick, events);
      }

      for (const unit of this.units) {
        moveUnit(this, unit, nextTick, events);
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

      separateUnits(this);

      acquireTargets(this);
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
      updateOfficerLoss(this, nextTick, events);
      applyOfficerAura(this);
      updateCohesion(this);
      updateMoraleStates(this);
      updateRecovery(this, nextTick, events);
      updateSoldierStates(this);
      fleePanicked(this);
      checkRouted(this, nextTick, events);
      clearArrivedOrders(this);
      cleanupOrders(this);
      updateFacing(this);
      updateOutcome(this, nextTick, events);
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
      units: snapshotUnits(this),
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
}
