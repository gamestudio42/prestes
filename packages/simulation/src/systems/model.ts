// Shared simulation data: unit records, templates and tuning constants.
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

export const BOUNDING_ORDERS = new Set<UnitOrder>([
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

export const FLANK_COOLDOWN = 180;
export const SUPPRESSION_COOLDOWN = 150;
export const SUPPRESS_FIRE_INTERVAL = 8;
export const WITHDRAW_DISTANCE = 12;
export const FATIGUE_MAX = 100;
export const AMBUSH_RADIUS = 14;
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

export interface BoundingGroup {
  squadId: number;
  teamA: number[];
  teamB: number[];
  destination: Vec2;
  targetId: number | null;
  phase: 'a' | 'b';
  mode: 'move' | 'attack';
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

export const BATTLE_UNITS = Array.from({ length: 6 }, (_, squadIndex) => {
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
