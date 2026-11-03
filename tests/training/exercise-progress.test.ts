import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../../apps/game/src/training/exercise-progress-types';
import {
  defaultExerciseProgress,
  EXERCISE_PROGRESS_KEY,
  LEGACY_BOOTCAMP_KEY,
  THREE_PHASE_PROGRESS_KEY,
  loadExerciseProgress,
  resetExerciseProgress,
  saveExerciseProgress,
} from '../../apps/game/src/training/exercise-progress';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const threePhase = (phaseIndex: number, completed = false) =>
  JSON.stringify({ phaseIndex, completedPhases: [], completed, bestTimeTicks: 700 });

describe('bootcamp exercise progress', () => {
  it('starts at station 1', () => {
    expect(defaultExerciseProgress()).toEqual({
      phaseIndex: 0,
      completedPhases: [],
      completed: false,
      bestTimeTicks: 0,
    });
  });

  it('round-trips station progress', () => {
    const storage = new MemoryStorage();
    const progress = { phaseIndex: 4, completedPhases: ['formation', 'fire', 'maneuver', 'defense'], completed: false, bestTimeTicks: 0 };
    saveExerciseProgress(storage, progress);
    expect(loadExerciseProgress(storage)).toEqual(progress);
  });

  it('clamps malformed data to the seven stations', () => {
    const storage = new MemoryStorage();
    storage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify({ phaseIndex: 99, completedPhases: [1, 'formation'] }));
    expect(loadExerciseProgress(storage)).toEqual({
      phaseIndex: 6,
      completedPhases: ['formation'],
      completed: false,
      bestTimeTicks: 0,
    });
  });

  it('migrates three-phase progress to the matching station', () => {
    for (const [phase, station] of [[0, 0], [1, 1], [2, 6]] as const) {
      const storage = new MemoryStorage();
      storage.setItem(THREE_PHASE_PROGRESS_KEY, threePhase(phase));
      const progress = loadExerciseProgress(storage);
      expect(progress.phaseIndex).toBe(station);
      expect(progress.completedPhases).toHaveLength(station);
      expect(progress.bestTimeTicks).toBe(700);
    }
  });

  it('keeps a completed three-phase exercise completed', () => {
    const storage = new MemoryStorage();
    storage.setItem(THREE_PHASE_PROGRESS_KEY, threePhase(2, true));
    const progress = loadExerciseProgress(storage);
    expect(progress.completed).toBe(true);
    expect(progress.completedPhases).toHaveLength(7);
  });

  it('replaces three-phase progress on the first station save', () => {
    const storage = new MemoryStorage();
    storage.setItem(THREE_PHASE_PROGRESS_KEY, threePhase(1));
    saveExerciseProgress(storage, loadExerciseProgress(storage));
    expect(storage.getItem(THREE_PHASE_PROGRESS_KEY)).toBeNull();
    expect(loadExerciseProgress(storage).phaseIndex).toBe(1);
  });

  it('starts legacy 27-step progress at station 1 and leaves it untouched', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_BOOTCAMP_KEY, JSON.stringify({ step: 12 }));
    expect(loadExerciseProgress(storage)).toEqual(defaultExerciseProgress());
    expect(storage.getItem(LEGACY_BOOTCAMP_KEY)).not.toBeNull();
  });

  it('resets progress', () => {
    const storage = new MemoryStorage();
    saveExerciseProgress(storage, { phaseIndex: 6, completedPhases: [], completed: true, bestTimeTicks: 800 });
    expect(resetExerciseProgress(storage)).toEqual(defaultExerciseProgress());
    expect(loadExerciseProgress(storage)).toEqual(defaultExerciseProgress());
  });
});
