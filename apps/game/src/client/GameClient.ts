import {
  ClientMirror,
  type Command,
  type Frame,
  type InterpolatedFrame,
  type SimEvent,
  type WorkerRequest,
  type WorkerResponse,
} from '@prestes/shared';

/** Ticks per 100 ms at the speed labelled 1x; 0.5x is 1 tick, 2x is 4. */
export const DEFAULT_SPEED = 2 as const;

export interface GameClientOptions {
  seed: number;
  sandbox?: boolean;
  training?: boolean;
  opposition?: boolean;
  bounding?: boolean;
  scenario?: 'bootcamp' | 'battle3v3';
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
  private readonly onFrame?: (frame: Frame) => void;
  private readonly onEvent?: (event: SimEvent) => void;
  private readonly seed: number;
  private readonly sandbox?: boolean;
  private readonly training?: boolean;
  private readonly opposition?: boolean;
  private readonly scenario?: 'bootcamp' | 'battle3v3';
  private bounding?: boolean;
  private timer: number | null = null;
  private speed: 0 | 1 | 2 | 4 = DEFAULT_SPEED;

  constructor(options: GameClientOptions) {
    this.onFrame = options.onFrame;
    this.onEvent = options.onEvent;
    this.seed = options.seed;
    this.sandbox = options.sandbox;
    this.training = options.training;
    this.opposition = options.opposition;
    this.bounding = options.bounding;
    this.scenario = options.scenario;
    this.worker = new Worker(new URL('../sim.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === 'ready' || message.type === 'frame') {
        this.mirror.apply(message.frame);
        for (const simEvent of message.frame.events) {
          this.onEvent?.(simEvent);
        }
        this.onFrame?.(message.frame);
        return;
      }
      if (message.type === 'error') {
        console.error(message.message);
      }
    };

    this.send({ type: 'start', seed: options.seed, sandbox: options.sandbox, training: options.training, opposition: options.opposition, bounding: options.bounding, scenario: options.scenario });
  }

  start(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = window.setInterval(() => {
      if (this.speed > 0) {
        this.send({ type: 'step', ticks: this.speed });
      }
    }, 100);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  setSpeed(speed: 0 | 1 | 2 | 4): void {
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
    this.send({ type: 'start', seed: this.seed, sandbox: this.sandbox, training: this.training, opposition: this.opposition, bounding: this.bounding, scenario: this.scenario });
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

  currentFrame(): Frame | null {
    return this.mirror.current;
  }

  interpolated(alpha: number): InterpolatedFrame | null {
    return this.mirror.interpolate(alpha);
  }

  dispose(): void {
    this.stop();
    this.worker.terminate();
  }

  private send(message: WorkerRequest): void {
    this.worker.postMessage(message);
  }
}






