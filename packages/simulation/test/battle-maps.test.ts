import { describe, expect, it } from 'vitest';
import { activeMapRuntime, coverAgainst, cropBlocksLine, isLineBlocked, EYE_HEIGHTS } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { SimulationEngine } from '../src/engine';
import { updateVision } from '../src/systems/vision';
import { revealShooter } from '../src/systems/concealment';
import { FERRY_BOARDING_TICKS } from '../src/systems/ferry';

/** A 3v3 on the river test map with everyone parked far from the action. */
function field(seed = 1922) {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
  for (const unit of engine.units) {
    unit.x = unit.faction === 'column' ? -185 + (unit.id % 11) * 2 : -185 + (unit.id % 11) * 2;
    unit.y = unit.faction === 'column' ? 190 : -190;
    unit.targetX = unit.x;
    unit.targetY = unit.y;
  }
  const observer = engine.units.find((unit) => unit.faction === 'column')!;
  const enemy = engine.units.find((unit) => unit.faction === 'legalist')!;
  const place = (unit: typeof observer, x: number, y: number, facingY = 1) => {
    unit.x = x;
    unit.y = y;
    unit.targetX = x;
    unit.targetY = y;
    unit.facingX = 0;
    unit.facingY = facingY;
  };
  const look = () => {
    engine.selectTerrain();
    updateVision(engine, engine.tickCount + (engine.tickCount % 2 === 0 ? 2 : 1));
    return engine.vision.seen.column.has(enemy.id);
  };
  return { engine, observer, enemy, place, look };
}

describe('concealment', () => {
  it('crouched in the corn: not seen from 30 m', () => {
    const t = field();
    t.place(t.observer, 60, 14, 1);
    t.place(t.enemy, 60, 44, -1);
    t.enemy.stance = 'crouched';
    expect(t.look()).toBe(false);
  });

  it('too close to hide: seen within 8 m', () => {
    const t = field();
    t.place(t.observer, 60, 37, 1);
    t.place(t.enemy, 60, 44, -1);
    t.enemy.stance = 'crouched';
    expect(t.look()).toBe(true);
  });

  it('standing in tall grass: seen; crouched at 50 m: hidden', () => {
    const t = field();
    t.place(t.observer, -60, 74, 1);
    t.place(t.enemy, -60, 124, -1);
    t.enemy.stance = 'standing';
    expect(t.look()).toBe(true);
    t.enemy.stance = 'crouched';
    expect(t.look()).toBe(false);
  });

  it('rifle in the cane: seen for 4 s after he fires, then hidden again', () => {
    const t = field();
    t.place(t.observer, -60, 20, 1);
    t.place(t.enemy, -60, 42, -1);
    t.enemy.stance = 'crouched';
    expect(t.look()).toBe(false);
    revealShooter(t.engine, t.enemy, t.engine.tickCount);
    expect(t.look()).toBe(true);
    t.engine.tickCount += 41;
    expect(t.look()).toBe(false);
  });

  it('running in the corn: seen at 14 m', () => {
    const t = field();
    t.place(t.observer, 60, 30, 1);
    t.place(t.enemy, 60, 44, -1);
    t.enemy.stance = 'crouched';
    expect(t.look()).toBe(false);
    t.enemy.path = [{ x: 70, y: 44 }];
    t.enemy.gait = 'run';
    expect(t.look()).toBe(true);
  });

  it('field between two sections: a 40 m canefield cuts the line', () => {
    const t = field();
    t.engine.selectTerrain();
    expect(isLineBlocked(-60, 30, -60, 90, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(true);
    // Tall grass and scrub do not cut it.
    expect(isLineBlocked(-60, 110, -60, 170, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(false);
  });

  it('looking down from a rise: an eye above the crop sees over the field', () => {
    const t = field();
    t.engine.selectTerrain();
    const runtime = activeMapRuntime()!;
    expect(cropBlocksLine(runtime, -60, 30, 1.6, -60, 90, 1.6)).toBe(true);
    expect(cropBlocksLine(runtime, -60, 30, 9, -60, 90, 6)).toBe(false);
  });

  it('shot through the stalks: vegetation gives no cover', () => {
    const t = field();
    t.engine.selectTerrain();
    for (const stance of ['standing', 'crouched', 'prone'] as const) {
      expect(coverAgainst(60, 44, 60, 0, stance, [])).toBe(coverAgainst(160, 44, 160, 0, stance, []));
    }
  });
});

describe('water and crossings', () => {
  it('ford slows and no one lies down in it', () => {
    const t = field();
    t.place(t.observer, -120, 2, -1);
    t.observer.stance = 'prone';
    t.engine.runTicks(1);
    expect(t.observer.stance).toBe('crouched');
    expect(coverAgainst(-120, 2, -120, -60, 'crouched', [])).toBe(0);
  });

  it('ferry trips: a section of eleven crosses in two trips, about 60 s', () => {
    const t = field();
    const section = t.engine.units.filter((unit) => unit.squadId === 1);
    section.forEach((unit, index) => {
      unit.x = 116 + (index % 4) * 2;
      unit.y = 22 + Math.floor(index / 4) * 2;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
    });
    t.engine.enqueue({ type: 'move', unitIds: section.map((unit) => unit.id), to: { x: 120, y: -40 } });
    let trips = 0;
    let wasMoving = false;
    let crossedAt: number | null = null;
    for (let tick = 0; tick < 1500 && crossedAt === null; tick += 1) {
      const frame = t.engine.tick();
      const ferry = frame.ferries![0]!;
      if (ferry.moving && !wasMoving) trips += 1;
      wasMoving = ferry.moving;
      if (section.every((unit) => unit.y < -10)) crossedAt = frame.tick;
      expect(section.filter((unit) => unit.ferryId !== undefined).length).toBeLessThanOrEqual(6);
    }
    expect(crossedAt).not.toBeNull();
    // Out and back empty and out again: three moves, two with men.
    expect(trips).toBe(3);
    expect(crossedAt!).toBeGreaterThan(3 * 200);
    expect(crossedAt!).toBeLessThan(3 * 200 + 3 * FERRY_BOARDING_TICKS + 300);
  });

  it('ferry is deterministic', () => {
    const run = () => {
      const t = field(7);
      const section = t.engine.units.filter((unit) => unit.squadId === 1);
      section.forEach((unit, index) => {
        unit.x = 116 + (index % 4) * 2;
        unit.y = 22 + Math.floor(index / 4) * 2;
      });
      t.engine.enqueue({ type: 'move', unitIds: section.map((unit) => unit.id), to: { x: 120, y: -40 } });
      return t.engine.runTicks(500).hash;
    };
    expect(run()).toBe(run());
  });

  it('an order into deep water goes to the bank', () => {
    const t = field();
    const section = t.engine.units.filter((unit) => unit.squadId === 1);
    section.forEach((unit, index) => {
      unit.x = 40 + index * 2;
      unit.y = 40;
    });
    t.engine.enqueue({ type: 'move', unitIds: section.map((unit) => unit.id), to: { x: 60, y: 3 } });
    t.engine.runTicks(400);
    for (const unit of section) expect(Math.abs(unit.y)).toBeGreaterThan(8);
  });

  it('an order outside the map is refused', () => {
    const t = field();
    const section = t.engine.units.filter((unit) => unit.squadId === 1);
    t.engine.enqueue({ type: 'move', unitIds: section.map((unit) => unit.id), to: { x: 0, y: 260 } });
    const frame = t.engine.runTicks(1);
    expect(frame.events.some((event) => event.type === 'command_rejected')).toBe(true);
  });
});
