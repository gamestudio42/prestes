import { describe, expect, it } from 'vitest';
import { compileMapDocument, createEditableMap, toMapDocument } from '@prestes/shared';
import { SimulationEngine } from '../src';

/**
 * revise-buildings-and-stone 3.5: two looks, one battle. The same map with a
 * house whitewashed and then in bare adobe, the same seed and commands, gives
 * the same state hash on every tick.
 */
function village(variant?: 'whitewash' | 'adobe') {
  const map = createEditableMap({ id: 'vila', size: 'small', name: { en: 'V', 'pt-BR': 'V' } });
  map.objects.push(
    { id: 1, type: 'casa-terrea', x: 0, y: 0, rotation: 0, ...(variant ? { variant } : {}) },
    { id: 2, type: 'sobrado', x: 25, y: -10, rotation: 0.4, ...(variant ? { variant } : {}) },
    { id: 3, type: 'venda', x: -25, y: 10, rotation: 0 },
  );
  return compileMapDocument(toMapDocument(map));
}

function hashes(variant: 'whitewash' | 'adobe'): string[] {
  const map = village(variant);
  expect(map.buildings[0]!.variant).toBe(variant);
  const engine = new SimulationEngine({ seed: 31, scenario: 'battle3v3', battleMap: map });
  const out: string[] = [];
  for (let tick = 0; tick < 400; tick += 1) out.push(engine.runTicks(1).hash);
  return out;
}

describe('building variants do not touch the battle (revise-buildings-and-stone 3.5)', { timeout: 120_000 }, () => {
  it('a whitewashed and a bare adobe house give the same hashes tick by tick', () => {
    const whitewash = hashes('whitewash');
    expect(whitewash.every((hash) => hash.length > 0)).toBe(true);
    expect(hashes('adobe')).toEqual(whitewash);
  });
});
