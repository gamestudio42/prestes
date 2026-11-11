import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../src';
import { knownEnemies } from '../src/systems/enemy-commander';

// add-map-objectives 2.4: the enemy commander plays the objectives: garrison
// the value-2+ ones it holds, attack the highest value it does not hold,
// retake one the player took within 60 s, and push in the last three minutes.
function battle(options: { fog?: boolean; timeLimitTicks?: number } = {}) {
  return new SimulationEngine({
    seed: 1922,
    scenario: 'battle3v3',
    sandbox: true,
    fog: options.fog ?? true,
    ...(options.timeLimitTicks === undefined ? {} : { timeLimitTicks: options.timeLimitTicks }),
  });
}

const centroid = (units: readonly { x: number; y: number }[]) => ({
  x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
  y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
});

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

function place(engine: SimulationEngine, squadId: number, faction: 'column' | 'legalist', x: number, y: number): void {
  const section = engine.units.filter((unit) => unit.faction === faction && unit.squadId === squadId);
  section.forEach((unit, index) => {
    unit.x = x + (index % 4) * 1.5;
    unit.y = y + Math.floor(index / 4) * 1.5;
    unit.targetX = unit.x;
    unit.targetY = unit.y;
  });
}

describe('the commander plays the objectives', () => {
  it('keeps one section on each objective of value 2 or more it holds', () => {
    const engine = battle();
    engine.runTicks(30);
    const guards = [...engine.battle.objectiveGuards.entries()];
    expect(guards).toHaveLength(1);
    const [squadId, objectiveId] = guards[0]!;
    expect(objectiveId).toBe(3);
    expect(engine.objectives.find((objective) => objective.id === objectiveId)!.value).toBeGreaterThanOrEqual(2);
    const section = engine.units.filter((unit) => unit.squadId === squadId);
    expect(section.every((unit) => unit.currentOrder === 'defend')).toBe(true);
    // The value-1 fire trench is not guarded: that section keeps to its plan.
    expect(guards.some(([, id]) => id === 4)).toBe(false);
  });

  it('retake: a section is sent to an objective the player took within 60 s', () => {
    const engine = battle();
    engine.runTicks(20);
    const church = engine.objectives.find((objective) => objective.id === 3)!;
    expect(church.owner).toBe('legalist');
    const flagged = engine.battle.objectiveGuards;
    // The player's first section walks onto the church (value 3) and takes it
    // before the section ordered to guard it arrives.
    place(engine, 1, 'column', church.flag.x, church.flag.y);
    let lostAt = -1;
    for (let tick = 0; tick < 250 && lostAt < 0; tick += 1) {
      const frame = engine.tick();
      if (frame.events.some((event) => event.type === 'objective_taken' && event.id === church.id && event.side === 'column')) {
        lostAt = frame.tick;
      }
    }
    expect(lostAt).toBeGreaterThan(0);
    expect(church.owner).toBe('column');
    const free = [11, 12, 13].filter((squadId) => !flagged.has(squadId));
    const before = new Map(free.map((squadId) => [squadId, centroid(engine.units.filter((unit) => unit.squadId === squadId))]));
    engine.runTicks(40);
    const sent = free.filter((squadId) => {
      const now = centroid(engine.units.filter((unit) => unit.squadId === squadId));
      return engine.battle.plans.get(squadId) === 'attack' && distance(now, church.flag) < distance(before.get(squadId)!, church.flag);
    });
    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect(engine.battle.retake).toBeNull();
  });

  it('last minutes: with less value it commits all but one section', () => {
    const engine = battle({ timeLimitTicks: 2400 });
    engine.runTicks(20);
    for (const objective of engine.objectives) {
      objective.owner = objective.id === 3 || objective.id === 4 ? 'legalist' : 'column';
    }
    engine.runTicks(570);
    const attackingEarly = [...engine.battle.plans.values()].filter((plan) => plan === 'attack').length;
    engine.runTicks(30);
    const attackingLate = [...engine.battle.plans.values()].filter((plan) => plan === 'attack').length;
    expect(attackingEarly).toBe(1);
    expect(attackingLate).toBe(2);
  });

  it('under fog it never targets a man its side does not know', () => {
    const engine = battle({ fog: true });
    for (let tick = 0; tick < 400; tick += 1) {
      engine.tick();
      const known = new Set(knownEnemies(engine, 'legalist', engine.tickCount).map((entry) => entry.unit.id));
      for (const unit of engine.units) {
        if (unit.faction !== 'legalist' || unit.targetId === null) continue;
        expect(known.has(unit.targetId), `tick ${engine.tickCount}: unit ${unit.id} targets unseen ${unit.targetId}`).toBe(true);
      }
    }
  });
});
