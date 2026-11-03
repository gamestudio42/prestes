import {
  BOOTCAMP_EXERCISE,
  type BootcampExercise,
  type ExerciseMarker,
  type ExerciseObjective,
  type ExercisePhase,
} from '@prestes/content';
import type { Command, Frame } from '@prestes/shared';
import {
  countInside,
  evaluateObjective,
  instructorUnit,
  objectiveTarget,
  playerUnits,
  trainingEnemies,
  type ObjectiveInput,
  type ObjectiveMemory,
} from './objectives';

export type { ObjectiveInput } from './objectives';

export interface RuntimeObjective {
  id: string;
  labelKey: ExerciseObjective['labelKey'];
  instructorKey: ExerciseObjective['instructorKey'];
  kind: ExerciseObjective['kind'];
  current: number;
  target: number;
  done: boolean;
  active: boolean;
}

export interface ExerciseState {
  /** Index of the current station. */
  phaseIndex: number;
  phaseStartedTick: number;
  completedPhases: string[];
  /** Index of the active objective inside the current station. */
  objectiveIndex: number;
  completed: boolean;
  failed: boolean;
  failureReason: string | null;
  peakSuppression: number;
  objectiveTicks: ObjectiveMemory;
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

const NO_INPUT: ObjectiveInput = { actions: new Set(), selectedCount: 0 };

export function startExercise(): ExerciseState {
  return {
    phaseIndex: 0,
    phaseStartedTick: 0,
    completedPhases: [],
    objectiveIndex: 0,
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

export function activeObjective(
  state: ExerciseState,
  exercise: BootcampExercise = BOOTCAMP_EXERCISE,
): ExerciseObjective | null {
  return currentPhase(state, exercise).objectives[state.objectiveIndex] ?? null;
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
      pinInstructor: phase.setup.pinInstructor,
      casualtyCount: phase.setup.casualtyCount,
    },
  };
}

export function objectivePlaceholders(phase: ExercisePhase, objectiveIndex = 0): RuntimeObjective[] {
  return phase.objectives.map((objective, index) => ({
    id: objective.id,
    labelKey: objective.labelKey,
    instructorKey: objective.instructorKey,
    kind: objective.kind,
    current: 0,
    target: objectiveTarget(objective),
    done: index < objectiveIndex,
    active: index === objectiveIndex,
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
    objectiveIndex: 0,
    failed: false,
    failureReason: null,
    objectiveTicks: {},
    failureTicks: {},
  };
  return { state: next, command: phaseCommand(phase), objectives: objectivePlaceholders(phase) };
}

/** Commands that set up the station when an objective becomes active. */
export function objectiveStartCommands(objective: ExerciseObjective, frame: Frame): Command[] {
  const enemies = trainingEnemies(frame).map((unit) => unit.id);
  switch (objective.onStart) {
    case 'enemy-advance':
      return enemies.length > 0 && objective.point
        ? [{ type: 'move', unitIds: enemies, to: objective.point }]
        : [];
    case 'enemy-fire':
      return enemies.length > 0 ? [{ type: 'hold_fire', unitIds: enemies, hold: false }] : [];
    case 'enemy-withdraw':
      return enemies.length > 0 ? [{ type: 'withdraw', unitIds: enemies }] : [];
    case 'instructor-out': {
      const instructor = instructorUnit(frame);
      return instructor && !instructor.incapacitated
        ? [{ type: 'incapacitate', targetId: instructor.id }]
        : [];
    }
    default:
      return [];
  }
}

export function advanceExercise(
  state: ExerciseState,
  frame: Frame,
  exercise: BootcampExercise = BOOTCAMP_EXERCISE,
  tickDelta = 1,
  input: ObjectiveInput = NO_INPUT,
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
  // The station setup command lands on the next tick; until then the frame
  // still shows the previous station, so objectives must not read it.
  if (frame.tick <= state.phaseStartedTick && state.phaseStartedTick > 0) {
    return {
      state,
      objectives: objectivePlaceholders(phase, state.objectiveIndex),
      commands: [],
      phaseCompleted: null,
      exerciseCompleted: false,
      failure: null,
    };
  }
  const memory = { ...state.objectiveTicks };
  const failureTicks = { ...state.failureTicks };
  const peakSuppression = Math.max(
    state.peakSuppression,
    ...playerUnits(frame).map((unit) => unit.suppression),
  );

  // Objectives run in order; only the active one is evaluated this frame.
  let objectiveIndex = state.objectiveIndex;
  const commands: Command[] = [];
  const objectives = objectivePlaceholders(phase, objectiveIndex);
  const active = phase.objectives[objectiveIndex];
  if (active) {
    const result = evaluateObjective(active, frame, memory, tickDelta, input);
    objectives[objectiveIndex] = {
      ...objectives[objectiveIndex]!,
      current: result.current,
      target: result.target,
      done: result.done,
    };
    if (result.done) {
      objectiveIndex += 1;
      const next = phase.objectives[objectiveIndex];
      if (next) {
        objectives[objectiveIndex] = { ...objectives[objectiveIndex]!, active: true };
        commands.push(...objectiveStartCommands(next, frame));
      }
    }
  }

  const failure = active ? evaluateFailure(phase, active, frame, failureTicks, tickDelta) : null;
  if (failure) {
    return {
      state: { ...state, failed: true, failureReason: failure, peakSuppression, objectiveTicks: memory, failureTicks },
      objectives,
      commands: [],
      phaseCompleted: null,
      exerciseCompleted: false,
      failure,
    };
  }

  if (objectiveIndex < phase.objectives.length) {
    return {
      state: { ...state, objectiveIndex, peakSuppression, objectiveTicks: memory, failureTicks },
      objectives,
      commands,
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
        objectiveIndex,
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
      objectiveIndex: 0,
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

/**
 * Line, instructor and enemy-in-zone failures apply while a hold objective is
 * active; the cohesion failure while a cohesion objective is active.
 */
function evaluateFailure(
  phase: ExercisePhase,
  active: ExerciseObjective,
  frame: Frame,
  ticks: Record<string, number>,
  tickDelta: number,
): string | null {
  const failure = phase.failure;
  if (!failure) {
    return null;
  }
  const accumulate = (key: string, condition: boolean, limit: number | undefined): boolean => {
    if (limit === undefined) {
      return false;
    }
    ticks[key] = condition ? (ticks[key] ?? 0) + tickDelta : 0;
    return ticks[key]! >= limit;
  };
  const player = playerUnits(frame);
  if (active.kind === 'hold') {
    const radius = active.radius ?? 0;
    if (accumulate('zoneEmpty', countInside(player, active.point, radius) === 0, failure.zoneEmptyTicks)) {
      return 'training.exercise.failure.line';
    }
    const instructor = instructorUnit(frame);
    const instructorDown =
      !instructor || instructor.incapacitated || instructor.state === 'pinned';
    if (accumulate('officerPinned', instructorDown, failure.officerPinnedTicks)) {
      return 'training.exercise.failure.officer';
    }
    const enemiesInside = countInside(trainingEnemies(frame), active.point, radius);
    if (accumulate('enemyInZone', enemiesInside > 0, failure.enemyInZoneTicks)) {
      return 'training.exercise.failure.enemy';
    }
  }
  if (active.kind === 'cohesion-hold') {
    const average =
      player.length === 0 ? 0 : player.reduce((sum, unit) => sum + unit.cohesion, 0) / player.length;
    if (accumulate('lowCohesion', average < 20, failure.lowCohesionTicks)) {
      return 'training.exercise.failure.cohesion';
    }
  }
  return null;
}
