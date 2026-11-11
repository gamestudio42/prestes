import { describe, expect, it } from 'vitest';
import { DEFAULT_TIME_LIMIT, TIME_LIMITS } from '@prestes/shared';
import { SimulationEngine, createSimulationHost } from '../src';

// add-map-objectives 2.1: the start request's time limit reaches the engine.
describe('objectives protocol', () => {
  it('passes timeLimitTicks from the start request to the engine factory', () => {
    const limits: (number | undefined)[] = [];
    const host = createSimulationHost(
      (seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters, deployment, timeLimitTicks) => {
        limits.push(timeLimitTicks);
        return new SimulationEngine({ seed, scenario, battleMap, rosters, deployment, timeLimitTicks });
      },
      { postMessage: () => undefined },
    );
    host.handle({ type: 'start', seed: 1924, scenario: 'battle3v3', battleMap: 'campo-de-provas', timeLimitTicks: 9000 });
    host.handle({ type: 'start', seed: 1924, scenario: 'battle3v3', battleMap: 'campo-de-provas' });
    expect(limits).toEqual([9000, undefined]);
  });

  it('offers 15, 20 and 30 minutes, 20 by default', () => {
    expect(TIME_LIMITS).toEqual([9000, 12000, 18000]);
    expect(DEFAULT_TIME_LIMIT).toBe(12000);
  });
});
