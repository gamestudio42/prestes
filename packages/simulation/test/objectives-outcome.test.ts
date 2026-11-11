import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src';
import type { SimContext } from '../src/systems/context';
import { updateOutcome } from '../src/systems/combat';
import { ALL_HELD_TICKS, type ObjectiveState } from '../src/systems/objectives';

// add-map-objectives 2.3: the clock, the outcome order and how a battle was
// decided (time limit by objective value, all objectives held, draw).
const AREA = [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }];

function objective(id: number, owner: ObjectiveState['owner'], value: number): ObjectiveState {
  return { id, owner, progress: { column: 0, legalist: 0 }, contested: false, value, area: AREA };
}

function setup(objectives: ObjectiveState[], timeLimitTicks: number) {
  const man = (faction: 'column' | 'legalist') => ({ faction, alive: true, routed: false, incapacitated: false });
  const ctx = {
    scenario: 'battle3v3',
    opposition: true,
    outcome: 'playing',
    units: [man('column'), man('legalist')],
    objectives,
    battle: { fellBack: new Set<'column' | 'legalist'>() },
    allHeldSince: { column: null, legalist: null } as { column: number | null; legalist: number | null },
    battleStartTick: 0,
    timeLimitTicks,
  };
  const events: SimEvent[] = [];
  let tick = 0;
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) {
      tick += 1;
      updateOutcome(ctx as unknown as SimContext, tick, events);
    }
  };
  const outcomeEvent = () => events.find((event) => event.type === 'outcome');
  return { ctx, events, run, outcomeEvent };
}

describe('battle clock and outcome', () => {
  it('time runs out: the side holding more value wins on objectives', () => {
    const { ctx, run, outcomeEvent } = setup(
      [objective(1, 'column', 2), objective(2, 'column', 2), objective(3, 'legalist', 3)],
      300,
    );
    run(299);
    expect(ctx.outcome).toBe('playing');
    run(1);
    expect(ctx.outcome).toBe('victory');
    expect(outcomeEvent()).toMatchObject({ type: 'outcome', tick: 300, outcome: 'victory', decidedBy: 'objectives' });
    expect(outcomeEvent()).toMatchObject({ values: { column: 4, legalist: 3 } });
  });

  it('all objectives held: two continuous minutes end the battle before the limit', () => {
    const { ctx, run, outcomeEvent } = setup(
      [objective(1, 'column', 1), objective(2, 'column', 2)],
      ALL_HELD_TICKS * 2,
    );
    run(ALL_HELD_TICKS - 1);
    expect(ctx.outcome).toBe('playing');
    run(1);
    expect(ctx.outcome).toBe('victory');
    expect(outcomeEvent()).toMatchObject({ decidedBy: 'all-objectives', tick: ALL_HELD_TICKS });
  });

  it('all objectives held: losing one restarts the two minutes', () => {
    const { ctx, run } = setup([objective(1, 'column', 1), objective(2, 'column', 2)], ALL_HELD_TICKS * 3);
    run(ALL_HELD_TICKS - 1);
    ctx.objectives[1]!.owner = 'neutral';
    run(1);
    expect(ctx.allHeldSince.column).toBeNull();
    expect(ctx.outcome).toBe('playing');
  });

  it('draw: equal value at the limit is a draw', () => {
    const { ctx, run, outcomeEvent } = setup([objective(1, 'column', 2), objective(2, 'legalist', 2)], 300);
    run(300);
    expect(ctx.outcome).toBe('draw');
    expect(outcomeEvent()).toMatchObject({ outcome: 'draw', decidedBy: 'draw', values: { column: 2, legalist: 2 } });
  });

  it('a side that fell back reports broken', () => {
    const { ctx, run, outcomeEvent } = setup([objective(1, 'neutral', 2)], 12000);
    ctx.battle.fellBack.add('legalist');
    run(1);
    expect(ctx.outcome).toBe('victory');
    expect(outcomeEvent()).toMatchObject({ decidedBy: 'broken' });
  });

  it('a map without objectives keeps the annihilation rule and no clock', () => {
    const { ctx, run, outcomeEvent } = setup([], 1);
    run(5);
    expect(ctx.outcome).toBe('playing');
    ctx.units[1]!.alive = false;
    run(1);
    expect(ctx.outcome).toBe('victory');
    expect(outcomeEvent()).toMatchObject({ outcome: 'victory', decidedBy: 'annihilation' });
    expect(outcomeEvent()).not.toHaveProperty('values');
  });

  it('the frame carries the clock of a battle with objectives', () => {
    const engine = new SimulationEngine({
      seed: 1924,
      scenario: 'battle3v3',
      battleMap: 'campo-de-provas',
      timeLimitTicks: 9000,
    });
    expect(engine.frame().clock).toEqual({ tick: 0, limit: 9000 });
    engine.runTicks(5);
    expect(engine.frame().clock).toEqual({ tick: 5, limit: 9000 });
  });
});
