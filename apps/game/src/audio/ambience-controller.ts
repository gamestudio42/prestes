import { activeMapRuntime, nearestWater } from '@prestes/shared';
import { hourOf, placeAt } from './ambience';
import { AmbientPlayer } from './ambient-player';
import { zoomOf } from './listening';
import type { AudioEngine } from './mixer';
import { SoundBank } from './sound-bank';
import type { AudioListener } from './ShotAudio';
import { WATER_REACH, WaterPlayer } from './water-player';
import { WebAmbientOutput } from './web-ambient-output';

/** The slow clock of design D3 (ms). */
export const AMBIENCE_TICK_MS = 250;
/** A listening point not refreshed for this long means the battle view is gone (ms). */
const STALE_MS = 1500;
/** Noon, for a map that gives no time. */
const DEFAULT_TIME = 12;

/**
 * ambient-sound-and-voices 3.2, 3.3: runs the ambient player and the water
 * emitters from the listening point and the active map on the slow clock,
 * and stops them when the battle view goes away.
 */
export class AmbienceController {
  private readonly player: AmbientPlayer;
  private readonly water: WaterPlayer;
  private listener: AudioListener | null = null;
  private heardAt = 0;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(private readonly engine: AudioEngine) {
    const bank = new SoundBank(() => engine.context);
    const output = new WebAmbientOutput(engine, bank);
    this.player = new AmbientPlayer(output);
    this.water = new WaterPlayer(output);
    this.timer = setInterval(() => this.tick(), AMBIENCE_TICK_MS);
  }

  setListener(listener: AudioListener | null): void {
    this.listener = listener;
    this.heardAt = performance.now();
  }

  /** What plays now (the dev bridge). */
  state(): AmbientPlayer['playing'] & { water: string[] } {
    return { ...this.player.playing, water: this.water.playing };
  }

  private tick(): void {
    const context = this.engine.context;
    const map = activeMapRuntime()?.map;
    const listener = this.listener;
    if (!context || !this.engine.mixer || !map || !listener || performance.now() - this.heardAt > STALE_MS) {
      if (this.player.playing.place !== null) this.player.stop();
      this.water.stop();
      return;
    }
    this.player.update(placeAt(map, listener.x, listener.y), hourOf(map.light?.time ?? DEFAULT_TIME), zoomOf(listener.span), context.currentTime);
    const point = { x: listener.x, y: listener.y, span: listener.span, right: listener.right ?? { x: 1, y: 0 } };
    this.water.update(nearestWater(map, listener.x, listener.y, WATER_REACH), point);
  }

  dispose(): void {
    clearInterval(this.timer);
    this.player.stop();
    this.water.stop();
  }
}
