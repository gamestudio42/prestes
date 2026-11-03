import {
  BOOTCAMP_EXERCISE,
  type BootcampExercise,
  type ExerciseMarker,
  type ExerciseObjective,
  type ExercisePhase,
} from '@prestes/content';
import type { Command, Frame, UnitSnapshot } from '@prestes/shared';

const SECURE_TICKS = 20;

export interface RuntimeObjective {
  id: string;
  labelKey: ExerciseObjective['labelKey'];
  kind: ExerciseObjective['kind'];
  current: number;
  target: number;
  done: boolean;
}

export interface ExerciseState {
  phaseIndex: number;
  phaseStartedTick: number;
  completedPhases: string[];
  completed: boolean;
  failed: boolean;
  failureReason: string | null;
  peakSuppression: number;
  objectiveTicks: Record<string, number>;
  failureTicks: Record<string, number>;
}

export interface ExerciseEvaluation {
  state: ExerciseState;
  objectives: RuntimeObjective[];
  commands: Command[];
  phaseCompleted: ExercisePhase | null;
  exerciseCompleted: boolean;
  failure: string | null;
}

export function startExercise(): ExerciseState {
  return {
    phaseIndex: 0,
    phaseStartedTick: 0,
    completedPhases: [],
    completed: false,
    failed: false,
    failureReason: null,
    peakSuppression: 0,
    objectiveTicks: {},
    failureTicks: {},
  };
}

export function currentPhase(
  state: ExerciseState,
  exercise: BootcampExercise = BOOTCAMP_EXERCISE,
): ExercisePhase {
  return exercise.phases[Math.min(state.phaseIndex, exercise.phases.length - 1)]!;
}

export function phaseCommand(phase: ExercisePhase): Command {
  return {
    type: 'training_phase',
    setup: {
      phase: phase.id,
      playerPoint: phase.setup.playerPoint,
      officerPoint: phase.setup.officerPoint,
      enemyPoint: phase.setup.trainingEnemyPoint,
      enemyCount: phase.setup.trainingEnemyCount,
      releaseTrainingFire: phase.setup.releaseTrainingFire,
    },
  };
}

export function objectivePlaceholders(phase: ExercisePhase): RuntimeObjective[] {
  return phase.objectives.map((objective) => ({
    id: objective.id,
    labelKey: objective.labelKey,
    kind: objective.kind,
    current: 0,
    target:
      objective.kind === 'hold'
        ? (objective.ticks ?? 1)
        : objective.kind === 'suppress'
          ? (objective.count ?? 1)
          : (objective.minUnits ?? 1),
    done: false,
  }));
}

export function markersForPhase(phase: ExercisePhase): readonly ExerciseMarker[] {
  return phase.markers;
}

export function retryPhase(
  state: ExerciseState,
  exercise: BootcampExercise = BOOTCAMP_EXERCISE,
): { state: ExerciseState; command: Command; objectives: RuntimeObjective[] } {
  const phase = currentPhase(state, exercise);
  const next: ExerciseState = {
    ...state,
    phaseStartedTick: state.phaseStartedTick,
    failed: false,
    failureReason: null,
    objectiveTicks: {},
    failureTicks: {},
  };
  return {
    state: next,
    command: phaseCommand(phase),
    objectives: [],
  };
}

export function advanceExercise(
  state: ExerciseState,
  frame: Frame,
  exercise: BootcampExercise = BOOTCAMP_EXERCISE,
  tickDelta = 1,
): ExerciseEvaluation {
  if (state.completed || state.failed) {
    return {
      state,
      objectives: [],
      commands: [],
      phaseCompleted: null,
      exerciseCompleted: state.completed,
      failure: state.failureReason,
    };
  }
  const phase = currentPhase(state, exercise);
  const objectiveTicks = { ...state.objectiveTicks };
  const failureTicks = { ...state.failureTicks };
  const peakSuppression = Math.max(
    state.peakSuppression,
    ...playerUnits(frame).map((unit) => unit.suppression),
  );
  const objectives = evaluateObjectives(phase, frame, objectiveTicks, tickDelta);

  const failure = evaluateFailure(phase, frame, failureTicks, tickDelta);
  if (failure) {
    return {
      state: {
        ...state,
        failed: true,
        failureReason: failure,
        peakSuppression,
        objectiveTicks,
        failureTicks,
      },
      objectives,
      commands: [],
      phaseCompleted: null,
      exerciseCompleted: false,
      failure,
    };
  }

  if (!objectives.every((objective) => objective.done)) {
    return {
      state: { ...state, peakSuppression, objectiveTicks, failureTicks },
      objectives,
      commands: [],
      phaseCompleted: null,
      exerciseCompleted: false,
      failure: null,
    };
  }

  const completedPhases = [...new Set([...state.completedPhases, phase.id])];
  const nextIndex = state.phaseIndex + 1;
  if (nextIndex >= exercise.phases.length) {
    return {
      state: {
        ...state,
        completedPhases,
        completed: true,
        failed: false,
        failureReason: null,
        peakSuppression,
        objectiveTicks: {},
        failureTicks: {},
      },
      objectives,
      commands: [],
      phaseCompleted: phase,
      exerciseCompleted: true,
      failure: null,
    };
  }

  const nextPhase = exercise.phases[nextIndex]!;
  return {
    state: {
      ...state,
      phaseIndex: nextIndex,
      phaseStartedTick: frame.tick,
      completedPhases,
      failed: false,
      failureReason: null,
      peakSuppression,
      objectiveTicks: {},
      failureTicks: {},
    },
    objectives,
    commands: [phaseCommand(nextPhase)],
    phaseCompleted: phase,
    exerciseCompleted: false,
    failure: null,
  };
}

function evaluateObjectives(
  phase: ExercisePhase,
  frame: Frame,
  ticks: Record<string, number>,
  tickDelta: number,
): RuntimeObjective[] {
  return phase.objectives.map((objective) => {
    const result = evaluateObjective(objective, frame, ticks, tickDelta);
    return {
      id: objective.id,
      labelKey: objective.labelKey,
      kind: objective.kind,
      current: result.current,
      target: result.target,
      done: result.done,
    };
  });
}

function evaluateObjective(
  objective: ExerciseObjective,
  frame: Frame,
  ticks: Record<string, number>,
  tickDelta: number,
): { current: number; target: number; done: boolean } {
  const player = playerUnits(frame);
  const enemies = trainingEnemies(frame);
  if (objective.kind === 'reach') {
    const current = countInside(player, objective.point, objective.radius ?? 0);
    const target = objective.minUnits ?? 1;
    return { current, target, done: current >= target };
  }
  if (objective.kind === 'suppress') {
    const target = objective.count ?? 1;
    const current =
      enemies.length === 0 ? target : enemies.filter((unit) => unit.suppressed).length;
    const held = current >= target;
    const next = held ? (ticks[objective.id] ?? 0) + tickDelta : 0;
    ticks[objective.id] = next;
    return { current, target, done: next >= (objective.ticks ?? 1) };
  }
  if (objective.kind === 'secure') {
    const current = countInside(player, objective.point, objective.radius ?? 0);
    const target = objective.minUnits ?? 1;
    const enemiesInside = countInside(enemies, objective.point, objective.radius ?? 0);
    const held = current >= target && enemiesInside === 0;
    const next = held ? (ticks[objective.id] ?? 0) + tickDelta : 0;
    ticks[objective.id] = next;
    return { current, target, done: next >= SECURE_TICKS };
  }
  if (objective.kind === 'hold') {
    const current = countInside(player, objective.point, objective.radius ?? 0);
    const target = objective.minUnits ?? 1;
    const next =
      current >= target ? (ticks[objective.id] ?? 0) + tickDelta : (ticks[objective.id] ?? 0);
    ticks[objective.id] = next;
    return { current: next, target: objective.ticks ?? 1, done: next >= (objective.ticks ?? 1) };
  }
  const officer = officerUnit(frame);
  const current =
    officer &&
    officer.alive &&
    !officer.incapacitated &&
    !officer.routed &&
    officer.state !== 'pinned' &&
    inside(officer, objective.point, objective.radius ?? 0)
      ? 1
      : 0;
  return { current, target: 1, done: current === 1 };
}

function evaluateFailure(
  phase: ExercisePhase,
  frame: Frame,
  ticks: Record<string, number>,
  tickDelta: number,
): string | null {
  if (!phase.failure) {
    return null;
  }
  const player = playerUnits(frame);
  const enemies = trainingEnemies(frame);
  const officer = officerUnit(frame);
  const hold = phase.objectives.find((objective) => objective.kind === 'hold');
  if (!hold) {
    return null;
  }
  const point = hold.point;
  const radius = hold.radius ?? 0;
  const insideCount = countInside(player, point, radius);
  const enemyInsideCount = countInside(enemies, point, radius);
  if (phase.failure.zoneEmptyTicks !== undefined) {
    ticks.zoneEmpty = insideCount === 0 ? (ticks.zoneEmpty ?? 0) + tickDelta : 0;
    if (ticks.zoneEmpty >= phase.failure.zoneEmptyTicks) {
      return 'training.exercise.failure.line';
    }
  }
  if (phase.failure.officerPinnedTicks !== undefined) {
    const pinned = !officer || !officer.alive || officer.incapacitated || officer.state === 'pinned';
    ticks.officerPinned = pinned ? (ticks.officerPinned ?? 0) + tickDelta : 0;
    if (ticks.officerPinned >= phase.failure.officerPinnedTicks) {
      return 'training.exercise.failure.officer';
    }
  }
  if (phase.failure.enemyInZoneTicks !== undefined) {
    ticks.enemyInZone =
      enemyInsideCount > 0 ? (ticks.enemyInZone ?? 0) + tickDelta : 0;
    if (ticks.enemyInZone >= phase.failure.enemyInZoneTicks) {
      return 'training.exercise.failure.enemy';
    }
  }
  return null;
}

function playerUnits(frame: Frame): UnitSnapshot[] {
  return frame.units.filter(
    (unit) =>
      unit.faction === 'column' &&
      unit.squadId !== 99 &&
      unit.alive &&
      !unit.routed &&
      !unit.incapacitated &&
      !unit.dummy,
  );
}

function trainingEnemies(frame: Frame): UnitSnapshot[] {
  return frame.units.filter(
    (unit) =>
      unit.role === 'training-enemy' &&
      unit.alive &&
      !unit.routed &&
      !unit.incapacitated,
  );
}

function officerUnit(frame: Frame): UnitSnapshot | null {
  return (
    frame.units.find(
      (unit) =>
        unit.faction === 'column' &&
        unit.kind === 'officer' &&
        unit.alive &&
        !unit.dummy,
    ) ?? null
  );
}

function countInside(
  units: readonly UnitSnapshot[],
  point: { x: number; y: number } | undefined,
  radius: number,
): number {
  if (!point) {
    return 0;
  }
  return units.filter((unit) => inside(unit, point, radius)).length;
}

function inside(
  unit: { x: number; y: number },
  point: { x: number; y: number } | undefined,
  radius: number,
): boolean {
  return point !== undefined && (unit.x - point.x) ** 2 + (unit.y - point.y) ** 2 <= radius * radius;
}




