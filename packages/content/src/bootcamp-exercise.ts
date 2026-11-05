import { STATION_OFFSETS, stationPoint } from '@prestes/shared';
import type { MessageKey } from './locales';

export type TrainingAction =
  | 'camera-pan'
  | 'camera-zoom'
  | 'camera-rotate'
  | 'select'
  | 'box-select'
  | 'move'
  | 'hold'
  | 'face'
  | 'formation'
  | 'hold-fire'
  | 'bounding'
  | 'attack'
  | 'suppress'
  | 'defend'
  | 'ambush'
  | 'recon'
  | 'reserve'
  | 'disperse'
  | 'regroup'
  | 'advance'
  | 'flank'
  | 'pursue'
  | 'withdraw'
  | 'rescue'
  | 'protect-officer'
  | 'stance-stand'
  | 'stance-crouch'
  | 'stance-prone';

/** The seven stations of the bootcamp, in order. */
export type ExercisePhaseId =
  | 'formation'
  | 'fire'
  | 'maneuver'
  | 'defense'
  | 'recon'
  | 'wounded'
  | 'final';

export interface ExercisePoint {
  x: number;
  y: number;
}

/**
 * Every kind is checked from simulation frames (unit state, orders, positions),
 * never from a button press alone. UI-only actions (selection, camera) also
 * need the action recorded by the HUD.
 */
export type ExerciseObjectiveKind =
  | 'camera'
  | 'select'
  | 'box-select'
  | 'formation'
  | 'stance'
  | 'posture'
  | 'reach'
  | 'order'
  | 'target-hit'
  | 'suppress'
  | 'hold-fire'
  | 'facing'
  | 'open-order'
  | 'flank-position'
  | 'bounding-advance'
  | 'withdraw-out'
  | 'defend-in-cover'
  | 'ambush-trigger'
  | 'secure'
  | 'hold'
  | 'recon-report'
  | 'pursue'
  | 'regroup'
  | 'rescue-complete'
  | 'protect-officer'
  | 'cohesion-hold';

/** Commands the director sends when an objective becomes active. */
export type ObjectiveStartAction =
  | 'enemy-advance'
  | 'enemy-fire'
  | 'enemy-withdraw'
  | 'instructor-out';

export interface ExerciseObjective {
  id: string;
  kind: ExerciseObjectiveKind;
  labelKey: MessageKey;
  /** Instructor callout naming the order to give for this objective. */
  instructorKey: MessageKey;
  point?: ExercisePoint;
  radius?: number;
  minUnits?: number;
  count?: number;
  ticks?: number;
  /** Order the soldiers must be carrying (order objectives). */
  order?: string;
  /** With `order`: the units must also have this fire control. */
  fireControl?: 'free' | 'contact' | 'hold';
  /**
   * HUD action that must also have been used, for orders the simulation can set
   * by itself (a finished withdrawal leaves the soldiers holding).
   */
  action?: TrainingAction;
  formation?: string;
  stance?: 'standing' | 'crouched' | 'prone';
  posture?: string;
  /** Kind-specific threshold: cohesion %, bearing degrees, facing degrees or distance m. */
  threshold?: number;
  onStart?: ObjectiveStartAction;
}

export interface ExerciseMarker {
  id: string;
  kind: 'zone' | 'approach' | 'fallback';
  point: ExercisePoint;
  radius: number;
}

export interface ExerciseSetup {
  playerPoint: ExercisePoint;
  officerPoint: ExercisePoint;
  trainingEnemyPoint?: ExercisePoint;
  trainingEnemyCount?: number;
  releaseTrainingFire?: boolean;
  pinInstructor?: boolean;
  casualtyCount?: number;
}

export interface ExerciseFailure {
  zoneEmptyTicks?: number;
  officerPinnedTicks?: number;
  enemyInZoneTicks?: number;
  /** Fails when average section cohesion stays below 20 for this many ticks. */
  lowCohesionTicks?: number;
}

export interface ExercisePhase {
  id: ExercisePhaseId;
  titleKey: MessageKey;
  objectiveKey: MessageKey;
  briefingKey: MessageKey;
  hintKey: MessageKey;
  instructorKey: MessageKey;
  objectives: readonly ExerciseObjective[];
  markers: readonly ExerciseMarker[];
  setup: ExerciseSetup;
  failure?: ExerciseFailure;
}

export interface BootcampExercise {
  id: 'bootcamp';
  phases: readonly ExercisePhase[];
}

// Every station has the same local layout, measured from its entry on the
// training ground (see packages/shared/src/training-ground.ts).
const pointOf = (id: ExercisePhaseId, offset: keyof typeof STATION_OFFSETS): ExercisePoint =>
  stationPoint(id, STATION_OFFSETS[offset]);
const entryOf = (id: ExercisePhaseId): ExercisePoint => stationPoint(id, { x: 0, y: 0 });
const at = (id: ExercisePhaseId, x: number, y: number): ExercisePoint => stationPoint(id, { x, y });

const key = (station: ExercisePhaseId, part: string) =>
  `training.station.${station}.${part}` as MessageKey;

function station(
  id: ExercisePhaseId,
  rest: Omit<ExercisePhase, 'id' | 'titleKey' | 'objectiveKey' | 'briefingKey' | 'hintKey' | 'instructorKey'>,
): ExercisePhase {
  return {
    id,
    titleKey: key(id, 'title'),
    objectiveKey: key(id, 'objective'),
    briefingKey: key(id, 'briefing'),
    hintKey: key(id, 'hint'),
    instructorKey: key(id, 'instructor'),
    ...rest,
  };
}

function objective(
  stationId: ExercisePhaseId,
  id: string,
  kind: ExerciseObjectiveKind,
  rest: Omit<ExerciseObjective, 'id' | 'kind' | 'labelKey' | 'instructorKey'> = {},
): ExerciseObjective {
  return {
    id: `${stationId}-${id}`,
    kind,
    labelKey: key(stationId, `${id}.label`),
    instructorKey: key(stationId, `${id}.instructor`),
    ...rest,
  };
}

export const BOOTCAMP_EXERCISE: BootcampExercise = {
  id: 'bootcamp',
  phases: [
    station('formation', {
      objectives: [
        objective('formation', 'select', 'select', { minUnits: 11 }),
        objective('formation', 'box', 'box-select'),
        objective('formation', 'camera', 'camera', { count: 2 }),
        objective('formation', 'wedge', 'formation', { formation: 'wedge', minUnits: 8 }),
        objective('formation', 'prone', 'stance', { stance: 'prone', minUnits: 8 }),
        objective('formation', 'crouch', 'stance', { stance: 'crouched', minUnits: 8 }),
        objective('formation', 'stand', 'stance', { stance: 'standing', minUnits: 8 }),
        objective('formation', 'reach', 'reach', { point: entryOf('formation'), radius: 10, minUnits: 5 }),
      ],
      markers: [{ id: 'formation-zone', kind: 'zone', point: entryOf('formation'), radius: 10 }],
      setup: { playerPoint: pointOf('formation', 'start'), officerPoint: at('formation', -18, 7) },
    }),
    station('fire', {
      objectives: [
        objective('fire', 'attack', 'target-hit'),
        objective('fire', 'aggressive', 'posture', { posture: 'aggressive', minUnits: 8 }),
        objective('fire', 'suppress', 'suppress', { count: 2, ticks: 20 }),
        objective('fire', 'holdfire', 'hold-fire', { minUnits: 8, ticks: 50 }),
        objective('fire', 'face', 'facing', { point: pointOf('fire', 'face'), minUnits: 8, threshold: 30 }),
      ],
      markers: [
        { id: 'fire-target', kind: 'approach', point: pointOf('fire', 'line'), radius: 9 },
        { id: 'fire-face', kind: 'fallback', point: pointOf('fire', 'face'), radius: 3 },
      ],
      setup: {
        playerPoint: entryOf('fire'),
        officerPoint: at('fire', 0, 6),
        trainingEnemyPoint: pointOf('fire', 'line'),
        trainingEnemyCount: 6,
      },
    }),
    station('maneuver', {
      objectives: [
        objective('maneuver', 'flank', 'flank-position', { minUnits: 2, threshold: 50 }),
        // A line of 11 at 2.8 m spacing is ~28 m wide: 12 m catches its centre.
        objective('maneuver', 'bound', 'bounding-advance', { point: pointOf('maneuver', 'bound'), radius: 12, minUnits: 4 }),
        objective('maneuver', 'withdraw', 'withdraw-out', { point: pointOf('maneuver', 'bound'), radius: 8, minUnits: 8 }),
        objective('maneuver', 'hold', 'order', { order: 'hold', minUnits: 8, action: 'hold' }),
      ],
      markers: [
        { id: 'maneuver-target', kind: 'approach', point: pointOf('maneuver', 'line'), radius: 9 },
        { id: 'maneuver-line', kind: 'zone', point: pointOf('maneuver', 'bound'), radius: 12 },
      ],
      setup: {
        playerPoint: entryOf('maneuver'),
        officerPoint: at('maneuver', 0, 6),
        trainingEnemyPoint: pointOf('maneuver', 'line'),
        trainingEnemyCount: 6,
      },
    }),
    station('defense', {
      objectives: [
        objective('defense', 'defensive', 'posture', { posture: 'defensive', minUnits: 8 }),
        objective('defense', 'defend', 'defend-in-cover', {
          point: pointOf('defense', 'line'),
          radius: 9,
          minUnits: 4,
          threshold: 0.25,
        }),
        objective('defense', 'ambush', 'ambush-trigger', {
          point: pointOf('defense', 'line'),
          minUnits: 4,
          onStart: 'enemy-advance',
        }),
        objective('defense', 'hold', 'hold', {
          point: pointOf('defense', 'line'),
          radius: 9,
          minUnits: 3,
          ticks: 300,
          onStart: 'enemy-fire',
        }),
      ],
      markers: [
        { id: 'defense-zone', kind: 'zone', point: pointOf('defense', 'line'), radius: 9 },
        { id: 'defense-approach', kind: 'approach', point: pointOf('defense', 'approach'), radius: 5 },
      ],
      setup: {
        playerPoint: entryOf('defense'),
        officerPoint: at('defense', 12, -12),
        trainingEnemyPoint: pointOf('defense', 'approach'),
        trainingEnemyCount: 6,
      },
      failure: { zoneEmptyTicks: 80, enemyInZoneTicks: 60 },
    }),
    station('recon', {
      objectives: [
        objective('recon', 'recon', 'recon-report'),
        objective('recon', 'pursue', 'pursue', { threshold: 15, onStart: 'enemy-withdraw' }),
        objective('recon', 'disperse', 'open-order', { minUnits: 6, threshold: 5 }),
        objective('recon', 'reserve', 'order', { order: 'defend', fireControl: 'hold', minUnits: 3 }),
        objective('recon', 'advance', 'order', { order: 'advance', minUnits: 5 }),
        objective('recon', 'regroup', 'regroup', { radius: 8, minUnits: 9 }),
      ],
      markers: [{ id: 'recon-area', kind: 'approach', point: pointOf('recon', 'recon'), radius: 6 }],
      setup: {
        playerPoint: entryOf('recon'),
        officerPoint: at('recon', 0, 6),
        trainingEnemyPoint: pointOf('recon', 'line'),
        trainingEnemyCount: 4,
      },
    }),
    station('wounded', {
      objectives: [
        objective('wounded', 'rescue', 'rescue-complete'),
        objective('wounded', 'protect', 'protect-officer', { radius: 10, minUnits: 4 }),
        objective('wounded', 'cohesion', 'cohesion-hold', {
          threshold: 40,
          ticks: 200,
          onStart: 'instructor-out',
        }),
      ],
      markers: [{ id: 'wounded-zone', kind: 'zone', point: entryOf('wounded'), radius: 10 }],
      setup: {
        playerPoint: entryOf('wounded'),
        officerPoint: at('wounded', 2, 8),
        trainingEnemyPoint: pointOf('wounded', 'line'),
        trainingEnemyCount: 3,
        releaseTrainingFire: true,
        casualtyCount: 1,
      },
      failure: { lowCohesionTicks: 100 },
    }),
    station('final', {
      objectives: [
        objective('final', 'suppress', 'suppress', { count: 2, ticks: 20 }),
        objective('final', 'secure', 'secure', { point: pointOf('final', 'line'), radius: 9, minUnits: 3 }),
        objective('final', 'hold', 'hold', { point: pointOf('final', 'line'), radius: 9, minUnits: 3, ticks: 600 }),
      ],
      markers: [
        { id: 'final-zone', kind: 'zone', point: pointOf('final', 'line'), radius: 9 },
        { id: 'final-fallback', kind: 'fallback', point: entryOf('final'), radius: 4 },
      ],
      setup: {
        playerPoint: entryOf('final'),
        officerPoint: at('final', 0, 6),
        trainingEnemyPoint: pointOf('final', 'line'),
        trainingEnemyCount: 6,
        releaseTrainingFire: true,
      },
      failure: { zoneEmptyTicks: 80, officerPinnedTicks: 50, enemyInZoneTicks: 60 },
    }),
  ],
};

/**
 * Mechanics every completed bootcamp must have required. The content test checks
 * each one is covered by at least one objective.
 */
export const CURRICULUM: readonly { mechanic: string; covered: (objective: ExerciseObjective) => boolean }[] = [
  { mechanic: 'camera', covered: (o) => o.kind === 'camera' },
  { mechanic: 'select', covered: (o) => o.kind === 'select' },
  { mechanic: 'box-select', covered: (o) => o.kind === 'box-select' },
  { mechanic: 'move', covered: (o) => o.kind === 'reach' },
  { mechanic: 'formation', covered: (o) => o.kind === 'formation' },
  { mechanic: 'stance-standing', covered: (o) => o.stance === 'standing' },
  { mechanic: 'stance-crouched', covered: (o) => o.stance === 'crouched' },
  { mechanic: 'stance-prone', covered: (o) => o.stance === 'prone' },
  { mechanic: 'attack', covered: (o) => o.kind === 'target-hit' },
  { mechanic: 'suppress', covered: (o) => o.kind === 'suppress' },
  { mechanic: 'hold-fire', covered: (o) => o.kind === 'hold-fire' },
  { mechanic: 'face', covered: (o) => o.kind === 'facing' },
  { mechanic: 'flank', covered: (o) => o.kind === 'flank-position' },
  { mechanic: 'bounding', covered: (o) => o.kind === 'bounding-advance' },
  { mechanic: 'advance', covered: (o) => o.order === 'advance' },
  { mechanic: 'withdraw', covered: (o) => o.kind === 'withdraw-out' },
  { mechanic: 'defend', covered: (o) => o.kind === 'defend-in-cover' },
  { mechanic: 'ambush', covered: (o) => o.kind === 'ambush-trigger' },
  { mechanic: 'hold-order', covered: (o) => o.order === 'hold' },
  { mechanic: 'hold-line', covered: (o) => o.kind === 'hold' },
  { mechanic: 'recon', covered: (o) => o.kind === 'recon-report' },
  { mechanic: 'pursue', covered: (o) => o.kind === 'pursue' },
  { mechanic: 'disperse', covered: (o) => o.kind === 'open-order' },
  { mechanic: 'reserve', covered: (o) => o.order === 'defend' && o.fireControl === 'hold' },
  { mechanic: 'fire-contact', covered: (o) => o.kind === 'ambush-trigger' },
  { mechanic: 'regroup', covered: (o) => o.kind === 'regroup' },
  { mechanic: 'rescue', covered: (o) => o.kind === 'rescue-complete' },
  { mechanic: 'protect-officer', covered: (o) => o.kind === 'protect-officer' },
  { mechanic: 'officer-aura', covered: (o) => o.kind === 'protect-officer' },
  { mechanic: 'officer-loss', covered: (o) => o.onStart === 'instructor-out' },
  { mechanic: 'posture-aggressive', covered: (o) => o.posture === 'aggressive' },
  { mechanic: 'posture-defensive', covered: (o) => o.posture === 'defensive' },
];
