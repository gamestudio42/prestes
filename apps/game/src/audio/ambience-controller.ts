import { activeMapRuntime } from '@prestes/shared';
import { hourOf, placeAt } from './ambience';
import { AmbientPlayer } from './ambient-player';
import { zoomOf } from './listening';
import type { AudioEngine } from './mixer';
import { SoundBank } from './sound-bank';
import type { AudioListener } from './ShotAudio';
import { WebAmbientOutput } from './web-ambient-output';

/** The slow clock of design D3 (ms). */
export const AMBIENCE_TICK_MS = 250;
/** A listening point not refreshed for this long means the battle view is gone (ms). */
const STALE_MS = 1500;
/** Noon, for a map that gives no time. */
const DEFAULT_TIME = 12;

/**
 * ambient-sound-and-voices 3.2: runs the ambient player from the listening
 * point and the active map on the slow clock, and stops it when the battle
 * view goes away.
 */
export class AmbienceController {
  private readonly player: AmbientPlayer;
  private listener: AudioListener | null = null;
  private heardAt = 0;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(private readonly engine: AudioEngine) {
    const bank = new SoundBank(() => engine.context);
    this.player = new AmbientPlayer(new WebAmbientOutput(engine, bank));
    this.timer = setInterval(() => this.tick(), AMBIENCE_TICK_MS);
  }

  setListener(listener: AudioListener | null): void {
    this.listener = listener;
    this.heardAt = performance.now();
  }

  /** What plays now (the dev bridge). */
  state(): AmbientPlayer['playing'] {
    return this.player.playing;
  }

  private tick(): void {
    const context = this.engine.context;
    const map = activeMapRuntime()?.map;
    const listener = this.listener;
    if (!context || !this.engine.mixer || !map || !listener || performance.now() - this.heardAt > STALE_MS) {
      if (this.player.playing.place !== null) this.player.stop();
      return;
    }
    this.player.update(placeAt(map, listener.x, listener.y), hourOf(map.light?.time ?? DEFAULT_TIME), zoomOf(listener.span), context.currentTime);
  }

  dispose(): void {
    clearInterval(this.timer);
    this.player.stop();
  }
}
