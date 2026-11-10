import { describe, expect, it } from 'vitest';
import {
  authoredMapIndex,
  battleMap,
  compileMapDocument,
  loadAuthoredMap,
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
  map.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: true, right: true }, points: [{ x: -200, y: 0 }, { x: 200, y: 10 }] });
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

  it('author-game-maps 5.1: the light is visual only, two lights give the same hash', () => {
    const run = (time: number, bearing: number) => {
      const document = { ...toMapDocument(sampleMap()), light: { time, bearing } };
      return new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: compileMapDocument(document) }).runTicks(600).hash;
    };
    expect(run(7, 90)).toBe(run(17, 270));
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

  // author-game-maps 1.3: a project map is fetched when asked for, then started from its document like the playtest.
  it('a project map loads on demand and the worker host starts the 3v3 from its document', async () => {
    // The test setup already loaded the test map; any indexed map loads the same way.
    const entry = authoredMapIndex()[0]!;
    const document = await loadAuthoredMap(entry.id);
    expect(document?.id).toBe(entry.id);
    expect(battleMap(entry.id).id).toBe(entry.id);
    const messages: WorkerResponse[] = [];
    const port: PortLike = { postMessage: (message) => messages.push(message) };
    const host = createSimulationHost(
      (seed, sandbox, training, opposition, bounding, scenario, map) => new SimulationEngine({ seed, sandbox, training, opposition, bounding, scenario, battleMap: map }),
      port,
    );
    host.handle({ type: 'start', seed: 1, scenario: 'battle3v3', battleMap: entry.id, mapDocument: document! });
    expect(messages[0]?.type).toBe('ready');
    unregisterBattleMap(entry.id);
  });

  it('a registered map is played under its id', () => {
    registerBattleMap(compileMapDocument(sampleMap()));
    const engine = new SimulationEngine({ seed: 3, scenario: 'battle3v3', battleMap: 'authored-sample' });
    expect(engine.battleMap?.id).toBe('authored-sample');
    unregisterBattleMap('authored-sample');
  });
});
