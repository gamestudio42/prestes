import type { Stance } from '../protocol';
import { runtimeHeightAt, runtimeVegetationAt, type MapRuntime } from './runtime';
import type { VegetationKind } from './types';

/**
 * Concealing vegetation (add-battle-maps, concealment). A soldier inside it
 * is not seen by an observer farther than his kind and stance's distance.
 * Null: not concealed in that stance. Concealment is not cover: hit chance
 * never reads it.
 */
export const VEGETATION: Readonly<
  Record<VegetationKind, { height: number; conceal: Readonly<Record<Stance, number | null>> }>
> = {
  cane: { height: 2.5, conceal: { standing: 10, crouched: 6, prone: 4 } },
  corn: { height: 2.0, conceal: { standing: 15, crouched: 8, prone: 5 } },
  // scrub-concealment-and-area-fire D1: only a man who keeps low is hidden, and only farther off.
  scrub: { height: 1.6, conceal: { standing: null, crouched: 50, prone: 30 } },
  'tall-grass': { height: 1.0, conceal: { standing: null, crouched: 40, prone: 12 } },
};

/** A sight line through more than this much tall crop (m) below its top is cut. */
export const CROP_SIGHT_DEPTH = 6;
/** A concealed soldier who fires is given away for this long (ticks, 4 s). */
export const REVEAL_TICKS = 40;
/**
 * His shot gives a concealed soldier away only to observers this near (m,
 * refine-battle-maps 5.13); farther off it is a shot from somewhere in the
 * grass (the unseen-fire marker).
 */
export const REVEAL_RADIUS = 50;
/** A man running inside vegetation is detected this many times farther. */
export const RUNNING_FACTOR = 2;

/**
 * The distance (m) inside which a soldier at this point, in this stance, is
 * seen; null when the vegetation there does not conceal him.
 */
export function concealmentDistance(
  runtime: MapRuntime | null,
  x: number,
  y: number,
  stance: Stance,
  running: boolean,
): number | null {
  if (!runtime) return null;
  const kind = runtimeVegetationAt(runtime, x, y);
  if (!kind) return null;
  const distance = VEGETATION[kind].conceal[stance];
  if (distance === null) return null;
  return running ? distance * RUNNING_FACTOR : distance;
}

function isTallCrop(kind: VegetationKind | null): kind is 'cane' | 'corn' {
  return kind === 'cane' || kind === 'corn';
}

/**
 * Whether the eye-to-eye line runs through more than CROP_SIGHT_DEPTH m of
 * corn or cane below the crop's top. Tall grass and scrub never cut a line;
 * they only conceal the man inside them. Walked every metre.
 */
export function cropBlocksLine(
  runtime: MapRuntime,
  ax: number,
  ay: number,
  startHeight: number,
  bx: number,
  by: number,
  endHeight: number,
): boolean {
  const length = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  if (length <= CROP_SIGHT_DEPTH) return false;
  const steps = Math.ceil(length);
  const step = length / steps;
  let inside = 0;
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const kind = runtimeVegetationAt(runtime, x, y);
    if (!isTallCrop(kind)) continue;
    const top = runtimeHeightAt(runtime, x, y) + VEGETATION[kind].height;
    if (startHeight + (endHeight - startHeight) * t < top) {
      inside += step;
      if (inside > CROP_SIGHT_DEPTH) return true;
    }
  }
  return false;
}
