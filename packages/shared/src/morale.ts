import type { MoraleState } from './protocol';

export const SUPPRESSION_THRESHOLD = 30;
export const PINNED_SUPPRESSION = 65;
export const PINNED_MORALE = 30;
export const SUPPRESSED_MORALE = 50;
export const PANIC_MORALE = 10;
export const CRITICAL_MORALE = 5;
export const SUPPRESSION_DECAY = 0.5;

export function moraleStateFor(
  morale: number,
  suppression: number,
  routed = false,
): MoraleState {
  if (routed) {
    return 'routed';
  }
  if (morale <= CRITICAL_MORALE || (morale <= PANIC_MORALE && suppression >= SUPPRESSION_THRESHOLD)) {
    return 'panicked';
  }
  if (suppression >= PINNED_SUPPRESSION || morale <= PINNED_MORALE) {
    return 'pinned';
  }
  if (suppression >= SUPPRESSION_THRESHOLD || morale <= SUPPRESSED_MORALE) {
    return 'suppressed';
  }
  return 'steady';
}


