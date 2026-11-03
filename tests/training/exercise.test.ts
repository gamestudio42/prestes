import { describe, expect, it } from 'vitest';
import { BOOTCAMP_EXERCISE } from '../../packages/content/src';
import type { Frame, UnitSnapshot } from '../../packages/shared/src';
import {
  advanceExercise,
  currentPhase,
  objectivePlaceholders,
  retryPhase,
  startExercise,
  type ExerciseState,
} from '../../apps/game/src/training/exercise';

function unit(
  id: number,
  x: number,
  y: number,
  overrides: Partial<UnitSnapshot> = {},
): UnitSnapshot {
  return {
    id,
    x,
    y,
    facingX: 0,
    facingY: -1,
    kind: 'infantry',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
    hp: 100,
    weaponId: 'mauser-7mm',
    magazine: 5,
    reserve: 15,
    morale: 100,
    alive: true,
    suppressed: false,
    suppression: 0,
    cohesion: 100,
    fatigue: 0,
    formation: 'line',
    soldierState: 'idle',
    incapacitated: false,
    rescueTargetId: null,
    rescueProgress: 0,
    reconContacts: 0,
    rescueQueueLength: 0,
    wound: 'none',
    state: 'steady',
    routed: false,
    dummy: false,
    cover: 0,
    order: null,
    targetId: null,
    ...overrides,
  } as UnitSnapshot;
}

function frame(tick: number, units: UnitSnapshot[]): Frame {
  return {
    tick,
    units,
    orders: [],
    covers: [],
    events: [],
    outcome: 'playing',
    hash: 'test',
  };
}

function players(x: number, y: number, count = 5): UnitSnapshot[] {
  return Array.from({ length: count }, (_, index) =>
    unit(index + 1, x + index * 0.5, y),
  );
}

function officer(x = 52, y = -8, overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return unit(99, x, y, {
    kind: 'officer',
    squadId: 99,
    ...overrides,
  } as Partial<UnitSnapshot>);
}

function trainingEnemies(count: number, x = 60, y = -18, suppressed = false): UnitSnapshot[] {
  return Array.from({ length: count }, (_, index) =>
    unit(20 + index, x + index, y, {
      faction: 'target',
      role: 'training-enemy',
      nonLethal: true,
      squadId: 10,
      suppressed,
      suppression: suppressed ? 60 : 0,
    } as Partial<UnitSnapshot>),
  );
}

function run(
  state: ExerciseState,
  build: (tick: number) => Frame,
  ticks: number,
): { state: ExerciseState; frames: Frame[]; result: ReturnType<typeof advanceExercise> } {
  let current = state;
  let result = advanceExercise(current, build(0));
  const frames = [build(0)];
  for (let tick = 1; tick <= ticks; tick += 1) {
    const nextFrame = build(tick);
    frames.push(nextFrame);
    result = advanceExercise(current, nextFrame);
    current = result.state;
  }
  return { state: current, frames, result };
}

describe('bootcamp exercise director', () => {
  it('starts at assembly and advances to assault when the zone is reached', () => {
    const initial = startExercise();
    const result = advanceExercise(
      initial,
      frame(1, [...players(28, 4), officer()]),
    );
    expect(result.phaseCompleted?.id).toBe('assembly');
    expect(result.state.phaseIndex).toBe(1);
    expect(result.state.completedPhases).toEqual(['assembly']);
    expect(result.commands[0]?.type).toBe('training_phase');
    expect(currentPhase(result.state).id).toBe('assault');
  });

  it('completes assault after suppression and securing the line', () => {
    const assault: ExerciseState = {
      ...startExercise(),
      phaseIndex: 1,
      completedPhases: ['assembly'],
    };
    const result = run(
      assault,
      (tick) => frame(tick, [...players(52, -18, 3), officer(), ...trainingEnemies(2, 62, -18, true)]),
      30,
    );
    expect(result.state.phaseIndex).toBe(2);
    expect(result.state.completedPhases).toContain('assault');
    expect(currentPhase(result.state).id).toBe('hold');
  });

  it('completes hold after the timer with the officer protected', () => {
    const hold: ExerciseState = {
      ...startExercise(),
      phaseIndex: 2,
      completedPhases: ['assembly', 'assault'],
    };
    const result = run(
      hold,
      (tick) => frame(tick, [...players(52, -18, 3), officer(), ...trainingEnemies(2, 72, 10)]),
      610,
    );
    expect(result.result.exerciseCompleted).toBe(true);
    expect(result.state.completed).toBe(true);
    expect(result.state.completedPhases).toContain('hold');
  });

  it('fails the hold when the line is empty and can retry the phase', () => {
    const hold: ExerciseState = {
      ...startExercise(),
      phaseIndex: 2,
      completedPhases: ['assembly', 'assault'],
    };
    const result = run(
      hold,
      (tick) => frame(tick, [...players(20, 4, 3), officer(), ...trainingEnemies(2, 72, 10)]),
      100,
    );
    expect(result.state.failed).toBe(true);
    expect(result.state.failureReason).toBe('training.exercise.failure.line');
    const retry = retryPhase(result.state);
    expect(retry.state.failed).toBe(false);
    expect(retry.command.type).toBe('training_phase');
    expect(currentPhase(retry.state).id).toBe('hold');
  });

  it('builds phase placeholders with the right target values', () => {
    const placeholders = objectivePlaceholders(BOOTCAMP_EXERCISE.phases[2]!);
    expect(placeholders.map((objective) => objective.id)).toEqual(['hold-line', 'hold-officer']);
    expect(placeholders[0]?.target).toBe(600);
  });
});


