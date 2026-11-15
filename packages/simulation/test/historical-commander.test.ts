import { describe, expect, it } from 'vitest';
import { authoredMapIndex, compileMapDocument, createEditableMap, loadAuthoredMap, toMapDocument, type BattleEvent, type BattleMap, type EventAction, type MapCommander, type Roster, type SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { updateOutcome } from '../src/systems/combat';
import { applyCommandRadius, COMMAND_RALLY_CAP, SELF_RALLY_CAP, selfRally, updateOfficerLoss } from '../src/systems/morale';
import { createScriptedState, updateBattleEvents } from '../src/systems/battle-events';
import type { SimContext } from '../src/systems/context';
import { createBattleMemory } from '../src/systems/enemy-commander';
import type { MutableUnit } from '../src/systems/model';

/**
 * add-historical-commander 2.1-2.5: a medium open field with a campaign
 * column force (Comando first), with or without a commander.
 */
const FORCE: Roster = { sections: ['comando', 'esquadra-5', 'esquadra-5', 'esquadra-4'] };

function field(commander?: MapCommander, events?: BattleEvent[]): BattleMap {
  const map = createEditableMap({ id: 'commander-field', size: 'medium', use: 'campaign', name: { en: 'Field', 'pt-BR': 'Campo' } });
  return compileMapDocument(toMapDocument({ ...map, mission: 'serra-nova', columnForce: FORCE, ...(commander ? { commander } : {}), ...(events ? { events, eventPlaces: [] } : {}) }));
}

const PRESTES: MapCommander = { figure: 'luis-carlos-prestes', presence: 'field', loss: 'defeat' };
const SIQUEIRA: MapCommander = { figure: 'siqueira-campos', presence: 'field', loss: 'continue' };
const ISIDORO: MapCommander = { figure: 'isidoro-dias-lopes', presence: 'voice', loss: 'continue' };

const engineOn = (map: BattleMap, seed = 1926) => new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: map });
const figureOf = (engine: SimulationEngine) => engine.units.find((unit) => unit.figure)!;

/** A column rifleman of another section than the figure's, set where and as the test needs him. */
function rifleman(engine: SimulationEngine, figure: MutableUnit, metres: number, morale: number): MutableUnit {
  const man = engine.units.find((unit) => unit.faction === 'column' && unit.kind === 'infantry' && unit.squadId !== figure.squadId)!;
  Object.assign(man, { x: figure.x + metres, y: figure.y, morale, suppression: 0 });
  return man;
}

/** Puts every other man out of reach so only the figure and the one soldier count. */
function clearAround(engine: SimulationEngine, keep: readonly MutableUnit[]): void {
  for (const unit of engine.units) if (!keep.includes(unit)) Object.assign(unit, { x: unit.faction === 'column' ? 190 : -190, y: unit.faction === 'column' ? 190 : -190 });
}

describe('historical commander: the figure on the field (2.1)', () => {
  it('Prestes at the Verdinho bridge: the Comando officer is the figure, armed as any Comando officer', () => {
    const engine = engineOn(field(PRESTES));
    const figures = engine.units.filter((unit) => unit.figure);
    expect(figures).toHaveLength(1);
    expect(figures[0]).toMatchObject({ faction: 'column', kind: 'officer', sectionType: 'comando' });
    const plain = engineOn(field()).units.find((unit) => unit.id === figures[0]!.id)!;
    for (const key of ['weaponId', 'sidearmId', 'hp', 'speed', 'magazine', 'reserve', 'morale', 'cohesion'] as const) expect(figures[0]![key], key).toEqual(plain[key]);
    expect(engine.frame().units.find((unit) => unit.id === figures[0]!.id)?.figure).toBe(true);
  });

  it('Isidoro as a voice: no unit is the figure, and the battle hashes as one without a commander', () => {
    const voice = engineOn(field(ISIDORO));
    expect(voice.units.some((unit) => unit.figure)).toBe(false);
    const plain = engineOn(field());
    for (let tick = 0; tick < 60; tick += 1) expect(voice.tick().hash).toBe(plain.tick().hash);
  });

  it('only the field map moves the hash', () => {
    expect(engineOn(field(PRESTES)).hashState()).not.toBe(engineOn(field()).hashState());
  });
});

describe('historical commander: command radius (2.2)', () => {
  it('steadier near him: out of fire at 20 m he rallies to 75 and stops there', () => {
    const engine = engineOn(field(PRESTES));
    const figure = figureOf(engine);
    const man = rifleman(engine, figure, 20, 50);
    clearAround(engine, [figure, man]);
    for (let tick = 0; tick < 2000; tick += 1) {
      applyCommandRadius(engine);
      selfRally(engine);
    }
    expect(man.morale).toBe(COMMAND_RALLY_CAP);
  });

  it('beyond the radius: at 40 m he rallies only to 60', () => {
    const engine = engineOn(field(PRESTES));
    const figure = figureOf(engine);
    const man = rifleman(engine, figure, 40, 50);
    clearAround(engine, [figure, man]);
    for (let tick = 0; tick < 2000; tick += 1) {
      applyCommandRadius(engine);
      selfRally(engine);
    }
    expect(man.morale).toBe(SELF_RALLY_CAP);
  });

  it('a fallen or panicked figure commands no one, and legalists are never steadied', () => {
    const engine = engineOn(field(PRESTES));
    const figure = figureOf(engine);
    const man = rifleman(engine, figure, 20, 50);
    const enemy = engine.units.find((unit) => unit.faction === 'legalist')!;
    Object.assign(enemy, { x: figure.x - 20, y: figure.y, morale: 50, suppression: 0 });
    clearAround(engine, [figure, man, enemy]);
    figure.state = 'panicked';
    applyCommandRadius(engine);
    expect(man.morale).toBe(50);
    figure.state = 'steady';
    applyCommandRadius(engine);
    expect(man.morale).toBeCloseTo(50.1);
    expect(enemy.morale).toBe(50);
  });
});

describe('historical commander: losing him (2.3)', () => {
  it('loss is not doubled: killed, a man 10 m away at 60 falls to 35, and the event names the cause', () => {
    const engine = engineOn(field(PRESTES));
    const figure = figureOf(engine);
    const man = rifleman(engine, figure, 10, 60);
    figure.alive = false;
    const events: SimEvent[] = [];
    updateOfficerLoss(engine, 5, events);
    expect(man.morale).toBe(35);
    expect(events.filter((entry) => entry.type === 'commander_down')).toEqual([{ type: 'commander_down', tick: 5, unitId: figure.id, cause: 'killed' }]);
  });

  it('the loss reaches 40 m, not the ordinary officer’s 25', () => {
    const engine = engineOn(field(PRESTES));
    const figure = figureOf(engine);
    const man = rifleman(engine, figure, 35, 60);
    figure.incapacitated = true;
    updateOfficerLoss(engine, 5, []);
    expect(man.morale).toBe(35);
  });

  it('Prestes falls at Serra Nova: incapacitated on a defeat map, the battle ends decided by the commander', () => {
    const engine = engineOn(field(PRESTES));
    figureOf(engine).incapacitated = true;
    const events: SimEvent[] = [];
    updateOutcome(engine, 7, events);
    expect(engine.outcome).toBe('defeat');
    expect(events).toContainEqual(expect.objectContaining({ type: 'outcome', outcome: 'defeat', decidedBy: 'commander' }));
  });

  it('continue: the battle goes on, the event comes once, and the radius resumes when he recovers', () => {
    const engine = engineOn(field(SIQUEIRA));
    const figure = figureOf(engine);
    const man = rifleman(engine, figure, 20, 50);
    clearAround(engine, [figure, man]);
    figure.incapacitated = true;
    const events: SimEvent[] = [];
    updateOfficerLoss(engine, 3, events);
    updateOfficerLoss(engine, 4, events);
    updateOutcome(engine, 4, events);
    expect(events.filter((entry) => entry.type === 'commander_down')).toHaveLength(1);
    expect(engine.outcome).toBe('playing');
    const before = man.morale;
    applyCommandRadius(engine);
    expect(man.morale).toBe(before);
    figure.incapacitated = false;
    updateOfficerLoss(engine, 5, events);
    expect(figure.officerLossApplied).toBe(false);
    applyCommandRadius(engine);
    expect(man.morale).toBeCloseTo(before + 0.1);
  });
});

describe('historical commander: the "commander down" trigger (2.4)', () => {
  const CARD: EventAction = { kind: 'card', title: { en: 'Siqueira falls', 'pt-BR': 'Siqueira cai' }, text: { en: 'Text', 'pt-BR': 'Texto' } };
  const DOWN: BattleEvent = { id: 1, label: 'down', trigger: { kind: 'commander' }, delay: 0, actions: [CARD] };

  it('commander down with a card: fires on the tick he falls and not before', () => {
    const ctx = {
      scripted: createScriptedState([DOWN], []),
      units: [{ id: 1, faction: 'column', figure: true, alive: true, incapacitated: false, routed: false, dummy: false, x: 0, y: 0 } as MutableUnit],
      objectives: [],
      battleStartTick: 0,
      battle: createBattleMemory(),
    };
    const log: SimEvent[] = [];
    const step = (tick: number) => updateBattleEvents(ctx as unknown as SimContext, tick, log);
    step(1);
    expect(log.filter((entry) => entry.type === 'battle_event_fired')).toEqual([]);
    ctx.units[0]!.incapacitated = true;
    step(2);
    expect(log.filter((entry) => entry.type === 'battle_event_fired')).toMatchObject([{ tick: 2, eventId: 1, cards: [{ title: { en: 'Siqueira falls' } }] }]);
  });

  it('the trigger survives the document round trip', () => {
    expect(field(SIQUEIRA, [DOWN]).events?.[0]?.trigger).toEqual({ kind: 'commander' });
  });
});

describe('historical commander: determinism (2.5)', () => {
  it('a field-commander battle played twice gives the same hash on every tick', () => {
    const map = field(PRESTES);
    const first = engineOn(map, 1925);
    const second = engineOn(map, 1925);
    for (let tick = 0; tick < 600; tick += 1) expect(first.tick().hash, `tick ${tick}`).toBe(second.tick().hash);
  });
});

describe('historical commander: the campaign maps (5.1, 5.3)', () => {
  const EXPECTED: Record<string, MapCommander> = {
    copacabana: { figure: 'siqueira-campos', presence: 'field', loss: 'continue' },
    'sao-luiz-ramada': { figure: 'luis-carlos-prestes', presence: 'field', loss: 'defeat' },
    'porto-mendes': { figure: 'miguel-costa', presence: 'field', loss: 'defeat' },
    catanduvas: { figure: 'isidoro-dias-lopes', presence: 'voice', loss: 'continue' },
    'ponte-de-verdinho': { figure: 'luis-carlos-prestes', presence: 'field', loss: 'defeat' },
    'serra-nova': { figure: 'luis-carlos-prestes', presence: 'field', loss: 'defeat' },
    pantanal: { figure: 'luis-carlos-prestes', presence: 'field', loss: 'defeat' },
    'la-gaiba': { figure: 'luis-carlos-prestes', presence: 'field', loss: 'continue' },
  };

  it('every campaign map declares its chapter commander with the presence and outcome of the spec', async () => {
    const campaign = authoredMapIndex().filter((entry) => entry.use === 'campaign');
    expect(campaign.map((entry) => entry.id).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const entry of campaign) {
      const document = await loadAuthoredMap(entry.id);
      expect(document?.commander, entry.id).toEqual(EXPECTED[entry.id]);
    }
  });

  it('Siqueira Campos falls on the avenue: the battle goes on, the event is emitted and the card comes', async () => {
    const document = (await loadAuthoredMap('copacabana'))!;
    const engine = engineOn(compileMapDocument(document), 1922);
    const figure = figureOf(engine);
    expect(figure).toBeDefined();
    figure.incapacitated = true;
    const log: SimEvent[] = [];
    for (let tick = 0; tick < 3; tick += 1) log.push(...engine.tick().events);
    expect(log.filter((entry) => entry.type === 'commander_down')).toHaveLength(1);
    expect(engine.outcome).toBe('playing');
    expect(log).toContainEqual(expect.objectContaining({ type: 'battle_event_fired', eventId: 8 }));
  });
});
