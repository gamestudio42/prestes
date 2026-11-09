import { describe, expect, it } from 'vitest';
import { allCoverSlots, compileMapDocument, createEditableMap, insideDeploymentArea, toMapDocument, type BattleMap, type Frame } from '@prestes/shared';
import type { Command } from '@prestes/shared';
import { SimulationEngine } from '../src';

const centre = (points: readonly { x: number; y: number }[]) => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

const section = (frame: Frame, squadId: number) => frame.units.filter((unit) => unit.faction === 'column' && unit.squadId === squadId);

/** A medium authored map with a 60 m fire trench 15 m in front of the column's points, facing the legalists. */
function trenchMap(): { map: BattleMap; trenchY: number } {
  const editable = createEditableMap({ id: 'deploy-trench', size: 'medium', name: { en: 'Trench', 'pt-BR': 'Trincheira' } });
  const front = editable.deployment.column.sections[1]!;
  const trenchY = front.y - 15;
  editable.trenches.push({ id: 1, kind: 'fire', depth: 1.2, facing: 'left', bays: false, parapet: 'earth', points: [{ x: front.x - 30, y: trenchY }, { x: front.x + 30, y: trenchY }] });
  return { map: compileMapDocument(toMapDocument(editable)), trenchY };
}

function deploying(battleMap: BattleMap | 'bairro' = 'bairro'): SimulationEngine {
  return new SimulationEngine({ seed: 1924, scenario: 'battle3v3', battleMap, deployment: true });
}

describe('deployment orders (add-deployment-phase 2.2)', () => {
  it('instant move: the section stands in formation at the target, still at tick 0', () => {
    const engine = deploying();
    const men = section(engine.frame(), 1);
    const ids = men.map((unit) => unit.id);
    const from = centre(men);
    const facing = engine.battleMap!.deployment.column.facing;
    const to = { x: from.x + facing.x * 20, y: from.y + facing.y * 20 };
    expect(insideDeploymentArea(engine.battleMap!.deployment.column.area, to.x, to.y)).toBe(true);
    engine.enqueue({ type: 'move', unitIds: ids, to });
    const frame = engine.runTicks(1);
    expect(frame.tick).toBe(0);
    expect(frame.events.filter((event) => event.type === 'command_rejected')).toEqual([]);
    const after = section(frame, 1);
    expect(Math.hypot(centre(after).x - to.x, centre(after).y - to.y)).toBeLessThan(4);
    // A battle run of the same order ends where the deployment put the men.
    const walked = new SimulationEngine({ seed: 1924, scenario: 'battle3v3', battleMap: 'bairro', fog: false });
    walked.enqueue({ type: 'move', unitIds: ids, to });
    walked.runTicks(1);
    const planned = walked.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1).map((unit) => ({ id: unit.id, x: unit.targetX, y: unit.targetY }));
    for (const man of after) {
      const plan = planned.find((entry) => entry.id === man.id)!;
      expect(Math.hypot(man.x - plan.x, man.y - plan.y)).toBeLessThan(0.01);
    }
  });

  it('outside the area: refused, the section stays', () => {
    const engine = deploying();
    const before = section(engine.frame(), 1);
    const facing = engine.battleMap!.deployment.column.facing;
    const from = centre(before);
    const seq = engine.enqueue({ type: 'move', unitIds: before.map((unit) => unit.id), to: { x: from.x + facing.x * 120, y: from.y + facing.y * 120 } });
    const frame = engine.runTicks(1);
    expect(frame.events).toContainEqual({ type: 'command_rejected', tick: 0, seq, reason: 'outside_deployment_area' });
    expect(section(frame, 1)).toEqual(before);
  });

  it('fight orders refused: fire at, advance, withdraw', () => {
    const engine = deploying();
    const ids = section(engine.frame(), 1).map((unit) => unit.id);
    const target = engine.frame().units.find((unit) => unit.faction === 'legalist')!.id;
    const seqs = [
      engine.enqueue({ type: 'suppress', unitIds: ids, targetId: target }),
      engine.enqueue({ type: 'order', order: 'advance', unitIds: ids, to: { x: 0, y: 0 } }),
      engine.enqueue({ type: 'withdraw', unitIds: ids }),
    ];
    const frame = engine.runTicks(1);
    for (const seq of seqs) expect(frame.events).toContainEqual({ type: 'command_rejected', tick: 0, seq, reason: 'not_during_deployment' });
  });

  it('stance and facing are set at once', () => {
    const engine = deploying();
    const ids = section(engine.frame(), 2).map((unit) => unit.id);
    engine.enqueue({ type: 'stance', unitIds: ids, stance: 'prone' });
    const frame = engine.runTicks(1);
    expect(section(frame, 2).every((unit) => unit.stance === 'prone')).toBe(true);
  });

  it('into the trench: a defend order 5 m behind a fire trench fills its fire step, facing the parapet', () => {
    const { map, trenchY } = trenchMap();
    const engine = deploying(map);
    const men = section(engine.frame(), 2);
    const to = { x: centre(men).x, y: trenchY + 5 };
    engine.enqueue({ type: 'order', order: 'defend', unitIds: men.map((unit) => unit.id), to });
    const frame = engine.runTicks(1);
    expect(frame.events.filter((event) => event.type === 'command_rejected')).toEqual([]);
    const trench = map.covers.filter((cover) => cover.kind === 'trench' && cover.facing);
    const steps = allCoverSlots(map.covers).filter((slot) => trench.some((cover) => cover.id === slot.coverId));
    const placed = section(frame, 2).filter((unit) => unit.alive);
    const onStep = placed.filter((unit) => steps.some((slot) => Math.hypot(slot.x - unit.x, slot.y - unit.y) < 0.3));
    expect(onStep.length).toBe(placed.length);
    const parapet = trench[0]!.facing!;
    for (const unit of onStep) expect(unit.facingX * parapet.x + unit.facingY * parapet.y).toBeGreaterThan(0.7);
  });

  it('replay a deployment: three deployment orders replayed from their commands reach the same hash at tick 1,000', () => {
    const play = (orders: boolean): string => {
      const engine = new SimulationEngine({ seed: 1924, scenario: 'battle3v3', battleMap: 'bairro', deployment: true, enemyDeployment: true });
      const frame = engine.frame();
      const facing = engine.battleMap!.deployment.column.facing;
      if (orders) {
        const first = section(frame, 1);
        const from = centre(first);
        const commands: Command[] = [
          { type: 'move', unitIds: first.map((unit) => unit.id), to: { x: from.x + facing.x * 15 + 10, y: from.y + facing.y * 15 } },
          { type: 'order', order: 'defend', unitIds: section(frame, 2).map((unit) => unit.id), to: centre(section(frame, 2)) },
          { type: 'stance', unitIds: section(frame, 3).map((unit) => unit.id), stance: 'crouched' },
        ];
        for (const command of commands) engine.enqueue(command);
        engine.runTicks(1);
      }
      engine.enqueue({ type: 'start_battle' });
      engine.runTicks(1);
      return engine.runTicks(1000).hash;
    };
    const deployed = play(true);
    expect(play(true)).toBe(deployed);
    expect(deployed).not.toBe(play(false));
  });
});
