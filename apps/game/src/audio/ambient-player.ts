import { ONE_SHOT_GAP, bedId, hourId, nextOneShot, type Hour, type Place } from './ambience';
import { ambienceShare } from './listening';

/**
 * ambient-sound-and-voices 3.2: the ambient bed. Two looped layers, the air
 * of the place and the hour over it, each cross-faded over `CROSSFADE`
 * seconds when it changes, and occasional one-shots that fit both. Works
 * through `AmbientOutput`, so it is tested without audio; a sound not loaded
 * yet is skipped and tried again on the next update.
 */

/** A looping sound already started (at gain 0). */
export interface LoopHandle {
  /** Glide to `gain` over `seconds`. */
  setGain(gain: number, seconds: number): void;
  /** Stop `seconds` from now. */
  stop(seconds: number): void;
}

export interface AmbientOutput {
  /** Starts a loop at gain 0, or null when its file is not loaded. */
  loop(id: string): LoopHandle | null;
  /** Whether a one-shot's file is loaded. */
  has(id: string): boolean;
  /** Plays a one-shot once. */
  shot(id: string, gain: number, pan: number): void;
}

/** Seconds a change of bed takes (the spec: at least 2 s, no silence, no hard cut). */
export const CROSSFADE = 2.5;
/** Seconds a level change within a bed takes (a zoom). */
export const GLIDE = 0.5;
export const BED_LEVEL = 0.7;
export const HOUR_LEVEL = 0.5;
export const ONE_SHOT_LEVEL = 0.45;
/** Updates in a row a new place must hold before the bed changes (no flapping at a border). */
export const PLACE_HOLD = 2;

class Layer {
  private id: string | null = null;
  private handle: LoopHandle | null = null;

  constructor(private readonly output: AmbientOutput) {}

  get playing(): string | null {
    return this.handle ? this.id : null;
  }

  set(id: string, level: number): void {
    if (id === this.id && this.handle) {
      this.handle.setGain(level, GLIDE);
      return;
    }
    const next = this.output.loop(id);
    if (id !== this.id && this.handle) {
      // The old bed fades out under the new one fading in: no gap, no cut.
      if (!next) return;
      this.handle.setGain(0, CROSSFADE);
      this.handle.stop(CROSSFADE);
      this.handle = null;
    }
    this.id = id;
    if (!next) return;
    this.handle = next;
    next.setGain(level, CROSSFADE);
  }

  stop(): void {
    this.handle?.setGain(0, GLIDE);
    this.handle?.stop(GLIDE);
    this.handle = null;
    this.id = null;
  }
}

export class AmbientPlayer {
  private readonly bed: Layer;
  private readonly hour: Layer;
  private place: Place | null = null;
  private candidate: Place | null = null;
  private held = 0;
  private lastShot: string | null = null;
  private nextShotAt: number | null = null;

  constructor(
    private readonly output: AmbientOutput,
    private readonly random: () => number = Math.random,
  ) {
    this.bed = new Layer(output);
    this.hour = new Layer(output);
  }

  /** The beds playing now (tests and the dev bridge). */
  get playing(): { bed: string | null; hour: string | null; place: Place | null } {
    return { bed: this.bed.playing, hour: this.hour.playing, place: this.place };
  }

  /** Called on the slow clock (design D3) with what is around the ear, and the time in seconds. */
  update(place: Place, hour: Hour, zoom: number, now: number): void {
    if (this.place === null) {
      this.place = place;
    } else if (place !== this.place) {
      this.held = place === this.candidate ? this.held + 1 : 1;
      this.candidate = place;
      if (this.held >= PLACE_HOLD) {
        this.place = place;
        this.held = 0;
      }
    } else {
      this.held = 0;
      this.candidate = null;
    }
    const share = ambienceShare(zoom);
    this.bed.set(bedId(this.place), BED_LEVEL * share);
    this.hour.set(hourId(hour), HOUR_LEVEL * share);

    if (this.nextShotAt === null) this.nextShotAt = now + this.gap();
    if (now >= this.nextShotAt) {
      const id = nextOneShot(this.place, hour, this.lastShot, (shot) => this.output.has(shot), this.random);
      if (id) {
        this.output.shot(id, ONE_SHOT_LEVEL * share, (this.random() * 2 - 1) * 0.6);
        this.lastShot = id;
      }
      this.nextShotAt = now + this.gap();
    }
  }

  stop(): void {
    this.bed.stop();
    this.hour.stop();
    this.place = null;
    this.nextShotAt = null;
  }

  private gap(): number {
    return ONE_SHOT_GAP.min + this.random() * (ONE_SHOT_GAP.max - ONE_SHOT_GAP.min);
  }
}
