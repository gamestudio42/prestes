import { fileURLToPath } from 'node:url';
import type { Frame, UnitSnapshot } from '../packages/shared/src';
import { SimulationEngine } from '../packages/simulation/src/engine';

/**
 * Battle feel report (battle-feel-3v3): runs the 3v3 headless with the
 * player holding his line and counterattacking once he outnumbers the enemy
 * (the game loop the playtests found), and measures how the fight plays.
 */

export interface BattleReport {
  seed: number;
  /** Simulated seconds until the outcome (or the cap). */
  seconds: number;
  outcome: 'victory' | 'defeat' | 'none';
  shots: number;
  casualties: { column: number; legalist: number };
  shotsPerCasualty: number;
  /** Most shots fired on any one tick, by both sides. */
  maxShotsPerTick: number;
  /** Longest stretch (s) with no shot while both sides had fit soldiers. */
  longestSilence: number;
  /** Seconds until the first shot. */
  firstShot: number;
}

const ORDER_EVERY = 50;

function fit(unit: UnitSnapshot): boolean {
  return unit.alive && !unit.incapacitated && !unit.routed;
}

function centroid(units: readonly UnitSnapshot[]): { x: number; y: number } {
  return {
    x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
    y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
  };
}

/** The player counterattacks once he has this many fit soldiers per enemy. */
const COUNTER_AT = 1.25;

/**
 * The player's script, the 3v3's game loop: hold the section's own line,
 * break the enemy's attack, then counterattack with every section, each on
 * the enemy nearest to it, once the player clearly outnumbers him.
 */
function orderPlayer(engine: SimulationEngine, frame: Frame, state: { countering: boolean }): void {
  const own = frame.units.filter((unit) => unit.faction === 'column' && fit(unit));
  const enemies = frame.units.filter((unit) => unit.faction === 'legalist' && fit(unit));
  if (frame.tick === 0) {
    for (const [squad, x] of [[1, -44], [2, 0], [3, 44]] as const) {
      const ids = own.filter((unit) => unit.squadId === squad).map((unit) => unit.id);
      engine.enqueue({ type: 'order', order: 'defend', unitIds: ids, to: { x, y: 80 }, facing: { x: 0, y: -1 } });
    }
    return;
  }
  if (!state.countering && own.length >= enemies.length * COUNTER_AT) state.countering = true;
  if (!state.countering || enemies.length === 0) return;
  for (const squad of new Set(own.map((unit) => unit.squadId))) {
    const section = own.filter((unit) => unit.squadId === squad);
    const engaged = section.some((unit) => {
      if (unit.order !== 'attack' || unit.targetId === null) return false;
      const target = frame.units.find((entry) => entry.id === unit.targetId);
      return target !== undefined && fit(target);
    });
    if (engaged) continue;
    const centre = centroid(section);
    const nearest = enemies.reduce((best, unit) =>
      (unit.x - centre.x) ** 2 + (unit.y - centre.y) ** 2 < (best.x - centre.x) ** 2 + (best.y - centre.y) ** 2 ? unit : best,
    );
    engine.enqueue({ type: 'attack', unitIds: section.map((unit) => unit.id), targetId: nearest.id });
  }
}

/** Ticks between yields to the event loop (a test worker must keep answering its runner). */
const YIELD_EVERY = 500;

export async function battleReport(seed = 1922, maxSeconds = 900): Promise<BattleReport> {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true });
  let frame = engine.frame();
  const faction = new Map(frame.units.map((unit) => [unit.id, unit.faction]));
  const casualties = { column: 0, legalist: 0 };
  const down = new Set<number>();
  let shots = 0;
  let maxShotsPerTick = 0;
  let firstShot = -1;
  let silenceStart = 0;
  let longestSilence = 0;
  let outcome: BattleReport['outcome'] = 'none';
  const script = { countering: false };
  const maxTicks = maxSeconds * 10;
  for (let tick = 0; tick < maxTicks && outcome === 'none'; tick += 1) {
    if (tick % YIELD_EVERY === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    if (tick % ORDER_EVERY === 0) orderPlayer(engine, frame, script);
    frame = engine.runTicks(1);
    let tickShots = 0;
    for (const event of frame.events) {
      if (event.type === 'shot') tickShots += 1;
      // A death after incapacitation is the same casualty, counted once.
      if ((event.type === 'unit_incapacitated' || event.type === 'unit_died') && !down.has(event.unitId)) {
        down.add(event.unitId);
        const side = faction.get(event.unitId);
        if (side === 'column' || side === 'legalist') casualties[side] += 1;
      }
      if (event.type === 'outcome' && event.outcome !== 'playing') outcome = event.outcome;
    }
    shots += tickShots;
    maxShotsPerTick = Math.max(maxShotsPerTick, tickShots);
    if (tickShots > 0) {
      if (firstShot < 0) firstShot = frame.tick;
      silenceStart = frame.tick;
    } else if (firstShot >= 0 && bothSidesFit(frame)) {
      longestSilence = Math.max(longestSilence, frame.tick - silenceStart);
    }
  }
  const fallen = casualties.column + casualties.legalist;
  return {
    seed,
    seconds: frame.tick / 10,
    outcome,
    shots,
    casualties,
    shotsPerCasualty: fallen === 0 ? shots : Number((shots / fallen).toFixed(1)),
    maxShotsPerTick,
    longestSilence: longestSilence / 10,
    firstShot: firstShot < 0 ? -1 : firstShot / 10,
  };
}

function bothSidesFit(frame: Frame): boolean {
  return (
    frame.units.some((unit) => unit.faction === 'column' && fit(unit)) &&
    frame.units.some((unit) => unit.faction === 'legalist' && fit(unit))
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const seeds = process.argv.slice(2).map(Number).filter((value) => Number.isFinite(value));
  for (const seed of seeds.length > 0 ? seeds : [1922]) {
    console.log(JSON.stringify(await battleReport(seed)));
  }
}
