import { describe, expect, it } from 'vitest';
import { battleMaps, FAZENDA, isWalkable, setActiveMap, type BattleRosters, type PortLike, type SectionTypeId, type WorkerResponse } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { createSimulationHost } from '../src/worker-host';

const six: SectionTypeId[] = ['comando', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'esquadra-4', 'irregulares'];

function battle(map: string, rosters?: BattleRosters, seed = 1922) {
  return new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: map as never, rosters });
}

describe('rostered 3v3 (pre-battle-roster 3.1-3.4)', () => {
  it('six small sections deploy on every map', () => {
    for (const map of battleMaps()) {
      const engine = battle(map.id, { column: { sections: six }, legalist: { sections: six } });
      setActiveMap(map);
      for (const unit of engine.units) expect(isWalkable(unit.x, unit.y, map.covers), `${map.id} unit ${unit.id}`).toBe(true);
      const squads = (faction: string) => [...new Set(engine.units.filter((unit) => unit.faction === faction).map((unit) => unit.squadId))];
      expect(squads('column')).toEqual([1, 2, 3, 4, 5, 6]);
      expect(squads('legalist')).toEqual([11, 12, 13, 14, 15, 16]);
      expect(engine.units.map((unit) => unit.id)).toEqual(engine.units.map((_, index) => index + 1));
      expect(engine.units).toHaveLength(50);
    }
  });

  it('each man carries his section weapon and its training load', () => {
    const engine = battle('fazenda', { column: { sections: six }, legalist: { sections: ['fuzileiros'] } });
    const squad = (id: number) => engine.units.filter((unit) => unit.squadId === id);
    const [officer, bugler] = squad(1);
    expect(officer).toMatchObject({ kind: 'officer', weaponId: 'revolver', magazine: 6, reserve: 18, sectionType: 'comando' });
    expect(bugler).toMatchObject({ kind: 'infantry', weaponId: 'mauser-7mm', magazine: 5, reserve: 45 });
    expect(squad(2).map((unit) => unit.weaponId)).toEqual(['metralhadora-7mm', 'mauser-7mm', 'mauser-7mm', 'mauser-7mm']);
    expect(squad(3).map((unit) => unit.weaponId).filter((id) => id === 'fuzil-automatico-7mm')).toHaveLength(1);
    expect(squad(6)[0]).toMatchObject({ weaponId: 'winchester-44', sidearmId: 'revolver', magazine: 9, reserve: 36 });
    expect(squad(6)[1]?.sidearmId).toBeUndefined();
  });

  it('the default roster as a player roster fields the same men as no roster', () => {
    const plain = battle('bairro');
    const rostered = battle('bairro', { column: { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] }, legalist: { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] } });
    const place = (engine: SimulationEngine) => engine.units.map(({ id, x, y, squadId, faction, weaponId }) => ({ id, x, y, squadId, faction, weaponId }));
    expect(place(rostered)).toEqual(place(plain));
  });

  it('enemy roster is deterministic', () => {
    const rosters = { column: { sections: six } };
    const sections = (engine: SimulationEngine) => engine.rosters?.legalist?.sections;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const a = battle('fazenda', rosters, seed);
      const b = battle('fazenda', rosters, seed);
      expect(sections(a)).toEqual(sections(b));
      expect(FAZENDA.enemyForces!.map((preset) => preset.sections)).toContainEqual(sections(a));
      expect(a.hashState()).toBe(b.hashState());
    }
    const drawn = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => JSON.stringify(sections(battle('fazenda', rosters, seed)))));
    expect(drawn.size).toBeGreaterThan(1);
  });

  it('chosen enemy is not drawn', () => {
    const chosen = battle('fazenda', { column: { sections: six }, legalist: { sections: ['irregulares', 'irregulares'] } });
    const drawnState = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: 'fazenda' }).rng.getState();
    expect(chosen.rosters?.legalist?.sections).toEqual(['irregulares', 'irregulares']);
    expect(chosen.rng.getState()).toEqual(drawnState);
  });

  it('a battle without rosters draws nothing', () => {
    const engine = battle('fazenda');
    expect(engine.rosters).toBeUndefined();
    expect(engine.units.some((unit) => 'sectionType' in unit)).toBe(false);
  });

  it('the host refuses a roster the rules refuse', () => {
    const posted: WorkerResponse[] = [];
    const port: PortLike = { postMessage: (message) => posted.push(message as WorkerResponse) };
    const host = createSimulationHost(
      (seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters) =>
        new SimulationEngine({ seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters }),
      port,
    );
    host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', battleMap: 'fazenda', rosters: { column: { sections: ['metralhadora', 'metralhadora'] } } });
    expect(posted).toEqual([{ type: 'error', message: 'roster_invalid' }]);
    host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', battleMap: 'fazenda', rosters: { column: { sections: six } } });
    const ready = posted[1];
    expect(ready?.type).toBe('ready');
    if (ready?.type === 'ready') expect(ready.frame.units.filter((unit) => unit.faction === 'column')).toHaveLength(25);
  });

  it('gun crew is slower and irregulars faster', () => {
    // Each section alone marches 100 m north over the Vila Militar's open field;
    // timed while the section's mean progress passes 50 m, before the far end's
    // buildings break up the line.
    const ticksTo = (type: SectionTypeId): number => {
      const engine = battle('vila-militar', { column: { sections: [type] }, legalist: { sections: ['esquadra-4'] } });
      const ids = engine.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
      const men = () => engine.units.filter((unit) => ids.includes(unit.id));
      const start = men().reduce((sum, unit) => sum + unit.y, 0) / ids.length;
      engine.enqueue({ type: 'move', unitIds: ids, to: { x: men()[0]!.x, y: start - 100 } });
      for (let tick = 1; tick <= 1200; tick += 1) {
        engine.runTicks(1);
        const progress = start - men().reduce((sum, unit) => sum + unit.y, 0) / ids.length;
        if (progress >= 50) return tick;
      }
      return Number.POSITIVE_INFINITY;
    };
    const rifles = ticksTo('esquadra-4');
    const crew = ticksTo('metralhadora');
    const irregulars = ticksTo('irregulares');
    // About 18 % later (1 / 0.85), with the march's start-up.
    expect(crew / rifles).toBeGreaterThan(1.1);
    expect(crew / rifles).toBeLessThan(1.35);
    expect(irregulars / rifles).toBeLessThan(0.97);
  });
});
