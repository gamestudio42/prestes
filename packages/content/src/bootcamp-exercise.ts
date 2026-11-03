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

const START_POINT = { x: 0, y: 6 } as const;
const ASSEMBLY_POINT = { x: 28, y: 4 } as const;
const LINE_POINT = { x: 52, y: -18 } as const;
const APPROACH_POINT = { x: 82, y: 10 } as const;
const BOUND_LINE = { x: 40, y: -4 } as const;
const FACE_POINT = { x: 28, y: 34 } as const;
/** Overlooks the training line without the trench parapet in the way. */
const RECON_POINT = { x: 42, y: -10 } as const;

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
        objective('formation', 'reach', 'reach', { point: ASSEMBLY_POINT, radius: 10, minUnits: 5 }),
      ],
      markers: [{ id: 'formation-zone', kind: 'zone', point: ASSEMBLY_POINT, radius: 10 }],
      setup: { playerPoint: START_POINT, officerPoint: { x: 10, y: 11 } },
    }),
    station('fire', {
      objectives: [
        objective('fire', 'attack', 'target-hit'),
        objective('fire', 'aggressive', 'posture', { posture: 'aggressive', minUnits: 8 }),
        objective('fire', 'suppress', 'suppress', { count: 2, ticks: 20 }),
        objective('fire', 'holdfire', 'hold-fire', { minUnits: 8, ticks: 50 }),
        objective('fire', 'face', 'facing', { point: FACE_POINT, minUnits: 8, threshold: 30 }),
      ],
      markers: [
        { id: 'fire-target', kind: 'approach', point: LINE_POINT, radius: 9 },
        { id: 'fire-face', kind: 'fallback', point: FACE_POINT, radius: 3 },
      ],
      setup: {
        playerPoint: ASSEMBLY_POINT,
        officerPoint: { x: 28, y: 10 },
        trainingEnemyPoint: LINE_POINT,
        trainingEnemyCount: 6,
      },
    }),
    station('maneuver', {
      objectives: [
        objective('maneuver', 'flank', 'flank-position', { minUnits: 2, threshold: 50 }),
        // A line of 11 at 2.8 m spacing is ~28 m wide: 12 m catches its centre.
        objective('maneuver', 'bound', 'bounding-advance', { point: BOUND_LINE, radius: 12, minUnits: 4 }),
        objective('maneuver', 'withdraw', 'withdraw-out', { point: BOUND_LINE, radius: 8, minUnits: 8 }),
        objective('maneuver', 'hold', 'order', { order: 'hold', minUnits: 8 }),
      ],
      markers: [
        { id: 'maneuver-target', kind: 'approach', point: LINE_POINT, radius: 9 },
        { id: 'maneuver-line', kind: 'zone', point: BOUND_LINE, radius: 12 },
      ],
      setup: {
        playerPoint: ASSEMBLY_POINT,
        officerPoint: { x: 28, y: 10 },
        trainingEnemyPoint: LINE_POINT,
        trainingEnemyCount: 6,
      },
    }),
    station('defense', {
      objectives: [
        objective('defense', 'defensive', 'posture', { posture: 'defensive', minUnits: 8 }),
        objective('defense', 'defend', 'defend-in-cover', {
          point: LINE_POINT,
          radius: 9,
          minUnits: 4,
          threshold: 0.25,
        }),
        objective('defense', 'ambush', 'ambush-trigger', {
          point: LINE_POINT,
          minUnits: 4,
          onStart: 'enemy-advance',
        }),
        objective('defense', 'hold', 'hold', {
          point: LINE_POINT,
          radius: 9,
          minUnits: 3,
          ticks: 300,
          onStart: 'enemy-fire',
        }),
      ],
      markers: [
        { id: 'defense-zone', kind: 'zone', point: LINE_POINT, radius: 9 },
        { id: 'defense-approach', kind: 'approach', point: APPROACH_POINT, radius: 5 },
      ],
      setup: {
        playerPoint: ASSEMBLY_POINT,
        officerPoint: { x: 40, y: -8 },
        trainingEnemyPoint: APPROACH_POINT,
        trainingEnemyCount: 6,
      },
      failure: { zoneEmptyTicks: 80, enemyInZoneTicks: 60 },
    }),
    station('recon', {
      objectives: [
        objective('recon', 'recon', 'recon-report'),
        objective('recon', 'pursue', 'pursue', { threshold: 15, onStart: 'enemy-withdraw' }),
        objective('recon', 'disperse', 'order', { order: 'disperse', minUnits: 6 }),
        objective('recon', 'reserve', 'order', { order: 'reserve', minUnits: 3 }),
        objective('recon', 'advance', 'order', { order: 'advance', minUnits: 5 }),
        objective('recon', 'regroup', 'regroup', { radius: 8, minUnits: 9 }),
      ],
      markers: [{ id: 'recon-area', kind: 'approach', point: RECON_POINT, radius: 6 }],
      setup: {
        playerPoint: ASSEMBLY_POINT,
        officerPoint: { x: 28, y: 10 },
        trainingEnemyPoint: LINE_POINT,
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
      markers: [{ id: 'wounded-zone', kind: 'zone', point: ASSEMBLY_POINT, radius: 10 }],
      setup: {
        playerPoint: ASSEMBLY_POINT,
        officerPoint: { x: 30, y: 12 },
        trainingEnemyPoint: LINE_POINT,
        trainingEnemyCount: 3,
        releaseTrainingFire: true,
        casualtyCount: 1,
      },
      failure: { lowCohesionTicks: 100 },
    }),
    station('final', {
      objectives: [
        objective('final', 'suppress', 'suppress', { count: 2, ticks: 20 }),
        objective('final', 'secure', 'secure', { point: LINE_POINT, radius: 9, minUnits: 3 }),
        objective('final', 'hold', 'hold', { point: LINE_POINT, radius: 9, minUnits: 3, ticks: 600 }),
      ],
      markers: [
        { id: 'final-zone', kind: 'zone', point: LINE_POINT, radius: 9 },
        { id: 'final-fallback', kind: 'fallback', point: ASSEMBLY_POINT, radius: 4 },
      ],
      setup: {
        playerPoint: ASSEMBLY_POINT,
        officerPoint: { x: 28, y: 10 },
        trainingEnemyPoint: LINE_POINT,
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
  { mechanic: 'disperse', covered: (o) => o.order === 'disperse' },
  { mechanic: 'reserve', covered: (o) => o.order === 'reserve' },
  { mechanic: 'regroup', covered: (o) => o.kind === 'regroup' },
  { mechanic: 'rescue', covered: (o) => o.kind === 'rescue-complete' },
  { mechanic: 'protect-officer', covered: (o) => o.kind === 'protect-officer' },
  { mechanic: 'officer-aura', covered: (o) => o.kind === 'protect-officer' },
  { mechanic: 'officer-loss', covered: (o) => o.onStart === 'instructor-out' },
  { mechanic: 'posture-aggressive', covered: (o) => o.posture === 'aggressive' },
  { mechanic: 'posture-defensive', covered: (o) => o.posture === 'defensive' },
];
