import { describe, expect, it } from 'vitest';
import { COVER_POINTS, clampToRegion, dragSpacing, planOrderPreview, type Frame, type UnitSnapshot } from '../src';

function frame(units: Array<Partial<UnitSnapshot>>): Frame {
  return {
    tick: 1,
    units: units as UnitSnapshot[],
    orders: [],
    covers: COVER_POINTS,
    events: [],
    outcome: 'playing',
    hash: 'test',
  };
}

const player = {
  id: 1,
  x: -4,
  y: 2,
  alive: true,
  routed: false,
  dummy: false,
  incapacitated: false,
  faction: 'column',
  formation: 'line',
  facingX: 0,
  facingY: -1,
} as Partial<UnitSnapshot>;

const enemy = {
  id: 4,
  x: 0,
  y: 0,
  alive: true,
  routed: false,
  dummy: false,
  incapacitated: false,
  faction: 'legalist',
  formation: 'line',
  facingX: 0,
  facingY: 1,
} as Partial<UnitSnapshot>;

describe('drag spacing', () => {
  it('starts in close order and opens to 6 m at 20 m', () => {
    expect(dragSpacing(0)).toBe(1.5);
    expect(dragSpacing(10)).toBeCloseTo(3.75);
    expect(dragSpacing(20)).toBe(6);
    expect(dragSpacing(80)).toBe(6);
  });
});

describe('order preview', () => {
  it('lays the slots at the dragged spacing', () => {
    const second = { ...player, id: 2, x: -2 };
    const plan = planOrderPreview({
      frame: frame([player, second, enemy]),
      unitIds: [1, 2],
      order: 'move',
      to: { x: -30, y: 34 },
      formation: 'line',
      facing: { x: 1, y: 0 },
      spacing: 5,
      fast: true,
    });
    const [a, b] = plan!.paths.map((path) => path.destination);
    expect(Math.abs(a!.y - b!.y)).toBeCloseTo(5);
    expect(plan!.facingArrow?.spacing).toBe(5);
  });

  it('turns the formation and the cones to a dragged facing', () => {
    const second = { ...player, id: 2, x: -2 };
    const plan = planOrderPreview({
      frame: frame([player, second, enemy]),
      unitIds: [1, 2],
      order: 'move',
      to: { x: -30, y: 34 },
      formation: 'line',
      facing: { x: 4, y: 0 },
      fast: true,
    });
    for (const cone of plan?.cones ?? []) {
      expect(cone.facingX).toBeCloseTo(1);
    }
    // A line facing east runs north-south.
    const [a, b] = plan!.paths.map((path) => path.destination);
    expect(Math.abs(a!.x - b!.x)).toBeLessThan(0.01);
    expect(Math.abs(a!.y - b!.y)).toBeGreaterThan(2);
  });

  it('plans paths and cones without mutating the frame', () => {
    const value = frame([player, enemy]);
    const before = JSON.stringify(value);
    const plan = planOrderPreview({
      frame: value,
      unitIds: [1],
      order: 'move',
      to: { x: -4, y: 7 },
      formation: 'line',
    });
    expect(plan).not.toBeNull();
    expect(plan?.paths).toHaveLength(1);
    expect(plan?.cones).toHaveLength(1);
    expect(plan?.cones[0]?.facingY).toBeLessThan(0);
    expect(JSON.stringify(value)).toBe(before);
  });

  it('uses straight fast move previews without cover routing or LOS', () => {
    const plan = planOrderPreview({
      frame: frame([player, enemy]),
      unitIds: [1],
      order: 'move',
      line: { from: { x: -10, y: 2 }, to: { x: 10, y: 2 } },
      to: { x: 0, y: 2 },
      formation: 'line',
      fast: true,
    });
    expect(plan).not.toBeNull();
    expect(plan?.paths).toHaveLength(1);
    expect(plan?.paths[0]?.points).toHaveLength(2);
    expect(plan?.los).toHaveLength(0);
  });

  it('prefers a reachable cover behind the threat and falls back when no cover exists', () => {
    const plan = planOrderPreview({
      frame: frame([{ ...player, x: -2, y: 6 }, enemy]),
      unitIds: [1],
      order: 'defend',
      to: { x: -2, y: 6 },
      formation: 'line',
    });
    expect(plan?.paths[0]?.cover).toBe(true);

    const open = planOrderPreview({
      frame: frame([{ ...player, x: 30, y: 30 }, { ...enemy, x: 35, y: 30 }]),
      unitIds: [1],
      order: 'defend',
      to: { x: 30, y: 30 },
      formation: 'line',
    });
    expect(open?.paths[0]?.cover).toBe(false);
  });

  it('keeps a defend line on the near side of a wall', () => {
    const units = [
      { ...player, id: 1, x: -7, y: 7 },
      { ...player, id: 2, x: 7, y: 7 },
      { ...player, id: 3, x: 10, y: 11 },
      { ...player, id: 7, x: -2, y: 7 },
      { ...player, id: 8, x: 2, y: 8 },
      { ...player, id: 9, x: 12, y: 7 },
    ];
    const plan = planOrderPreview({
      frame: frame([...units, { ...enemy, x: 0, y: -20 }]),
      unitIds: units.map((unit) => unit.id!),
      order: 'defend',
      to: { x: 0, y: 6.5 },
      formation: 'line',
    });
    expect(plan).not.toBeNull();
    expect(plan?.paths.every((path) => path.destination.y > 5.3)).toBe(true);
    expect(plan?.paths.some((path) => path.cover)).toBe(true);
  });
  it('clamps a defend destination to the region', () => {
    const destination = clampToRegion({ x: 10, y: 0 }, { x: 0, y: 0 }, 8);
    expect(Math.hypot(destination.x, destination.y)).toBeCloseTo(8);
  });
  it('previews cover for move orders even without a threat', () => {
    const plan = planOrderPreview({
      frame: frame([{ ...player, x: -2, y: 2 }]),
      unitIds: [1],
      order: 'move',
      to: { x: -2, y: 2 },
      formation: 'line',
    });
    expect(plan?.paths[0]?.cover).toBe(true);
  });

  it('gives each soldier a distinct cover destination', () => {
    const units = [
      { ...player, id: 1, x: -5, y: 6 },
      { ...player, id: 2, x: -4, y: 6 },
      { ...player, id: 3, x: -3, y: 6 },
      { ...player, id: 7, x: -2, y: 6 },
    ];
    const plan = planOrderPreview({
      frame: frame(units),
      unitIds: units.map((unit) => unit.id!),
      order: 'move',
      to: { x: -4, y: 5.8 },
      formation: 'line',
    });
    const points = new Set(plan?.paths.map((path) => `${path.destination.x.toFixed(2)}:${path.destination.y.toFixed(2)}`));
    expect(points.size).toBe(units.length);
  });
  it('faces a line move forward and shows LOS from the final slots', () => {
    const plan = planOrderPreview({
      frame: frame([{ ...player, x: 0, y: 5, facingX: 0, facingY: -1 }]),
      unitIds: [1],
      order: 'move',
      formation: 'line',
      to: { x: 5, y: 0 },
      line: { from: { x: -5, y: 0 }, to: { x: 5, y: 0 } },
    });
    expect(plan).not.toBeNull();
    expect(plan?.cones[0]?.facingX).toBeCloseTo(0);
    expect(plan?.cones[0]?.facingY).toBeCloseTo(-1);
    expect(plan?.los).toHaveLength(1);
    expect(plan?.los[0]?.from.x).toBeCloseTo(plan?.paths[0]?.destination.x ?? 0);
    expect(plan?.los[0]?.from.y).toBeCloseTo(plan?.paths[0]?.destination.y ?? 0);
    expect(plan?.los[0]?.to.y).toBeLessThan(plan?.los[0]?.from.y ?? 0);

    const reversed = planOrderPreview({
      frame: frame([{ ...player, x: 0, y: 5, facingX: 0, facingY: -1 }]),
      unitIds: [1],
      order: 'move',
      formation: 'line',
      to: { x: -5, y: 0 },
      line: { from: { x: 5, y: 0 }, to: { x: -5, y: 0 } },
    });
    expect(reversed?.cones[0]?.facingY).toBeCloseTo(1);
    expect(reversed?.los[0]?.to.y).toBeGreaterThan(reversed?.los[0]?.from.y ?? 0);
  });

  it('puts cover opposite the facing direction and rejects unknown targets', () => {
    const plan = planOrderPreview({
      frame: frame([{ ...player, x: -2, y: 6 }]),
      unitIds: [1],
      order: 'defend',
      to: { x: 0, y: 2 },
      formation: 'line',
    });
    expect(plan).not.toBeNull();
    expect(plan?.paths[0]?.cover).toBe(true);
    expect(plan?.paths[0]?.destination.y).toBeGreaterThan(4.5);
    expect(
      planOrderPreview({
        frame: frame([player, enemy]),
        unitIds: [1],
        order: 'attack',
        targetId: 99,
      }),
    ).toBeNull();
  });
});






