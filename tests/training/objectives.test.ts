import { describe, expect, it } from 'vitest';
import type { ExerciseObjective, TrainingAction } from '../../packages/content/src';
import type { UnitSnapshot } from '../../packages/shared/src';
import {
  evaluateObjective,
  type ObjectiveInput,
  type ObjectiveMemory,
} from '../../apps/game/src/training/objectives';
import { frame, officer, players, trainingEnemies, unit } from './fixtures';

const NONE: ObjectiveInput = { actions: new Set(), selectedCount: 0 };

function objective(kind: ExerciseObjective['kind'], extra: Partial<ExerciseObjective> = {}): ExerciseObjective {
  return { id: `test-${kind}`, kind, labelKey: 'app.title', instructorKey: 'app.title', ...extra };
}

/** Evaluates one objective over a sequence of frames, one tick apart. */
function evaluate(
  target: ExerciseObjective,
  frames: UnitSnapshot[][],
  input: ObjectiveInput = NONE,
): { done: boolean; current: number; memory: ObjectiveMemory } {
  const memory: ObjectiveMemory = {};
  let result = { done: false, current: 0, target: 0 };
  frames.forEach((units, tick) => {
    result = evaluateObjective(target, frame(tick, units), memory, 1, input);
  });
  return { done: result.done, current: result.current, memory };
}

const section = (overrides: Partial<UnitSnapshot> = {}, count = 8, x = 0, y = 0) =>
  players(x, y, count).map((soldier) => ({ ...soldier, ...overrides }) as UnitSnapshot);
const actions = (...list: TrainingAction[]): ObjectiveInput => ({ actions: new Set(list), selectedCount: 11 });

describe('objective evaluators', () => {
  it('camera needs the requested number of distinct camera actions', () => {
    const goal = objective('camera', { count: 2 });
    expect(evaluate(goal, [section()], actions('camera-pan')).done).toBe(false);
    expect(evaluate(goal, [section()], actions('camera-pan', 'camera-zoom')).done).toBe(true);
  });

  it('select needs the action and the selection size', () => {
    const goal = objective('select', { minUnits: 11 });
    expect(evaluate(goal, [section()], { actions: new Set(['select']), selectedCount: 5 }).done).toBe(false);
    expect(evaluate(goal, [section()], actions('select')).done).toBe(true);
  });

  it('box-select needs a box selection', () => {
    expect(evaluate(objective('box-select'), [section()], actions('select')).done).toBe(false);
    expect(evaluate(objective('box-select'), [section()], actions('box-select')).done).toBe(true);
  });

  it('formation, stance and posture read the soldiers state, not the button', () => {
    expect(evaluate(objective('formation', { formation: 'wedge', minUnits: 8 }), [section({ formation: 'wedge' })]).done).toBe(true);
    expect(evaluate(objective('formation', { formation: 'wedge', minUnits: 8 }), [section({ formation: 'wedge' }, 7)]).done).toBe(false);
    expect(evaluate(objective('stance', { stance: 'prone', minUnits: 8 }), [section({ stance: 'prone' })]).done).toBe(true);
    expect(evaluate(objective('posture', { posture: 'aggressive', minUnits: 8 }), [section({ posture: 'aggressive' } as Partial<UnitSnapshot>)]).done).toBe(true);
  });

  it('reach counts soldiers inside the zone', () => {
    const goal = objective('reach', { point: { x: 0, y: 0 }, radius: 10, minUnits: 5 });
    expect(evaluate(goal, [section({}, 5, 50, 50)]).done).toBe(false);
    expect(evaluate(goal, [section({}, 5)]).done).toBe(true);
  });

  it('order counts soldiers carrying the order', () => {
    const goal = objective('order', { order: 'disperse', minUnits: 6 });
    expect(evaluate(goal, [section({ order: 'disperse' }, 5)]).done).toBe(false);
    expect(evaluate(goal, [section({ order: 'disperse' }, 6)]).done).toBe(true);
  });

  it('order with an action needs the HUD action, not only the order state', () => {
    const goal = objective('order', { order: 'hold', minUnits: 4, action: 'hold' });
    expect(evaluate(goal, [section({ order: 'hold' }, 4)]).done).toBe(false);
    expect(evaluate(goal, [section({ order: 'hold' }, 4)], actions('hold')).done).toBe(true);
  });

  it('target-hit needs the training troop to lose health after it appeared', () => {
    const goal = objective('target-hit');
    const healthy = trainingEnemies(3);
    const hit = healthy.map((enemy, index) => (index === 0 ? { ...enemy, hp: 70 } : enemy));
    expect(evaluate(goal, [[...section()], [...section(), ...healthy]]).done).toBe(false);
    expect(evaluate(goal, [[...section(), ...healthy], [...section(), ...hit]]).done).toBe(true);
  });

  it('suppress needs the enemies suppressed for the configured ticks', () => {
    const goal = objective('suppress', { count: 2, ticks: 3 });
    const pinned = trainingEnemies(2, 60, -18, true);
    expect(evaluate(goal, [pinned, pinned]).done).toBe(false);
    expect(evaluate(goal, [pinned, pinned, pinned]).done).toBe(true);
  });

  it('hold-fire needs enough soldiers holding fire for the ticks', () => {
    const goal = objective('hold-fire', { minUnits: 8, ticks: 2 });
    const silent = section({ holdFire: true } as Partial<UnitSnapshot>);
    const few = section({ holdFire: true } as Partial<UnitSnapshot>, 7);
    expect(evaluate(goal, [few, few]).done).toBe(false);
    expect(evaluate(goal, [silent, silent]).done).toBe(true);
  });

  it('facing counts soldiers turned toward the marker', () => {
    const goal = objective('facing', { point: { x: 0, y: 40 }, minUnits: 8, threshold: 30 });
    expect(evaluate(goal, [section({ facingX: 0, facingY: -1 })]).done).toBe(false);
    expect(evaluate(goal, [section({ facingX: 0, facingY: 1 })]).done).toBe(true);
  });

  it('flank-position needs flankers at the target side, not just the order', () => {
    const goal = objective('flank-position', { minUnits: 2, threshold: 50 });
    const enemies = trainingEnemies(2, 0, -30);
    const start = [...section({ order: 'flank' }, 8, 0, 0), ...enemies];
    const sent = [...section({ order: 'flank' }, 6, 0, 0), unit(30, 0, 0, { order: 'flank' }), unit(31, 1, 0, { order: 'flank' }), ...enemies];
    // The flank order has ended on arrival: they still count as flankers.
    const side = [...section({}, 6, 0, 0), unit(30, 25, -30), unit(31, 25, -28), ...enemies];
    const wanderers = [...section({}, 6, 0, 0), unit(30, 25, -30), unit(31, 25, -28), ...enemies];
    expect(evaluate(goal, [start, start]).done).toBe(false);
    expect(evaluate(goal, [sent, side]).done).toBe(true);
    // Soldiers who reach the side without a flank order do not count.
    expect(evaluate(goal, [start.map((soldier) => ({ ...soldier, order: null })), wanderers]).done).toBe(false);
  });

  it('bounding-advance needs alternating teams on the way to the line', () => {
    const goal = objective('bounding-advance', { point: { x: 0, y: 0 }, radius: 8, minUnits: 5 });
    expect(evaluate(goal, [section({}, 5)]).done).toBe(false);
    expect(evaluate(goal, [section({ boundTeam: 'a' } as Partial<UnitSnapshot>, 5, 30, 30), section({}, 5)]).done).toBe(true);
  });

  it('withdraw-out needs a withdraw order and an empty danger zone', () => {
    const goal = objective('withdraw-out', { point: { x: 0, y: 0 }, radius: 8, minUnits: 4 });
    expect(evaluate(goal, [section({}, 5, 40, 40)]).done).toBe(false);
    expect(evaluate(goal, [section({ order: 'withdraw' }, 5, 0, 0), section({}, 5, 40, 40)]).done).toBe(true);
    // Three out and two pinned inside is not yet enough for four.
    const mixed = [...section({}, 3, 40, 40), ...section({}, 2, 0, 0).map((soldier, index) => ({ ...soldier, id: 50 + index }))];
    expect(evaluate(goal, [section({ order: 'withdraw' }, 5, 0, 0), mixed]).done).toBe(false);
  });

  it('defend-in-cover counts defenders in cover inside the area', () => {
    const goal = objective('defend-in-cover', { point: { x: 0, y: 0 }, radius: 9, minUnits: 4, threshold: 0.25 });
    expect(evaluate(goal, [section({ order: 'defend', cover: 0.1 }, 4)]).done).toBe(false);
    expect(evaluate(goal, [section({ order: 'defend', cover: 0.5 }, 4)]).done).toBe(true);
  });

  it('ambush-trigger needs the ambush set and then an enemy struck', () => {
    const goal = objective('ambush-trigger', { minUnits: 4 });
    const set = [...section({ order: 'ambush' }, 4), ...trainingEnemies(2)];
    const struck = [...section({ order: 'defend' }, 4), ...trainingEnemies(2, 60, -18, true)];
    expect(evaluate(goal, [struck]).done).toBe(false);
    expect(evaluate(goal, [set, struck]).done).toBe(true);
  });

  it('secure and hold track the line', () => {
    const secure = objective('secure', { point: { x: 0, y: 0 }, radius: 9, minUnits: 3 });
    const inLine = section({}, 3);
    expect(evaluate(secure, Array.from({ length: 20 }, () => inLine)).done).toBe(true);
    expect(evaluate(secure, Array.from({ length: 20 }, () => [...inLine, ...trainingEnemies(1, 0, 0)])).done).toBe(false);
    const hold = objective('hold', { point: { x: 0, y: 0 }, radius: 9, minUnits: 3, ticks: 5 });
    expect(evaluate(hold, Array.from({ length: 5 }, () => inLine)).done).toBe(true);
  });

  it('recon-report needs a reported contact', () => {
    expect(evaluate(objective('recon-report'), [section()]).done).toBe(false);
    expect(evaluate(objective('recon-report'), [section({ reconContacts: 2 })]).done).toBe(true);
  });

  it('pursue needs a pursuer within range of its target', () => {
    const goal = objective('pursue', { threshold: 15 });
    const enemy = trainingEnemies(1, 0, -30);
    expect(evaluate(goal, [[unit(1, 0, 0, { order: 'pursue', targetId: 20 }), ...enemy]]).done).toBe(false);
    expect(evaluate(goal, [[unit(1, 0, -20, { order: 'pursue', targetId: 20 }), ...enemy]]).done).toBe(true);
    // Bringing the pursued target down also completes the pursuit.
    expect(evaluate(goal, [[unit(1, 0, 0, { order: 'pursue', targetId: 20 }), ...enemy], [unit(1, 0, 0, { order: 'hold' })]]).done).toBe(true);
    // A target that was never pursued does not count.
    expect(evaluate(goal, [[unit(1, 0, 0), ...enemy], [unit(1, 0, 0)]]).done).toBe(false);
  });

  it('regroup needs the order and a closed section', () => {
    const goal = objective('regroup', { radius: 8, minUnits: 5 });
    const spread = Array.from({ length: 5 }, (_, index) => unit(index + 1, index * 20, 0, { order: 'regroup' }));
    expect(evaluate(goal, [spread]).done).toBe(false);
    expect(evaluate(goal, [section({ order: 'regroup' }, 5)]).done).toBe(true);
  });

  it('rescue-complete needs the casualty evacuated', () => {
    const goal = objective('rescue-complete');
    const down = [...section({}, 4), unit(9, 0, 0, { incapacitated: true, soldierState: 'incapacitated' })];
    const evacuated = [...section({}, 4), unit(9, 0, 0, { alive: false, soldierState: 'recovering' })];
    expect(evaluate(goal, [down]).done).toBe(false);
    expect(evaluate(goal, [down, evacuated]).done).toBe(true);
  });

  it('protect-officer counts guards near the instructor', () => {
    const goal = objective('protect-officer', { radius: 10, minUnits: 4 });
    expect(evaluate(goal, [[...section({ order: 'protect-officer' }, 4, 40, 40), officer(0, 0)]]).done).toBe(false);
    expect(evaluate(goal, [[...section({ order: 'protect-officer' }, 4), officer(0, 0)]]).done).toBe(true);
  });

  it('cohesion-hold needs average cohesion over the threshold for the ticks', () => {
    const goal = objective('cohesion-hold', { threshold: 40, ticks: 3 });
    const low = section({ cohesion: 30 });
    const high = section({ cohesion: 60 });
    expect(evaluate(goal, [high, high, low]).done).toBe(false);
    expect(evaluate(goal, [high, high, high]).done).toBe(true);
  });
});
