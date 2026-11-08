import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { battleMaps } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';

/**
 * pre-battle-roster 0.2: today's default 3 vs 3, pinned unit by unit on every
 * battle map. The default roster must reproduce it exactly, so every later
 * slice of the roster work proves it changes nothing for a player who does
 * not build a force. Re-record only for a deliberate change:
 * `PIN_DEFAULT_ROSTER=1 npx vitest run packages/simulation/test/default-roster.test.ts`.
 */
const FIXTURE = resolve(__dirname, 'fixtures/default-roster.json');

type Pinned = Record<string, [number, number, string, number, number, string][]>;

function units(map: string): Pinned[string] {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: map as never });
  return engine.units.map((unit) => [
    unit.id,
    unit.squadId,
    unit.faction,
    Math.round(unit.x * 1000) / 1000,
    Math.round(unit.y * 1000) / 1000,
    unit.weaponId,
  ]);
}

describe('default roster', () => {
  const maps = battleMaps().map((map) => map.id);
  const actual: Pinned = Object.fromEntries(maps.map((map) => [map, units(map)]));
  if (process.env.PIN_DEFAULT_ROSTER === '1' || !existsSync(FIXTURE)) {
    writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 1)}\n`);
  }
  const pinned = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Pinned;

  for (const map of maps) {
    it(`the default 3 vs 3 on ${map} is the pinned 66 men`, () => {
      expect(actual[map]).toHaveLength(66);
      expect(actual[map]).toEqual(pinned[map]);
    });
  }
});
