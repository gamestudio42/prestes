// Shared simulation data: unit records, templates and tuning constants.
import { DEFAULT_ROSTER, deployRoster, SECTION_TYPES } from '@prestes/shared';
import type { BattleMap, BattleRosters, Gait, SectionTypeId } from '@prestes/shared';
import type {
  Faction,
  FormationKind,
  SoldierState,
  Stance,
  Posture,
  UnitKind,
  MoraleState,
  UnitOrder,
  WeaponId,
  WoundSeverity,
  Vec2,
  UnitRole,
} from '@prestes/shared';

export const OPEN_POINT_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
  { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
] as const;

/**
 * Orders that move by bounds (one half covers, the other moves): the tactical
 * advance and the assault closing on its target. A march (Move) does not.
 */
export const BOUNDING_ORDERS = new Set<UnitOrder>(['advance', 'attack']);

export const FLANK_COOLDOWN = 180;
export const SUPPRESSION_COOLDOWN = 150;
export const SUPPRESS_FIRE_INTERVAL = 8;
export const WITHDRAW_DISTANCE = 12;
export const FATIGUE_MAX = 100;
/**
 * Fatigue per tick of movement. Rest (below) applies every tick, so marching
 * nets 0.15 a tick: about a minute (120 m) takes a fresh soldier to 90.
 */
export const FATIGUE_MARCH = 0.25;
/** Fatigue recovered every tick: about 1.5 minutes from tired to fresh at rest. */
export const FATIGUE_REST = 0.1;
export const AMBUSH_RADIUS = 14;
/** Fire control on contact opens when an enemy is this close (metres). */
export const CONTACT_RADIUS = 25;
/**
 * refine-battle-maps 5.14: a concealed section on its default fire control
 * holds its fire until an enemy is this near (m); the player's own "fire on
 * contact" keeps CONTACT_RADIUS.
 */
export const CONCEALED_CONTACT_RADIUS = 60;
export const AWARENESS_RANGE = 120;
export const RESCUE_CONTACT_DISTANCE = 1.4;
export const RESCUE_CARRY_TICKS = 30;
export const TREAT_TICKS = 30;
export const RECOVERY_TICKS = 300;
export const TRAINING_ENEMY_HP = 420;

export interface MutableUnit {
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
  /** pre-battle-roster: a second weapon (the Comando's officer has only his revolver; an irregular leader carries one). */
  sidearmId?: WeaponId;
  /** pre-battle-roster: the section type he was fielded in (rostered battles only). */
  sectionType?: SectionTypeId;
  /** pre-battle-roster 4.2: rounds left in the burst he is firing (automatic weapons only). */
  burstLeft?: number;
  /** pre-battle-roster 4.3: ticks a gunner has stood still, up to his gun's set-up time. */
  gunStill?: number;
  /** machine-gun-fire-feedback 2.2: the gun's crew is halted to fire (its order's path is kept). */
  gunHalt?: true;
  /** machine-gun-fire-feedback 2.2: ticks a halted gunner has had no enemy to fire on. */
  gunIdle?: number;
  magazine: number;
  reserve: number;
  morale: number;
  alive: boolean;
  suppressed: boolean;
  suppression: number;
  cohesion: number;
  fatigue: number;
  formation: FormationKind;
  /** Ordered spacing between soldiers; the default when unset. */
  formationSpacing?: number;
  /** Current ground speed (m/s), eased toward the gait's. */
  moveSpeed?: number;
  /** Winded: capped at a walk until fatigue falls below WINDED_RECOVER. */
  winded?: boolean;
  /** add-battle-maps: the ferry he is aboard. */
  ferryId?: number;
  /** add-battle-maps: concealment is lifted until this tick (he fired). */
  revealedUntil?: number;
  /** refine-battle-maps 5.14: the player (or a commander) set his fire control. */
  fireControlSet?: boolean;
  /**
   * refine-battle-maps 5.14: fire on contact set by concealment, not by an
   * order: armed while his section is settled in the vegetation, spent once
   * the section has opened fire (until it leaves the vegetation).
   */
  autoContact?: 'armed' | 'spent';
  /** Where and when his path last made headway (refine-battle-maps: a man who cannot get on stops). */
  stuckFrom?: { x: number; y: number; tick: number };
  /** The gait he moved at last tick (the view picks walk or run from it). */
  gait?: Gait;
  /** Recon: the front a scout sweeps, kept once he halts. */
  reconFront?: Vec2;
  /** Ticks left under fire (a shot at him or a squad mate near him). */
  underFireTicks?: number;
  /** The target his rifle is laid on. */
  aimedAt?: number;
  /** Tick of his last shot: a man in action shifts targets without a fresh reaction delay. */
  lastShotTick?: number;
  /** Who fired the last shot that put him under fire. */
  lastShooter?: number | null;
  /** Ticks before he looks for cover under fire again. */
  fireCoverCooldown?: number;
  /** Fire control on contact: hold fire beyond `CONTACT_RADIUS` until the section opens. */
  fireOnContact?: boolean;
  /** Where an attack turned into a pursuit (the 40 m leash). */
  pursueOrigin?: Vec2 | null;
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
  /** Officers only: the loss consequence was applied for the current absence. */
  officerLossApplied: boolean;
  /** Reserved cover slot (see shared cover-slots), or null. */
  slotId: number | null;
  reserveMode: boolean;
  recon: boolean;
  reconReported: boolean;
  /** add-run-toggle: set only while the pace is Run, so a walking battle hashes as before. */
  hurry?: true;
  /** garrison-and-assault: the position he is inside, and his port's index there. */
  garrison?: number;
  port?: number;
  /** garrison-and-assault: the position he is walking in to. */
  entering?: number;
  /** garrison-and-assault: his turn to leave (tick), and the point he leaves for. */
  exitAt?: number;
  exitTo?: Vec2;
  /** garrison-and-assault D5: the position he is assaulting, and where his section came from. */
  assaulting?: number;
  assaultFrom?: Vec2;
  /** garrison-and-assault 4.7: at an upper-floor window, that floor's height (m); absent on the ground. */
  elevation?: number;
  /** garrison-and-assault 1.5: the church whose tower he is in; its walls do not hide him nor his view. */
  inTower?: number;
  /**
   * scrub-concealment-and-area-fire: the disc he fires into and the tick the
   * order ends; absent otherwise, so a battle without it hashes as before.
   */
  areaFire?: { x: number; y: number; radius: number; untilTick: number };
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

export interface BoundingGroup {
  squadId: number;
  teamA: number[];
  teamB: number[];
  destination: Vec2;
  targetId: number | null;
  phase: 'a' | 'b';
  mode: 'move' | 'attack';
  /** A long advance that went by rushes (battle-feel-3v3). */
  rushed?: boolean;
  targets: Map<number, Vec2>;
}

export interface ActiveOrder {
  id: number;
  unitIds: number[];
  points: Vec2[];
  kind: 'move' | 'withdraw' | 'flank';
}

export const DEFAULT_UNITS: ReadonlyArray<
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
    | 'officerLossApplied'
    | 'slotId'
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

export const INFANTRY_TEMPLATE = DEFAULT_UNITS[0]!;
export const OFFICER_TEMPLATE = DEFAULT_UNITS.find((unit) => unit.kind === 'officer')!;

/** A 3v3 soldier before the engine fills in his state; rostered battles name his weapon and section. */
export type BattleUnitSeed = (typeof DEFAULT_UNITS)[number] & {
  weaponId?: WeaponId;
  sidearmId?: WeaponId;
  sectionType?: SectionTypeId;
};

/**
 * The 3v3 troops, placed on a battle map's deployment zones (add-battle-maps;
 * pre-battle-roster 3.2). Without rosters each side fields the default three
 * sections of eleven, exactly as before (`default-roster.test.ts` pins them).
 * With rosters, each side's sections stand in its six slots in roster order
 * (`deployRoster`), each man with his section's weapon; the Comando's officer
 * is an `officer`, and a type's speed factor scales his speed. Unit ids run
 * from 1, column then legalist; squads are 1-6 and 11-16.
 */
export function battleUnits(map: BattleMap, rosters?: BattleRosters): BattleUnitSeed[] {
  const units: BattleUnitSeed[] = [];
  for (const faction of ['column', 'legalist'] as const) {
    if (faction === 'legalist' && map.noEnemy) continue;
    const roster = rosters ? (faction === 'column' ? rosters.column : (rosters.legalist ?? DEFAULT_ROSTER)) : DEFAULT_ROSTER;
    for (const section of deployRoster(map, faction, roster).sections) {
      const type = SECTION_TYPES[section.type];
      for (const man of section.men) {
        const base = {
          ...INFANTRY_TEMPLATE,
          id: units.length + 1,
          x: man.x,
          y: man.y,
          faction,
          squadId: section.squadId,
        };
        if (!rosters) {
          units.push(base);
          continue;
        }
        units.push({
          ...base,
          speed: INFANTRY_TEMPLATE.speed * (type.speedFactor ?? 1),
          kind: man.role === 'officer' ? 'officer' : 'infantry',
          weaponId: man.weapon,
          ...(man.sidearm ? { sidearmId: man.sidearm } : {}),
          sectionType: section.type,
        });
      }
    }
  }
  return units;
}

export const TRAINING_UNITS = [
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

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}
