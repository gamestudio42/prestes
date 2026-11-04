import { describe, expect, it } from 'vitest';
import { BOOTCAMP_EXERCISE } from '../../packages/content/src';
import { SimulationEngine } from '../../packages/simulation/src/engine';
import { phaseCommand } from '../../apps/game/src/training/exercise';

describe('flanking the training troop', () => {
  it('goes around the troop, not in front of it, when the end soldier is clicked', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true, training: true, opposition: false, bounding: true });
    engine.runTicks(1);
    engine.enqueue(phaseCommand(BOOTCAMP_EXERCISE.phases.find((phase) => phase.id === 'maneuver')!));
    engine.runTicks(3);
    const units = engine.frame().units;
    const section = units.filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive);
    const troop = units.filter((unit) => unit.role === 'training-enemy' && unit.alive);
    expect(troop.length).toBeGreaterThan(2);
    const centre = (list: typeof units) => ({
      x: list.reduce((sum, unit) => sum + unit.x, 0) / list.length,
      y: list.reduce((sum, unit) => sum + unit.y, 0) / list.length,
    });
    const anchor = centre(troop);
    const start = centre(section);
    const approach = Math.atan2(start.y - anchor.y, start.x - anchor.x);
    // The westmost soldier of the line, as the e2e script and a player would click.
    const endSoldier = [...troop].sort((left, right) => left.x - right.x)[0]!;
    engine.enqueue({ type: 'flank', unitIds: section.map((unit) => unit.id), targetId: endSoldier.id });
    const flankers = engine
      .runTicks(1)
      .orders.filter((order) => order.kind === 'flank')
      .map((order) => order.unitIds[0]!);
    expect(flankers.length).toBeGreaterThanOrEqual(2);
    // As the station measures it: where the flankers stand once settled, seen
    // from what is left of the troop, against the bearing the section came from.
    const settled = engine.runTicks(600);
    const left = settled.units.filter((unit) => unit.role === 'training-enemy' && unit.alive && !unit.incapacitated);
    const now = left.length > 0 ? centre(left) : anchor;
    const wide = flankers.filter((id) => {
      const unit = settled.units.find((entry) => entry.id === id)!;
      const bearing = Math.atan2(unit.y - now.y, unit.x - now.x);
      const delta = Math.abs(Math.atan2(Math.sin(bearing - approach), Math.cos(bearing - approach)));
      return (delta * 180) / Math.PI >= 50;
    });
    expect(wide.length).toBeGreaterThanOrEqual(2);
  });
});
