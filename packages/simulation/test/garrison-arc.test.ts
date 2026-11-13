import { describe, expect, it } from 'vitest';
import type { PositionDef } from '@prestes/shared';
import { clampFacingToPort, outsidePortArc } from '../src/systems/garrison';
import type { SimContext } from '../src/systems/context';
import type { MutableUnit } from '../src/systems/model';

/**
 * A man at a building's window sees, fires and faces only within the
 * window's 120-degree arc, so his barrel never shows through his own wall.
 */
function setup(kind: PositionDef['kind'] = 'building', arcDeg = 120) {
  const position = {
    id: 1,
    kind,
    capacity: 1,
    cover: 0.6,
    entrances: [],
    ports: [{ x: 0, y: 0, facing: { x: 1, y: 0 }, arcDeg }],
    coverIds: [1],
    x: -2,
    y: 0,
  } as PositionDef;
  const ctx = { positionById: new Map([[1, position]]) } as unknown as SimContext;
  const unit = { x: 0, y: 0, garrison: 1, port: 0, facingX: 1, facingY: 0 } as unknown as MutableUnit;
  return { ctx, unit };
}

describe('garrison: a window fires within its arc', () => {
  it('a point ahead or 50 degrees off is in the arc; 70 degrees off or behind is not', () => {
    const { ctx, unit } = setup();
    const at = (deg: number) => [Math.cos((deg * Math.PI) / 180) * 10, Math.sin((deg * Math.PI) / 180) * 10] as const;
    expect(outsidePortArc(ctx, unit, ...at(0))).toBe(false);
    expect(outsidePortArc(ctx, unit, ...at(50))).toBe(false);
    expect(outsidePortArc(ctx, unit, ...at(-50))).toBe(false);
    expect(outsidePortArc(ctx, unit, ...at(70))).toBe(true);
    expect(outsidePortArc(ctx, unit, ...at(-90))).toBe(true);
    expect(outsidePortArc(ctx, unit, ...at(180))).toBe(true);
  });

  it('a man outside, in a trench line or in the tower is not bound by it', () => {
    const outside = setup();
    delete (outside.unit as { garrison?: number }).garrison;
    expect(outsidePortArc(outside.ctx, outside.unit, -10, 0)).toBe(false);
    const trench = setup('trench-line');
    expect(outsidePortArc(trench.ctx, trench.unit, -10, 0)).toBe(false);
    const tower = setup('building', 360);
    expect(outsidePortArc(tower.ctx, tower.unit, -10, 0)).toBe(false);
  });

  it('his facing past the arc turns back to its edge, on the side he turned', () => {
    const { ctx, unit } = setup();
    unit.facingX = 0;
    unit.facingY = 1;
    clampFacingToPort(ctx, unit);
    expect(unit.facingX).toBeCloseTo(0.5);
    expect(unit.facingY).toBeCloseTo(Math.sqrt(0.75));
    unit.facingX = -1;
    unit.facingY = -0.01;
    clampFacingToPort(ctx, unit);
    expect(unit.facingX).toBeCloseTo(0.5);
    expect(unit.facingY).toBeCloseTo(-Math.sqrt(0.75));
    unit.facingX = Math.cos(0.5);
    unit.facingY = Math.sin(0.5);
    clampFacingToPort(ctx, unit);
    expect(unit.facingX).toBeCloseTo(Math.cos(0.5));
  });
});
