import { activeMapRuntime, nearestWater, terrainSurfaceAt, vegetationAt, waterAt } from '@prestes/shared';
import { hourOf, placeAt } from './ambience';
import { AmbientPlayer } from './ambient-player';
import { zoomOf } from './listening';
import type { AudioEngine } from './mixer';
import { SoundBank } from './sound-bank';
import type { AudioListener } from './ShotAudio';
import { FootstepPlayer, GaitClock, footSurface, footstepGroups } from './footsteps';
import { WadingPlayer, wadingGroups } from './wading';
import { WATER_REACH, WaterPlayer } from './water-player';
import { WebAmbientOutput } from './web-ambient-output';

/** The slow clock of design D3 (ms). */
export const AMBIENCE_TICK_MS = 250;
/** A listening point not refreshed for this long means the battle view is gone (ms). */
const STALE_MS = 1500;
/** Noon, for a map that gives no time. */
const DEFAULT_TIME = 12;

/**
 * ambient-sound-and-voices 3.2 to 4.1: runs the ambient player, the water
 * emitters, the wading and the footsteps from the listening point and the
 * active map on the slow clock, and stops them when the battle view goes
 * away.
 */
export class AmbienceController {
  private readonly player: AmbientPlayer;
  private readonly water: WaterPlayer;
  private readonly wading: WadingPlayer;
  private readonly footsteps: FootstepPlayer;
  private readonly gait = new GaitClock();
  private listener: AudioListener | null = null;
  private heardAt = 0;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(private readonly engine: AudioEngine) {
    const bank = new SoundBank(() => engine.context);
    const output = new WebAmbientOutput(engine, bank);
    this.player = new AmbientPlayer(output);
    this.water = new WaterPlayer(output);
    this.wading = new WadingPlayer(output);
    this.footsteps = new FootstepPlayer(output);
    this.timer = setInterval(() => this.tick(), AMBIENCE_TICK_MS);
  }

  setListener(listener: AudioListener | null): void {
    this.listener = listener;
    this.heardAt = performance.now();
  }

  /** What plays now (the dev bridge). */
  state(): AmbientPlayer['playing'] & { water: string[]; wading: number[]; footsteps: string[] } {
    return { ...this.player.playing, water: this.water.playing, wading: this.wading.playing, footsteps: this.footsteps.playing };
  }

  private tick(): void {
    const context = this.engine.context;
    const map = activeMapRuntime()?.map;
    const listener = this.listener;
    if (!context || !this.engine.mixer || !map || !listener || performance.now() - this.heardAt > STALE_MS) {
      if (this.player.playing.place !== null) this.player.stop();
      this.water.stop();
      this.wading.stop();
      this.footsteps.stop();
      return;
    }
    this.player.update(placeAt(map, listener.x, listener.y), hourOf(map.light?.time ?? DEFAULT_TIME), zoomOf(listener.span), context.currentTime);
    const point = { x: listener.x, y: listener.y, span: listener.span, right: listener.right ?? { x: 1, y: 0 } };
    this.water.update(nearestWater(map, listener.x, listener.y, WATER_REACH), point);
    // A ford is the shallow water men walk in (`waterAt` 1; deep water is 2).
    this.wading.update(listener.frame ? wadingGroups(listener.frame, listener.faction, (x, y) => waterAt(x, y) === 1) : [], point);
    // The steps keep the men's cadence at the game's speed, and stop while it is paused.
    const rate = this.gait.update(listener.frame?.tick, performance.now() / 1000);
    this.footsteps.update(listener.frame ? footstepGroups(listener.frame, listener.faction, (x, y) => footSurface(terrainSurfaceAt(x, y), vegetationAt(x, y))) : [], point, rate);
  }

  dispose(): void {
    clearInterval(this.timer);
    this.player.stop();
    this.water.stop();
    this.wading.stop();
    this.footsteps.stop();
  }
}
