import { battleMap, compileMapDocument, DEFAULT_BATTLE_MAP, registerBattleMap, sizeOfBounds, validateRoster, type BattleMapId, type BattleRosters, type Difficulty, type PortLike, type WorkerRequest } from '@prestes/shared';
import type { SimulationEngine } from './engine';

const GAME_FRAME = { hash: false } as const;

export interface SimulationHost {
  handle(message: WorkerRequest): void;
}

/**
 * Protocol adapter shared by the browser worker and the unit tests. The host
 * owns the engine and is the only place that turns requests into ticks.
 */
export function createSimulationHost(
  factory: (
    seed: number,
    sandbox?: boolean,
    training?: boolean,
    opposition?: boolean,
    bounding?: boolean,
    scenario?: 'bootcamp' | 'battle3v3',
    battleMap?: BattleMapId,
    rosters?: BattleRosters,
    deployment?: boolean,
    timeLimitTicks?: number,
    playtest?: boolean,
    difficulty?: Difficulty,
  ) => SimulationEngine,
  port: PortLike,
): SimulationHost {
  let engine: SimulationEngine | null = null;

  return {
    handle(message: WorkerRequest): void {
      if (message.type === 'start') {
        if (message.mapDocument) {
          try {
            registerBattleMap(compileMapDocument(message.mapDocument));
          } catch {
            port.postMessage({ type: 'error', message: 'map_document_invalid' });
            return;
          }
        }
        // pre-battle-roster 3.1: a roster the rules refuse never reaches the engine,
        // judged by the limits of its map's size (scale-forces-by-map-size).
        const rosters = message.rosters;
        const size = rosters ? sizeOfBounds(battleMap(message.battleMap ?? DEFAULT_BATTLE_MAP).bounds) : 'small';
        if (rosters && [rosters.column, rosters.legalist].some((roster) => roster && !validateRoster(roster, undefined, size).ok)) {
          port.postMessage({ type: 'error', message: 'roster_invalid' });
          return;
        }
        engine = factory(
          message.seed,
          message.sandbox,
          message.training,
          message.opposition,
          message.bounding,
          message.scenario,
          message.battleMap,
          rosters,
          message.deployment,
          message.timeLimitTicks,
          message.playtest,
          message.difficulty,
        );
        // The game never reads the state hash: frames to it go without one.
        port.postMessage({ type: 'ready', frame: engine.frame(GAME_FRAME) });
        return;
      }

      if (!engine) {
        port.postMessage({ type: 'error', message: 'simulation_not_started' });
        return;
      }

      if (message.type === 'command') {
        engine.enqueue(message.command);
        // add-deployment-phase D1: in deployment a command takes effect at once, answered by one frame.
        if (engine.phase === 'deployment') port.postMessage({ type: 'frame', frame: engine.runTicks(1, GAME_FRAME) });
        return;
      }

      if (message.type === 'step') {
        const frame = engine.runTicks(message.ticks, GAME_FRAME);
        port.postMessage({ type: 'frame', frame });
      }
    },
  };
}




