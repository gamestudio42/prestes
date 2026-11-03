import type { StorageLike } from './exercise-progress-types';

export const EXERCISE_PROGRESS_KEY = 'prestes.bootcamp.stations.v2';
/** Three-phase exercise progress (assembly, assault, hold). */
export const THREE_PHASE_PROGRESS_KEY = 'prestes.bootcamp.exercise.v1';
export const STATION_COUNT = 7;
const STATION_IDS = ['formation', 'fire', 'maneuver', 'defense', 'recon', 'wounded', 'final'];
/** assembly -> formation, assault -> fire, hold -> final. */
const THREE_PHASE_TO_STATION = [0, 1, 6];
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
    if (raw) {
      return parseProgress(raw, STATION_COUNT - 1) ?? defaultExerciseProgress();
    }
    const legacy = storage.getItem(THREE_PHASE_PROGRESS_KEY);
    if (legacy) {
      const old = parseProgress(legacy, 2);
      if (old) {
        return migrateThreePhase(old);
      }
    }
    return defaultExerciseProgress();
  } catch {
    return defaultExerciseProgress();
  }
}

/** Maps three-phase progress onto the matching station. */
export function migrateThreePhase(old: ExerciseProgress): ExerciseProgress {
  const phaseIndex = THREE_PHASE_TO_STATION[old.phaseIndex] ?? 0;
  return {
    phaseIndex,
    completedPhases: old.completed ? [...STATION_IDS] : STATION_IDS.slice(0, phaseIndex),
    completed: old.completed,
    bestTimeTicks: old.bestTimeTicks,
  };
}

function parseProgress(raw: string, maxIndex: number): ExerciseProgress | null {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const value = parsed as Partial<ExerciseProgress>;
  const phaseIndex = Number.isInteger(value.phaseIndex)
    ? Math.max(0, Math.min(maxIndex, value.phaseIndex as number))
    : 0;
  return {
    phaseIndex,
    completedPhases: Array.isArray(value.completedPhases)
      ? value.completedPhases.filter((id): id is string => typeof id === 'string')
      : [],
    completed: value.completed === true,
    bestTimeTicks:
      typeof value.bestTimeTicks === 'number' && value.bestTimeTicks > 0 ? value.bestTimeTicks : 0,
  };
}

export function saveExerciseProgress(storage: StorageLike | null, progress: ExerciseProgress): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
    // The v2 save replaces three-phase progress.
    storage.removeItem?.(THREE_PHASE_PROGRESS_KEY);
  } catch {
    // Storage can be unavailable; the session keeps in-memory progress.
  }
}

export function resetExerciseProgress(storage: StorageLike | null): ExerciseProgress {
  const progress = defaultExerciseProgress();
  saveExerciseProgress(storage, progress);
  return progress;
}
