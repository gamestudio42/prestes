import { describe, expect, it } from 'vitest';
import { CATALOG_OBJECTS, type Building, type BuildingModel, type SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { duel, duelMap } from './garrison-duel';

/**
 * revise-buildings-and-stone 3.4: a new building of each group fights like
 * the others: a section ordered in goes in by a door, its men take windows
 * up to the building's capacity, and the garrison can be assaulted.
 */
const NEW: readonly { group: string; model: BuildingModel }[] = [
  { group: 'rural', model: 'rancho' },
  { group: 'town', model: 'railway-station' },
  { group: 'military', model: 'barracks-block' },
];

function placed(model: BuildingModel): Building {
  const entry = CATALOG_OBJECTS.find((candidate) => candidate.model === model)!;
  return { id: 9001, model, x: 0, y: 0, rotation: 0, halfWidth: entry.halfWidth, halfDepth: entry.halfDepth, height: entry.height };
}

describe('new buildings fight like the others (revise-buildings-and-stone 3.4)', { timeout: 120_000 }, () => {
  for (const { group, model } of NEW) {
    it(`${group}: a section ordered into the ${model} enters by its doors and mans its windows up to its capacity`, () => {
      const house = placed(model);
      const engine = new SimulationEngine({ seed: 5, scenario: 'battle3v3', sandbox: true, battleMap: duelMap(house) });
      // Three legalists stay (with no enemy the battle is over); everyone holds fire.
      const kept = new Set(engine.units.filter((unit) => unit.faction === 'legalist').slice(0, 3).map((unit) => unit.id));
      for (let index = engine.units.length - 1; index >= 0; index -= 1) {
        const unit = engine.units[index]!;
        if (unit.faction === 'legalist' && !kept.has(unit.id)) engine.units.splice(index, 1);
      }
      engine.enqueue({ type: 'hold_fire', unitIds: engine.units.map((unit) => unit.id), hold: true });
      const position = engine.positions.find((entry) => entry.id === house.id)!;
      expect(position.capacity).toBeGreaterThan(0);
      expect(position.entrances.length).toBeGreaterThan(0);
      const squads = [...new Set(engine.units.filter((unit) => unit.faction === 'column').map((unit) => unit.squadId))].sort((a, b) => a - b);
      const ids = engine.units.filter((unit) => unit.squadId === squads[0]).map((unit) => unit.id);
      const expected = Math.min(position.capacity, ids.length);
      engine.enqueue({ type: 'order', order: 'enter', unitIds: ids, positionId: house.id });
      const events: SimEvent[] = [];
      const held = () => engine.frame().garrisons?.find((entry) => entry.positionId === house.id)?.unitIds ?? [];
      for (let tick = 0; tick < 4000 && held().length < expected; tick += 100) events.push(...engine.runTicks(100, { hash: false }).events);
      expect(held()).toHaveLength(expected);
      expect(events.filter((event) => event.type === 'unit_entered' && event.positionId === house.id)).toHaveLength(expected);
      const men = engine.units.filter((unit) => held().includes(unit.id));
      expect(men.every((unit) => unit.port !== undefined && unit.port < position.ports.length)).toBe(true);
      expect(new Set(men.map((unit) => unit.port)).size).toBe(men.length);
    });

    it(`${group}: a pinned garrison in the ${model} can be assaulted`, () => {
      const t = duel(4, { house: placed(model), openCount: 8, atDoor: 10, garrisonPinned: true });
      t.engine.enqueue({ type: 'assault', unitIds: t.open.map((unit) => unit.id), positionId: t.house.id });
      let started = false;
      let ended = false;
      for (let tick = 0; tick < 1500 && !ended; tick += 1) {
        for (const unit of t.inside) if (unit.alive && !unit.incapacitated) unit.suppression = 100;
        const frame = t.engine.runTicks(1, { hash: false });
        started ||= frame.events.some((event) => event.type === 'assault_started' && event.positionId === t.house.id);
        ended = frame.events.some((event) => event.type === 'assault_ended' && event.positionId === t.house.id);
      }
      expect(started).toBe(true);
      expect(ended).toBe(true);
    });
  }
});
