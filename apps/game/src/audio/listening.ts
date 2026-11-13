/**
 * ambient-sound-and-voices 1.2 (D2): the listening point and the one rule
 * for nearness. The battle is heard from the ground point the camera looks
 * at; every positioned sound (water, footsteps, call-outs) takes its gain
 * from `gainAt` and its left-right place from `panAt`. Pure: no audio
 * context, so it is unit-tested alone.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** What the camera gives each frame: its ground focus, its span and the screen's right on the ground. */
export interface ListeningPoint {
  x: number;
  y: number;
  /** Ground metres across the view. */
  span: number;
  /** The screen's rightward direction on the ground, a unit vector. */
  right: Vec2;
}

/** The camera's closest and farthest spans (`packages/view3d` camera rig). */
export const NEAR_SPAN = 25;
export const FAR_SPAN = 300;
/** At the farthest zoom a sound's range is this many times longer… */
export const ZOOM_RANGE = 1;
/** …and positioned sounds are this much thinner (a share of their gain). */
export const ZOOM_THIN = 0.6;
/** Ambience at the nearest zoom, as a share of its level at the farthest. */
export const NEAR_AMBIENCE = 0.6;
/** The farthest a sound pans: never quite all in one ear. */
export const MAX_PAN = 0.8;

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

/** How far out the camera is: 0 at the nearest span, 1 at the farthest. */
export function zoomOf(span: number): number {
  return clamp((span - NEAR_SPAN) / (FAR_SPAN - NEAR_SPAN), 0, 1);
}

/**
 * The gain of a positioned sound `distance` metres from the listening point,
 * for a sound heard up to `range` metres at the nearest zoom: full at the
 * point, falling smoothly, silent at and beyond its range. Zooming out
 * lengthens the range and thins the sound.
 */
export function gainAt(distance: number, range: number, zoom: number): number {
  const z = clamp(zoom, 0, 1);
  const reach = range * (1 + ZOOM_RANGE * z);
  if (!(reach > 0) || distance >= reach) return 0;
  const near = 1 - Math.max(0, distance) / reach;
  return near * near * (1 - ZOOM_THIN * z);
}

/** The share of the general ambience at a zoom: fuller when zoomed out. */
export function ambienceShare(zoom: number): number {
  return NEAR_AMBIENCE + (1 - NEAR_AMBIENCE) * clamp(zoom, 0, 1);
}

/**
 * Left (-1) to right (+1) for a source at (x, y): by where it lies across
 * the screen, full at the view's edge, held to `MAX_PAN`.
 */
export function panAt(point: ListeningPoint, x: number, y: number): number {
  const across = (x - point.x) * point.right.x + (y - point.y) * point.right.y;
  const half = Math.max(1, point.span / 2);
  return clamp(across / half, -1, 1) * MAX_PAN;
}

/** Gain and pan of a source for the listening point, in one call. */
export function hear(point: ListeningPoint, x: number, y: number, range: number): { gain: number; pan: number } {
  const distance = Math.hypot(x - point.x, y - point.y);
  return { gain: gainAt(distance, range, zoomOf(point.span)), pan: panAt(point, x, y) };
}
