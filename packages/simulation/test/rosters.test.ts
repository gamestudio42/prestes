import { describe, expect, it } from 'vitest';
import { battleMap, createEditableMap, isWalkable, setActiveMap, toMapDocument, type BattleRosters, type PortLike, type SectionTypeId, type WorkerResponse } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { createSimulationHost } from '../src/worker-host';
import { openField } from './open-field';

// author-game-maps 3.1: on the test map (its enemy presets are in its document).
const TEST_MAP = 'campo-de-provas';

const six: SectionTypeId[] = ['comando', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'esquadra-4', 'irregulares'];

function battle(map: string | ReturnType<typeof openField>, rosters?: BattleRosters, seed = 1922) {
  return new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: map, rosters });
}

describe('rostered 3v3 (pre-battle-roster 3.1-3.4)', () => {
  it('six small sections deploy on the test map', () => {
    for (const map of [battleMap(TEST_MAP)]) {
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
    const engine = battle(TEST_MAP, { column: { sections: six }, legalist: { sections: ['fuzileiros'] } });
    const squad = (id: number) => engine.units.filter((unit) => unit.squadId === id);
    const [officer, bugler] = squad(1);
    expect(officer).toMatchObject({ kind: 'officer', weaponId: 'revolver', magazine: 6, reserve: 18, sectionType: 'comando' });
    expect(bugler).toMatchObject({ kind: 'infantry', weaponId: 'mauser-7mm', magazine: 5, reserve: 45 });
    expect(squad(2).map((unit) => unit.weaponId)).toEqual(['metralhadora-7mm', 'mauser-7mm', 'mauser-7mm', 'mauser-7mm']);
    expect(squad(3).map((unit) => unit.weaponId).filter((id) => id === 'fuzil-automatico-7mm')).toHaveLength(1);
    // faction-armies 3.1: the potreada carries three quarters of the issue in reserve.
    expect(squad(6)[0]).toMatchObject({ weaponId: 'winchester-44', sidearmId: 'revolver', magazine: 9, reserve: 27 });
    expect(squad(6)[1]?.sidearmId).toBeUndefined();
  });

  it('the default roster as a player roster fields the same men as no roster', () => {
    const plain = battle(TEST_MAP);
    const rostered = battle(TEST_MAP, { column: { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] }, legalist: { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] } });
    const place = (engine: SimulationEngine) => engine.units.map(({ id, x, y, squadId, faction, weaponId }) => ({ id, x, y, squadId, faction, weaponId }));
    expect(place(rostered)).toEqual(place(plain));
  });

  it('enemy roster is deterministic', () => {
    const rosters = { column: { sections: six } };
    const sections = (engine: SimulationEngine) => engine.rosters?.legalist?.sections;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const a = battle(TEST_MAP, rosters, seed);
      const b = battle(TEST_MAP, rosters, seed);
      expect(sections(a)).toEqual(sections(b));
      expect(battleMap(TEST_MAP).enemyForces!.map((preset) => preset.sections)).toContainEqual(sections(a));
      expect(a.hashState()).toBe(b.hashState());
    }
    const drawn = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => JSON.stringify(sections(battle(TEST_MAP, rosters, seed)))));
    expect(drawn.size).toBeGreaterThan(1);
  });

  it('chosen enemy is not drawn', () => {
    const chosen = battle(TEST_MAP, { column: { sections: six }, legalist: { sections: ['irregulares', 'irregulares'] } });
    const drawnState = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: TEST_MAP }).rng.getState();
    expect(chosen.rosters?.legalist?.sections).toEqual(['irregulares', 'irregulares']);
    expect(chosen.rng.getState()).toEqual(drawnState);
  });

  it("the map's fixed column force wins over the player's, and fields with no roster at all", () => {
    const eighteen: SectionTypeId[] = ['comando', 'esquadra-5', 'esquadra-5', 'esquadra-4'];
    const map = { ...battleMap(TEST_MAP), columnForce: { sections: eighteen } };
    const men = (engine: SimulationEngine) => engine.units.filter((unit) => unit.faction === 'column').length;
    for (const rosters of [undefined, { column: { sections: six } }]) {
      const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: map, rosters });
      expect(engine.rosters?.column.sections).toEqual(eighteen);
      expect(men(engine)).toBe(18);
    }
  });

  it('a scene without an enemy fields no legalist, whatever roster comes, and is not won by an empty field', () => {
    const map = { ...battleMap(TEST_MAP), noEnemy: true };
    for (const rosters of [undefined, { column: { sections: six } }, { column: { sections: six }, legalist: { sections: six } }]) {
      const engine = new SimulationEngine({ seed: 1927, scenario: 'battle3v3', battleMap: map, rosters });
      expect(engine.units.some((unit) => unit.faction === 'legalist')).toBe(false);
      expect(engine.units.some((unit) => unit.faction === 'column')).toBe(true);
      expect(engine.runTicks(20).outcome).toBe('playing');
    }
  });

  it('a battle without rosters draws nothing', () => {
    const engine = battle(TEST_MAP);
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
    // The test map is medium: two machine guns are allowed there, three are not (scale-forces-by-map-size).
    host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', battleMap: TEST_MAP, rosters: { column: { sections: ['metralhadora', 'metralhadora', 'metralhadora'] } } });
    expect(posted).toEqual([{ type: 'error', message: 'roster_invalid' }]);
    host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', battleMap: TEST_MAP, rosters: { column: { sections: six } } });
    const ready = posted[1];
    expect(ready?.type).toBe('ready');
    if (ready?.type === 'ready') expect(ready.frame.units.filter((unit) => unit.faction === 'column')).toHaveLength(25);
  });

  // scale-forces-by-map-size 1.2: the host judges a roster by its map's size.
  it('the host refuses 44 men on a small map and takes them on a medium one', () => {
    const four: SectionTypeId[] = ['fuzileiros', 'fuzileiros', 'fuzileiros', 'fuzileiros'];
    const start = (battleMapId: string, mapDocument?: ReturnType<typeof toMapDocument>) => {
      const posted: WorkerResponse[] = [];
      const port: PortLike = { postMessage: (message) => posted.push(message as WorkerResponse) };
      const host = createSimulationHost(
        (seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters) =>
          new SimulationEngine({ seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters }),
        port,
      );
      host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', battleMap: battleMapId as never, ...(mapDocument ? { mapDocument } : {}), rosters: { column: { sections: four } } });
      return posted[0];
    };
    const small = createEditableMap({ id: 'pequeno', size: 'small', name: { en: 'S', 'pt-BR': 'P' } });
    expect(start('pequeno', toMapDocument(small))).toEqual({ type: 'error', message: 'roster_invalid' });
    expect(start(TEST_MAP)?.type).toBe('ready');
  });

  it('gun crew is slower and irregulars faster', () => {
    // Each section alone marches 100 m north over open ground; timed while the
    // section's mean progress passes 50 m.
    const ticksTo = (type: SectionTypeId): number => {
      const engine = battle(openField(), { column: { sections: [type] }, legalist: { sections: ['esquadra-4'] } });
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

describe('sandbox troops of a section type (pre-battle-roster 5.3)', () => {
  it('spawns a machine-gun crew with its weapons, speed and belt pool', () => {
    const engine = new SimulationEngine({ seed: 7, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
    const before = engine.units.length;
    const anchor = engine.units[0]!;
    for (const dy of [12, -12, 24, -24]) {
      engine.enqueue({ type: 'spawn_troop', faction: 'column', to: { x: anchor.x, y: anchor.y + dy }, count: 11, section: 'metralhadora' });
      engine.tick();
      if (engine.units.length > before) break;
    }
    const crew = engine.units.slice(before);
    expect(crew).toHaveLength(4);
    expect(crew.map((unit) => unit.weaponId)).toEqual(['metralhadora-7mm', 'mauser-7mm', 'mauser-7mm', 'mauser-7mm']);
    expect(crew.every((unit) => unit.sectionType === 'metralhadora')).toBe(true);
    expect(crew[0]).toMatchObject({ magazine: 250, reserve: 0 });
    expect(crew[0]!.speed).toBeCloseTo(anchor.speed * 0.85);
    const frame = engine.frame({ hash: false });
    expect(frame.gunPools?.[crew[0]!.squadId]).toBe(750);
    expect(frame.units.find((unit) => unit.id === crew[0]!.id)?.gunSet).toBe(false);
  });

  it('a plain spawned troop is unchanged: no section type, no pool', () => {
    const engine = new SimulationEngine({ seed: 7, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
    const before = engine.units.length;
    const anchor = engine.units[0]!;
    for (const dy of [12, -12, 24, -24]) {
      engine.enqueue({ type: 'spawn_troop', faction: 'column', to: { x: anchor.x, y: anchor.y + dy }, count: 3 });
      engine.tick();
      if (engine.units.length > before) break;
    }
    const added = engine.units.slice(before);
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((unit) => unit.sectionType === undefined && unit.weaponId === 'mauser-7mm')).toBe(true);
    expect(engine.frame({ hash: false }).gunPools).toBeUndefined();
  });
});
