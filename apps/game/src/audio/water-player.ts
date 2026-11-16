import { WATER_SOUND_KINDS, type NearWater, type WaterSoundKind } from '@prestes/shared';
import type { AmbientOutput, LoopHandle } from './ambient-player';
import { GLIDE } from './ambient-player';
import { ZOOM_RANGE, gainAt, panAt, zoomOf, type ListeningPoint } from './listening';

/**
 * ambient-sound-and-voices 3.3 (design D5): the water emitters. One looped
 * bed per kind of water (river, stream, ford, pond), placed at the nearest
 * stretch of that kind and heard by the one rule for nearness (1.2); a
 * second emitter of a kind when two separate stretches are in range. A
 * kind with no water in range is silent and its loop stops.
 */

/** How far each kind is heard at the nearest zoom (m): a wide river carries, a pond barely. */
export const WATER_RANGE: Readonly<Record<WaterSoundKind, number>> = { river: 70, stream: 35, ford: 45, pond: 25, sea: 110 };
export const WATER_LEVEL = 0.8;

/** The loop of a kind (files `water/<id>.mp3`). */
export const waterId = (kind: WaterSoundKind): string => `water-${kind}`;

/** The farthest any water can be heard at any zoom: how far to look for it. */
export const WATER_REACH = Math.max(...WATER_SOUND_KINDS.map((kind) => WATER_RANGE[kind])) * (1 + ZOOM_RANGE);

export class WaterPlayer {
  private readonly slots = new Map<string, LoopHandle>();

  constructor(private readonly output: AmbientOutput) {}

  /** The emitters sounding now, by `kind:index` (tests and the dev bridge). */
  get playing(): string[] {
    return [...this.slots.keys()].sort();
  }

  /** Called on the slow clock with the water near the listening point (`nearestWater`). */
  update(waters: readonly NearWater[], point: ListeningPoint): void {
    const zoom = zoomOf(point.span);
    const wanted = new Map<string, { gain: number; pan: number; kind: WaterSoundKind }>();
    const counts = new Map<WaterSoundKind, number>();
    for (const water of waters) {
      const index = counts.get(water.kind) ?? 0;
      counts.set(water.kind, index + 1);
      const gain = WATER_LEVEL * gainAt(water.distance, WATER_RANGE[water.kind], zoom);
      if (gain <= 0) continue;
      // On the water itself the sound is all around, not to one side.
      const pan = water.distance === 0 ? 0 : panAt(point, water.point.x, water.point.y);
      wanted.set(`${water.kind}:${index}`, { gain, pan, kind: water.kind });
    }
    for (const [key, handle] of this.slots) {
      if (wanted.has(key)) continue;
      handle.setGain(0, GLIDE);
      handle.stop(GLIDE);
      this.slots.delete(key);
    }
    for (const [key, { gain, pan, kind }] of wanted) {
      let handle = this.slots.get(key);
      if (!handle) {
        const started = this.output.loop(waterId(kind));
        if (!started) continue;
        handle = started;
        this.slots.set(key, handle);
      }
      handle.setGain(gain, GLIDE);
      handle.setPan?.(pan, GLIDE);
    }
  }

  stop(): void {
    for (const handle of this.slots.values()) {
      handle.setGain(0, GLIDE);
      handle.stop(GLIDE);
    }
    this.slots.clear();
  }
}
