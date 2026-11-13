import { describe, expect, it } from 'vitest';
import { compileMapDocument, createEditableMap, SIDED_CAMP, toMapDocument } from '@prestes/shared';
import { SimulationEngine } from '../src';

/**
 * revise-buildings-and-stone 5.2 (D11): two camps, one battle. The same map
 * with the camp in the Column's looks and in the government's, the same seed
 * and commands, gives the same state hash on every tick.
 */
function camp(side?: 'legalist') {
  const map = createEditableMap({ id: 'acampamento', size: 'small', name: { en: 'C', 'pt-BR': 'C' } });
  [...SIDED_CAMP, 'campfire', 'rifle-stack', 'field-gun-75'].forEach((type, index) =>
    map.objects.push({ id: index + 1, type, x: -30 + (index % 4) * 15, y: -10 + Math.floor(index / 4) * 12, rotation: 0.3, ...(side ? { variant: side } : {}) }),
  );
  return compileMapDocument(toMapDocument(map));
}

function hashes(side?: 'legalist'): string[] {
  const map = camp(side);
  expect(map.props.filter((prop) => prop.side === 'legalist')).toHaveLength(side ? SIDED_CAMP.length : 0);
  const engine = new SimulationEngine({ seed: 31, scenario: 'battle3v3', battleMap: map });
  const out: string[] = [];
  for (let tick = 0; tick < 400; tick += 1) out.push(engine.runTicks(1).hash);
  return out;
}

describe('camp sides do not touch the battle (revise-buildings-and-stone 5.2)', { timeout: 120_000 }, () => {
  it("the Column's camp and the government's give the same hashes tick by tick", () => {
    const column = hashes();
    expect(column.every((hash) => hash.length > 0)).toBe(true);
    expect(hashes('legalist')).toEqual(column);
  });

  it('the side lands only on the sided camp objects', () => {
    const map = camp('legalist');
    const unsided = map.props.filter((prop) => ['campfire', 'rifle-stack', 'field-gun-75'].includes(prop.model));
    expect(unsided.every((prop) => prop.side === undefined)).toBe(true);
    expect(map.covers).toEqual(camp().covers);
  });
});
