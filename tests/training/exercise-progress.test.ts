import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../../apps/game/src/training/exercise-progress-types';
import {
  defaultExerciseProgress,
  EXERCISE_PROGRESS_KEY,
  loadExerciseProgress,
  resetExerciseProgress,
  saveExerciseProgress,
} from '../../apps/game/src/training/exercise-progress';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('bootcamp exercise progress', () => {
  it('starts at phase 1', () => {
    expect(defaultExerciseProgress()).toEqual({
      phaseIndex: 0,
      completedPhases: [],
      completed: false,
      bestTimeTicks: 0,
    });
  });

  it('round-trips phase progress', () => {
    const storage = new MemoryStorage();
    saveExerciseProgress(storage, {
      phaseIndex: 2,
      completedPhases: ['assembly', 'assault'],
      completed: false,
      bestTimeTicks: 0,
    });
    expect(loadExerciseProgress(storage)).toEqual({
      phaseIndex: 2,
      completedPhases: ['assembly', 'assault'],
      completed: false,
      bestTimeTicks: 0,
    });
  });

  it('clamps and migrates malformed data safely', () => {
    const storage = new MemoryStorage();
    storage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify({ phaseIndex: 99, completedPhases: [1, 'assembly'] }));
    expect(loadExerciseProgress(storage)).toEqual({
      phaseIndex: 2,
      completedPhases: ['assembly'],
      completed: false,
      bestTimeTicks: 0,
    });
  });

  it('resets progress', () => {
    const storage = new MemoryStorage();
    saveExerciseProgress(storage, {
      phaseIndex: 2,
      completedPhases: ['assembly', 'assault'],
      completed: true,
      bestTimeTicks: 800,
    });
    expect(resetExerciseProgress(storage)).toEqual(defaultExerciseProgress());
    expect(loadExerciseProgress(storage)).toEqual(defaultExerciseProgress());
  });
});
