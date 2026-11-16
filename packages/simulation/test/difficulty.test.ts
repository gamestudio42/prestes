import { describe, expect, it } from 'vitest';
import { DIFFICULTY_FACTORS, type Difficulty, type SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { areaHitChance } from '../src/systems/combat';
import { commanderEvery } from '../src/systems/enemy-commander';
import { openField } from './open-field';

// add-difficulty-levels 1.2-1.6: the level in the simulation.

function battle(difficulty?: Difficulty, seed = 1922) {
  return new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, fog: true, ...(difficulty ? { difficulty } : {}) });
}

const LEVELS: readonly Difficulty[] = ['historia', 'soldado', 'oficial'];

describe('the level of a battle (1.2)', () => {
  it('Default level: a battle started without one is fought at Soldado', () => {
    const engine = battle();
    expect(engine.difficulty).toBe('soldado');
    expect(engine.factors).toEqual(DIFFICULTY_FACTORS.soldado);
    expect(engine.frame().difficulty).toBe('soldado');
  });

  it('Level in the hash: the same battle hashes differently at História and Oficial', () => {
    expect(battle('historia').hashState()).not.toBe(battle('oficial').hashState());
  });

  it('Same level, same hash: two runs at Oficial agree on every tick', () => {
    const left = battle('oficial', 7);
    const right = battle('oficial', 7);
    for (let tick = 0; tick < 300; tick += 1) {
      expect(left.tick().hash).toBe(right.tick().hash);
    }
  });

  it('the level comes through the worker host and rides the frame', async () => {
    const { createSimulationHost } = await import('../src');
    const posted: unknown[] = [];
    const host = createSimulationHost(
      (seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters, deployment, timeLimitTicks, playtest, difficulty) =>
        new SimulationEngine({ seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters, deployment, timeLimitTicks, playtest, difficulty }),
      { postMessage: (message) => posted.push(message) },
    );
    host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', difficulty: 'oficial' });
    expect((posted[0] as { frame: { difficulty?: Difficulty } }).frame.difficulty).toBe('oficial');
  });
});

/** A legalist rifle section firing at a Column section that holds its fire, `gap` metres apart. */
function duel(difficulty: Difficulty, gap = 70) {
  const engine = new SimulationEngine({
    seed: 1922,
    scenario: 'battle3v3',
    battleMap: openField('large'),
    fog: false,
    difficulty,
    rosters: { column: { sections: ['esquadra-4'] }, legalist: { sections: ['infantaria-exercito'] } },
  });
  const place = (faction: 'column' | 'legalist', y: number, facingY: number) => {
    engine.units
      .filter((unit) => unit.faction === faction)
      .forEach((unit, index) => {
        unit.x = -80 + index * 2.5;
        unit.y = y;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        unit.facingX = 0;
        unit.facingY = facingY;
      });
  };
  place('column', 40, -1);
  place('legalist', 40 - gap, 1);
  for (const unit of engine.units) if (unit.faction === 'column') unit.holdFire = true;
  return engine;
}

describe('enemy aim follows the level (1.3)', () => {
  it('the same shot is less likely to hit at História than at Soldado, and at Soldado than at Oficial', () => {
    const chances = LEVELS.map((level) => {
      const engine = duel(level);
      const shooter = engine.units.find((unit) => unit.faction === 'legalist')!;
      const target = engine.units.find((unit) => unit.faction === 'column')!;
      return areaHitChance(engine, shooter, target, 0);
    });
    expect(chances[0]).toBeLessThan(chances[1]!);
    expect(chances[1]).toBeLessThan(chances[2]!);
  });

  it('the Column’s own aim does not depend on the level', () => {
    const chances = LEVELS.map((level) => {
      const engine = duel(level);
      const shooter = engine.units.find((unit) => unit.faction === 'column')!;
      const target = engine.units.find((unit) => unit.faction === 'legalist')!;
      return areaHitChance(engine, shooter, target, 0);
    });
    expect(new Set(chances).size).toBe(1);
  });

  it('over a firefight the enemy lands fewer of its aimed rounds at História than at Oficial', () => {
    const share = (level: Difficulty) => {
      const engine = duel(level);
      const legalists = new Set(engine.units.filter((unit) => unit.faction === 'legalist').map((unit) => unit.id));
      const shots: Extract<SimEvent, { type: 'shot' }>[] = [];
      for (let tick = 0; tick < 900 && shots.length < 60; tick += 1) {
        for (const event of engine.tick().events) if (event.type === 'shot' && legalists.has(event.source)) shots.push(event);
      }
      expect(shots.length).toBeGreaterThanOrEqual(20);
      return shots.filter((shot) => shot.hit).length / shots.length;
    };
    expect(share('historia')).toBeLessThan(share('oficial'));
  });
});

describe('the enemy commander follows the level (1.4)', () => {
  it('reviews the field less often at História and more often at Oficial', () => {
    expect(commanderEvery(battle('historia'))).toBeGreaterThan(commanderEvery(battle('soldado')));
    expect(commanderEvery(battle('soldado'))).toBeGreaterThan(commanderEvery(battle('oficial')));
  });

  it('Commander counterattacks sooner at Oficial: at a 1.4 ratio it attacks at Oficial and holds at Soldado', () => {
    const attacking = (level: Difficulty) => {
      const engine = battle(level);
      engine.runTicks(1);
      // The player has lost ten men the enemy saw fall: 33 legalists against 23.
      const column = engine.units.filter((unit) => unit.faction === 'column');
      for (const unit of column.slice(0, 10)) {
        unit.alive = false;
        unit.soldierState = 'dead';
        engine.battle.seenDown.legalist.add(unit.id);
      }
      engine.runTicks(60);
      return [...engine.battle.plans.values()].filter((plan) => plan === 'attack').length;
    };
    const ratio = 33 / 23;
    expect(ratio).toBeGreaterThan(DIFFICULTY_FACTORS.oficial.commanderAdvantage);
    expect(ratio).toBeLessThan(DIFFICULTY_FACTORS.soldado.commanderAdvantage);
    expect(attacking('oficial')).toBeGreaterThan(attacking('soldado'));
  });

  it('never sends a section to retake an objective at História', () => {
    const engine = battle('historia');
    engine.runTicks(20);
    const church = engine.objectives.find((objective) => objective.id === 3)!;
    engine.battle.retake = { objectiveId: church.id, tick: engine.tickCount };
    church.owner = 'column';
    engine.runTicks(40);
    expect(engine.battle.retake).toBeNull();
    const sent = [...engine.units]
      .filter((unit) => unit.faction === 'legalist' && unit.currentOrder === 'advance' && unit.orderDestination)
      .filter((unit) => Math.hypot(unit.orderDestination!.x - church.flag.x, unit.orderDestination!.y - church.flag.y) < 1);
    expect(sent).toHaveLength(0);
  });
});

describe('the player’s morale follows the level (1.5)', () => {
  it('Morale holds better at História: the same officer loss shakes a man less than at Oficial', () => {
    const after = (level: Difficulty) => {
      const engine = duel(level);
      const officer = engine.units.find((unit) => unit.faction === 'column')!;
      const man = engine.units.find((unit) => unit.faction === 'column' && unit.id !== officer.id)!;
      officer.kind = 'officer';
      officer.alive = false;
      officer.soldierState = 'dead';
      man.morale = 80;
      for (const unit of engine.units) if (unit.faction === 'legalist') unit.holdFire = true;
      engine.tick();
      return man.morale;
    };
    expect(after('historia')).toBeGreaterThan(after('oficial'));
  });

  it('rallies faster at História than at Oficial, and the enemy rallies alike at every level', () => {
    const rally = (level: Difficulty, faction: 'column' | 'legalist') => {
      const engine = duel(level, 300);
      for (const unit of engine.units) unit.holdFire = true;
      const man = engine.units.find((unit) => unit.faction === faction)!;
      man.morale = 40;
      engine.runTicks(100);
      return man.morale;
    };
    expect(rally('historia', 'column')).toBeGreaterThan(rally('oficial', 'column'));
    expect(rally('historia', 'legalist')).toBeCloseTo(rally('oficial', 'legalist'), 5);
  });
});

describe('ammunition at Oficial (1.6)', () => {
  const reserves = (level: Difficulty, faction: 'column' | 'legalist') => {
    const engine = new SimulationEngine({
      seed: 1,
      scenario: 'battle3v3',
      battleMap: openField(),
      difficulty: level,
      rosters: { column: { sections: ['fuzileiros'] }, legalist: { sections: ['infantaria-exercito'] } },
    });
    return engine.units.filter((unit) => unit.faction === faction).map((unit) => ({ magazine: unit.magazine, reserve: unit.reserve }));
  };

  it('Reduced reserve: a Column rifleman with 45 rounds in reserve at Soldado carries 27 at Oficial, with a full magazine', () => {
    const soldado = reserves('soldado', 'column');
    const oficial = reserves('oficial', 'column');
    const rifleman = soldado.findIndex((entry) => entry.reserve === 45);
    expect(rifleman).toBeGreaterThanOrEqual(0);
    expect(oficial[rifleman]).toEqual({ magazine: soldado[rifleman]!.magazine, reserve: 27 });
    expect(reserves('historia', 'column')).toEqual(soldado);
  });

  it('Enemy reserve unchanged', () => {
    expect(reserves('oficial', 'legalist')).toEqual(reserves('soldado', 'legalist'));
  });

  it('Forces unchanged by level: the same sections, soldiers and weapons at every level', () => {
    const forces = (level: Difficulty) =>
      battle(level).units.map((unit) => ({ id: unit.id, faction: unit.faction, squadId: unit.squadId, weaponId: unit.weaponId, sectionType: unit.sectionType }));
    expect(forces('historia')).toEqual(forces('soldado'));
    expect(forces('oficial')).toEqual(forces('soldado'));
  });
});
