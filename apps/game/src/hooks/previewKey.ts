import type { Vec2 } from '@prestes/shared';

/**
 * What an order preview depends on (movement-polish). The preview is
 * recomputed only when this key changes: the pointer's 1 m cell, the hovered
 * unit, the selection, the order, a drag, and the selected soldiers' positions
 * rounded to 1 m. A still pointer over a running battle keeps the same key.
 */
export interface PreviewKeyInput {
  order: string;
  selected: readonly { id: number; x: number; y: number }[];
  hoverPoint: Vec2 | null;
  hoverUnitId: number | null;
  formation?: string;
  drag?: { from: Vec2; to: Vec2 } | null;
  /** 'facing' or 'line' while a drag is in progress. */
  dragKind?: string | null;
}

const cell = (value: number) => Math.floor(value);

export function previewKey(input: PreviewKeyInput): string {
  const pointer = input.hoverPoint ? `${cell(input.hoverPoint.x)},${cell(input.hoverPoint.y)}` : '-';
  // A drag sets facing and spacing: follow it at a tenth of a metre.
  const drag = input.drag
    ? `${input.dragKind}:${input.drag.from.x.toFixed(1)},${input.drag.from.y.toFixed(1)}>${input.drag.to.x.toFixed(1)},${input.drag.to.y.toFixed(1)}`
    : '-';
  const soldiers = input.selected.map((unit) => `${unit.id}@${cell(unit.x)},${cell(unit.y)}`).join(';');
  return [input.order, pointer, input.hoverUnitId ?? '-', input.formation ?? '-', drag, soldiers].join('|');
}
