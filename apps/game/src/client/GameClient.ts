import {
  ClientMirror,
  FogView,
  type BattleMapId,
  type BattleRosters,
  type Command,
  type Frame,
  type InterpolatedFrame,
  type MapDocument,
  type SimEvent,
  type WorkerRequest,
  type WorkerResponse,
} from '@prestes/shared';

/**
 * Ticks per 200 ms. 1x (2) is real time, one 0.1 s tick per 100 ms; 0.5x is
 * 1, 2x is 4 and 4x is 8 (order-tempo-and-facing).
 */
export const DEFAULT_SPEED = 2 as const;

export interface GameClientOptions {
  seed: number;
  sandbox?: boolean;
  training?: boolean;
  opposition?: boolean;
  bounding?: boolean;
  scenario?: 'bootcamp' | 'battle3v3';
  /** add-battle-maps: the 3v3's battle map. */
  battleMap?: BattleMapId;
  /** add-map-editor: an unsaved map to play (the editor's playtest); `battleMap` is its id. */
  mapDocument?: MapDocument;
  /** pre-battle-roster 3.1: the 3v3's forces (absent: the default roster). */
  rosters?: BattleRosters;
  /** add-deployment-phase: open in the deployment phase (the enemy deploys too). */
  deployment?: boolean;
  /** add-map-objectives 3.3: the battle's time limit in ticks. */
  timeLimitTicks?: number;
  onFrame?: (frame: Frame) => void;
  onEvent?: (event: SimEvent) => void;
}

/**
 * Main-thread facade over the simulation worker. It owns the worker, the frame
 * clock and the read-only mirror; it never owns simulation state.
 */
export class GameClient {
  private readonly worker: Worker;
  private readonly mirror = new ClientMirror();
  /** fog-of-war: the player's view of each frame (the bridge reads the raw one). */
  private readonly fog = new FogView('column');
  private readonly onFrame?: (frame: Frame) => void;
  private readonly onEvent?: (event: SimEvent) => void;
  private readonly seed: number;
  private readonly sandbox?: boolean;
  private readonly training?: boolean;
  private readonly opposition?: boolean;
  private readonly scenario?: 'bootcamp' | 'battle3v3';
  readonly battleMap?: BattleMapId;
  private readonly mapDocument?: MapDocument;
  private readonly rosters?: BattleRosters;
  private readonly deployment?: boolean;
  private readonly timeLimitTicks?: number;
  private bounding?: boolean;
  private timer: number | null = null;
  /** Half ticks owed: the interval runs every 100 ms, the speed is per 200 ms. */
  private owed = 0;
  /** When the latest frame arrived, and the smoothed time between frames (ms). */
  private frameAt = 0;
  private frameGap = 100;
  private speed: 0 | 1 | 2 | 4 | 8 = DEFAULT_SPEED;

  constructor(options: GameClientOptions) {
    this.onFrame = options.onFrame;
    this.onEvent = options.onEvent;
    this.seed = options.seed;
    this.sandbox = options.sandbox;
    this.training = options.training;
    this.opposition = options.opposition;
    this.bounding = options.bounding;
    this.scenario = options.scenario;
    this.battleMap = options.battleMap;
    this.mapDocument = options.mapDocument;
    this.rosters = options.rosters;
    this.deployment = options.deployment;
    this.timeLimitTicks = options.timeLimitTicks;
    this.worker = new Worker(new URL('../sim.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === 'ready' || message.type === 'frame') {
        const now = performance.now();
        if (this.frameAt > 0) {
          const gap = Math.min(400, Math.max(30, now - this.frameAt));
          this.frameGap += (gap - this.frameGap) * 0.2;
        }
        this.frameAt = now;
        this.mirror.apply(message.frame);
        const view = this.fog.apply(message.frame);
        for (const simEvent of view.events) {
          this.onEvent?.(simEvent);
        }
        this.onFrame?.(view);
        return;
      }
      if (message.type === 'error') {
        console.error(message.message);
      }
    };

    this.send({ type: 'start', seed: options.seed, sandbox: options.sandbox, training: options.training, opposition: options.opposition, bounding: options.bounding, scenario: options.scenario, battleMap: options.battleMap, ...(options.mapDocument ? { mapDocument: options.mapDocument } : {}), ...(options.rosters ? { rosters: options.rosters } : {}), ...(options.deployment ? { deployment: true } : {}), ...(options.timeLimitTicks === undefined ? {} : { timeLimitTicks: options.timeLimitTicks }) });
  }

  start(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = window.setInterval(() => {
      if (this.speed > 0) {
        this.owed += this.speed;
        const ticks = Math.floor(this.owed / 2);
        if (ticks > 0) {
          this.owed -= ticks * 2;
          this.send({ type: 'step', ticks });
        }
      }
    }, 100);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  setSpeed(speed: 0 | 1 | 2 | 4 | 8): void {
    this.speed = speed;
  }

  reset(): void {
    this.mirror.apply({
      tick: 0,
      units: [],
      orders: [],
      covers: [],
      events: [],
      outcome: 'playing',
      hash: '',
    });
    this.send({ type: 'start', seed: this.seed, sandbox: this.sandbox, training: this.training, opposition: this.opposition, bounding: this.bounding, scenario: this.scenario, battleMap: this.battleMap, ...(this.mapDocument ? { mapDocument: this.mapDocument } : {}), ...(this.rosters ? { rosters: this.rosters } : {}), ...(this.deployment ? { deployment: true } : {}), ...(this.timeLimitTicks === undefined ? {} : { timeLimitTicks: this.timeLimitTicks }) });
  }

  step(ticks = 1): void {
    this.send({ type: 'step', ticks });
  }

  setBounding(enabled: boolean): void {
    this.bounding = enabled;
    this.sendCommand({ type: 'set_bounding', enabled });
  }

  sendCommand(command: Command): void {
    this.send({ type: 'command', command });
  }

  /** The simulation's latest frame, unfiltered (developer bridge). */
  currentFrame(): Frame | null {
    return this.mirror.current;
  }

  /** fog-of-war: the player sees only what his side sees, unless turned off (control of both sides). */
  setFogView(enabled: boolean): void {
    this.fog.enabled = enabled;
  }

  /**
   * The units between the last two frames. Without `alpha`, by the time since
   * the latest frame arrived over the usual gap between frames, so soldiers
   * glide at an even pace between the 10 frames a second (5 at 0.5x) instead
   * of stepping on each one; the view draws one frame behind the simulation.
   */
  interpolated(alpha?: number): InterpolatedFrame | null {
    const t = alpha ?? (performance.now() - this.frameAt) / this.frameGap;
    const frame = this.mirror.interpolate(t);
    return frame ? this.fog.apply(frame) : null;
  }

  dispose(): void {
    this.stop();
    this.worker.terminate();
  }

  private send(message: WorkerRequest): void {
    this.worker.postMessage(message);
  }
}






