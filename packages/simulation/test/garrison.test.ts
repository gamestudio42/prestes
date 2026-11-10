import { describe, expect, it } from 'vitest';
import type { Command, Frame, PositionDef, SimEvent, Vec2 } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { createSimulationHost } from '../src/worker-host';
import type { WorkerResponse } from '@prestes/shared';

/**
 * A battle on the test map with both sides holding fire: the tests move men in and
 * out. Three legalists are left (one test sends them at a held house); the
 * rest are taken out, or their commander would assault the column's houses.
 */
function field(seed = 7) {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, battleMap: 'campo-de-provas' });
  const kept = new Set(engine.units.filter((unit) => unit.faction === 'legalist').slice(0, 3).map((unit) => unit.id));
  for (let index = engine.units.length - 1; index >= 0; index -= 1) {
    const unit = engine.units[index]!;
    if (unit.faction === 'legalist' && !kept.has(unit.id)) engine.units.splice(index, 1);
  }
  let frame = engine.frame();
  const events: SimEvent[] = [];
  const send = (command: Command, ticks = 1): Frame => {
    engine.enqueue(command);
    frame = engine.runTicks(ticks, { hash: false });
    events.push(...frame.events);
    return frame;
  };
  const all = frame.units.map((unit) => unit.id);
  // Past the legalist commander's first think: the positions he sends a section to are known.
  send({ type: 'hold_fire', unitIds: all, hold: true }, 20);
  const section = (squadOrder: number) => {
    const column = frame.units.filter((unit) => unit.faction === 'column');
    const squads = [...new Set(column.map((unit) => unit.squadId))].sort((a, b) => a - b);
    return column.filter((unit) => unit.squadId === squads[squadOrder]).map((unit) => unit.id);
  };
  const centre = (ids: readonly number[]): Vec2 => {
    const men = frame.units.filter((unit) => ids.includes(unit.id));
    return { x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length, y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length };
  };
  /** The nearest free position of a kind (and capacity) to a point: none the enemy holds or is going into. */
  const nearestPosition = (to: Vec2, test: (position: PositionDef) => boolean): PositionDef => {
    const taken = (position: PositionDef) =>
      engine.units.some((unit) => unit.entering === position.id) || (frame.garrisons ?? []).some((garrison) => garrison.positionId === position.id);
    const candidates = engine.positions.filter((position) => test(position) && !taken(position));
    return candidates.reduce((best, position) =>
      (position.x - to.x) ** 2 + (position.y - to.y) ** 2 < (best.x - to.x) ** 2 + (best.y - to.y) ** 2 ? position : best,
    );
  };
  return { engine, send, section, centre, nearestPosition, events, frame: () => frame };
}

const inside = (frame: Frame, positionId: number) => frame.garrisons?.find((garrison) => garrison.positionId === positionId)?.unitIds.length ?? 0;

describe('garrison: enter and leave (garrison-and-assault 2.2-2.3)', { timeout: 60_000 }, () => {
  it('enter a house: four men go in and the house holds 4', () => {
    const t = field();
    const four = t.section(0).slice(0, 4);
    const house = t.nearestPosition(t.centre(four), (position) => position.kind === 'building' && position.capacity === 4);
    t.send({ type: 'order', order: 'enter', unitIds: four, positionId: house.id }, 900);
    expect(inside(t.frame(), house.id)).toBe(4);
    const garrison = t.frame().garrisons!.find((entry) => entry.positionId === house.id)!;
    expect(garrison.side).toBe('column');
    expect(t.frame().units.filter((unit) => four.includes(unit.id)).every((unit) => unit.garrison === house.id)).toBe(true);
    expect(t.events.filter((event) => event.type === 'unit_entered' && four.includes(event.unitId))).toHaveLength(4);
  });

  it('over capacity: eleven ordered into a house of 4, four go in and seven stay outside', () => {
    const t = field();
    const eleven = t.section(0);
    expect(eleven).toHaveLength(11);
    const house = t.nearestPosition(t.centre(eleven), (position) => position.kind === 'building' && position.capacity === 4);
    t.send({ type: 'order', order: 'enter', unitIds: eleven, positionId: house.id }, 1200);
    expect(inside(t.frame(), house.id)).toBe(4);
    const outside = t.frame().units.filter((unit) => eleven.includes(unit.id) && unit.garrison === undefined);
    expect(outside).toHaveLength(7);
    // They took places near the door rather than standing in the street at random.
    const door = house.entrances[0]!;
    for (const unit of outside) expect(Math.hypot(unit.x - door.x, unit.y - door.y)).toBeLessThan(30);
  });

  it('a man inside is not moved by anything else and keeps his port', () => {
    const t = field();
    const four = t.section(0).slice(0, 4);
    const house = t.nearestPosition(t.centre(four), (position) => position.kind === 'building' && position.capacity === 4);
    t.send({ type: 'order', order: 'enter', unitIds: four, positionId: house.id }, 900);
    // No enemy left to re-pick ports against (the garrison's own port choice follows a moving threat).
    for (let index = t.engine.units.length - 1; index >= 0; index -= 1) if (t.engine.units[index]!.faction === 'legalist') t.engine.units.splice(index, 1);
    t.send({ type: 'stance', unitIds: four, stance: 'standing' }, 40);
    const before = t.frame().units.filter((unit) => four.includes(unit.id)).map(({ x, y }) => ({ x, y }));
    t.send({ type: 'stance', unitIds: four, stance: 'crouched' }, 100);
    const after = t.frame().units.filter((unit) => four.includes(unit.id)).map(({ x, y }) => ({ x, y }));
    expect(after).toEqual(before);
  });

  it('the enemy cannot enter a house the column holds', () => {
    const t = field();
    const four = t.section(0).slice(0, 4);
    const house = t.nearestPosition(t.centre(four), (position) => position.kind === 'building' && position.capacity === 4);
    t.send({ type: 'order', order: 'enter', unitIds: four, positionId: house.id }, 900);
    const legalist = t.frame().units.filter((unit) => unit.faction === 'legalist').slice(0, 3).map((unit) => unit.id);
    const frame = t.send({ type: 'order', order: 'enter', unitIds: legalist, positionId: house.id });
    expect(frame.events.some((event) => event.type === 'command_rejected' && event.reason === 'position_held')).toBe(true);
  });

  it('leave to the back yard: the men leave by the back door and form around the point', () => {
    const t = field();
    const eight = t.section(0).slice(0, 8);
    const long = t.nearestPosition(t.centre(eight), (position) => position.kind === 'building' && position.entrances.length === 2 && position.capacity >= 8);
    t.send({ type: 'order', order: 'enter', unitIds: eight, positionId: long.id }, 1500);
    const men = inside(t.frame(), long.id);
    expect(men).toBeGreaterThanOrEqual(6);
    // 12 m out of the back door, away from the front.
    const [front, back] = long.entrances as [Vec2, Vec2];
    const out = { x: back.x - front.x, y: back.y - front.y };
    const length = Math.hypot(out.x, out.y);
    const point = { x: back.x + (out.x / length) * 12, y: back.y + (out.y / length) * 12 };
    const left: number[] = [];
    let tick = 0;
    t.engine.enqueue({ type: 'order', order: 'exit', unitIds: eight, to: point });
    while (tick < 400) {
      const frame = t.engine.runTicks(1, { hash: false });
      for (const event of frame.events) {
        if (event.type === 'command_rejected') throw new Error(`exit refused: ${event.reason}`);
        if (event.type === 'unit_left') {
          const unit = frame.units.find((entry) => entry.id === event.unitId)!;
          // Each steps out at the back door.
          expect(Math.hypot(unit.x - back.x, unit.y - back.y)).toBeLessThan(Math.hypot(unit.x - front.x, unit.y - front.y));
          left.push(event.unitId);
        }
      }
      tick += 1;
    }
    expect(left).toHaveLength(men);
    expect(inside(t.engine.frame(), long.id)).toBe(0);
    const settled = t.engine.frame().units.filter((unit) => left.includes(unit.id));
    for (const unit of settled) expect(Math.hypot(unit.x - point.x, unit.y - point.y)).toBeLessThan(15);
  });

  it('too far: an exit to a point 50 m away is refused with its reason', () => {
    const t = field();
    const four = t.section(0).slice(0, 4);
    const house = t.nearestPosition(t.centre(four), (position) => position.kind === 'building' && position.capacity === 4);
    t.send({ type: 'order', order: 'enter', unitIds: four, positionId: house.id }, 900);
    const door = house.entrances[0]!;
    const frame = t.send({ type: 'order', order: 'exit', unitIds: four, to: { x: door.x, y: door.y + 50 } });
    expect(frame.events.some((event) => event.type === 'command_rejected' && event.reason === 'too_far')).toBe(true);
    expect(inside(frame, house.id)).toBe(4);
  });

  it('host: an enter order through the worker host comes back as a garrison in the frame (2.1)', () => {
    const messages: WorkerResponse[] = [];
    let engine: SimulationEngine | null = null;
    const host = createSimulationHost(
      (seed) => (engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, battleMap: 'campo-de-provas' })),
      { postMessage: (message) => messages.push(message) },
    );
    host.handle({ type: 'start', seed: 7 });
    const sim = engine as unknown as SimulationEngine;
    const units = sim.frame().units;
    host.handle({ type: 'command', command: { type: 'hold_fire', unitIds: units.map((unit) => unit.id), hold: true } });
    const squad = Math.min(...units.filter((unit) => unit.faction === 'column').map((unit) => unit.squadId));
    const four = units.filter((unit) => unit.faction === 'column' && unit.squadId === squad).slice(0, 4);
    const centre = { x: four.reduce((s, u) => s + u.x, 0) / 4, y: four.reduce((s, u) => s + u.y, 0) / 4 };
    const house = sim.positions
      .filter((position) => position.kind === 'building' && position.capacity === 4)
      .reduce((best, position) => ((position.x - centre.x) ** 2 + (position.y - centre.y) ** 2 < (best.x - centre.x) ** 2 + (best.y - centre.y) ** 2 ? position : best));
    host.handle({ type: 'command', command: { type: 'order', order: 'enter', unitIds: four.map((unit) => unit.id), positionId: house.id } });
    host.handle({ type: 'step', ticks: 900 });
    const last = messages.filter((message) => message.type === 'frame').at(-1);
    if (last?.type !== 'frame') throw new Error('missing frame');
    expect(last.frame.garrisons?.find((garrison) => garrison.positionId === house.id)?.unitIds).toHaveLength(4);
    expect(last.frame.units.filter((unit) => unit.garrison === house.id)).toHaveLength(4);
  });

  it('determinism: the same enter and exit twice give the same hash', () => {
    const run = () => {
      const t = field(11);
      const four = t.section(0).slice(0, 4);
      const house = t.nearestPosition(t.centre(four), (position) => position.kind === 'building' && position.capacity === 4);
      t.send({ type: 'order', order: 'enter', unitIds: four, positionId: house.id }, 600);
      const door = house.entrances[0]!;
      t.send({ type: 'order', order: 'exit', unitIds: four, to: { x: door.x, y: door.y + 6 } }, 200);
      return t.engine.frame().hash;
    };
    expect(run()).toBe(run());
  });
});
