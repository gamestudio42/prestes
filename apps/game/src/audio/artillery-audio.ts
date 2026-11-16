/**
 * add-artillery-bombardment 3.4, 3.5: the sounds of a shell. The incoming
 * whistle ends as the shell lands; the burst is a close bang within
 * NEAR_BURST metres of the listener and a rumble beyond.
 *
 * PLACEHOLDER: both are synthesized here (named as such in docs/assets.md)
 * until CC0 recordings are chosen with the owner; the recordings would
 * replace these buffers and nothing else.
 */

export type ShellSound = 'whistle' | 'burst-near-a' | 'burst-near-b' | 'burst-far-a' | 'burst-far-b';

/** A whistle for a shell farther than this from the listener (m) is not heard. */
export const WHISTLE_CUTOFF = 250;
/** Within this distance (m) a burst is the close bang, beyond it the distant rumble. */
export const NEAR_BURST = 60;
/** The synthesized whistle's length (s). */
export const WHISTLE_SECONDS = 2.2;

/** The burst recording for a shell: near or far, and one of two, picked from the shell itself. */
export function burstSound(distance: number, x: number, y: number, tick: number): ShellSound {
  const variant = Math.abs(Math.round(x) * 31 + Math.round(y) * 17 + tick) % 2 === 0 ? 'a' : 'b';
  return distance <= NEAR_BURST ? `burst-near-${variant}` : `burst-far-${variant}`;
}

/** How far into the whistle to start so it ends as the shell lands `flight` seconds from now. */
export function whistleOffset(flight: number): number {
  return Math.max(0, Math.min(WHISTLE_SECONDS, WHISTLE_SECONDS - flight));
}

/** Loudness of a burst: full close by, falling with distance, a far rumble always faintly heard. */
export function burstLoudness(distance: number): number {
  return distance <= 30 ? 1 : Math.max(0.12, (30 / distance) ** 1.2);
}

function noiseFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
}

/** The whistle: a falling tone with a little air, swelling as it comes in. */
export function synthesizeWhistle(sampleRate: number): Float32Array {
  const length = Math.floor(sampleRate * WHISTLE_SECONDS);
  const data = new Float32Array(length);
  const noise = noiseFrom(7);
  let phase = 0;
  let air = 0;
  for (let index = 0; index < length; index += 1) {
    const t = index / sampleRate;
    const share = t / WHISTLE_SECONDS;
    const frequency = 1500 - 1000 * share ** 1.4 + 18 * Math.sin(t * 31);
    phase += (2 * Math.PI * frequency) / sampleRate;
    air += (noise() - air) * 0.08;
    const swell = Math.min(1, share * 1.6) ** 2 * (index > length - sampleRate * 0.02 ? (length - index) / (sampleRate * 0.02) : 1);
    data[index] = (Math.sin(phase) * 0.55 + air * 0.6) * swell * 0.5;
  }
  return data;
}

/** A burst: a hard crack, a deep body and a long, rolling tail; `far` is duller and longer. */
export function synthesizeBurst(sampleRate: number, far: boolean, seed: number): Float32Array {
  const seconds = far ? 3.2 : 2.4;
  const length = Math.floor(sampleRate * seconds);
  const data = new Float32Array(length);
  const noise = noiseFrom(seed);
  const brightness = far ? 0.03 : 0.18;
  const decay = far ? 1.6 : 2.4;
  let low = 0;
  let lower = 0;
  for (let index = 0; index < length; index += 1) {
    const t = index / sampleRate;
    const raw = noise();
    low += (raw - low) * brightness;
    lower += (low - lower) * 0.05;
    const crack = !far && t < 0.03 ? raw * (1 - t / 0.03) : 0;
    const thump = Math.sin(2 * Math.PI * (far ? 32 : 44) * t) * Math.exp(-t * (far ? 3 : 5));
    const rumble = Math.sin(2 * Math.PI * 23 * t + Math.sin(t * 3)) * Math.exp(-t * 1.2) * 0.3;
    const attack = Math.min(1, t / (far ? 0.06 : 0.004));
    data[index] = (crack * 0.9 + low * 2.2 * Math.exp(-t * decay) + lower * 3 * Math.exp(-t * decay * 0.6) + thump * 0.8 + rumble) * attack * 0.6;
  }
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0.95) for (let index = 0; index < length; index += 1) data[index] = (data[index]! / peak) * 0.95;
  return data;
}

/** Every shell sound as samples. */
export function shellSamples(sampleRate: number): Record<ShellSound, Float32Array> {
  return {
    whistle: synthesizeWhistle(sampleRate),
    'burst-near-a': synthesizeBurst(sampleRate, false, 1101),
    'burst-near-b': synthesizeBurst(sampleRate, false, 2203),
    'burst-far-a': synthesizeBurst(sampleRate, true, 3307),
    'burst-far-b': synthesizeBurst(sampleRate, true, 4409),
  };
}
