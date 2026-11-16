import { fileURLToPath } from 'node:url';
import { battleMap, DEFAULT_BATTLE_MAP, isDifficulty, type Difficulty, type DifficultyFactors, hasBattleMap, loadAuthoredMap, type BattleMap, type BattleMapId, type BattleRosters, type DecidedBy, type Frame, type Roster, type UnitSnapshot, type WeaponId, getWeapon } from '../packages/shared/src';
import { SimulationEngine } from '../packages/simulation/src/engine';
import { visible } from '../packages/simulation/src/systems/combat';

/**
 * Battle feel report (battle-feel-3v3): runs the 3v3 headless with the
 * player holding his line, then counterattacking once he outnumbers the enemy
 * or is behind on the objectives (the game loop the playtests found), and
 * measures how the fight plays. Under fog of war the player knows only what
 * his side sees; objective owners are public.
 */

export interface BattleReport {
  seed: number;
  /** Simulated seconds until the outcome (or the cap). */
  seconds: number;
  outcome: 'victory' | 'defeat' | 'draw' | 'none';
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
  /** add-map-objectives 4.1: how the battle was decided, and the objectives at the end. */
  decidedBy?: DecidedBy;
  objectives: Array<{
    id: number;
    name: string;
    value: number;
    owner: 'neutral' | 'column' | 'legalist';
    /** Seconds into the battle when the objective was last taken, or null. */
    capturedAt: number | null;
  }>;
  /** machine-gun-fire-feedback 1.1: rounds, bursts (aimed shots count as one each) and hits, per side and weapon. */
  weapons: Record<'column' | 'legalist', Partial<Record<WeaponId, WeaponFire>>>;
  /** Per side with a machine gun: share of the ticks its gunner had a target in sight and reach during which the gun was set. */
  gunSetShare: Partial<Record<'column' | 'legalist', number>>;
  /** garrison-and-assault 3.4 / 5.1: men who went into a position, and close assaults started and won, per side. */
  garrison: { entered: Record<'column' | 'legalist', number>; assaults: number; assaultsWon: Record<'column' | 'legalist', number> };
}

export interface WeaponFire {
  rounds: number;
  bursts: number;
  hits: number;
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
  /** pre-battle-roster 6.1: a rostered battle; its sections hold 10 m in front of where they deployed. */
  rostered: boolean;
  countering: boolean;
  /** Enemy soldiers the player saw fall (fog-of-war: his only count of the enemy's losses). */
  seenDown: Set<number>;
}

/** The objective owners as the frame carries them (public), over the map's values. */
function ownersOf(frame: Frame): Map<number, 'neutral' | 'column' | 'legalist'> {
  return new Map((frame.objectives ?? []).map((objective) => [objective.id, objective.owner]));
}

/** Each side's objective value at this frame. */
function objectiveValuesOf(map: BattleMap, frame: Frame): { column: number; legalist: number } {
  const owners = ownersOf(frame);
  const values = { column: 0, legalist: 0 };
  for (const objective of map.objectives ?? []) {
    const owner = owners.get(objective.id) ?? objective.owner;
    if (owner === 'column') values.column += objective.value;
    else if (owner === 'legalist') values.legalist += objective.value;
  }
  return values;
}

/**
 * add-map-objectives 4.1: the objective of most value the column does not
 * hold (ties: nearest to `from`, then id). The player attacks objectives, not
 * a fixed line, so a stand-off cannot win for him.
 */
function targetObjective(map: BattleMap, frame: Frame, from: { x: number; y: number }): { x: number; y: number } | null {
  const owners = ownersOf(frame);
  let best: { x: number; y: number; value: number; distance: number; id: number } | null = null;
  for (const objective of map.objectives ?? []) {
    const owner = owners.get(objective.id) ?? objective.owner;
    if (owner === 'column') continue;
    const distance = (objective.flag.x - from.x) ** 2 + (objective.flag.y - from.y) ** 2;
    if (
      best === null ||
      objective.value > best.value ||
      (objective.value === best.value &&
        (distance < best.distance || (distance === best.distance && objective.id < best.id)))
    ) {
      best = { x: objective.flag.x, y: objective.flag.y, value: objective.value, distance, id: objective.id };
    }
  }
  return best === null ? null : { x: best.x, y: best.y };
}

/**
 * The player's script, the 3v3's game loop: hold the section's own line,
 * break the enemy's attack, then counterattack once he clearly outnumbers the
 * enemy or he holds less objective value. Under fog of war he knows only what
 * his side sees: he estimates the enemy as 33 less the casualties he saw,
 * attacks the nearest enemy he sees, and with no one in sight goes for the
 * objective of most value he does not hold.
 */
function orderPlayer(engine: SimulationEngine, frame: Frame, state: ScriptState): void {
  const own = frame.units.filter((unit) => unit.faction === 'column' && fit(unit));
  const seen = new Set(frame.fog && frame.seen ? frame.seen.column : frame.units.map((unit) => unit.id));
  for (const unit of frame.units) {
    if (unit.faction === 'legalist' && seen.has(unit.id) && !fit(unit)) state.seenDown.add(unit.id);
  }
  const enemies = frame.units.filter((unit) => unit.faction === 'legalist' && fit(unit) && seen.has(unit.id));
  const estimate = frame.units.filter((unit) => unit.faction === 'legalist').length - state.seenDown.size;
  if (frame.tick === 0 && state.rostered) {
    const zone = state.map.deployment.column;
    for (const squad of new Set(own.map((unit) => unit.squadId))) {
      const section = own.filter((unit) => unit.squadId === squad);
      const centre = centroid(section);
      engine.enqueue({
        type: 'order',
        order: 'defend',
        unitIds: section.map((unit) => unit.id),
        to: { x: centre.x, y: centre.y + zone.facing.y * 10 },
        facing: zone.facing,
      });
    }
    return;
  }
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
  const values = objectiveValuesOf(state.map, frame);
  if (!state.countering && (own.length >= estimate * COUNTER_AT || values.column < values.legalist)) state.countering = true;
  if (!state.countering) return;
  // add-map-objectives 4.1: the whole force goes for one objective, the most
  // valuable he does not hold (a split force only lengthens the fight).
  const objectiveGoal = targetObjective(state.map, frame, centroid(own));
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
      // add-map-objectives 4.1: go for the objective of most value he does not
      // hold; only when he holds them all does he look for the enemy's line.
      engine.enqueue({ type: 'order', order: 'advance', unitIds: ids, to: objectiveGoal ?? enemyLine(state.map) });
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

/**
 * add-map-objectives 4.1: the report's battle runs with the 15-minute clock,
 * so every run ends on the clock at the latest and the bands measure the
 * game's own limit.
 */
export const REPORT_TIME_LIMIT_SECONDS = 900;
const REPORT_TIME_LIMIT_TICKS = REPORT_TIME_LIMIT_SECONDS * 10;

export async function battleReport(
  seed = 1922,
  maxSeconds = 900,
  mapId: BattleMapId = DEFAULT_BATTLE_MAP,
  rosters?: BattleRosters,
  /** add-deployment-phase 4.1: the enemy places itself on the map's cover before the battle. */
  enemyDeployment = false,
  /** add-difficulty-levels 4.1: the level (Soldado by default) and, for tuning, factors over it. */
  level: { difficulty?: Difficulty; factors?: Partial<DifficultyFactors>; economy?: boolean } = {},
): Promise<BattleReport> {
  // author-game-maps 3.3: any authored map loads on demand (the test map by default).
  if (!hasBattleMap(mapId)) throw new Error(`unknown battle map ${mapId}`);
  await loadAuthoredMap(mapId);
  const map = battleMap(mapId);
  const engine = new SimulationEngine({
    seed,
    scenario: 'battle3v3',
    sandbox: true,
    battleMap: mapId,
    rosters,
    enemyDeployment,
    timeLimitTicks: REPORT_TIME_LIMIT_TICKS,
    ...(level.difficulty ? { difficulty: level.difficulty } : {}),
    ...(level.factors ? { factors: level.factors } : {}),
  });
  // add-difficulty-levels D6: on request (tuning) the scripted player spares his rounds; by default he fires freely.
  if (level.economy === true) {
    const column = engine.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
    engine.enqueue({ type: 'fire_control', unitIds: column, mode: 'economy' });
  }
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
  let decidedBy: DecidedBy | undefined;
  const capturedAt = new Map<number, number>();
  const script: ScriptState = { map, rostered: rosters !== undefined, countering: false, seenDown: new Set() };
  let firstSight = -1;
  const weapons: BattleReport['weapons'] = { column: {}, legalist: {} };
  const gunTicks = { column: { targeted: 0, set: 0 }, legalist: { targeted: 0, set: 0 } };
  const unitById = new Map(engine.units.map((unit) => [unit.id, unit]));
  const garrison: BattleReport['garrison'] = { entered: { column: 0, legalist: 0 }, assaults: 0, assaultsWon: { column: 0, legalist: 0 } };
  const maxTicks = maxSeconds * 10;
  for (let tick = 0; tick < maxTicks && outcome === 'none'; tick += 1) {
    if (tick % YIELD_EVERY === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    if (tick % ORDER_EVERY === 0) orderPlayer(engine, frame, script);
    frame = engine.runTicks(1);
    let tickShots = 0;
    for (const event of frame.events) {
      if (event.type === 'shot') {
        tickShots += 1;
        const shooter = unitById.get(event.source);
        if (shooter && (shooter.faction === 'column' || shooter.faction === 'legalist')) {
          const fire = (weapons[shooter.faction][shooter.weaponId] ??= { rounds: 0, bursts: 0, hits: 0 });
          fire.rounds += 1;
          if (event.burstStart !== false) fire.bursts += 1;
          if (event.hit) fire.hits += 1;
        }
      }
      // A death after incapacitation is the same casualty, counted once.
      if ((event.type === 'unit_incapacitated' || event.type === 'unit_died') && !down.has(event.unitId)) {
        down.add(event.unitId);
        const side = faction.get(event.unitId);
        if (side === 'column' || side === 'legalist') casualties[side] += 1;
      }
      if (event.type === 'outcome' && event.outcome !== 'playing') {
        outcome = event.outcome;
        decidedBy = event.decidedBy;
      }
      if (event.type === 'objective_taken') capturedAt.set(event.id, frame.tick / 10);
      if (event.type === 'unit_entered') {
        const side = faction.get(event.unitId);
        if (side === 'column' || side === 'legalist') garrison.entered[side] += 1;
      }
      if (event.type === 'assault_started') garrison.assaults += 1;
      if (event.type === 'assault_ended') garrison.assaultsWon[event.winner] += 1;
    }
    shots += tickShots;
    for (const unit of engine.units) {
      if (unit.faction !== 'column' && unit.faction !== 'legalist') continue;
      if (!unit.alive || unit.incapacitated || unit.targetId === null) continue;
      const weapon = getWeapon(unit.weaponId);
      if (weapon?.fire !== 'belt') continue;
      // A target he can fire on: an attack keeps its objective out of sight too.
      const target = unitById.get(unit.targetId);
      if (!target || !target.alive || target.incapacitated || !visible(engine, unit, target)) continue;
      gunTicks[unit.faction].targeted += 1;
      if ((unit.gunStill ?? 0) >= (weapon.setupTicks ?? 0)) gunTicks[unit.faction].set += 1;
    }
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
  const owners = new Map((frame.objectives ?? []).map((objective) => [objective.id, objective.owner]));
  return {
    seed,
    seconds: frame.tick / 10,
    outcome,
    ...(decidedBy === undefined ? {} : { decidedBy }),
    objectives: (map.objectives ?? []).map((objective) => ({
      id: objective.id,
      name: objective.name.en,
      value: objective.value,
      owner: owners.get(objective.id) ?? objective.owner,
      capturedAt: capturedAt.get(objective.id) ?? null,
    })),
    shots,
    casualties,
    shotsPerCasualty: fallen === 0 ? shots : Number((shots / fallen).toFixed(1)),
    maxShotsPerTick,
    longestSilence: longestSilence / 10,
    firstShot: firstShot < 0 ? -1 : firstShot / 10,
    bunching: Number(bunching.toFixed(2)),
    firstSight: firstSight < 0 ? -1 : firstSight / 10,
    weapons,
    garrison,
    gunSetShare: Object.fromEntries(
      (['column', 'legalist'] as const)
        .filter((side) => gunTicks[side].targeted > 0)
        .map((side) => [side, Number((gunTicks[side].set / gunTicks[side].targeted).toFixed(2))]),
    ),
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

/** pre-battle-roster 6.1: a full mixed force of 33 for the player. */
export const MIXED_PLAYER: Roster = { sections: ['comando', 'metralhadora', 'esquadra-5', 'fuzileiros', 'irregulares', 'esquadra-4'] };
export const DEFAULT_PLAYER: Roster = { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] };
/** faction-armies 4.1: the enemy pairings the report compares: regulars, patriots, and a mix of both armies. */
export const ARMY_PAIRINGS: readonly (readonly [string, Roster])[] = [
  ['legalista', { sections: ['comando-companhia', 'infantaria-exercito', 'brigada-militar', 'metralhadora-legalista', 'fuzil-metralhador-legalista'] }],
  ['patriotico', { sections: ['voluntarios', 'voluntarios', 'jaguncos-mauser', 'jaguncos-mauser'] }],
  ['mix', { sections: ['comando-companhia', 'infantaria-exercito', 'jaguncos-mauser', 'jaguncos-mauser', 'cangaceiros'] }],
];
export const PRESET_SEEDS = [1922, 1924, 1925];

/** The battle-lab feel bands (spec "Report within bands"); null when the report is inside them. */
export function outsideBands(report: BattleReport): string | null {
  const misses: string[] = [];
  // add-map-objectives 4.1: the battle must end within its own 15-minute clock.
  if (report.seconds < 180 || report.seconds > REPORT_TIME_LIMIT_SECONDS) misses.push(`time ${report.seconds}s`);
  if (report.maxShotsPerTick > 8) misses.push(`shots/tick ${report.maxShotsPerTick}`);
  if (report.longestSilence > 120) misses.push(`silence ${report.longestSilence}s`);
  if (report.bunching >= 0.15) misses.push(`bunching ${report.bunching}`);
  // machine-gun-fire-feedback 2.4: the player's gun is set while it has a target.
  const gunSet = report.gunSetShare.column;
  if (gunSet !== undefined && gunSet < GUN_SET_BAND) misses.push(`gun set ${gunSet}`);
  return misses.length > 0 ? misses.join(', ') : null;
}

/** Least share of its targeted time the player's machine gun is set (battle-lab band). */
// faction-armies 3.4 (owner, 2026-11-11): 0.7 -> 0.5; the enemy's make-up moves the share (0.45-1.0 measured).
export const GUN_SET_BAND = 0.5;

function gunFire(report: BattleReport): string {
  const fire = report.weapons.column['metralhadora-7mm'];
  return fire ? `${fire.rounds}/${fire.bursts}/${fire.hits}` : '-';
}

/** author-game-maps 3.3: the tables run on the test map, or on the map `--map` names. */
async function reportMaps(id: BattleMapId): Promise<BattleMap[]> {
  await loadAuthoredMap(id);
  return [battleMap(id)];
}

async function presetTable(id: BattleMapId): Promise<void> {
  console.log('| Map | Enemy | Player | Seed | Time (s) | Outcome | Decided | Cas. col/leg | Shots/cas. | Max shots/tick | Silence (s) | Bunching | MG rounds/bursts/hits | Gun set | Bands |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const map of await reportMaps(id)) {
    for (const [index, enemy] of (map.enemyForces ?? []).entries()) {
      for (const [name, player] of [['default', DEFAULT_PLAYER], ['mixed', MIXED_PLAYER]] as const) {
        for (const seed of PRESET_SEEDS) {
          const report = await battleReport(seed, 900, map.id, { column: player, legalist: enemy });
          const r = report;
          console.log(
            `| ${map.id} | ${String.fromCharCode(65 + index)} | ${name} | ${seed} | ${r.seconds} | ${r.outcome} | ${r.decidedBy ?? '-'} | ${r.casualties.column}/${r.casualties.legalist} | ${r.shotsPerCasualty} | ${r.maxShotsPerTick} | ${r.longestSilence} | ${r.bunching} | ${gunFire(r)} | ${r.gunSetShare.column ?? '-'} | ${outsideBands(r) ?? 'ok'} |`,
          );
        }
      }
    }
  }
}

/** faction-armies 4.1: the column against each enemy army pairing, three seeds. */
async function armiesTable(id: BattleMapId): Promise<void> {
  console.log('| Map | Enemy army | Player | Seed | Time (s) | Outcome | Decided | Cas. col/leg | Bands |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const map of await reportMaps(id)) {
    for (const [army, enemy] of ARMY_PAIRINGS) {
      for (const seed of PRESET_SEEDS) {
        const r = await battleReport(seed, 900, map.id, { column: MIXED_PLAYER, legalist: enemy });
        console.log(`| ${map.id} | ${army} | mixed | ${seed} | ${r.seconds} | ${r.outcome} | ${r.decidedBy ?? '-'} | ${r.casualties.column}/${r.casualties.legalist} | ${outsideBands(r) ?? 'ok'} |`);
      }
    }
  }
}

/** add-deployment-phase 4.1: every map, three seeds, the enemy where it starts and deployed on cover. */
async function deploymentTable(id: BattleMapId): Promise<void> {
  console.log('| Map | Enemy deployed | Seed | Time (s) | Outcome | Decided | Cas. col/leg | Shots/cas. | Max shots/tick | Silence (s) | Bunching | Bands |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const map of await reportMaps(id)) {
    for (const deployed of [false, true]) {
      for (const seed of PRESET_SEEDS) {
        const r = await battleReport(seed, 900, map.id, undefined, deployed);
        console.log(
          `| ${map.id} | ${deployed ? 'yes' : 'no'} | ${seed} | ${r.seconds} | ${r.outcome} | ${r.decidedBy ?? '-'} | ${r.casualties.column}/${r.casualties.legalist} | ${r.shotsPerCasualty} | ${r.maxShotsPerTick} | ${r.longestSilence} | ${r.bunching} | ${outsideBands(r) ?? 'ok'} |`,
        );
      }
    }
  }
}

/** garrison-and-assault 3.4 / 5.1: every map, three seeds: who went in, and the assaults. */
async function garrisonTable(id: BattleMapId): Promise<void> {
  console.log('| Map | Seed | Time (s) | Outcome | Decided | Cas. col/leg | Entered col/leg | Assaults | Won col/leg | Bands |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const map of await reportMaps(id)) {
    for (const seed of PRESET_SEEDS) {
      const r = await battleReport(seed, 900, map.id);
      const g = r.garrison;
      console.log(
        `| ${map.id} | ${seed} | ${r.seconds} | ${r.outcome} | ${r.decidedBy ?? '-'} | ${r.casualties.column}/${r.casualties.legalist} | ${g.entered.column}/${g.entered.legalist} | ${g.assaults} | ${g.assaultsWon.column}/${g.assaultsWon.legalist} | ${outsideBands(r) ?? 'ok'} |`,
      );
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // pnpm battle:report [--map <id>] [seed ...] | --presets | --armies | --deployment | --garrisons (each with an optional --map)
  const args = process.argv.slice(2);
  const mapAt = args.indexOf('--map');
  const map = (mapAt >= 0 ? args[mapAt + 1] : DEFAULT_BATTLE_MAP) as BattleMapId;
  if (args.includes('--garrisons')) {
    await garrisonTable(map);
    process.exit(0);
  }
  if (args.includes('--deployment')) {
    await deploymentTable(map);
    process.exit(0);
  }
  if (args.includes('--armies')) {
    await armiesTable(map);
    process.exit(0);
  }
  if (args.includes('--presets')) {
    await presetTable(map);
    process.exit(0);
  }
  // add-difficulty-levels 4.1: --difficulty <historia|soldado|oficial>.
  const levelAt = args.indexOf('--difficulty');
  const difficulty = levelAt >= 0 ? args[levelAt + 1] : undefined;
  if (difficulty !== undefined && !isDifficulty(difficulty)) {
    console.error(`unknown difficulty ${difficulty}`);
    process.exit(1);
  }
  // add-difficulty-levels 4.3: --factors '<json>' overrides the level's factors (tuning only).
  const factorsAt = args.indexOf('--factors');
  const factors = factorsAt >= 0 ? (JSON.parse(args[factorsAt + 1]!) as Partial<DifficultyFactors>) : undefined;
  const economy = args.includes('--economy');
  const skip = new Set([mapAt, mapAt + 1, levelAt, levelAt + 1, factorsAt, factorsAt + 1].filter((index) => index >= 0));
  const seeds = args.filter((_, index) => !skip.has(index)).map(Number).filter((value) => Number.isFinite(value));
  for (const seed of seeds.length > 0 ? seeds : [1922]) {
    console.log(JSON.stringify({ map, difficulty: difficulty ?? 'soldado', ...(await battleReport(seed, 900, map, undefined, false, { difficulty, factors, economy })) }));
  }
}
