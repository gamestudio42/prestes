import type { Vec2 } from './protocol';

export function rotateOffset(offset: Vec2, rotation: number): Vec2 {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: offset.x * cos - offset.y * sin,
    y: offset.x * sin + offset.y * cos,
  };
}

export function troopFormationOffsets(
  count: number,
  columns: number,
  spacing: number,
  rotation: number,
): Vec2[] {
  const offsets: Vec2[] = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const local = {
      x: (column - (columns - 1) / 2) * spacing,
      y: row * spacing,
    };
    offsets.push(rotateOffset(local, rotation));
  }
  return offsets;
}

export function normaliseRotation(rotation: number): number {
  const turn = Math.PI * 2;
  return ((rotation % turn) + turn) % turn;
}
