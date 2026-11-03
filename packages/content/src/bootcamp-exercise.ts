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
  | 'flank'
  | 'pursue'
  | 'withdraw'
  | 'rescue'
  | 'protect-officer'
  | 'stance-stand'
  | 'stance-crouch'
  | 'stance-prone';

export type ExercisePhaseId = 'assembly' | 'assault' | 'hold';

export interface ExercisePoint {
  x: number;
  y: number;
}

export interface ExerciseObjective {
  id: string;
  kind: 'reach' | 'suppress' | 'secure' | 'hold' | 'protect-officer';
  labelKey: MessageKey;
  point?: ExercisePoint;
  radius?: number;
  minUnits?: number;
  count?: number;
  ticks?: number;
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
}

export interface ExerciseFailure {
  zoneEmptyTicks?: number;
  officerPinnedTicks?: number;
  enemyInZoneTicks?: number;
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
  drills: readonly TrainingAction[];
  setup: ExerciseSetup;
  failure?: ExerciseFailure;
}

export interface BootcampExercise {
  id: 'bootcamp';
  phases: readonly ExercisePhase[];
}

const ASSEMBLY_POINT = { x: 28, y: 4 } as const;
const LINE_POINT = { x: 52, y: -18 } as const;
const APPROACH_POINT = { x: 82, y: 10 } as const;

export const BOOTCAMP_EXERCISE: BootcampExercise = {
  id: 'bootcamp',
  phases: [
    {
      id: 'assembly',
      titleKey: 'training.exercise.assembly.title',
      objectiveKey: 'training.exercise.assembly.objective',
      briefingKey: 'training.exercise.assembly.briefing',
      hintKey: 'training.exercise.assembly.hint',
      instructorKey: 'training.exercise.assembly.instructor',
      objectives: [
        {
          id: 'assembly-reach',
          kind: 'reach',
          labelKey: 'training.exercise.assembly.reach',
          point: ASSEMBLY_POINT,
          radius: 10,
          minUnits: 5,
        },
      ],
      markers: [
        {
          id: 'assembly-zone',
          kind: 'zone',
          point: ASSEMBLY_POINT,
          radius: 10,
        },
      ],
      drills: ['camera-pan', 'camera-zoom', 'camera-rotate', 'select', 'move', 'formation', 'hold', 'face'],
      setup: {
        playerPoint: { x: 0, y: 6 },
        officerPoint: { x: 10, y: 11 },
      },
    },
    {
      id: 'assault',
      titleKey: 'training.exercise.assault.title',
      objectiveKey: 'training.exercise.assault.objective',
      briefingKey: 'training.exercise.assault.briefing',
      hintKey: 'training.exercise.assault.hint',
      instructorKey: 'training.exercise.assault.instructor',
      objectives: [
        {
          id: 'assault-suppress',
          kind: 'suppress',
          labelKey: 'training.exercise.assault.suppress',
          count: 2,
          ticks: 20,
        },
        {
          id: 'assault-secure',
          kind: 'secure',
          labelKey: 'training.exercise.assault.secure',
          point: LINE_POINT,
          radius: 9,
          minUnits: 3,
        },
      ],
      markers: [
        {
          id: 'assault-zone',
          kind: 'zone',
          point: LINE_POINT,
          radius: 9,
        },
        {
          id: 'assault-fallback',
          kind: 'fallback',
          point: ASSEMBLY_POINT,
          radius: 4,
        },
      ],
      drills: ['hold-fire', 'suppress', 'flank', 'attack', 'stance-crouch', 'stance-prone', 'stance-stand', 'recon', 'pursue'],
      setup: {
        playerPoint: ASSEMBLY_POINT,
        officerPoint: { x: 28, y: 10 },
        trainingEnemyPoint: LINE_POINT,
        trainingEnemyCount: 6,
        releaseTrainingFire: true,
      },
    },
    {
      id: 'hold',
      titleKey: 'training.exercise.hold.title',
      objectiveKey: 'training.exercise.hold.objective',
      briefingKey: 'training.exercise.hold.briefing',
      hintKey: 'training.exercise.hold.hint',
      instructorKey: 'training.exercise.hold.instructor',
      objectives: [
        {
          id: 'hold-line',
          kind: 'hold',
          labelKey: 'training.exercise.hold.line',
          point: LINE_POINT,
          radius: 8,
          minUnits: 3,
          ticks: 600,
        },
        {
          id: 'hold-officer',
          kind: 'protect-officer',
          labelKey: 'training.exercise.hold.officer',
          point: { x: 52, y: -8 },
          radius: 12,
        },
      ],
      markers: [
        {
          id: 'hold-zone',
          kind: 'zone',
          point: LINE_POINT,
          radius: 8,
        },
        {
          id: 'hold-approach',
          kind: 'approach',
          point: APPROACH_POINT,
          radius: 5,
        },
      ],
      drills: ['defend', 'ambush', 'protect-officer', 'rescue', 'withdraw', 'bounding', 'reserve', 'disperse', 'regroup'],
      setup: {
        playerPoint: LINE_POINT,
        officerPoint: { x: 52, y: -8 },
        trainingEnemyPoint: APPROACH_POINT,
        trainingEnemyCount: 6,
        releaseTrainingFire: true,
      },
      failure: {
        zoneEmptyTicks: 80,
        officerPinnedTicks: 50,
        enemyInZoneTicks: 60,
      },
    },
  ],
};




