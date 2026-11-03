import type { PortLike, WorkerRequest } from '@prestes/shared';
import type { SimulationEngine } from './engine';

export interface SimulationHost {
  handle(message: WorkerRequest): void;
}

/**
 * Protocol adapter shared by the browser worker and the unit tests. The host
 * owns the engine and is the only place that turns requests into ticks.
 */
export function createSimulationHost(
  factory: (
    seed: number,
    sandbox?: boolean,
    training?: boolean,
    opposition?: boolean,
    bounding?: boolean,
    scenario?: 'bootcamp' | 'battle3v3',
  ) => SimulationEngine,
  port: PortLike,
): SimulationHost {
  let engine: SimulationEngine | null = null;

  return {
    handle(message: WorkerRequest): void {
      if (message.type === 'start') {
        engine = factory(
          message.seed,
          message.sandbox,
          message.training,
          message.opposition,
          message.bounding,
          message.scenario,
        );
        port.postMessage({ type: 'ready', frame: engine.frame() });
        return;
      }

      if (!engine) {
        port.postMessage({ type: 'error', message: 'simulation_not_started' });
        return;
      }

      if (message.type === 'command') {
        engine.enqueue(message.command);
        return;
      }

      if (message.type === 'step') {
        const frame = engine.runTicks(message.ticks);
        port.postMessage({ type: 'frame', frame });
      }
    },
  };
}




