import { describe, expect, it } from 'vitest';
import { BOOTCAMP_COVERS, allCoverSlots, findPath, coverSlots, isPointBlockedByCovers, isPointInCover, pickSlots } from '../src';
import type { CoverPoint } from '../src';

const wall: CoverPoint = { id: 1, kind: 'low-wall', x: 0, y: 0, halfWidth: 3, halfDepth: 0.5, height: 1.4, radius: 3.2, quality: 0.35, blocksMovement: true, blocksSight: true };
const trench = BOOTCAMP_COVERS.find((cover) => cover.kind === 'trench')!;

describe('cover slots', () => {
  it('lays slots along both faces of linear cover', () => {
    const slots = coverSlots(wall);
    expect(slots).toHaveLength(10);
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(10);
    expect(slots.every((slot) => !isPointBlockedByCovers(slot.x, slot.y, [wall], 0.8))).toBe(true);
    expect(slots.every((slot) => slot.stance === 'standing')).toBe(true);
    expect(coverSlots({ ...wall, height: 0.9 }).every((slot) => slot.stance === 'crouched')).toBe(true);
  });

  it('puts trench slots on the walkable floor', () => {
    const slots = coverSlots(trench);
    expect(slots.length).toBeGreaterThanOrEqual(8);
    expect(slots.every((slot) => isPointInCover(slot.x, slot.y, trench) && slot.guard === null)).toBe(true);
  });

  it('is deterministic and follows rotation', () => {
    expect(coverSlots(wall)).toEqual(coverSlots(wall));
    const turned = coverSlots({ ...wall, rotation: Math.PI / 2 });
    expect(Math.abs(turned[0]!.x)).toBeCloseTo(1.5, 5);
  });

  it('gives buildings corner and wall slots', () => {
    const house: CoverPoint = { ...wall, id: 2, kind: 'building', halfWidth: 4, halfDepth: 3, height: 4 };
    expect(coverSlots(house).length).toBe(4 + 2 * 4 + 2 * 3);
  });

  it('keeps every bootcamp slot outside blocking footprints', () => {
    const slots = allCoverSlots(BOOTCAMP_COVERS);
    expect(slots.every((slot) => !isPointBlockedByCovers(slot.x, slot.y, BOOTCAMP_COVERS, 0.8))).toBe(true);
  });
});

describe('bootcamp slots', () => {
  it('can all be reached from open ground', () => {
    const start = { x: 0, y: 2 };
    const unreachable = allCoverSlots(BOOTCAMP_COVERS).filter(
      (slot) => findPath(start, slot, BOOTCAMP_COVERS).length === 0,
    );
    expect(unreachable.map((slot) => slot.id)).toEqual([]);
  });
});

describe('pickSlots', () => {
  const units = [1, 2, 3].map((id) => ({ id, x: id, y: 3 }));
  const anchors = new Map(units.map((unit) => [unit.id, { x: unit.x, y: unit.y }]));

  it('chooses the side away from the threat without double assignment', () => {
    const picked = pickSlots(units, anchors, coverSlots(wall), { threat: { x: 0, y: -20 } });
    expect(picked.size).toBe(3);
    expect(new Set([...picked.values()].map((slot) => slot.id)).size).toBe(3);
    expect([...picked.values()].every((slot) => slot.y > 0)).toBe(true);
  });

  it('skips held slots and respects the region', () => {
    const slots = coverSlots(wall);
    const held = new Map([[slots[0]!.id, 99]]);
    const picked = pickSlots(units, anchors, slots, { held, region: { center: { x: 0, y: 0 }, radius: 2 } });
    expect([...picked.values()].every((slot) => slot.id !== slots[0]!.id && Math.hypot(slot.x, slot.y) <= 2)).toBe(true);
  });
});
