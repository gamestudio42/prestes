import { describe, expect, it } from 'vitest';
import type { CoverPoint } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { unseenFireMarker, updateVision } from '../src/systems/vision';
import { openField } from './open-field';

// fog-of-war: what each side sees.
function field() {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: openField() });
  engine.covers.splice(0);
  // One observer, one enemy, everyone else far away and out of sight.
  for (const unit of engine.units) {
    unit.x = unit.faction === 'column' ? -110 : 110;
    unit.y = unit.faction === 'column' ? 110 : -110;
  }
  const observer = engine.units.find((unit) => unit.faction === 'column')!;
  const enemy = engine.units.find((unit) => unit.faction === 'legalist')!;
  observer.x = 0;
  observer.y = 0;
  observer.facingX = 0;
  observer.facingY = -1;
  const look = () => {
    updateVision(engine, 2);
    return engine.vision.seen.column.has(enemy.id);
  };
  return { engine, observer, enemy, look };
}

describe('side vision', () => {
  it('sees an enemy 80 m ahead in the open', () => {
    const t = field();
    t.enemy.x = 0;
    t.enemy.y = -80;
    expect(t.look()).toBe(true);
    expect(t.engine.vision.lastSeen.column.get(t.enemy.id)).toMatchObject({ x: 0, y: -80 });
  });

  it('does not see him behind a high stone wall', () => {
    const t = field();
    t.enemy.x = 0;
    t.enemy.y = -80;
    const wall: CoverPoint = { id: 990, kind: 'stone', x: 0, y: -40, halfWidth: 6, halfDepth: 1, height: 3, radius: 7, quality: 0.6, blocksMovement: true, blocksSight: true };
    t.engine.covers.push(wall);
    expect(t.look()).toBe(false);
  });

  it('does not see him outside the cone at 40 m', () => {
    const t = field();
    t.enemy.x = 0;
    t.enemy.y = 40;
    expect(t.look()).toBe(false);
  });

  it('senses him 10 m behind', () => {
    const t = field();
    t.enemy.x = 0;
    t.enemy.y = 10;
    expect(t.look()).toBe(true);
  });

  it('is the same for the same seed and orders', () => {
    const run = () => {
      const engine = new SimulationEngine({ seed: 7, scenario: 'battle3v3', sandbox: true });
      const ids = engine.units.filter((unit) => unit.squadId === 2).map((unit) => unit.id);
      engine.enqueue({ type: 'order', order: 'advance', unitIds: ids, to: { x: 0, y: -20 } });
      const seen: string[] = [];
      for (let tick = 0; tick < 600; tick += 1) {
        const frame = engine.tick();
        if (tick % 50 === 0) seen.push(JSON.stringify(frame.seen));
      }
      return seen;
    };
    expect(run()).toEqual(run());
  });
});

describe('unseen fire marker', () => {
  it('marks a hidden shooter 100 m away within 11 m, and narrows as he keeps firing', () => {
    const t = field();
    const shooter = t.enemy;
    shooter.x = 0;
    shooter.y = 100;
    // Behind the observer's back and beyond his 15 m sense: unseen.
    updateVision(t.engine, 2);
    expect(t.engine.vision.seen.column.has(shooter.id)).toBe(false);
    const marks = [10, 40, 70].map((tick) => unseenFireMarker(t.engine, shooter, t.observer, tick)!);
    const off = (mark: { x: number; y: number }) => Math.sqrt((mark.x - 0) ** 2 + (mark.y - 100) ** 2);
    for (const mark of marks) expect(mark.type).toBe('unseen_fire');
    const [first, , third] = marks.map((mark) => (mark.type === 'unseen_fire' ? mark : null)!);
    expect(first!.radius).toBeCloseTo(11);
    expect(off(first!)).toBeLessThanOrEqual(11 + 1e-6);
    expect(third!.radius).toBeLessThanOrEqual(3);
    expect(off(third!)).toBeLessThanOrEqual(3);
    // The marker never names the shooter.
    for (const mark of marks) expect(Object.values(mark)).not.toContain(shooter.id);
  });

  it('leaves no marker for a shooter the side sees', () => {
    const t = field();
    t.enemy.x = 0;
    t.enemy.y = -80;
    updateVision(t.engine, 2);
    expect(unseenFireMarker(t.engine, t.enemy, t.observer, 10)).toBeNull();
  });

  it('is emitted with the shot in a running battle', () => {
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: openField() });
    let markers = 0;
    for (let tick = 0; tick < 1500 && markers === 0; tick += 1) {
      markers += engine.tick().events.filter((event) => event.type === 'unseen_fire').length;
    }
    expect(markers).toBeGreaterThan(0);
  });
});

// Open point closed 2026-11-11: defend and ambush faced the nearest enemy,
// seen or not, so a section turned toward men its side had never spotted.
describe('defend and ambush under fog', () => {
  for (const order of ['defend', 'ambush'] as const) {
    it(`${order} does not turn toward an enemy nobody has seen`, () => {
      const t = field();
      // Behind the observer, outside his cone and his 15 m all-round sense.
      t.enemy.x = 0;
      t.enemy.y = 60;
      t.enemy.facingX = 0;
      t.enemy.facingY = 1;
      expect(t.look()).toBe(false);
      t.engine.enqueue({ type: 'order', order, unitIds: [t.observer.id], to: { x: 0, y: -6 } });
      t.engine.runTicks(80);
      expect(t.engine.vision.seen.column.has(t.enemy.id)).toBe(false);
      expect(t.observer.facingY).toBeLessThan(0);
    });
  }

  it('defend faces the enemy its side sees', () => {
    const t = field();
    t.enemy.x = 30;
    t.enemy.y = -60;
    t.enemy.facingX = 0;
    t.enemy.facingY = -1;
    expect(t.look()).toBe(true);
    t.engine.enqueue({ type: 'order', order: 'defend', unitIds: [t.observer.id], to: { x: 0, y: -6 } });
    t.engine.runTicks(80);
    const dx = t.enemy.x - t.observer.x;
    const dy = t.enemy.y - t.observer.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    expect((t.observer.facingX * dx + t.observer.facingY * dy) / length).toBeGreaterThan(0.9);
  });
});
