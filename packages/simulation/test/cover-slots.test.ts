import { describe, expect, it } from 'vitest';
import { BOOTCAMP_COVERS, coverSlots, isPointInCover } from '@prestes/shared';
import type { Command, Frame } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';

type Internal = {
  units: Array<{ id: number; x: number; y: number; targetX: number; targetY: number; slotId: number | null; alive: boolean; routed: boolean }>;
};

function training() {
  const engine = new SimulationEngine({ seed: 1922, sandbox: true, training: true });
  let frame: Frame = engine.runTicks(1);
  const send = (command: Command, ticks = 1): Frame => {
    engine.enqueue(command);
    frame = engine.runTicks(ticks);
    return frame;
  };
  const internal = engine as unknown as Internal;
  const slotOf = (id: number) => internal.units.find((unit) => unit.id === id)!.slotId;
  const riflemen = () =>
    frame.units
      .filter((unit) => unit.faction === 'column' && unit.kind !== 'officer' && unit.alive)
      .map((unit) => unit.id);
  /** Stands the soldiers in a line near a point, so a test walk stays short. */
  const placeNear = (ids: readonly number[], at: { x: number; y: number }) => {
    ids.forEach((id, index) => {
      const unit = internal.units.find((entry) => entry.id === id)!;
      unit.x = at.x + (index - (ids.length - 1) / 2) * 1.5;
      unit.y = at.y;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
    });
    frame = engine.runTicks(1);
  };
  return { engine, send, slotOf, riflemen, placeNear, frame: () => frame, internal };
}

const trench = BOOTCAMP_COVERS.find((cover) => cover.id === 109)!;
const lowWall = BOOTCAMP_COVERS.find((cover) => cover.id === 106)!;

describe('cover slots in the simulation', () => {
  it('puts a section of 11 into the trench, each in its own place', () => {
    const t = training();
    t.send({ type: 'spawn_troop', faction: 'column', to: { x: 52, y: -4 }, count: 6 }, 2);
    t.send({ type: 'spawn_troop', faction: 'column', to: { x: 52, y: -4 }, count: 6 }, 2);
    const ids = t.riflemen();
    expect(ids.length).toBeGreaterThanOrEqual(11);
    const section = ids.slice(0, 11);
    t.placeNear(section, { x: trench.x, y: trench.y + 9 });
    const frame = t.send({ type: 'move', unitIds: section, to: { x: trench.x, y: trench.y } }, 500);
    const soldiers = frame.units.filter((unit) => section.includes(unit.id));
    const inTrench = soldiers.filter((unit) => isPointInCover(unit.x, unit.y, trench));
    expect(inTrench.length).toBeGreaterThanOrEqual(8);
    for (const [index, left] of soldiers.entries()) {
      for (const right of soldiers.slice(index + 1)) {
        expect(Math.hypot(left.x - right.x, left.y - right.y)).toBeGreaterThan(1);
      }
    }
    const slotIds = section.map((id) => t.slotOf(id)).filter((id) => id !== null);
    expect(new Set(slotIds).size).toBe(slotIds.length);
    expect(slotIds.length).toBeGreaterThanOrEqual(8);
  });

  it('defends a wall from the side away from the threat', () => {
    const t = training();
    t.send({ type: 'spawn_troop', faction: 'target', to: { x: lowWall.x, y: lowWall.y - 22 }, count: 3, holdFire: true }, 2);
    const section = t.riflemen().slice(0, 5);
    t.placeNear(section, { x: lowWall.x, y: lowWall.y + 8 });
    const frame = t.send({ type: 'order', order: 'defend', unitIds: section, to: { x: lowWall.x, y: lowWall.y + 2 } }, 400);
    const defenders = frame.units.filter((unit) => section.includes(unit.id));
    expect(defenders.every((unit) => unit.y > lowWall.y)).toBe(true);
    const wallSlots = new Set(coverSlots(lowWall).map((slot) => slot.id));
    expect(section.filter((id) => wallSlots.has(t.slotOf(id) ?? -1)).length).toBeGreaterThanOrEqual(4);
  });

  it('fires over a low wall from its slots', () => {
    const t = training();
    const section = t.riflemen().slice(0, 4);
    t.placeNear(section, { x: lowWall.x, y: lowWall.y + 8 });
    t.send({ type: 'move', unitIds: section, to: { x: lowWall.x, y: lowWall.y + 2 } }, 200);
    const living = section.filter((id) => t.frame().units.find((unit) => unit.id === id)?.alive);
    expect(living.every((id) => t.slotOf(id) !== null)).toBe(true);
    t.send({ type: 'spawn_troop', faction: 'target', to: { x: lowWall.x, y: lowWall.y - 18 }, count: 2, holdFire: true }, 2);
    const target = t.frame().units.find((unit) => unit.faction === 'target' && unit.alive)!;
    let shots = 0;
    t.engine.enqueue({ type: 'attack', unitIds: section, targetId: target.id });
    for (let index = 0; index < 200; index += 1) {
      shots += t.engine.tick().events.filter((event) => event.type === 'shot' && section.includes(event.source)).length;
    }
    expect(shots).toBeGreaterThan(0);
  });

  it('releases a slot on a new destination and on a fall', () => {
    const t = training();
    const section = t.riflemen().slice(0, 3);
    t.placeNear(section, { x: lowWall.x, y: lowWall.y + 8 });
    t.send({ type: 'move', unitIds: section, to: { x: lowWall.x, y: lowWall.y + 2 } }, 5);
    const [first, second] = section as [number, number];
    expect(t.slotOf(first)).not.toBeNull();
    expect(t.slotOf(second)).not.toBeNull();
    const held = t.slotOf(first);
    t.send({ type: 'move', unitIds: [first], to: { x: lowWall.x - 14, y: lowWall.y + 10 } }, 2);
    expect(t.slotOf(first)).not.toBe(held);
    t.send({ type: 'incapacitate', targetId: second }, 2);
    expect(t.slotOf(second)).toBeNull();
  });

  it('releases the slot of a dead or routed soldier', () => {
    const t = training();
    const section = t.riflemen().slice(0, 2);
    t.send({ type: 'move', unitIds: section, to: { x: lowWall.x, y: lowWall.y + 2 } }, 5);
    const [dead, broken] = section.map((id) => t.internal.units.find((unit) => unit.id === id)!);
    dead!.alive = false;
    broken!.routed = true;
    t.engine.runTicks(1);
    expect(dead!.slotId).toBeNull();
    expect(broken!.slotId).toBeNull();
  });
});
