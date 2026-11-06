import { fileURLToPath } from 'node:url';
import { battleMap, type BattleMap, type BattleMapId, type Frame, type UnitSnapshot } from '../packages/shared/src';
import { SimulationEngine } from '../packages/simulation/src/engine';

/**
 * Battle feel report (battle-feel-3v3): runs the 3v3 headless with the
 * player holding his line and counterattacking once he outnumbers the enemy
 * (the game loop the playtests found), and measures how the fight plays.
 * Under fog of war the player knows only what his side sees.
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
  /** Largest share of a side's fit soldiers with a mate within 1 m. */
  bunching: number;
  /** Seconds until the player's side first sees an enemy (fog-of-war). */
  firstSight: number;
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
 * The enemy's line, where the player looks for him when he sees no one (a map
 * fact): 12 m in front of the legalist start (y -78 on the Vila Militar field).
 */
function enemyLine(map: BattleMap): { x: number; y: number } {
  const zone = map.deployment.legalist;
  const x = zone.sections.reduce((sum, point) => sum + point.x, 0) / zone.sections.length;
  const y = zone.sections.reduce((sum, point) => sum + point.y, 0) / zone.sections.length;
  return { x, y: y + zone.facing.y * 12 };
}

interface ScriptState {
  map: BattleMap;
  countering: boolean;
  /** Enemy soldiers the player saw fall (fog-of-war: his only count of the enemy's losses). */
  seenDown: Set<number>;
}

/**
 * The player's script, the 3v3's game loop: hold the section's own line,
 * break the enemy's attack, then counterattack once he clearly outnumbers the
 * enemy. Under fog of war he knows only what his side sees: he estimates the
 * enemy as 33 less the casualties he saw, attacks the nearest enemy he sees,
 * and with no one in sight advances on the enemy's line.
 */
function orderPlayer(engine: SimulationEngine, frame: Frame, state: ScriptState): void {
  const own = frame.units.filter((unit) => unit.faction === 'column' && fit(unit));
  const seen = new Set(frame.fog && frame.seen ? frame.seen.column : frame.units.map((unit) => unit.id));
  for (const unit of frame.units) {
    if (unit.faction === 'legalist' && seen.has(unit.id) && !fit(unit)) state.seenDown.add(unit.id);
  }
  const enemies = frame.units.filter((unit) => unit.faction === 'legalist' && fit(unit) && seen.has(unit.id));
  const estimate = frame.units.filter((unit) => unit.faction === 'legalist').length - state.seenDown.size;
  if (frame.tick === 0) {
    // Each section holds its own line, 10 m in front of its start.
    const zone = state.map.deployment.column;
    zone.sections.forEach((start, index) => {
      const ids = own.filter((unit) => unit.squadId === index + 1).map((unit) => unit.id);
      engine.enqueue({
        type: 'order',
        order: 'defend',
        unitIds: ids,
        to: { x: start.x, y: start.y + zone.facing.y * 10 },
        facing: zone.facing,
      });
    });
    return;
  }
  if (!state.countering && own.length >= estimate * COUNTER_AT) state.countering = true;
  if (!state.countering) return;
  for (const squad of new Set(own.map((unit) => unit.squadId))) {
    const section = own.filter((unit) => unit.squadId === squad);
    const busy = section.some((unit) => {
      if (unit.order === 'advance' && unit.gait !== undefined) return true;
      if (unit.order !== 'attack' || unit.targetId === null) return false;
      const target = frame.units.find((entry) => entry.id === unit.targetId);
      return target !== undefined && fit(target);
    });
    if (busy) continue;
    const ids = section.map((unit) => unit.id);
    if (enemies.length === 0) {
      engine.enqueue({ type: 'order', order: 'advance', unitIds: ids, to: enemyLine(state.map) });
      continue;
    }
    const centre = centroid(section);
    const nearest = enemies.reduce((best, unit) =>
      (unit.x - centre.x) ** 2 + (unit.y - centre.y) ** 2 < (best.x - centre.x) ** 2 + (best.y - centre.y) ** 2 ? unit : best,
    );
    engine.enqueue({ type: 'attack', unitIds: ids, targetId: nearest.id });
  }
}

/** Ticks between yields to the event loop (a test worker must keep answering its runner). */
const YIELD_EVERY = 500;

export async function battleReport(
  seed = 1922,
  maxSeconds = 900,
  mapId: BattleMapId = 'vila-militar',
): Promise<BattleReport> {
  const map = battleMap(mapId);
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, battleMap: mapId });
  let frame = engine.frame();
  const faction = new Map(frame.units.map((unit) => [unit.id, unit.faction]));
  const casualties = { column: 0, legalist: 0 };
  const down = new Set<number>();
  let shots = 0;
  let maxShotsPerTick = 0;
  let firstShot = -1;
  let bunching = 0;
  let silenceStart = 0;
  let longestSilence = 0;
  let outcome: BattleReport['outcome'] = 'none';
  const script: ScriptState = { map, countering: false, seenDown: new Set() };
  let firstSight = -1;
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
    if (firstSight < 0 && (frame.seen?.column.length ?? 0) > 0) firstSight = frame.tick;
    if (frame.tick % 10 === 0) bunching = Math.max(bunching, bunchedShare(frame, 'column'), bunchedShare(frame, 'legalist'));
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
    bunching: Number(bunching.toFixed(2)),
    firstSight: firstSight < 0 ? -1 : firstSight / 10,
  };
}

/**
 * Closer than a man's width: soldiers in a line 1.2 to 1.4 m apart (a trench
 * line) are not bunched; a mate within this is (the pairs half a metre apart
 * of the old slot layout).
 */
const CROWDED = 1.0;

/** Share of a side's fit soldiers (6 or more) who stand halted with a fit mate within CROWDED m. */
export function bunchedShare(frame: Frame, faction: 'column' | 'legalist'): number {
  const side = frame.units.filter((unit) => unit.faction === faction && fit(unit));
  // A handful of survivors together is not a bunched section.
  if (side.length < 6) return 0;
  // Men passing each other on the move are not bunched: only halted men count,
  // and only next to halted mates.
  const halted = side.filter((unit) => unit.gait === undefined);
  const crowded = halted.filter(
    (unit) => halted.some((mate) => mate !== unit && (mate.x - unit.x) ** 2 + (mate.y - unit.y) ** 2 < CROWDED * CROWDED),
  ).length;
  return crowded / side.length;
}

function bothSidesFit(frame: Frame): boolean {
  return (
    frame.units.some((unit) => unit.faction === 'column' && fit(unit)) &&
    frame.units.some((unit) => unit.faction === 'legalist' && fit(unit))
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // pnpm battle:report [--map fazenda] [seed ...]
  const args = process.argv.slice(2);
  const mapAt = args.indexOf('--map');
  const map = (mapAt >= 0 ? args[mapAt + 1] : 'vila-militar') as BattleMapId;
  const seeds = args.filter((_, index) => index !== mapAt && index !== mapAt + 1).map(Number).filter((value) => Number.isFinite(value));
  for (const seed of seeds.length > 0 ? seeds : [1922]) {
    console.log(JSON.stringify({ map, ...(await battleReport(seed, 900, map)) }));
  }
}
