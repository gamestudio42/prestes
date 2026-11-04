import { DEFAULT_SPACING, averageAim, averageFacing, findPath } from '@prestes/shared';
import { formationSlots } from '../tactical';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { clampToRegion } from './geometry';
import { queueUnitOrder } from './movement';

/**
 * A section standing with no order takes its new formation where it is: the
 * slots are laid around its centre, facing its ordered facing (aim) or the way
 * it faces now, at its spacing, and every soldier walks to his.
 */
export function reformInPlace(ctx: SimContext, units: readonly MutableUnit[]): void {
  const group = units.filter(
    (unit) => unit.alive && !unit.incapacitated && !unit.routed && unit.state !== 'pinned',
  );
  if (group.length < 2) {
    return;
  }
  const centre = {
    x: group.reduce((sum, unit) => sum + unit.x, 0) / group.length,
    y: group.reduce((sum, unit) => sum + unit.y, 0) / group.length,
  };
  const slots = formationSlots(
    group.map((unit) => ({ x: unit.x, y: unit.y })),
    centre,
    group[0]?.formationSpacing ?? DEFAULT_SPACING,
    group[0]?.formation ?? 'line',
    averageAim(group) ?? averageFacing(group),
  );
  group.forEach((unit, index) => {
    const destination = slots[index] ?? centre;
    const path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    if (path.length === 0) {
      return;
    }
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = destination.x;
    unit.targetY = destination.y;
    unit.holdPosition = false;
    unit.currentOrder = 'move';
    // A short shuffle into the new shape, not a bound.
    unit.lineMove = true;
    unit.orderIssued = true;
    unit.orderDestination = { ...centre };
    queueUnitOrder(ctx, unit, path, 'move');
  });
}

/** Returns whether a moving section was re-laid (else it was standing). */
export function reflowFormation(ctx: SimContext, units: readonly MutableUnit[]): boolean {
  const active = units.filter(
    (unit) =>
      unit.alive &&
      !unit.incapacitated &&
      unit.currentOrder !== null &&
      unit.orderDestination !== null,
  );
  if (active.length < 2) {
    return false;
  }
  const anchor = active[0]?.orderDestination;
  if (!anchor) {
    return false;
  }
  const group = active.filter(
    (unit) =>
      unit.orderDestination !== null &&
      Math.abs(unit.orderDestination.x - anchor.x) < 0.01 &&
      Math.abs(unit.orderDestination.y - anchor.y) < 0.01,
  );
  if (group.length < 2) {
    return false;
  }
  const spacing =
    group[0]?.currentOrder === 'disperse' ? 5 : (group[0]?.formationSpacing ?? DEFAULT_SPACING);
  // A changed formation keeps the ordered facing (the soldiers' aim).
  const slots = formationSlots(
    group.map((unit) => ({ x: unit.x, y: unit.y })),
    anchor,
    spacing,
    group[0]?.formation ?? 'line',
    averageAim(group),
  );
  const ids = new Set(group.map((unit) => unit.id));
  ctx.orders = ctx.orders.filter(
    (order) => !order.unitIds.some((id) => ids.has(id)) || order.kind !== 'move',
  );
  group.forEach((unit, index) => {
    let destination = slots[index] ?? anchor;
    if (unit.orderRegionCenter !== null) {
      destination = clampToRegion(ctx, destination, unit.orderRegionCenter, unit.orderRegionRadius);
    }
    const path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    if (path.length === 0) {
      return;
    }
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = destination.x;
    unit.targetY = destination.y;
    queueUnitOrder(ctx, unit, path, 'move');
  });
  return true;
}
