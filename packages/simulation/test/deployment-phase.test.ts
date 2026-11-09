import { describe, expect, it } from 'vitest';
import type { WorkerResponse } from '@prestes/shared';
import { SimulationEngine, createSimulationHost } from '../src';

const battle = (deployment: boolean, seed = 1924) => new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: 'bairro', deployment });

describe('deployment phase (add-deployment-phase 2.1)', () => {
  it('time stands still: no tick, no shot, no man moves', () => {
    const engine = battle(true);
    const before = engine.frame();
    expect(before.phase).toBe('deployment');
    let shots = 0;
    for (let index = 0; index < 30; index += 1) {
      const frame = engine.runTicks(10);
      shots += frame.events.filter((event) => event.type === 'shot').length;
    }
    const after = engine.frame();
    expect(after.tick).toBe(0);
    expect(shots).toBe(0);
    expect(after.units.map(({ id, x, y }) => ({ id, x, y }))).toEqual(before.units.map(({ id, x, y }) => ({ id, x, y })));
  });

  it('start_battle ends the phase: battle_started, then ticks run', () => {
    const engine = battle(true);
    engine.enqueue({ type: 'start_battle' });
    const started = engine.runTicks(5);
    expect(started.tick).toBe(0);
    expect(started.phase).toBe('battle');
    expect(started.events).toContainEqual({ type: 'battle_started', tick: 0 });
    expect(engine.runTicks(5).tick).toBe(5);
  });

  it('a fight order in deployment is refused, the men stay', () => {
    const engine = battle(true);
    const before = engine.frame();
    const seq = engine.enqueue({ type: 'attack', unitIds: [1], targetId: 40 });
    const frame = engine.runTicks(1);
    expect(frame.events).toContainEqual({ type: 'command_rejected', tick: 0, seq, reason: 'not_during_deployment' });
    expect(frame.units[0]).toEqual(before.units[0]);
  });

  it('goldens hold: an empty deployment hashes as a battle without the phase', () => {
    const plain = battle(false);
    const deployed = battle(true);
    expect(deployed.hashState()).not.toBe(plain.hashState());
    deployed.enqueue({ type: 'start_battle' });
    deployed.runTicks(1);
    expect(deployed.hashState()).toBe(plain.hashState());
    expect(deployed.runTicks(300).hash).toBe(plain.runTicks(300).hash);
  });

  it('headless engines skip the phase unless asked', () => {
    expect(battle(false).frame().phase).toBeUndefined();
    expect(new SimulationEngine({ seed: 1, deployment: true }).phase).toBe('battle');
  });

  it('the host holds ticks in deployment and answers each command with a frame', () => {
    const messages: WorkerResponse[] = [];
    const host = createSimulationHost(
      (seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters, deployment) =>
        new SimulationEngine({ seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters, deployment }),
      { postMessage: (message) => messages.push(message) },
    );
    host.handle({ type: 'start', seed: 1924, scenario: 'battle3v3', battleMap: 'bairro', deployment: true });
    host.handle({ type: 'step', ticks: 4 });
    const held = messages.at(-1);
    expect(held?.type === 'frame' && held.frame.tick).toBe(0);
    host.handle({ type: 'command', command: { type: 'start_battle' } });
    const answer = messages.at(-1);
    expect(answer?.type === 'frame' && answer.frame.events.some((event) => event.type === 'battle_started')).toBe(true);
    host.handle({ type: 'step', ticks: 4 });
    const running = messages.at(-1);
    expect(running?.type === 'frame' && running.frame.tick).toBe(4);
  });
});
