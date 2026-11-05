import { describe, expect, it } from 'vitest';
import type { CoverPoint } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { assignBoundingAdvance } from '../src/systems/bounding';

// battle-feel-3v3: the rush of an attack by bounds (the lanço).
function rushingTeam() {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true });
  engine.covers.splice(0); // open ground
  const team = engine.units.filter((unit) => unit.squadId === 1).slice(0, 5);
  const start = new Map(team.map((unit) => [unit.id, { x: unit.x, y: unit.y }]));
  const rush = (unitId: number) => {
    const unit = team.find((entry) => entry.id === unitId)!;
    const from = start.get(unitId)!;
    return Math.hypot(unit.targetX - from.x, unit.targetY - from.y);
  };
  return { engine, team, rush };
}

describe('rush length', () => {
  it('rushes 12 to 20 m across the open toward an enemy 80 m away', () => {
    const t = rushingTeam();
    const lead = t.team[0]!;
    assignBoundingAdvance(t.engine, t.team, { x: lead.x, y: lead.y - 80 }, null);
    for (const unit of t.team) {
      expect(t.rush(unit.id)).toBeGreaterThanOrEqual(12 - 0.01);
      expect(t.rush(unit.id)).toBeLessThanOrEqual(20 + 0.01);
    }
  });

  it('makes for cover 25 m ahead in one rush', () => {
    const t = rushingTeam();
    const lead = t.team[0]!;
    const wall: CoverPoint = {
      id: 900,
      kind: 'sandbag',
      x: lead.x,
      y: lead.y - 25,
      halfWidth: 8,
      halfDepth: 0.4,
      height: 0.9,
      radius: 3.5,
      quality: 0.3,
      blocksMovement: false,
      blocksSight: false,
    };
    t.engine.covers.push(wall);
    assignBoundingAdvance(t.engine, t.team, { x: lead.x, y: lead.y - 80 }, null);
    // Every man of the team makes for the wall, spread along it.
    for (const unit of t.team) {
      expect(Math.abs(unit.targetY - wall.y)).toBeLessThan(1);
      expect(Math.abs(unit.targetX - wall.x)).toBeLessThanOrEqual(wall.halfWidth);
    }
    const places = new Set(t.team.map((unit) => unit.targetX.toFixed(1)));
    expect(places.size).toBe(t.team.length);
  });

  it('stops the last rush at the objective', () => {
    const t = rushingTeam();
    const lead = t.team[0]!;
    assignBoundingAdvance(t.engine, [lead], { x: lead.x, y: lead.y - 8 }, null);
    expect(t.rush(lead.id)).toBeLessThanOrEqual(8 + 0.01);
  });
});

describe('rushes go forward (movement-polish)', () => {
  it('ignores cover 25 m to the side that gains only 2 m', () => {
    const t = rushingTeam();
    const lead = t.team[0]!;
    const side: CoverPoint = {
      id: 901,
      kind: 'sandbag',
      x: lead.x + 25,
      y: lead.y - 2,
      halfWidth: 3,
      halfDepth: 0.4,
      height: 0.9,
      radius: 3.5,
      quality: 0.3,
      blocksMovement: false,
      blocksSight: false,
    };
    t.engine.covers.push(side);
    assignBoundingAdvance(t.engine, [lead], { x: lead.x, y: lead.y - 80 }, null);
    // Straight ahead in the open, not over to the side.
    expect(Math.abs(lead.targetX - t.team[0]!.x)).toBeLessThan(1);
    expect(t.rush(lead.id)).toBeGreaterThanOrEqual(12 - 0.01);
  });
});

describe('overflow soldiers keep their room (movement-polish)', () => {
  it('eleven soldiers defending eight slots all stand apart', () => {
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true });
    engine.covers.splice(0);
    engine.covers.push({ id: 950, kind: 'sandbag', x: 0, y: 40, halfWidth: 4.8, halfDepth: 0.4, height: 0.9, radius: 6, quality: 0.3, blocksMovement: false, blocksSight: false });
    const section = engine.units.filter((unit) => unit.squadId === 1);
    engine.enqueue({ type: 'order', order: 'defend', unitIds: section.map((unit) => unit.id), to: { x: 0, y: 41.4 }, facing: { x: 0, y: -1 } });
    engine.tick();
    // Every soldier has a place of his own, slot or not.
    for (const a of section) {
      for (const b of section) {
        if (a !== b) expect((a.targetX - b.targetX) ** 2 + (a.targetY - b.targetY) ** 2).toBeGreaterThanOrEqual(1.15 * 1.15 - 1e-9);
      }
    }
    expect(section.filter((unit) => unit.slotId === null).length).toBeGreaterThan(0);
    // And they stand there apart (before the enemy commander's patience runs out at 30 s).
    for (let tick = 0; tick < 280; tick += 1) engine.tick();
    for (const a of section) {
      for (const b of section) {
        if (a !== b) expect((a.x - b.x) ** 2 + (a.y - b.y) ** 2).toBeGreaterThan(1);
      }
    }
  });
});
