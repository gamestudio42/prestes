import type { Frame, UnitSnapshot } from '@prestes/shared';
import type { AmbientOutput, LoopHandle } from './ambient-player';
import { GLIDE } from './ambient-player';
import { gainAt, panAt, zoomOf, type ListeningPoint } from './listening';

/**
 * ambient-sound-and-voices 3.4: men wading. The men of a section standing
 * in shallow water (a ford) make one looped sound, placed at them and
 * fuller for more men; it stops when the last of them leaves the water.
 * Heard for the listener's own side, and for the enemy only while seen
 * (fog of war), like the footsteps (4.1).
 */

export const WADING_ID = 'wading';
/** How far wading is heard at the nearest zoom (m). */
export const WADING_RANGE = 40;
export const WADING_LEVEL = 0.7;
/** The most sections heard wading at once: the nearest. */
export const WADING_CAP = 3;

export interface WadingGroup {
  squadId: number;
  /** Where the section's wading men stand, on average. */
  x: number;
  y: number;
  /** Men of the section in the water. */
  count: number;
}

type FrameView = Pick<Frame, 'units' | 'seen' | 'fog'>;

function heard(unit: UnitSnapshot, frame: FrameView, faction: string): boolean {
  if (unit.faction === faction || !frame.fog) return true;
  return frame.seen?.[faction as keyof NonNullable<Frame['seen']>]?.includes(unit.id) ?? false;
}

/** The sections with men in shallow water, by `inShallowWater`, among those the listener's side may hear. */
export function wadingGroups(frame: FrameView, faction: string, inShallowWater: (x: number, y: number) => boolean): WadingGroup[] {
  const groups = new Map<number, WadingGroup>();
  for (const unit of frame.units) {
    if (!unit.alive || unit.dummy || unit.garrison !== undefined || !heard(unit, frame, faction)) continue;
    if (!inShallowWater(unit.x, unit.y)) continue;
    const group = groups.get(unit.squadId) ?? { squadId: unit.squadId, x: 0, y: 0, count: 0 };
    group.x += unit.x;
    group.y += unit.y;
    group.count += 1;
    groups.set(unit.squadId, group);
  }
  return [...groups.values()].map((group) => ({ ...group, x: group.x / group.count, y: group.y / group.count }));
}

/** One man is a splash, a section a crowd: the level by the number in the water. */
export function wadingDensity(count: number): number {
  return Math.min(1, 0.35 + 0.65 * Math.sqrt(Math.max(0, count - 1) / 10));
}

export class WadingPlayer {
  private readonly loops = new Map<number, LoopHandle>();

  constructor(private readonly output: AmbientOutput) {}

  /** The sections heard wading now (tests and the dev bridge). */
  get playing(): number[] {
    return [...this.loops.keys()].sort((a, b) => a - b);
  }

  update(groups: readonly WadingGroup[], point: ListeningPoint): void {
    const zoom = zoomOf(point.span);
    const wanted = new Map<number, { gain: number; pan: number }>();
    const near = groups
      .map((group) => ({ group, distance: Math.hypot(group.x - point.x, group.y - point.y) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, WADING_CAP);
    for (const { group, distance } of near) {
      const gain = WADING_LEVEL * wadingDensity(group.count) * gainAt(distance, WADING_RANGE, zoom);
      if (gain > 0) wanted.set(group.squadId, { gain, pan: panAt(point, group.x, group.y) });
    }
    for (const [squadId, handle] of this.loops) {
      if (wanted.has(squadId)) continue;
      handle.setGain(0, GLIDE);
      handle.stop(GLIDE);
      this.loops.delete(squadId);
    }
    for (const [squadId, { gain, pan }] of wanted) {
      let handle = this.loops.get(squadId);
      if (!handle) {
        const started = this.output.loop(WADING_ID);
        if (!started) continue;
        handle = started;
        this.loops.set(squadId, handle);
      }
      handle.setGain(gain, GLIDE);
      handle.setPan?.(pan, GLIDE);
    }
  }

  stop(): void {
    for (const handle of this.loops.values()) {
      handle.setGain(0, GLIDE);
      handle.stop(GLIDE);
    }
    this.loops.clear();
  }
}
