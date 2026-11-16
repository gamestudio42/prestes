import {
  DEFAULT_WEAPON_ID,
  MAP_BOUNDS,
  WEAPONS,
  TRAINING_AMMUNITION,
  MAX_HP,
  MAX_MORALE,
  troopFormationOffsets,
  rotateOffset,
  isPointBlockedByCovers,
  SECTION_TYPES,
  getWeapon,
  isSectionTypeId,
  unitValues,
  trainingLoad,
} from '@prestes/shared';
import type {
  Command,
  SimEvent,
  RosterRecord,
  Vec2,
  UnitRole,
  TrainingPhaseSetup,
  SectionTypeId,
  Faction,
} from '@prestes/shared';
import { TRAINING_ENEMY_HP } from './model';
import type { MutableUnit } from './model';
import { factorsOf, type SimContext } from './context';
import { reject } from './commands';
import { incapacitate } from './casualties';

export function applyRoster(ctx: SimContext, records: readonly RosterRecord[]): void {
  for (const record of records) {
    const unit = ctx.units.find((entry) => entry.id === record.id);
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

export function spawnDummy(
  ctx: SimContext,
  to: Vec2,
  tick: number,
  seq: number,
  events: SimEvent[],
  rotation = 0,
): void {
  if (!ctx.sandbox && !ctx.training) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  if (
    isPointBlockedByCovers(to.x, to.y, ctx.covers, 1) ||
    to.x < MAP_BOUNDS.minX ||
    to.x > MAP_BOUNDS.maxX ||
    to.y < MAP_BOUNDS.minY ||
    to.y > MAP_BOUNDS.maxY
  ) {
    reject(ctx, tick, seq, 'invalid_position', events);
    return;
  }
  ctx.units.push({
    id: ctx.nextUnitId,
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
  });
  ctx.nextUnitId += 1;
}

export function spawnTroop(
  ctx: SimContext,
  command: Extract<Command, { type: 'spawn_troop' }>,
  tick: number,
  seq: number,
  events: SimEvent[],
): void {
  if (!ctx.sandbox && !ctx.training) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  // pre-battle-roster 5.3: a section type gives the troop its men, weapons and speed.
  const section = command.section !== undefined && isSectionTypeId(command.section) ? SECTION_TYPES[command.section] : undefined;
  const count = section ? section.men.length : Math.max(1, Math.min(16, command.count ?? 11));
  const squadId = ctx.nextSquadId;
  const spacing = 2.4;
  const rotation = command.rotation ?? 0;
  const offsets = troopFormationOffsets(count, 6, spacing, rotation);
  const formationFacing = rotateOffset({ x: 0, y: 1 }, rotation);
  const slots: SectionSlot[] = [];
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
      isPointBlockedByCovers(to.x, to.y, ctx.covers, 1)
    ) {
      continue;
    }
    slots.push({ x: to.x, y: to.y, index });
  }
  spawnSection(ctx, {
    faction: command.faction,
    ...(section ? { section: section.id } : {}),
    slots,
    facing: formationFacing,
    holdPosition: true,
    holdFire: command.holdFire ?? command.dummy === true,
    dummy: command.dummy === true,
    ...(command.role ? { role: command.role } : {}),
    nonLethal: command.nonLethal === true,
  });
  // A training troop is tougher and starts crouched, however it was spawned.
  if (command.role === 'training-enemy') {
    for (const unit of ctx.units) {
      if (unit.squadId === squadId && unit.role === 'training-enemy') {
        unit.hp = TRAINING_ENEMY_HP;
        unit.stance = 'crouched';
        unit.stanceLocked = true;
      }
    }
  }
}

/** A man's place in a new section: where he stands and which of the type's men he is. */
export interface SectionSlot {
  x: number;
  y: number;
  index: number;
}

export interface SectionSpec {
  faction: Faction;
  /** Absent: plain riflemen with the default weapon (the sandbox's troops). */
  section?: SectionTypeId;
  slots: readonly SectionSlot[];
  facing: Vec2;
  holdPosition: boolean;
  holdFire: boolean;
  dummy?: boolean;
  role?: UnitRole;
  nonLethal?: boolean;
}

/**
 * add-battle-events 2.1: puts one section on the map, a man per slot, with
 * its type's men, weapons, speed, ammunition, morale and cohesion, and its
 * machine gun's belts; takes the next squad id and returns it. No sandbox
 * check: the sandbox's spawn and the battle events' arrivals both use it.
 */
export function spawnSection(ctx: SimContext, spec: SectionSpec): number {
  const section = spec.section !== undefined ? SECTION_TYPES[spec.section] : undefined;
  const squadId = ctx.nextSquadId;
  const dummy = spec.dummy === true;
  for (const slot of spec.slots) {
    const man = section?.men[slot.index];
    const weaponId = man?.weapon ?? DEFAULT_WEAPON_ID;
    const load = man ? trainingLoad(weaponId) : WEAPONS[DEFAULT_WEAPON_ID];
    ctx.units.push({
      id: ctx.nextUnitId,
      x: slot.x,
      y: slot.y,
      targetX: slot.x,
      targetY: slot.y,
      speed: 2 * (section?.speedFactor ?? 1),
      kind: man?.role === 'officer' ? 'officer' : 'infantry',
      faction: spec.faction,
      stance: 'standing',
      squadId,
      hp: MAX_HP,
      weaponId,
      magazine: dummy ? 0 : load.magazine,
      // faction-armies 3.1: a section's ammunition, morale and cohesion are its army's and type's.
      reserve: dummy ? 0 : levelReserve(ctx, spec.faction, section?.ammunitionFactor !== undefined ? Math.round(load.reserve * section.ammunitionFactor) : load.reserve),
      ...(man?.sidearm ? { sidearmId: man.sidearm } : {}),
      ...(section ? { sectionType: section.id } : {}),
      morale: section ? unitValues({ sectionType: section.id }).morale : MAX_MORALE,
      alive: true,
      suppressed: false,
      suppression: 0,
      cohesion: section ? unitValues({ sectionType: section.id }).cohesion : 100,
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
      facingX: spec.facing.x,
      facingY: spec.facing.y,
      aimX: null,
      aimY: null,
      stanceLocked: false,
      coverSeekCooldown: 0,
      flankTargetId: null,
      flankCooldown: 0,
      suppressionCooldown: 0,
      suppress: false,
      holdPosition: spec.holdPosition,
      holdFire: spec.holdFire,
      posture: 'balanced',
      boundTeam: null,
      boundPhase: null,
      targetLocked: false,
      currentOrder: null,
      lineMove: false,
      dummy,
      role: spec.role,
      nonLethal: spec.nonLethal === true,
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
    });
    ctx.nextUnitId += 1;
  }
  // A machine-gun crew brings its belts: the squad's pool.
  const gun = section?.men.find((man) => getWeapon(man.weapon)?.fire === 'belt');
  if (gun && !dummy) ctx.gunPools = { ...(ctx.gunPools ?? {}), [squadId]: trainingLoad(gun.weapon).pool ?? 0 };
  ctx.nextSquadId += 1;
  return squadId;
}

export function setTrainingPhase(
  ctx: SimContext,
  setup: TrainingPhaseSetup,
  tick: number,
  seq: number,
  events: SimEvent[],
): void {
  if (!ctx.training && !ctx.sandbox) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  despawnRoleUnits(ctx, 'training-enemy');
  ctx.bounding.clear();
  ctx.orders = [];
  const player = ctx.units.filter(
    (unit) => unit.faction === 'column' && !unit.dummy && unit.squadId !== 99,
  );
  const offsets = troopFormationOffsets(player.length, 6, 2.4, 0);
  player.forEach((unit, index) => {
    const offset = offsets[index] ?? { x: 0, y: 0 };
    resetTrainingUnit(
      ctx,
      unit,
      setup.playerPoint.x + offset.x,
      setup.playerPoint.y + offset.y,
      false,
    );
  });
  const officer = ctx.units.find(
    (unit) => unit.faction === 'column' && unit.kind === 'officer' && !unit.dummy,
  );
  if (officer) {
    resetTrainingUnit(ctx, officer, setup.officerPoint.x, setup.officerPoint.y, true);
  }
  ctx.instructorPinned = setup.pinInstructor === true;
  // Casualty drills: the last soldiers of the section start incapacitated.
  const casualties = Math.max(0, Math.min(player.length, setup.casualtyCount ?? 0));
  for (const unit of player.slice(player.length - casualties)) {
    incapacitate(ctx, unit.id, tick, seq, events);
  }
  if (officer && setup.instructorOut === true) {
    incapacitate(ctx, officer.id, tick, seq, events);
  }
  if (setup.enemyPoint && (setup.enemyCount ?? 0) > 0) {
    spawnTroop(
      ctx,
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
    for (const unit of ctx.units) {
      if (unit.role === 'training-enemy') {
        unit.hp = TRAINING_ENEMY_HP;
        unit.stance = 'crouched';
        unit.stanceLocked = true;
      }
    }
  }
}

export function despawnRole(
  ctx: SimContext,
  role: UnitRole,
  tick: number,
  seq: number,
  events: SimEvent[],
): void {
  if (!ctx.training && !ctx.sandbox) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  despawnRoleUnits(ctx, role);
}

export function despawnRoleUnits(ctx: SimContext, role: UnitRole): void {
  const removed = new Set(ctx.units.filter((unit) => unit.role === role).map((unit) => unit.id));
  if (removed.size === 0) {
    return;
  }
  const remaining = ctx.units.filter((unit) => !removed.has(unit.id));
  ctx.units.splice(0, ctx.units.length, ...remaining);
  ctx.orders = ctx.orders.filter((order) => !order.unitIds.some((id) => removed.has(id)));
  for (const unit of ctx.units) {
    if (unit.targetId !== null && removed.has(unit.targetId)) {
      unit.targetId = null;
      unit.targetLocked = false;
    }
  }
}

export function resetTrainingUnit(
  ctx: SimContext,
  unit: MutableUnit,
  x: number,
  y: number,
  holdFire: boolean,
): void {
  unit.x = x;
  unit.y = y;
  unit.targetX = x;
  unit.targetY = y;
  unit.hp = MAX_HP;
  unit.magazine = TRAINING_AMMUNITION.magazine;
  unit.reserve = TRAINING_AMMUNITION.reserve;
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

export function reinforce(
  ctx: SimContext,
  faction: 'column' | 'legalist',
  tick: number,
  seq: number,
  events: SimEvent[],
): void {
  if (!ctx.sandbox && !ctx.training) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  const base = faction === 'column' ? 6 : 3;
  const count = ctx.units.filter((unit) => unit.faction === faction && !unit.dummy).length;
  const index = Math.max(0, count - base);
  const column = index % 4;
  const row = Math.floor(index / 4);
  const to =
    faction === 'column'
      ? { x: -16 + column * 2.2, y: 16 + row * 2 }
      : { x: -16 + column * 2.2, y: -26 - row * 2 };
  if (
    isPointBlockedByCovers(to.x, to.y, ctx.covers, 0.8) ||
    to.x < MAP_BOUNDS.minX ||
    to.x > MAP_BOUNDS.maxX ||
    to.y < MAP_BOUNDS.minY ||
    to.y > MAP_BOUNDS.maxY
  ) {
    reject(ctx, tick, seq, 'invalid_position', events);
    return;
  }
  ctx.units.push({
    id: ctx.nextUnitId,
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
  });
  ctx.nextUnitId += 1;
}

/**
 * add-difficulty-levels: the player's side carries the level's share of its
 * reserve (60 % at Oficial), rounded, after the section type's own factor.
 */
export function levelReserve(ctx: Pick<SimContext, 'factors'>, faction: MutableUnit['faction'], reserve: number): number {
  const factor = faction === 'column' ? factorsOf(ctx).playerReserve : 1;
  return factor === 1 ? reserve : Math.round(reserve * factor);
}
