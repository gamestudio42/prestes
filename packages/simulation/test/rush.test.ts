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
