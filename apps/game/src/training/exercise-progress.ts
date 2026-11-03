import type { StorageLike } from './exercise-progress-types';

export const EXERCISE_PROGRESS_KEY = 'prestes.bootcamp.exercise.v1';
export const LEGACY_BOOTCAMP_KEY = 'prestes.bootcamp.steps.v1';

export interface ExerciseProgress {
  phaseIndex: number;
  completedPhases: string[];
  completed: boolean;
  bestTimeTicks: number;
}

export function defaultExerciseProgress(): ExerciseProgress {
  return { phaseIndex: 0, completedPhases: [], completed: false, bestTimeTicks: 0 };
}

export function loadExerciseProgress(storage: StorageLike | null): ExerciseProgress {
  if (!storage) {
    return defaultExerciseProgress();
  }
  try {
    const raw = storage.getItem(EXERCISE_PROGRESS_KEY);
    if (!raw) {
      return defaultExerciseProgress();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return defaultExerciseProgress();
    }
    const value = parsed as Partial<ExerciseProgress>;
    const phaseIndex = Number.isInteger(value.phaseIndex)
      ? Math.max(0, Math.min(2, value.phaseIndex as number))
      : 0;
    return {
      phaseIndex,
      completedPhases: Array.isArray(value.completedPhases)
        ? value.completedPhases.filter((id): id is string => typeof id === 'string')
        : [],
      completed: value.completed === true,
      bestTimeTicks:
        typeof value.bestTimeTicks === 'number' && value.bestTimeTicks > 0
          ? value.bestTimeTicks
          : 0,
    };
  } catch {
    return defaultExerciseProgress();
  }
}

export function saveExerciseProgress(storage: StorageLike | null, progress: ExerciseProgress): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be unavailable; the session keeps in-memory progress.
  }
}

export function resetExerciseProgress(storage: StorageLike | null): ExerciseProgress {
  const progress = defaultExerciseProgress();
  saveExerciseProgress(storage, progress);
  return progress;
}
