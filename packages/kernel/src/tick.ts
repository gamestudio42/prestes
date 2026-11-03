export const TICK_DT = 0.1;
export const TICKS_PER_SECOND = 10;
export const MAX_TICKS_PER_FRAME = 8;

export function secondsToTicks(seconds: number): number {
  return Math.round(seconds / TICK_DT);
}

export function ticksToSeconds(ticks: number): number {
  return ticks * TICK_DT;
}

export function clampTicks(ticks: number): number {
  return Math.max(0, Math.min(MAX_TICKS_PER_FRAME, Math.floor(ticks)));
}
