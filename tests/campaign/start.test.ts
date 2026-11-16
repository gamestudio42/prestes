import { beforeAll, describe, expect, it } from 'vitest';
import { authoredMapIndex, compileMapDocument, DEFAULT_ROSTER, loadAuthoredMap, type MapDocument, type SimEvent, type UnitSnapshot } from '../../packages/shared/src';
import { SimulationEngine } from '../../packages/simulation/src/engine';
import { campaignStart } from '../../apps/game/src/campaign/start';
import { campaignResult } from '../../apps/game/src/campaign/result';

// make-campaign-playable 2.1: a chapter starts on its authored map with the default column roster.
describe('make-campaign-playable 2.1: the campaign start', () => {
  it('starts the chapter on the map holding its mission, with the default column roster', () => {
    expect(campaignStart('prologue-18-do-forte')).toEqual({ map: 'copacabana', rosters: { column: { sections: [...DEFAULT_ROSTER.sections] } } });
    expect(campaignStart('serra-nova')?.map).toBe('serra-nova');
    expect(campaignStart('no-such-chapter')).toBeNull();
    const index = authoredMapIndex().filter((entry) => entry.id !== 'la-gaiba');
    expect(campaignStart('la-gaiba', index)).toBeNull();
  });

  let copacabana: MapDocument;
  beforeAll(async () => {
    copacabana = (await loadAuthoredMap('copacabana'))!;
  });

  it('Copacabana started this way twice with one seed gives the same hash, and fields the map column force', () => {
    const start = campaignStart('prologue-18-do-forte')!;
    const run = () =>
      new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: compileMapDocument(copacabana), rosters: start.rosters, deployment: true, enemyDeployment: true });
    const a = run();
    const b = run();
    expect(a.hashState()).toBe(b.hashState());
    a.runTicks(300);
    b.runTicks(300);
    expect(a.hashState()).toBe(b.hashState());
    const force = copacabana.columnForce!.sections;
    expect(force.length).toBeGreaterThan(0);
    const sections = new Map<number, string | undefined>();
    for (const unit of a.units) if (unit.faction === 'column' && unit.kind !== 'dummy') sections.set(unit.squadId, unit.sectionType);
    expect([...sections.values()].sort()).toEqual([...force].sort());
  });
});

const man = (faction: 'column' | 'legalist', state: Partial<UnitSnapshot> = {}): UnitSnapshot =>
  ({ id: 0, faction, kind: 'infantry', alive: true, incapacitated: false, routed: false, dummy: false, ...state }) as UnitSnapshot;

// make-campaign-playable 2.2: the result kept from the first ended frame.
describe('make-campaign-playable 2.2: the result builder', () => {
  const outcome = { type: 'outcome', tick: 900, outcome: 'victory', decidedBy: 'objectives' } as unknown as SimEvent;

  it('is null while the battle is playing', () => {
    expect(campaignResult({ outcome: 'playing', events: [], units: [], tick: 10 })).toBeNull();
  });

  it('keeps the outcome, how it was decided, the battle time after deployment and the column lost', () => {
    const units = [
      man('column', { alive: false }),
      man('column', { incapacitated: true }),
      man('column', { routed: true }),
      man('column'),
      man('column', { alive: false, dummy: true, kind: 'dummy' }),
      man('legalist', { alive: false }),
    ];
    expect(campaignResult({ outcome: 'victory', events: [outcome], units, tick: 1200, clock: { tick: 900, limit: 6000 } })).toEqual({
      outcome: 'victory',
      decidedBy: 'objectives',
      ticks: 900,
      columnLost: 2,
    });
  });

  it('records the level when the frame carries one, and the whole battle without a clock', () => {
    expect(campaignResult({ outcome: 'defeat', events: [], units: [], tick: 400, difficulty: 'historia' })).toEqual({
      outcome: 'defeat',
      ticks: 400,
      columnLost: 0,
      level: 'historia',
    });
  });
});
