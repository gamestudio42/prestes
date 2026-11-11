import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src';
import type { SimContext } from '../src/systems/context';
import { CAPTURE_TICKS, updateObjectives, type ObjectiveState } from '../src/systems/objectives';

// add-map-objectives 2.2: capture by presence, contest, decay, held without staying.
const AREA = [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }];

function setup(owner: ObjectiveState['owner'] = 'neutral') {
  const objective: ObjectiveState = { id: 1, owner, progress: { column: 0, legalist: 0 }, contested: false, value: 2, area: AREA };
  const man = (id: number, faction: 'column' | 'legalist', x: number) => ({ id, faction, x, y: 0, alive: true, incapacitated: false, routed: false, dummy: false });
  const ctx = { objectives: [objective], units: [man(1, 'column', 50), man(2, 'legalist', 60)] };
  const events: SimEvent[] = [];
  const run = (ticks: number) => {
    for (let tick = 0; tick < ticks; tick += 1) updateObjectives(ctx as unknown as SimContext, tick, events);
  };
  return { objective, column: ctx.units[0]!, legalist: ctx.units[1]!, events, run };
}

describe('objective capture', () => {
  it('taking the bridge: a side alone for 10 s takes it', () => {
    const { objective, column, events, run } = setup();
    column.x = 0;
    run(CAPTURE_TICKS - 1);
    expect(objective.owner).toBe('neutral');
    run(1);
    expect(objective.owner).toBe('column');
    expect(events.filter((event) => event.type === 'objective_taken')).toHaveLength(1);
  });

  it('contested: both sides inside freeze the progress', () => {
    const { objective, column, legalist, events, run } = setup();
    column.x = 0;
    run(40);
    legalist.x = 5;
    run(200);
    expect(objective.owner).toBe('neutral');
    expect(objective.contested).toBe(true);
    expect(objective.progress.column).toBe(40);
    expect(events.filter((event) => event.type === 'objective_contested')).toHaveLength(1);
  });

  it('held without staying: the owner keeps it after leaving; progress decays when empty', () => {
    const { objective, column, legalist, run } = setup();
    column.x = 0;
    run(CAPTURE_TICKS);
    column.x = 50;
    run(500);
    expect(objective.owner).toBe('column');
    legalist.x = 0;
    run(30);
    legalist.x = 60;
    run(10);
    expect(objective.progress.legalist).toBe(10);
    expect(objective.owner).toBe('column');
  });

  it('routed and incapacitated men do not count', () => {
    const { objective, column, run } = setup();
    column.x = 0;
    column.routed = true;
    run(CAPTURE_TICKS * 2);
    expect(objective.owner).toBe('neutral');
  });

  it('the test map battle carries its five objectives in the frame', () => {
    const engine = new SimulationEngine({ seed: 1924, scenario: 'battle3v3', battleMap: 'campo-de-provas' });
    expect(engine.frame().objectives?.map((objective) => objective.owner)).toEqual(['neutral', 'neutral', 'legalist', 'legalist', 'column']);
  });
});
