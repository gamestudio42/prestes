import { describe, expect, it } from 'vitest';
import { BOOTCAMP_EXERCISE } from '../../packages/content/src';
import { stationPoint } from '../../packages/shared/src/training-ground';
import { SimulationEngine } from '../../packages/simulation/src/engine';
import { phaseCommand } from '../../apps/game/src/training/exercise';

type Internal = { units: Array<{ id: number; x: number; y: number; targetX: number; targetY: number; squadId: number }> };

describe('regroup', () => {
  it('closes a spread section into a compact body on the instructor, even by the hamlet trench', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true, training: true, opposition: false });
    engine.runTicks(1);
    engine.enqueue(phaseCommand(BOOTCAMP_EXERCISE.phases.find((phase) => phase.id === 'recon')!));
    engine.runTicks(3);
    const internal = engine as unknown as Internal;
    // The instructor stands between the hamlet's trench and wall, where the
    // hand play found a line regroup split in two.
    const officer = internal.units.find((unit) => unit.squadId === 99)!;
    const at = stationPoint('recon', { x: 17, y: -16 });
    Object.assign(officer, { x: at.x, y: at.y, targetX: at.x, targetY: at.y });
    const section = internal.units.filter((unit) => unit.squadId === 1);
    section.forEach((unit, index) => {
      const spot = stationPoint('recon', { x: -6 + (index % 6) * 6, y: index < 6 ? -2 : 6 });
      Object.assign(unit, { x: spot.x, y: spot.y, targetX: spot.x, targetY: spot.y });
    });
    engine.enqueue({ type: 'order', order: 'regroup', unitIds: section.map((unit) => unit.id) });
    const frame = engine.runTicks(500);
    const living = frame.units.filter((unit) => unit.squadId === 1 && unit.alive);
    const centre = {
      x: living.reduce((sum, unit) => sum + unit.x, 0) / living.length,
      y: living.reduce((sum, unit) => sum + unit.y, 0) / living.length,
    };
    const close = living.filter((unit) => Math.hypot(unit.x - centre.x, unit.y - centre.y) <= 8);
    expect(close.length).toBeGreaterThanOrEqual(9);
  });
});
