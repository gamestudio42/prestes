import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { BOOTCAMP_EXERCISE, translate, type Locale, type TrainingAction } from '@prestes/content';
import type { Frame } from '@prestes/shared';
import type { OrderCallout } from '@prestes/view3d';
import { DEFAULT_SPEED, type GameClient } from '../client/GameClient';
import { trainingStorage } from '../storage';
import {
  activeObjective,
  advanceExercise,
  currentPhase,
  markersForPhase,
  objectivePlaceholders,
  retryPhase,
  type ExerciseState,
  type RuntimeObjective,
} from '../training/exercise';
import {
  loadExerciseProgress,
  saveExerciseProgress,
  type ExerciseProgress,
} from '../training/exercise-progress';

interface ExerciseDirectorOptions {
  frame: Frame | null;
  locale: Locale;
  /** Current HUD selection size, read when objectives are evaluated. */
  selectedCountRef: MutableRefObject<number>;
  sessionMode: 'battle' | 'training';
  clientRef: MutableRefObject<GameClient | null>;
  setSpeed: Dispatch<SetStateAction<0 | 1 | 2 | 4>>;
}

/** Bootcamp exercise state, the per-frame director, progress, retry and debrief. */
export function useExerciseDirector({
  frame,
  locale,
  selectedCountRef,
  sessionMode,
  clientRef,
  setSpeed,
}: ExerciseDirectorOptions) {
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress>(() =>
    loadExerciseProgress(trainingStorage()),
  );
  const [exerciseState, setExerciseState] = useState<ExerciseState | null>(null);
  const [exerciseObjectives, setExerciseObjectives] = useState<RuntimeObjective[]>([]);
  const [exerciseFeedback, setExerciseFeedback] = useState<string | null>(null);
  const [trainingActions, setTrainingActions] = useState<Set<TrainingAction>>(new Set());
  const exerciseTickRef = useRef(-1);
  const [instructorCallout, setInstructorCallout] = useState<OrderCallout | null>(null);
  const calloutObjective = useRef<string | null>(null);

  const recordTrainingAction = (action: TrainingAction): void => {
    if (
      sessionMode !== 'training' ||
      !exerciseState ||
      exerciseState.failed ||
      exerciseState.completed
    ) {
      return;
    }
    setTrainingActions((previous) => {
      const next = new Set(previous);
      next.add(action);
      return next;
    });
  };

  const handleRetryPhase = (): void => {
    if (!exerciseState) {
      return;
    }
    const result = retryPhase(exerciseState);
    setExerciseState(result.state);
    setExerciseObjectives(objectivePlaceholders(currentPhase(result.state)));
    setExerciseFeedback(null);
    clientRef.current?.sendCommand(result.command);
    setSpeed(DEFAULT_SPEED);
    clientRef.current?.setSpeed(DEFAULT_SPEED);
  };

  useEffect(() => {
    if (sessionMode !== 'training' || !exerciseState || !frame) {
      return;
    }
    if (exerciseState.failed || exerciseState.completed) {
      return;
    }
    if (exerciseTickRef.current === frame.tick) {
      return;
    }
    const tickDelta =
      exerciseTickRef.current < 0 ? 1 : Math.max(1, frame.tick - exerciseTickRef.current);
    exerciseTickRef.current = frame.tick;
    const result = advanceExercise(exerciseState, frame, BOOTCAMP_EXERCISE, tickDelta, {
      actions: trainingActions,
      selectedCount: selectedCountRef.current,
    });
    setExerciseState(result.state);
    setExerciseObjectives(result.objectives);
    // Objective start actions (enemy advance, instructor out) and the next
    // station setup both go through the command boundary.
    for (const command of result.commands) {
      clientRef.current?.sendCommand(command);
    }
    if (result.failure) {
      setExerciseFeedback(null);
      setSpeed(0);
      clientRef.current?.setSpeed(0);
      return;
    }
    if (result.exerciseCompleted) {
      setSpeed(0);
      clientRef.current?.setSpeed(0);
      const nextProgress: ExerciseProgress = {
        phaseIndex: result.state.phaseIndex,
        completedPhases: result.state.completedPhases,
        completed: true,
        bestTimeTicks: Math.max(600, frame.tick - exerciseState.phaseStartedTick),
      };
      setExerciseProgress(nextProgress);
      saveExerciseProgress(trainingStorage(), nextProgress);
      return;
    }
    if (result.phaseCompleted) {
      setExerciseFeedback(result.phaseCompleted.titleKey);
      setTrainingActions(new Set());
      setExerciseObjectives(objectivePlaceholders(currentPhase(result.state)));
      const nextProgress: ExerciseProgress = {
        phaseIndex: result.state.phaseIndex,
        completedPhases: result.state.completedPhases,
        completed: false,
        bestTimeTicks: exerciseProgress.bestTimeTicks,
      };
      setExerciseProgress(nextProgress);
      saveExerciseProgress(trainingStorage(), nextProgress);
    }
  }, [frame, exerciseState, sessionMode, exerciseProgress.bestTimeTicks, trainingActions]);
  useEffect(() => {
    if (!exerciseFeedback) {
      return;
    }
    const handle = window.setTimeout(() => setExerciseFeedback(null), 2400);
    return () => window.clearTimeout(handle);
  }, [exerciseFeedback]);
  // The instructor speaks the order for each new objective over his head.
  useEffect(() => {
    if (sessionMode !== 'training' || !exerciseState || exerciseState.completed || !frame) {
      return;
    }
    const objective = activeObjective(exerciseState);
    if (!objective || calloutObjective.current === objective.id) {
      return;
    }
    calloutObjective.current = objective.id;
    const instructor = frame.units.find(
      (unit) => unit.faction === 'column' && unit.kind === 'officer' && unit.squadId === 99,
    );
    const text = translate(locale, objective.instructorKey).replace(/^[^:]{3,12}:\s*/, '');
    setInstructorCallout({ officerId: instructor?.id ?? null, troopIds: [], officerText: text, troopText: '' });
  }, [exerciseState, frame, locale, sessionMode]);
  const exercisePhase = exerciseState ? currentPhase(exerciseState) : null;
  const debrief =
    exerciseState?.completed && frame
      ? {
          timeTicks: Math.max(0, frame.tick - exerciseState.phaseStartedTick),
          ammo: frame.units
            .filter((unit) => unit.faction === 'column' && unit.squadId !== 99 && unit.alive)
            .reduce((sum, unit) => sum + unit.magazine + unit.reserve, 0),
          peakSuppression: Math.round(exerciseState.peakSuppression),
          alive: frame.units.filter(
            (unit) => unit.faction === 'column' && unit.squadId !== 99 && unit.alive && !unit.incapacitated,
          ).length,
          total: 11,
          stations: exerciseState.completedPhases.length,
        }
      : null;
  const exerciseMarkers = useMemo(
    () =>
      exercisePhase
        ? markersForPhase(exercisePhase).map((marker) => ({
            id: marker.id,
            x: marker.point.x,
            y: marker.point.y,
            kind: marker.kind,
            radius: marker.radius,
          }))
        : [],
    [exercisePhase],
  );

  return {
    exerciseProgress,
    setExerciseProgress,
    exerciseState,
    setExerciseState,
    exerciseObjectives,
    setExerciseObjectives,
    exerciseFeedback,
    setExerciseFeedback,
    trainingActions,
    setTrainingActions,
    recordTrainingAction,
    handleRetryPhase,
    exercisePhase,
    debrief,
    exerciseMarkers,
    instructorCallout,
  };
}
