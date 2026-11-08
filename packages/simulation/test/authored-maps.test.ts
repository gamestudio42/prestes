import { describe, expect, it } from 'vitest';
import {
  compileMapDocument,
  createEditableMap,
  registerBattleMap,
  toMapDocument,
  unregisterBattleMap,
  type PortLike,
  type WorkerResponse,
} from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { createSimulationHost } from '../src/worker-host';

function sampleMap() {
  const map = createEditableMap({ id: 'authored-sample', size: 'medium', name: { en: 'Sample', 'pt-BR': 'Amostra' } });
  map.roads.push({ id: 1, type: 'dirt-road', width: 5, camber: 0.1, ditches: { left: true, right: true }, points: [{ x: -200, y: 0 }, { x: 200, y: 10 }] });
  map.objects.push(
    { id: 1, type: 'matacao', x: -30, y: 20, rotation: 0.4 },
    { id: 2, type: 'casa-terrea', x: 60, y: -30, rotation: 0 },
    { id: 3, type: 'cart', x: 10, y: 40, rotation: 1 },
    { id: 4, type: 'xique-xique', x: -60, y: -40, rotation: 0 },
  );
  map.lines.push({ id: 1, kind: 'stone-wall', height: 1.2, points: [{ x: -80, y: 50 }, { x: -20, y: 52 }] });
  return map;
}

describe('authored maps', () => {
  it('deterministic compile: two compiles of the same document give the same 1,000-tick hash', () => {
    const document = toMapDocument(sampleMap());
    const run = () => new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: compileMapDocument(document) }).runTicks(1000).hash;
    expect(run()).toBe(run());
  });

  it('the worker host compiles a playtest document and starts the 3v3 on it', () => {
    const messages: WorkerResponse[] = [];
    const port: PortLike = { postMessage: (message) => messages.push(message) };
    const host = createSimulationHost(
      (seed, sandbox, training, opposition, bounding, scenario, battleMap) =>
        new SimulationEngine({ seed, sandbox, training, opposition, bounding, scenario, battleMap }),
      port,
    );
    host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', battleMap: 'authored-sample', mapDocument: toMapDocument(sampleMap()) });
    expect(messages[0]?.type).toBe('ready');
    if (messages[0]?.type === 'ready') {
      const column = messages[0].frame.units.filter((unit) => unit.faction === 'column');
      expect(column.length).toBeGreaterThan(0);
      expect(Math.max(...column.map((unit) => unit.y))).toBeGreaterThan(60);
    }
    unregisterBattleMap('authored-sample');
  });

  it('a registered map is played under its id', () => {
    registerBattleMap(compileMapDocument(sampleMap()));
    const engine = new SimulationEngine({ seed: 3, scenario: 'battle3v3', battleMap: 'authored-sample' });
    expect(engine.battleMap?.id).toBe('authored-sample');
    unregisterBattleMap('authored-sample');
  });
});
