import { describe, expect, it } from 'vitest';
import {
  compileMapDocument,
  coverAgainst,
  createEditableMap,
  toMapDocument,
  type BattleEvent,
  type BattleMap,
  type CoverPoint,
  type EventAction,
  type EventPlace,
  type GunId,
  type SimEvent,
} from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { artilleryHashState, burstHitChance, landShell, MAX_CRATERS, type PendingShell } from '../src/systems/artillery';
import type { MutableUnit } from '../src/systems/model';

/**
 * add-artillery-bombardment 2.2 to 2.5. A medium open field (400 m): the
 * column deploys in the south (y +95), the legalists in the north (y -95).
 * "Mooca" is an area in the middle of the field.
 */
const MOOCA: EventPlace = { id: 1, name: 'Mooca', kind: 'area', polygon: [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }] };
const shelling = (patch: Partial<Extract<EventAction, { kind: 'bombardment' }>> = {}): EventAction => ({
  kind: 'bombardment',
  side: 'legalist',
  gun: 'field-75',
  target: { kind: 'area', area: 1 },
  perMinute: 6,
  spread: 25,
  until: { seconds: 120 },
  ...patch,
});
const event = (id: number, actions: EventAction[], patch: Partial<BattleEvent> = {}): BattleEvent => ({ id, label: `e${id}`, trigger: { kind: 'time', seconds: 1 }, delay: 0, actions, ...patch });

function fieldWith(events: BattleEvent[]): BattleMap {
  const map = createEditableMap({ id: 'artillery-field', size: 'medium', name: { en: 'Artillery', 'pt-BR': 'Artilharia' } });
  return compileMapDocument(toMapDocument({ ...map, events, eventPlaces: [MOOCA] }));
}

type Incoming = Extract<SimEvent, { type: 'shell_incoming' }>;
type Impact = Extract<SimEvent, { type: 'shell_impact' }>;

function battle(events: BattleEvent[], options: { seed?: number; fog?: boolean } = {}) {
  const engine = new SimulationEngine({ seed: options.seed ?? 1924, scenario: 'battle3v3', battleMap: fieldWith(events), ...(options.fog !== undefined ? { fog: options.fog } : {}) });
  const log: SimEvent[] = [];
  const hashes: string[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) {
      const frame = engine.tick();
      log.push(...frame.events);
      hashes.push(frame.hash);
    }
  };
  const incoming = () => log.filter((entry): entry is Incoming => entry.type === 'shell_incoming');
  const impacts = () => log.filter((entry): entry is Impact => entry.type === 'shell_impact');
  return { engine, log, hashes, run, incoming, impacts };
}

/** An engine whose men all stand far away, for shells landed by hand at the middle of the field. */
function lab(seed = 7) {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: fieldWith([event(1, [shelling()], { trigger: { kind: 'time', seconds: 1800 } })]) });
  engine.tick();
  engine.units.forEach((unit, index) => {
    unit.x = -150 + (index % 30) * 10;
    unit.y = unit.faction === 'column' ? 180 : -180;
    unit.path = [];
  });
  const state = engine.scripted!;
  /** Puts a fresh, standing man at (x, y). */
  const fresh = (unit: MutableUnit, x: number, y: number, stance: MutableUnit['stance'] = 'standing') => {
    Object.assign(unit, { x, y, stance, hp: 100, alive: true, incapacitated: false, routed: false, wound: 'none', soldierState: 'healthy', morale: 100, suppression: 0, garrison: undefined });
  };
  const land = (x: number, y: number, gun: GunId = 'field-75', side: 'column' | 'legalist' = 'column') => {
    const events: SimEvent[] = [];
    const shell: PendingShell = { gun, side, x, y, landsAt: engine.tickCount };
    landShell(engine, state, shell, engine.tickCount, events);
    return events;
  };
  return { engine, state, fresh, land };
}

/** The share of `tries` shells landing `distance` m from a fresh man that hit him. */
function hitShare(distance: number, tries: number, options: { stance?: MutableUnit['stance']; covers?: CoverPoint[]; at?: { x: number; y: number }; burst?: { x: number; y: number }; gun?: GunId; side?: 'column' | 'legalist' } = {}) {
  const { engine, fresh, land } = lab();
  if (options.covers) engine.covers.push(...options.covers);
  const man = engine.units.find((unit) => unit.faction === 'legalist')!;
  const at = options.at ?? { x: 0, y: 0 };
  const burst = options.burst ?? { x: at.x + distance, y: at.y };
  let hits = 0;
  for (let index = 0; index < tries; index += 1) {
    fresh(man, at.x, at.y, options.stance);
    const events = land(burst.x, burst.y, options.gun, options.side);
    if (events.some((entry) => entry.type === 'unit_hit' && entry.unitId === man.id)) hits += 1;
    // Craters would shelter the man after the first few shells: clear them.
    engine.covers.splice(0, engine.covers.length, ...engine.covers.filter((cover) => cover.kind !== 'crater'));
  }
  return hits / tries;
}

describe('artillery: the schedule', () => {
  it('announces the first shell when the event fires and lands it 20 ticks later, within the spread', () => {
    const { run, incoming, impacts, log } = battle([event(1, [shelling({ spread: 20, perMinute: 30, until: { seconds: 600 } })])]);
    run(3 * 60 * 10);
    const firedAt = log.find((entry) => entry.type === 'battle_event_fired')!.tick;
    const shells = incoming();
    expect(shells[0]!.tick).toBe(firedAt);
    expect(shells[0]!.landsAt).toBe(firedAt + 20);
    const landed = impacts();
    expect(landed[0]).toMatchObject({ tick: firedAt + 20, x: shells[0]!.x, y: shells[0]!.y });
    expect(shells.length).toBeGreaterThan(70);
    for (const shell of shells) expect(Math.hypot(shell.x, shell.y)).toBeLessThanOrEqual(20.01);
  });

  it('about twelve shells for two minutes at six a minute, none announced after the end, the announced ones still land', () => {
    const { run, incoming, impacts, log } = battle([event(1, [shelling()])]);
    run(3 * 60 * 10);
    const firedAt = log.find((entry) => entry.type === 'battle_event_fired')!.tick;
    const shells = incoming();
    expect(shells.length).toBeGreaterThanOrEqual(10);
    expect(shells.length).toBeLessThanOrEqual(14);
    expect(shells.every((shell) => shell.tick < firedAt + 1200)).toBe(true);
    expect(impacts().length).toBe(shells.length);
  });

  it('stops announcing when the "until" event fires', () => {
    const stop = event(2, [{ kind: 'card', title: { en: 'Cease', 'pt-BR': 'Cessar' }, text: { en: 'fire', 'pt-BR': 'fogo' } }], { trigger: { kind: 'time', seconds: 30 } });
    const { run, incoming, impacts, log } = battle([event(1, [shelling({ perMinute: 30, until: { event: 2 } })]), stop]);
    run(90 * 10);
    const stoppedAt = log.find((entry) => entry.type === 'battle_event_fired' && entry.eventId === 2)!.tick;
    expect(incoming().every((shell) => shell.tick < stoppedAt)).toBe(true);
    expect(incoming().length).toBeGreaterThan(5);
    expect(impacts().length).toBe(incoming().length);
  });

  it('a fifth bombardment replaces the oldest: at most four run at once', () => {
    const { engine, run } = battle([event(1, [shelling(), shelling(), shelling(), shelling()]), event(2, [shelling({ gun: 'howitzer-105' })])]);
    run(30);
    const running = engine.scripted!.bombardments;
    expect(running).toHaveLength(4);
    expect(running.at(-1)!.gun).toBe('howitzer-105');
  });

  it('guns on the enemy fire only on what their side knows of', () => {
    const blind = battle([event(1, [shelling({ target: { kind: 'enemy' }, perMinute: 30 })])], { fog: true });
    // The legalists see nobody at 190 m in the first seconds: no shell is fired.
    blind.run(15 * 10);
    const seenAny = blind.engine.vision.seen.legalist.size + blind.engine.vision.lastSeen.legalist.size;
    if (seenAny === 0) expect(blind.incoming()).toHaveLength(0);
    // With fog off every enemy is known: the shells land among the column.
    const open = battle([event(1, [shelling({ target: { kind: 'enemy' }, perMinute: 30, spread: 5 })])], { fog: false });
    open.run(15 * 10);
    expect(open.incoming().length).toBeGreaterThan(0);
    expect(open.incoming().every((shell) => shell.y > 40)).toBe(true);
  });
});

describe('artillery: damage, cover and suppression', () => {
  it('the hit chance falls with distance as stated', () => {
    expect(burstHitChance('field-75', 2)).toBeCloseTo(0.85);
    expect(burstHitChance('field-75', 10)).toBeCloseTo(0.475);
    expect(burstHitChance('field-75', 14)).toBeCloseTo(0.175);
    expect(burstHitChance('field-75', 16)).toBe(0);
    expect(burstHitChance('howitzer-105', 18)).toBeGreaterThan(0);
  });

  it('falloff: 500 shells at 2, 10 and 14 m hit standing men at those shares, and none at 16 m', () => {
    expect(hitShare(2, 500)).toBeCloseTo(0.85, 1);
    expect(hitShare(10, 500)).toBeCloseTo(0.475, 1);
    expect(hitShare(14, 500)).toBeCloseTo(0.175, 1);
    expect(hitShare(16, 200)).toBe(0);
  });

  it('prone men are hit less than standing men', () => {
    expect(hitShare(8, 400, { stance: 'prone' })).toBeLessThan(hitShare(8, 400) * 0.7);
  });

  it('a trench shelters from behind, but not from a direct hit', () => {
    // A fire trench facing north (y -1); the burst lands 8 m to its south, behind it.
    const trench: CoverPoint = { id: 9001, kind: 'trench', x: 0, y: 0, halfWidth: 3, halfDepth: 1.2, height: 0.25, radius: 2, quality: 0.35, blocksMovement: false, blocksSight: false, facing: { x: 0, y: -1 } };
    const open = hitShare(8, 400, { burst: { x: 0, y: 8 } });
    const dug = hitShare(8, 400, { covers: [trench], burst: { x: 0, y: 8 } });
    expect(dug).toBeLessThan(open * 0.35);
    expect(hitShare(1, 300, { covers: [trench], burst: { x: 1, y: 0 } })).toBeCloseTo(0.85, 1);
  });

  it('shells hit the firing side too', () => {
    expect(hitShare(3, 100, { side: 'legalist' })).toBeGreaterThan(0.6);
  });

  it('two bursts at 8 m pin men in the open; at 25 m they unsettle far less', () => {
    const { engine, fresh, land } = lab(11);
    const men = engine.units.filter((unit) => unit.faction === 'column').slice(0, 4);
    men.forEach((man, index) => fresh(man, index * 1.5, 0));
    land(0.75 * 3 / 2, 8);
    land(0.75 * 3 / 2, -8);
    const standing = men.filter((man) => man.alive && !man.incapacitated);
    expect(standing.length).toBeGreaterThan(0);
    for (const man of standing) {
      expect(man.suppression).toBeGreaterThanOrEqual(70);
      expect(man.morale).toBeLessThan(100);
    }
    const far = lab(11);
    const farMen = far.engine.units.filter((unit) => unit.faction === 'column').slice(0, 4);
    farMen.forEach((man, index) => far.fresh(man, index * 1.5, 0));
    far.land(2, 25);
    far.land(2, -25);
    for (const man of farMen) expect(man.suppression).toBeLessThan(30);
  });
});

describe('artillery: craters', () => {
  it('a shell on open ground leaves a crater that is low cover; none within 3 m of another', () => {
    const { engine, land, state } = lab();
    const events = land(40, 0);
    const impact = events.find((entry): entry is Impact => entry.type === 'shell_impact')!;
    expect(impact.crater).toBeDefined();
    const crater = engine.covers.find((cover) => cover.id === impact.crater)!;
    expect(crater).toMatchObject({ kind: 'crater', blocksMovement: false, blocksSight: false });
    expect(coverAgainst(40, 0, 40, -60, 'prone', engine.covers)).toBeGreaterThan(coverAgainst(40, 0, 40, -60, 'prone', []));
    expect(coverAgainst(40, 0, 40, -60, 'standing', engine.covers)).toBe(0);
    land(41.5, 1);
    expect(state.craters).toBe(1);
  });

  it('no crater inside another cover, and at most forty in a battle', () => {
    const { engine, land, state } = lab();
    engine.covers.push({ id: 9002, kind: 'sandbag', x: -60, y: -60, halfWidth: 1.7, halfDepth: 0.4, height: 1, radius: 2, quality: 0.5, blocksMovement: true, blocksSight: false });
    land(-60, -60);
    expect(state.craters).toBe(0);
    for (let index = 0; index < 60; index += 1) land(-140 + (index % 10) * 28, -60 + Math.floor(index / 10) * 20);
    expect(state.craters).toBe(MAX_CRATERS);
    expect(engine.covers.filter((cover) => cover.kind === 'crater')).toHaveLength(MAX_CRATERS);
  });
});

describe('artillery: determinism', () => {
  it('the same bombardment twice lands the same shells and hashes the same every tick', () => {
    const events = [event(1, [shelling({ perMinute: 20 }), shelling({ target: { kind: 'enemy' }, gun: 'howitzer-105', perMinute: 10 })])];
    const first = battle(events, { seed: 99, fog: false });
    const second = battle(events, { seed: 99, fog: false });
    first.run(1500);
    second.run(1500);
    expect(first.impacts().length).toBeGreaterThan(10);
    expect(second.impacts()).toEqual(first.impacts());
    expect(second.hashes).toEqual(first.hashes);
  });

  it('adds nothing to the hash before a bombardment fires', () => {
    const { engine, run } = battle([event(1, [shelling()], { trigger: { kind: 'time', seconds: 1800 } })]);
    run(50);
    expect(artilleryHashState(engine.scripted!)).toEqual({});
  });
});
