import { DEFAULT_SPACING, averageAim, findPath } from '@prestes/shared';
import { formationSlots } from '../tactical';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { clampToRegion } from './geometry';
import { queueUnitOrder } from './movement';

export function reflowFormation(ctx: SimContext, units: readonly MutableUnit[]): void {
  const active = units.filter(
    (unit) =>
      unit.alive &&
      !unit.incapacitated &&
      unit.currentOrder !== null &&
      unit.orderDestination !== null,
  );
  if (active.length < 2) {
    return;
  }
  const anchor = active[0]?.orderDestination;
  if (!anchor) {
    return;
  }
  const group = active.filter(
    (unit) =>
      unit.orderDestination !== null &&
      Math.abs(unit.orderDestination.x - anchor.x) < 0.01 &&
      Math.abs(unit.orderDestination.y - anchor.y) < 0.01,
  );
  if (group.length < 2) {
    return;
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
}
