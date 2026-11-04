import { describe, expect, it } from 'vitest';
import { TRAINING_GROUND, coverSlots, isPointInCover, planOrderPreview, stationPoint } from '@prestes/shared';
import type { Command, Frame } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';

type Internal = {
  units: Array<{ id: number; x: number; y: number; targetX: number; targetY: number; slotId: number | null; alive: boolean; routed: boolean }>;
};

function training(opposition?: boolean) {
  const engine = new SimulationEngine({
    seed: 1922,
    sandbox: true,
    training: true,
    opposition,
    map: 'training-ground',
  });
  let frame: Frame = engine.runTicks(1);
  const send = (command: Command, ticks = 1): Frame => {
    engine.enqueue(command);
    frame = engine.runTicks(ticks);
    return frame;
  };
  const internal = engine as unknown as Internal & { units: Array<{ faction: string }> };
  // The default legalists stand in open field on the training ground: move
  // them out of range so no test ends in a stray fight (which freezes the
  // simulation once a side is beaten). Tests spawn their own targets.
  for (const unit of internal.units) {
    if (unit.faction === 'legalist') {
      unit.x = -110 + unit.id;
      unit.y = 110;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
    }
  }
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

// The trench line, the maneuver field's bound wall and a barracks block.
const trench = TRAINING_GROUND.covers.find((cover) => cover.id === 220)!;
const lowWall = TRAINING_GROUND.covers.find((cover) => cover.id === 212)!;
const house = TRAINING_GROUND.covers.find((cover) => cover.kind === 'building' && cover.id === 301)!;

describe('cover slots in the simulation', () => {
  it('puts a section of 11 into the trench, each in its own place', () => {
    const t = training();
    t.send({ type: 'spawn_troop', faction: 'column', to: { x: trench.x, y: trench.y + 14 }, count: 6 }, 2);
    t.send({ type: 'spawn_troop', faction: 'column', to: { x: trench.x, y: trench.y + 14 }, count: 6 }, 2);
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

  it('previews the same slots the order then takes', () => {
    const t = training();
    const section = t.riflemen().slice(0, 5);
    t.placeNear(section, { x: trench.x, y: trench.y + 9 });
    const to = { x: trench.x, y: trench.y };
    const plan = planOrderPreview({ frame: t.frame(), unitIds: section, order: 'move', to });
    const previewed = new Map(plan!.paths.map((path) => [path.unitId, path.slotId]));
    t.send({ type: 'move', unitIds: section, to }, 1);
    expect(section.map((id) => t.slotOf(id))).toEqual(section.map((id) => previewed.get(id)));
    expect(section.every((id) => t.slotOf(id) !== null)).toBe(true);
  });

  it('keeps trench slots through a bounding defend order', () => {
    // The bootcamp section: one squad of 11 plus the instructor.
    const t = training(false);
    // One squad of 11, as in the bootcamp stations.
    t.send({
      type: 'training_phase',
      setup: {
        phase: 'defense',
        playerPoint: stationPoint('defense', { x: 0, y: 0 }),
        officerPoint: stationPoint('defense', { x: 12, y: -12 }),
      },
    }, 3);
    const section = t.frame().units
      .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.kind !== 'officer')
      .map((unit) => unit.id);
    expect(section.length).toBeGreaterThanOrEqual(10);
    // Enemies far off the field, so no soldier is wounded on the way.
    const enemies = new Set(t.frame().units.filter((unit) => unit.faction !== 'column').map((unit) => unit.id));
    for (const unit of t.internal.units) {
      if (enemies.has(unit.id)) {
        unit.x = -95 + unit.id;
        unit.y = 95;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
      }
    }
    t.send({ type: 'set_bounding', enabled: true });
    t.send({ type: 'order', order: 'defend', unitIds: section, to: { x: trench.x, y: trench.y } }, 2500);
    const living = section.filter((id) => t.frame().units.find((unit) => unit.id === id)?.alive);
    const trenchSlots = new Set(coverSlots(trench).map((slot) => slot.id));
    expect(living.filter((id) => trenchSlots.has(t.slotOf(id) ?? -1)).length).toBe(living.length);
    for (const id of living) {
      const unit = t.frame().units.find((entry) => entry.id === id)!;
      expect(isPointInCover(unit.x, unit.y, trench)).toBe(true);
    }
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
    // The threat is north of the wall, so the slots are on its south side.
    t.send({ type: 'spawn_troop', faction: 'target', to: { x: lowWall.x, y: lowWall.y - 18 }, count: 2, holdFire: true }, 2);
    t.placeNear(section, { x: lowWall.x, y: lowWall.y + 8 });
    // Everyone holds fire on the way in so the target is still there to shoot at.
    const column = t.frame().units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
    t.send({ type: 'hold_fire', unitIds: column, hold: true });
    t.send({ type: 'move', unitIds: section, to: { x: lowWall.x, y: lowWall.y + 2 } }, 200);
    t.send({ type: 'hold_fire', unitIds: section, hold: false });
    const living = section.filter((id) => t.frame().units.find((unit) => unit.id === id)?.alive);
    expect(living.every((id) => t.slotOf(id) !== null)).toBe(true);
    const target = t.frame().units.find((unit) => unit.faction === 'target' && unit.alive)!;
    let shots = 0;
    t.engine.enqueue({ type: 'attack', unitIds: section, targetId: target.id });
    for (let index = 0; index < 200; index += 1) {
      shots += t.engine.tick().events.filter((event) => event.type === 'shot' && section.includes(event.source)).length;
    }
    expect(shots).toBeGreaterThan(0);
  });

  it('takes a corner slot at the training house', () => {
    const t = training();
    const [soldier] = t.riflemen() as [number];
    // A threat north of the barracks: the south-west corner faces away from it.
    t.send({ type: 'spawn_troop', faction: 'target', to: { x: house.x, y: house.y - 30 }, count: 1, holdFire: true }, 2);
    const southWest = { x: house.x - house.halfWidth - 1, y: house.y + house.halfDepth + 1 };
    const corner = [...coverSlots(house)].sort(
      (left, right) =>
        (left.x - southWest.x) ** 2 + (left.y - southWest.y) ** 2 -
        ((right.x - southWest.x) ** 2 + (right.y - southWest.y) ** 2),
    )[0]!;
    // Start 4 m out from the corner, away from the building.
    const out = { x: corner.x - house.x, y: corner.y - house.y };
    const length = Math.sqrt(out.x ** 2 + out.y ** 2);
    t.placeNear([soldier], { x: corner.x + (out.x / length) * 4, y: corner.y + (out.y / length) * 4 });
    const frame = t.send({ type: 'move', unitIds: [soldier], to: { x: corner.x, y: corner.y } }, 200);
    const unit = frame.units.find((entry) => entry.id === soldier)!;
    expect(t.slotOf(soldier)).toBe(corner.id);
    expect(Math.hypot(unit.x - corner.x, unit.y - corner.y)).toBeLessThan(0.6);
    expect(isPointInCover(unit.x, unit.y, house)).toBe(false);
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

describe('ordered facing while bounding', () => {
  it('the bounding section keeps its wedge turned to the dragged facing', () => {
    // The bootcamp formation station, as the game sets it up.
    const t = training(false);
    t.send({
      type: 'training_phase',
      setup: {
        phase: 'formation',
        playerPoint: stationPoint('formation', { x: 0, y: 0 }),
        officerPoint: stationPoint('formation', { x: 12, y: -12 }),
      },
    }, 3);
    const internal = t.internal as unknown as { units: Array<{ id: number; faction: string; x: number; y: number; targetX: number; targetY: number }> };
    for (const unit of internal.units) {
      if (unit.faction !== 'column') {
        unit.x = -95 + unit.id;
        unit.y = 95;
        unit.targetX = unit.x;
        unit.targetY = unit.y;
      }
    }
    const section = t.frame().units
      .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.kind !== 'officer')
      .map((unit) => unit.id);
    const centre = t.frame().units
      .filter((unit) => section.includes(unit.id))
      .reduce((sum, unit) => ({ x: sum.x + unit.x / section.length, y: sum.y + unit.y / section.length }), { x: 0, y: 0 });
    t.send({ type: 'set_bounding', enabled: true });
    t.send({ type: 'formation', unitIds: section, formation: 'wedge' });
    const to = { x: centre.x + 16, y: centre.y };
    // Facing south (+y): the point leads, the arms trail to the north.
    t.send({ type: 'move', unitIds: section, to, facing: { x: 0, y: 1 } }, 1200);
    const units = t.frame().units.filter((unit) => section.includes(unit.id));
    for (const unit of units) {
      expect(unit.facingY).toBeGreaterThan(0.9);
      expect(unit.y - to.y).toBeLessThan(0.5);
    }
    expect(units.filter((unit) => unit.y < to.y - 1.5).length).toBe(units.length - 1);
  });
});
