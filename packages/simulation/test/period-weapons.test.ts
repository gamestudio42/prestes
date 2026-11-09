import { describe, expect, it } from 'vitest';
import type { SectionTypeId, SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { visible } from '../src/systems/combat';
import type { MutableUnit } from '../src/systems/model';

/**
 * pre-battle-roster 4.1-4.4: the period weapons in a rostered 3v3. Two
 * sections face each other on the Vila Militar's open western field, the
 * column at y = 40 facing north and the legalists `gap` metres north of it.
 */
function duel(column: SectionTypeId, legalist: SectionTypeId, gap: number, seed = 1922) {
  const engine = new SimulationEngine({
    seed,
    scenario: 'battle3v3',
    battleMap: 'vila-militar',
    fog: false,
    rosters: { column: { sections: [column] }, legalist: { sections: [legalist] } },
  });
  const place = (faction: 'column' | 'legalist', y: number, facingY: number) => {
    engine.units
      .filter((unit) => unit.faction === faction)
      .forEach((unit, index) => {
        unit.x = -80 + index * 2.5;
        unit.y = y + (index % 2) * 0.5;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
        unit.facingX = 0;
        unit.facingY = facingY;
      });
  };
  place('column', 40, -1);
  place('legalist', 40 - gap, 1);
  const events: SimEvent[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) events.push(...engine.tick().events);
  };
  const side = (faction: 'column' | 'legalist') => engine.units.filter((unit) => unit.faction === faction);
  const shotsBy = (units: readonly MutableUnit[]) => {
    const ids = new Set(units.map((unit) => unit.id));
    return events.filter(
      (event): event is Extract<SimEvent, { type: 'shot' }> => event.type === 'shot' && ids.has(event.source),
    );
  };
  return { engine, events, run, side, shotsBy };
}

describe('per-weapon range (4.1)', () => {
  it('ranges differ', () => {
    const reach = (type: SectionTypeId, gap: number) => {
      const t = duel(type, 'esquadra-4', gap);
      const shooter = t.side('column')[0]!;
      const target = t.side('legalist')[0]!;
      target.x = shooter.x;
      return visible(t.engine, shooter, target);
    };
    // Comando: its first man is the officer with his revolver.
    expect([20, 60, 100].map((gap) => reach('comando', gap))).toEqual([true, false, false]);
    expect([20, 60, 100].map((gap) => reach('irregulares', gap))).toEqual([true, true, false]);
    expect([20, 60, 100].map((gap) => reach('esquadra-4', gap))).toEqual([true, true, true]);
  });
});

describe('burst fire (4.2)', () => {
  it('burst fire suppresses', () => {
    const suppression = (type: SectionTypeId) => {
      const t = duel(type, 'esquadra-4', 70);
      t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('legalist').map((unit) => unit.id), hold: true });
      // Only the section's first gunner fires: the automatic rifle against one Mauser.
      const shooter = t.side('column').find((unit) => unit.weaponId !== 'mauser-7mm') ?? t.side('column')[0]!;
      t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('column').filter((unit) => unit !== shooter).map((unit) => unit.id), hold: true });
      t.run(200);
      const shots = t.shotsBy([shooter]);
      return { shots: shots.length, suppression: t.side('legalist').reduce((sum, unit) => sum + unit.suppression, 0) };
    };
    const rifle = suppression('esquadra-4');
    const auto = suppression('fuzil-metralhador');
    expect(auto.shots).toBeGreaterThan(rifle.shots * 2);
    expect(auto.suppression).toBeGreaterThan(rifle.suppression);
  });

  it('a burst is several rounds a few ticks apart', () => {
    const t = duel('fuzil-metralhador', 'esquadra-4', 60);
    t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('legalist').map((unit) => unit.id), hold: true });
    t.run(200);
    const gunner = t.side('column').find((unit) => unit.weaponId === 'fuzil-automatico-7mm')!;
    const ticks = t.shotsBy([gunner]).map((event) => event.tick);
    const gaps = ticks.slice(1).map((tick, index) => tick - ticks[index]!);
    expect(gaps.filter((gap) => gap === 2).length).toBeGreaterThan(3);
    expect(gaps.some((gap) => gap > 10)).toBe(true);
  });

  it('marks the first round of each burst, and only aimed fire goes unmarked (5.4)', () => {
    const t = duel('fuzil-metralhador', 'esquadra-4', 60);
    t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('legalist').map((unit) => unit.id), hold: true });
    t.run(200);
    const gunner = t.side('column').find((unit) => unit.weaponId === 'fuzil-automatico-7mm')!;
    const shots = t.shotsBy([gunner]);
    expect(shots.every((event) => typeof event.burstStart === 'boolean')).toBe(true);
    const starts = shots.filter((event) => event.burstStart).length;
    // The view draws one tracer per burst: fewer than the rounds, at least the long gaps.
    expect(starts).toBeGreaterThan(1);
    expect(starts).toBeLessThan(shots.length);
    expect(shots[0]?.burstStart).toBe(true);
    const loaders = t.side('column').filter((unit) => unit.weaponId === 'mauser-7mm');
    expect(t.shotsBy(loaders).every((event) => event.burstStart === undefined)).toBe(true);
  });

  it('a 600-tick burst duel is deterministic', () => {
    const play = () => {
      const t = duel('esquadra-5', 'fuzil-metralhador', 70, 7);
      t.run(600);
      return t.engine.hashState();
    };
    expect(play()).toBe(play());
  });
});

describe('the machine gun (4.3)', () => {
  const gunnerOf = (t: ReturnType<typeof duel>) => t.side('column').find((unit) => unit.alive && unit.weaponId === 'metralhadora-7mm');

  it('no fire on the move', () => {
    const t = duel('metralhadora', 'esquadra-4', 90);
    t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('legalist').map((unit) => unit.id), hold: true });
    const gunner = gunnerOf(t)!;
    t.engine.enqueue({ type: 'move', unitIds: t.side('column').map((unit) => unit.id), to: { x: -60, y: 75 } });
    t.run(60);
    expect(gunner.path.length).toBeGreaterThan(0);
    expect(t.shotsBy([gunner])).toHaveLength(0);
    expect(gunner.gunStill).toBe(0);
  });

  it('the gun fires once set up, in long bursts, and its loaders feed it', () => {
    const t = duel('metralhadora', 'esquadra-4', 90);
    t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('legalist').map((unit) => unit.id), hold: true });
    const gunner = gunnerOf(t)!;
    const loaders = t.side('column').filter((unit) => unit !== gunner);
    // Loaders kneel beside the gun.
    loaders.forEach((loader, index) => {
      loader.x = gunner.x + (index - 1) * 1.5;
      loader.y = gunner.y + 1.5;
      loader.targetX = loader.x;
      loader.targetY = loader.y;
    });
    t.run(30);
    expect(t.shotsBy([gunner])).toHaveLength(0);
    t.run(270);
    const shots = t.shotsBy([gunner]);
    expect(shots.length).toBeGreaterThan(12);
    expect(shots[0]!.tick).toBeGreaterThanOrEqual(42);
    const firing = new Set(shots.map((event) => event.tick));
    const first = Math.min(...firing);
    const last = Math.max(...firing);
    const loaderShots = t.shotsBy(loaders).filter((event) => event.tick >= first && event.tick <= last);
    expect(loaderShots).toHaveLength(0);
  });

  it('crewman takes over', () => {
    const t = duel('metralhadora', 'esquadra-4', 90);
    t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('legalist').map((unit) => unit.id), hold: true });
    const gunner = gunnerOf(t)!;
    const belt = gunner.magazine;
    gunner.alive = false;
    gunner.hp = 0;
    const mates = t.side('column').filter((unit) => unit !== gunner);
    const nearest = [...mates].sort((a, b) => (a.x - gunner.x) ** 2 + (a.y - gunner.y) ** 2 - ((b.x - gunner.x) ** 2 + (b.y - gunner.y) ** 2) || a.id - b.id)[0]!;
    t.run(1);
    expect(nearest.weaponId).toBe('metralhadora-7mm');
    expect(nearest.magazine).toBe(belt);
    expect(gunner.weaponId).toBe('mauser-7mm');
    expect(nearest.gunStill).toBeLessThanOrEqual(1);
    t.run(200);
    expect(t.shotsBy([nearest]).length).toBeGreaterThan(0);
  });

  it('pool runs dry, the gun falls silent', () => {
    const t = duel('metralhadora', 'fuzileiros', 90);
    t.engine.enqueue({ type: 'hold_fire', unitIds: t.side('legalist').map((unit) => unit.id), hold: true });
    const gunner = gunnerOf(t)!;
    // Keep the target alive and in sight so the gun keeps firing.
    for (const unit of t.side('legalist')) unit.nonLethal = true;
    gunner.nonLethal = true;
    t.engine.gunPools![gunner.squadId] = 20;
    gunner.magazine = 10;
    t.run(600);
    expect(t.engine.gunPools![gunner.squadId]).toBe(0);
    expect(gunner.magazine).toBe(0);
    expect(gunner.reserve).toBe(0);
    expect(t.shotsBy([gunner])).toHaveLength(30);
  });
});

describe('the command section (4.4)', () => {
  const regroupOutcome = (types: SectionTypeId[]) => {
    const engine = new SimulationEngine({ seed: 3, scenario: 'battle3v3', battleMap: 'fazenda', rosters: { column: { sections: types } } });
    const section = engine.units.filter((unit) => unit.faction === 'column' && unit.sectionType === 'fuzileiros');
    engine.enqueue({ type: 'order', unitIds: section.map((unit) => unit.id), order: 'regroup' } as never);
    const events = engine.tick().events;
    return events.some((event) => event.type === 'command_rejected' && (event as { reason?: string }).reason === 'no_officer');
  };

  it('regroup is refused without a Comando and accepted with one', () => {
    expect(regroupOutcome(['fuzileiros', 'fuzileiros'])).toBe(true);
    expect(regroupOutcome(['comando', 'fuzileiros', 'fuzileiros'])).toBe(false);
  });

  it('the Comando officer steadies men near him', () => {
    const morale = (types: SectionTypeId[]) => {
      const engine = new SimulationEngine({ seed: 3, scenario: 'battle3v3', battleMap: 'fazenda', rosters: { column: { sections: types } } });
      const rifle = engine.units.find((unit) => unit.faction === 'column' && unit.sectionType === 'esquadra-4')!;
      const officer = engine.units.find((unit) => unit.kind === 'officer' && unit.faction === 'column');
      if (officer) {
        rifle.x = officer.x + 4;
        rifle.y = officer.y;
        rifle.targetX = rifle.x;
        rifle.targetY = rifle.y;
      }
      rifle.morale = 50;
      engine.runTicks(20);
      return rifle.morale;
    };
    expect(morale(['comando', 'esquadra-4'])).toBeGreaterThan(morale(['esquadra-4', 'esquadra-4']));
  });
});
