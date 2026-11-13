import type { Frame, TerrainSurface, UnitSnapshot, VegetationKind } from '@prestes/shared';
import type { AmbientOutput, LoopHandle } from './ambient-player';
import { gainAt, panAt, zoomOf, type ListeningPoint } from './listening';

/**
 * ambient-sound-and-voices 4.1 (design D4): footsteps as loops by group, not
 * samples per step. The moving men of a section are bucketed by the ground
 * under them and their pace; each bucket is one loop at the men's average
 * place: one man walking, or a section walking (a few men play it thinner),
 * or a section running with equipment rattle over it, or crawling (dry or
 * wet). Heard for the listener's own side, and for the enemy only while
 * seen (fog of war); the nearest groups only, up to a cap. Men in water are
 * the wading's (3.4).
 */

export type FootSurface = 'road' | 'dirt' | 'grass' | 'mud' | 'stone' | 'wood' | 'brush';
export type Pace = 'walk' | 'run' | 'crawl';

export const FOOT_SURFACES: readonly FootSurface[] = ['road', 'dirt', 'grass', 'mud', 'stone', 'wood', 'brush'];

/** How far footsteps are heard at the nearest zoom (m). */
export const FOOTSTEP_RANGE = 30;
export const FOOTSTEP_LEVEL = 0.6;
export const RATTLE_LEVEL = 0.45;
/** The most footstep loops playing at once (rattle included): the nearest groups. */
export const FOOTSTEP_CAP = 6;
/** Seconds a loop glides to a new level, or one loop hands over to another. */
export const STEP_GLIDE = 0.3;
/** A section's loop for this many men or more is at full level; fewer play it thinner. */
export const FULL_SECTION = 5;

/** The footstep ground of a map surface and the plants on it, or 'water' (the wading's). */
export function footSurface(surface: TerrainSurface, vegetation: VegetationKind | null): FootSurface | 'water' {
  if (surface === 'ford' || surface === 'water') return 'water';
  if (surface === 'bridge') return 'wood';
  if (vegetation) return 'brush';
  switch (surface) {
    case 'road':
    case 'dirt-road':
    case 'floor':
      return 'road';
    case 'cobbles':
    case 'ridge':
      return 'stone';
    case 'mud':
    case 'trench-floor':
      return 'mud';
    case 'crop':
    case 'scrub':
    case 'thorns':
    case 'tall-grass':
      return 'brush';
    case 'sand':
    case 'crater':
    case 'trench':
      return 'dirt';
    default:
      return 'grass';
  }
}

export function paceOf(unit: Pick<UnitSnapshot, 'stance' | 'gait'>): Pace {
  if (unit.stance === 'prone') return 'crawl';
  return unit.gait === 'run' || unit.gait === 'quick' ? 'run' : 'walk';
}

export interface FootstepGroup {
  squadId: number;
  surface: FootSurface;
  pace: Pace;
  x: number;
  y: number;
  /** Men of the section moving on this ground at this pace. */
  count: number;
}

type FrameView = Pick<Frame, 'units' | 'seen' | 'fog'>;

function heard(unit: UnitSnapshot, frame: FrameView, faction: string): boolean {
  if (unit.faction === faction || !frame.fog) return true;
  return frame.seen?.[faction as keyof NonNullable<Frame['seen']>]?.includes(unit.id) ?? false;
}

/** The moving men the listener's side may hear, bucketed by section, ground and pace. */
export function footstepGroups(frame: FrameView, faction: string, groundAt: (x: number, y: number) => FootSurface | 'water'): FootstepGroup[] {
  const groups = new Map<string, FootstepGroup>();
  for (const unit of frame.units) {
    if (!unit.alive || unit.dummy || !unit.gait || unit.garrison !== undefined || !heard(unit, frame, faction)) continue;
    const surface = groundAt(unit.x, unit.y);
    if (surface === 'water') continue;
    const pace = paceOf(unit);
    const key = `${unit.squadId}:${surface}:${pace}`;
    const group = groups.get(key) ?? { squadId: unit.squadId, surface, pace, x: 0, y: 0, count: 0 };
    group.x += unit.x;
    group.y += unit.y;
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, x: group.x / group.count, y: group.y / group.count }));
}

/**
 * The loop for a group: one man walking has his own; two or more walking
 * are the section's (many feet, not one man louder); running and crawling
 * have one each (`files footsteps/<id>.mp3`).
 */
export function footstepId(group: Pick<FootstepGroup, 'surface' | 'pace' | 'count'>): string {
  if (group.pace === 'crawl') return group.surface === 'mud' ? 'crawl-wet' : 'crawl-dry';
  if (group.pace === 'run') return `steps-${group.surface}-run`;
  return group.count === 1 ? `steps-${group.surface}-one` : `steps-${group.surface}-many`;
}

/**
 * Every loop is levelled alike when prepared, so one man is set below a
 * section here; a section's loop is thinner for a few men, full from
 * `FULL_SECTION`.
 */
export const ONE_MAN = 0.6;

export function footstepDensity(count: number): number {
  if (count <= 1) return ONE_MAN;
  return Math.min(1, 0.45 + (0.55 * (count - 2)) / (FULL_SECTION - 2));
}

interface Playing {
  id: string;
  handle: LoopHandle;
}

export class FootstepPlayer {
  private readonly loops = new Map<string, Playing>();

  constructor(private readonly output: AmbientOutput) {}

  /** The loops playing now, by group key and sound id (tests and the dev bridge). */
  get playing(): string[] {
    return [...this.loops.entries()].map(([key, { id }]) => `${key}=${id}`).sort();
  }

  update(groups: readonly FootstepGroup[], point: ListeningPoint): void {
    const zoom = zoomOf(point.span);
    const wanted = new Map<string, { id: string; gain: number; pan: number; distance: number }>();
    for (const group of groups) {
      const distance = Math.hypot(group.x - point.x, group.y - point.y);
      const near = gainAt(distance, FOOTSTEP_RANGE, zoom);
      if (near <= 0) continue;
      const pan = panAt(point, group.x, group.y);
      const key = `${group.squadId}:${group.surface}:${group.pace}`;
      wanted.set(key, { id: footstepId(group), gain: FOOTSTEP_LEVEL * footstepDensity(group.count) * near, pan, distance });
      if (group.pace === 'run') wanted.set(`${key}:rattle`, { id: 'rattle', gain: RATTLE_LEVEL * footstepDensity(group.count) * near, pan, distance });
    }
    const kept = new Map([...wanted.entries()].sort((a, b) => a[1].distance - b[1].distance).slice(0, FOOTSTEP_CAP));
    for (const [key, playing] of this.loops) {
      if (kept.get(key)?.id === playing.id) continue;
      playing.handle.setGain(0, STEP_GLIDE);
      playing.handle.stop(STEP_GLIDE);
      this.loops.delete(key);
    }
    for (const [key, { id, gain, pan }] of kept) {
      let playing = this.loops.get(key);
      if (!playing) {
        const handle = this.output.loop(id);
        if (!handle) continue;
        playing = { id, handle };
        this.loops.set(key, playing);
      }
      playing.handle.setGain(gain, STEP_GLIDE);
      playing.handle.setPan?.(pan, STEP_GLIDE);
    }
  }

  stop(): void {
    for (const { handle } of this.loops.values()) {
      handle.setGain(0, STEP_GLIDE);
      handle.stop(STEP_GLIDE);
    }
    this.loops.clear();
  }
}
