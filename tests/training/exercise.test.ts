import { describe, expect, it } from 'vitest';
import { BOOTCAMP_EXERCISE, type BootcampExercise } from '../../packages/content/src';
import type { Frame, UnitSnapshot } from '../../packages/shared/src';
import {
  activeObjective,
  advanceExercise,
  currentPhase,
  objectivePlaceholders,
  retryPhase,
  startExercise,
  type ExerciseState,
} from '../../apps/game/src/training/exercise';
import { frame, officer, players, trainingEnemies } from './fixtures';

const at = (state: ExerciseState, phaseIndex: number, objectiveIndex = 0): ExerciseState => ({
  ...state,
  phaseIndex,
  objectiveIndex,
});

function run(state: ExerciseState, build: (tick: number) => Frame, ticks: number) {
  let current = state;
  let result = advanceExercise(current, build(0));
  current = result.state;
  const commands = [...result.commands];
  for (let tick = 1; tick <= ticks && !current.failed && !current.completed; tick += 1) {
    result = advanceExercise(current, build(tick));
    current = result.state;
    commands.push(...result.commands);
  }
  return { state: current, result, commands };
}

describe('bootcamp exercise director', () => {
  it('starts at station 1 with the first objective active', () => {
    const state = startExercise();
    expect(currentPhase(state).id).toBe('formation');
    const placeholders = objectivePlaceholders(currentPhase(state));
    expect(placeholders[0]?.active).toBe(true);
    expect(placeholders.slice(1).every((objective) => !objective.active && !objective.done)).toBe(true);
  });

  it('evaluates objectives in order: a later objective does not count early', () => {
    // Station 1, objective "select": soldiers already in the assembly zone do not
    // complete the later reach objective.
    const units = players(28, 4, 11);
    const result = advanceExercise(startExercise(), frame(1, units));
    expect(result.state.objectiveIndex).toBe(0);
    expect(result.objectives.find((objective) => objective.kind === 'reach')?.done).toBe(false);
  });

  it('advances to the next objective once the active one is met', () => {
    const units = players(0, 6, 11);
    const result = advanceExercise(startExercise(), frame(1, units), BOOTCAMP_EXERCISE, 1, {
      actions: new Set(['select']),
      selectedCount: 11,
    });
    expect(result.state.objectiveIndex).toBe(1);
    expect(result.objectives[0]?.done).toBe(true);
    expect(result.objectives[1]?.active).toBe(true);
  });

  it('sends the start command of an objective when it becomes active', () => {
    // Station 4 (defense): once defenders are in cover, the ambush starts and the
    // training troop is ordered to advance on the trench.
    const defense = BOOTCAMP_EXERCISE.phases.findIndex((phase) => phase.id === 'defense');
    const state = at(startExercise(), defense, 1);
    const defenders = players(52, -18, 4).map((unit) => ({ ...unit, order: 'defend', cover: 0.5 }) as UnitSnapshot);
    const result = advanceExercise(state, frame(1, [...defenders, ...trainingEnemies(3, 82, 10)]));
    expect(activeObjective(result.state)?.kind).toBe('ambush-trigger');
    expect(result.commands).toContainEqual(
      expect.objectContaining({ type: 'move', to: { x: 52, y: -18 } }),
    );
  });

  it('takes the instructor out when the cohesion objective starts', () => {
    const wounded = BOOTCAMP_EXERCISE.phases.findIndex((phase) => phase.id === 'wounded');
    const state = at(startExercise(), wounded, 1);
    const guards = players(28, 10, 4).map((unit) => ({ ...unit, order: 'protect-officer' }) as UnitSnapshot);
    const result = advanceExercise(state, frame(1, [...guards, officer(28, 12)]));
    expect(result.commands).toContainEqual({ type: 'incapacitate', targetId: 99 });
  });

  it('applies line failures only while the hold objective is active', () => {
    const final = BOOTCAMP_EXERCISE.phases.findIndex((phase) => phase.id === 'final');
    const empty = (tick: number) => frame(tick, [...players(0, 40, 5), officer(52, -8), ...trainingEnemies(3, 82, 10)]);
    const suppressing = run(at(startExercise(), final, 0), empty, 200);
    expect(suppressing.state.failed).toBe(false);
    const holding = run(at(startExercise(), final, 2), empty, 200);
    expect(holding.state.failed).toBe(true);
    expect(holding.state.failureReason).toBe('training.exercise.failure.line');
  });

  it('fails station 6 when cohesion collapses and retries the station', () => {
    const wounded = BOOTCAMP_EXERCISE.phases.findIndex((phase) => phase.id === 'wounded');
    const shaken = (tick: number) =>
      frame(tick, players(28, 4, 8).map((unit) => ({ ...unit, cohesion: 10 }) as UnitSnapshot));
    const failed = run(at(startExercise(), wounded, 2), shaken, 200);
    expect(failed.state.failureReason).toBe('training.exercise.failure.cohesion');
    const retry = retryPhase(failed.state);
    expect(retry.state.failed).toBe(false);
    expect(retry.state.objectiveIndex).toBe(0);
    expect(retry.state.phaseIndex).toBe(wounded);
    expect(retry.command).toMatchObject({ type: 'training_phase', setup: { phase: 'wounded', casualtyCount: 1 } });
  });

  it('moves to the next station with its setup command when the last objective is met', () => {
    const exercise: BootcampExercise = {
      id: 'bootcamp',
      phases: [BOOTCAMP_EXERCISE.phases[0]!, BOOTCAMP_EXERCISE.phases[1]!],
    };
    const state = at(startExercise(), 0, BOOTCAMP_EXERCISE.phases[0]!.objectives.length - 1);
    const result = advanceExercise(state, frame(50, players(28, 4, 6)), exercise);
    expect(result.phaseCompleted?.id).toBe('formation');
    expect(result.state.phaseIndex).toBe(1);
    expect(result.state.objectiveIndex).toBe(0);
    expect(result.commands).toContainEqual(
      expect.objectContaining({ type: 'training_phase', setup: expect.objectContaining({ phase: 'fire' }) }),
    );
  });

  it('completes the exercise after the final station', () => {
    const final = BOOTCAMP_EXERCISE.phases.length - 1;
    const hold = BOOTCAMP_EXERCISE.phases[final]!.objectives.length - 1;
    const holding = (tick: number) => frame(tick, [...players(52, -18, 5), officer(52, -10)]);
    const done = run(at(startExercise(), final, hold), holding, 700);
    expect(done.state.completed).toBe(true);
    expect(done.state.completedPhases).toContain('final');
  });
});
