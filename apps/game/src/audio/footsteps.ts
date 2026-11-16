import type { Frame, TerrainSurface, UnitSnapshot, VegetationKind } from '@prestes/shared';
import type { LoopHandle } from './ambient-player';
import { gainAt, panAt, zoomOf, type ListeningPoint } from './listening';

/**
 * ambient-sound-and-voices 4.1 (design D4, amended 2026-11-15): footsteps by
 * group, played step by step. The moving men of a section are bucketed by
 * the ground under them and their pace; each bucket is heard at the men's
 * average place as a few pairs of feet ("streams", up to `MAX_STREAMS`),
 * each stepping at the gait's cadence (walk, run, crawl) with a little
 * jitter in time, pitch and level. The steps are cut from one man's
 * recording on that ground (`stepGrains`) and scheduled on the audio clock
 * a moment ahead; a stream that falls behind the clock (a pause, a hidden
 * tab) starts afresh instead of catching up, so steps never come in bursts.
 * Running adds the equipment rattle loop. Heard for the listener's own
 * side, and for the enemy only while seen (fog of war); the nearest groups
 * only, up to a cap. Men in water are the wading's (3.4).
 *
 * The owner (2026-11-15): the looped recordings sounded like steps that
 * "repeat, stop, then repeat fast": the takes are uneven (clusters of hits
 * and second-long gaps) and the section loops are one take layered.
 */

export type FootSurface = 'road' | 'dirt' | 'grass' | 'mud' | 'stone' | 'wood' | 'brush';
export type Pace = 'walk' | 'run' | 'crawl';

export const FOOT_SURFACES: readonly FootSurface[] = ['road', 'dirt', 'grass', 'mud', 'stone', 'wood', 'brush'];

/** How far footsteps are heard at the nearest zoom (m). */
export const FOOTSTEP_RANGE = 30;
export const FOOTSTEP_LEVEL = 0.6;
export const RATTLE_LEVEL = 0.45;
/** The most groups heard at once: the nearest. */
export const FOOTSTEP_CAP = 6;
/** The most rattle loops at once (the nearest running groups). */
export const RATTLE_CAP = 2;
/** Seconds a loop glides to a new level, or stops. */
export const STEP_GLIDE = 0.3;
/** A section of this many men or more is at full level; fewer are thinner. */
export const FULL_SECTION = 5;
/** Seconds between one man's steps at each pace, at the game's normal speed. */
export const STEP_INTERVAL: Readonly<Record<Pace, number>> = { walk: 0.55, run: 0.34, crawl: 0.85 };
/** Each step lands up to this share of the interval early or late. */
export const STEP_JITTER = 0.08;
/** Pairs of feet heard for one group at most: a section is a few men out of step, not eleven. */
export const MAX_STREAMS = 4;
/** Seconds of steps scheduled ahead of the audio clock on each update (longer than the slow clock). */
export const STEP_LOOKAHEAD = 0.4;
/** The fastest the cadence follows the game's speed: at 4× the men do not tap-dance. */
export const MAX_CADENCE_RATE = 1.5;
/** Pitch of a step, as playback rate: 1 ± this. */
export const STEP_PITCH = 0.06;
/** Level of a step: 1 - up to this. */
export const STEP_LEVEL_JITTER = 0.25;

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
 * The recording a group's steps are cut from: one man's take on that ground
 * for walking and running (a section is several of him out of step), the
 * crawl takes for crawling, dry or wet (`files footsteps/<id>.mp3`).
 */
export function footstepSource(group: Pick<FootstepGroup, 'surface' | 'pace'>): string {
  if (group.pace === 'crawl') return group.surface === 'mud' ? 'crawl-wet' : 'crawl-dry';
  return `steps-${group.surface}-one`;
}

/** Pairs of feet heard for a group of `count` men. */
export function streamsFor(count: number): number {
  return Math.max(1, Math.min(MAX_STREAMS, Math.floor(count)));
}

/**
 * One man is set below a section; a section is thinner for a few men, full
 * from `FULL_SECTION`.
 */
export const ONE_MAN = 0.6;

export function footstepDensity(count: number): number {
  if (count <= 1) return ONE_MAN;
  return Math.min(1, 0.45 + (0.55 * (count - 2)) / (FULL_SECTION - 2));
}

/** One step cut from a recording: where it starts and how long it rings (s). */
export interface StepGrain {
  offset: number;
  duration: number;
}

/** Window of the loudness envelope the steps are found in (s). */
const GRAIN_WINDOW = 0.01;
/** A step starts where the envelope rises through this share of the take's loudest window. */
const GRAIN_THRESHOLD = 0.3;
/** Seconds of lead before a step's onset, so its attack is whole. */
const GRAIN_LEAD = 0.015;

/**
 * The steps of a recording, found by their onsets in its loudness envelope:
 * each runs from its onset to the next one, up to `longest` seconds; hits
 * closer than `apart` seconds (heel and toe, a scuff) are one step.
 */
export function stepGrains(data: Float32Array, sampleRate: number, apart = 0.15, longest = 0.32): StepGrain[] {
  const size = Math.max(1, Math.round(sampleRate * GRAIN_WINDOW));
  const envelope: number[] = [];
  for (let start = 0; start + size <= data.length; start += size) {
    let sum = 0;
    for (let index = start; index < start + size; index += 1) sum += data[index]! * data[index]!;
    envelope.push(Math.sqrt(sum / size));
  }
  let loudest = 0;
  for (const value of envelope) loudest = Math.max(loudest, value);
  if (!(loudest > 0)) return [];
  const onsets: number[] = [];
  for (let index = 1; index < envelope.length; index += 1) {
    const rising = envelope[index]! > loudest * GRAIN_THRESHOLD && envelope[index - 1]! <= loudest * GRAIN_THRESHOLD;
    const last = onsets[onsets.length - 1];
    if (rising && (last === undefined || (index - last) * GRAIN_WINDOW >= apart)) onsets.push(index);
  }
  const end = data.length / sampleRate;
  return onsets.map((onset, index) => {
    const offset = Math.max(0, onset * GRAIN_WINDOW - GRAIN_LEAD);
    const next = onsets[index + 1];
    const until = next === undefined ? end : next * GRAIN_WINDOW - GRAIN_LEAD;
    return { offset, duration: Math.max(0.05, Math.min(longest, until - offset)) };
  });
}

/**
 * One pair of feet: the times of its steps on the audio clock. Asked for the
 * steps due before `until`, it gives each once, an interval apart with a
 * little jitter. Fallen behind `now` (the clock ran on while nobody asked:
 * a pause, a hidden tab, a stalled update), it starts afresh within one
 * interval rather than playing the steps it missed; a step planned far
 * ahead at a slower cadence is brought in to the new one.
 */
export class StepCadence {
  private next: number | null = null;
  private last: number | null = null;

  constructor(private readonly random: () => number = Math.random) {}

  due(now: number, until: number, interval: number): number[] {
    if (!(interval > 0)) return [];
    if (this.last !== null && this.next !== null && this.next >= now && this.next - this.last > interval * (1 + STEP_JITTER)) this.next = this.last + interval;
    // Behind the clock: start afresh at a phase of its own (never "now" for every pair of feet at once).
    if (this.next === null || this.next < now) this.next = now + this.random() * interval;
    const steps: number[] = [];
    while (this.next < until) {
      steps.push(this.next);
      this.last = this.next;
      this.next += interval * (1 + (this.random() * 2 - 1) * STEP_JITTER);
    }
    return steps;
  }
}

/** What the footsteps play through: the ambient output, with steps on the audio clock. */
export interface FootstepOutput {
  /** Starts a loop at gain 0 (the rattle), or null when its file is not loaded. */
  loop(id: string): LoopHandle | null;
  /** The steps cut from a recording, or null while it is not loaded. */
  grains(id: string): readonly StepGrain[] | null;
  /** Plays one step of a recording at `when` on the audio clock. */
  step(id: string, grain: StepGrain, when: number, gain: number, pan: number, rate: number): void;
  /** The audio clock (s), or null with no audio. */
  now(): number | null;
}

interface Stream {
  cadence: StepCadence;
  /** This man's own pace against the others' (a few per cent), so the feet drift out of step. */
  stride: number;
  lastGrain: number;
}

interface Heard {
  group: FootstepGroup;
  key: string;
  gain: number;
  pan: number;
  distance: number;
}

/** Seconds between one pair of feet's steps at a pace, quickened by the game's speed up to `MAX_CADENCE_RATE`. */
export function stepInterval(pace: Pace, rate: number): number {
  return STEP_INTERVAL[pace] / Math.min(MAX_CADENCE_RATE, rate);
}

export class FootstepPlayer {
  private readonly streams = new Map<string, Stream[]>();
  private readonly rattles = new Map<string, LoopHandle>();
  private readonly heard = new Map<string, string>();

  constructor(
    private readonly output: FootstepOutput,
    private readonly random: () => number = Math.random,
  ) {}

  /** The groups heard now, by group key and recording (tests and the dev bridge). */
  get playing(): string[] {
    return [...this.heard.entries()].map(([key, id]) => `${key}=${id}`).sort();
  }

  /**
   * Called on the slow clock. `rate` is the game's speed as the men's gait
   * hears it (1 normal, 0 paused: no steps).
   */
  update(groups: readonly FootstepGroup[], point: ListeningPoint, rate = 1): void {
    const now = this.output.now();
    const zoom = zoomOf(point.span);
    const heard: Heard[] = [];
    for (const group of groups) {
      const distance = Math.hypot(group.x - point.x, group.y - point.y);
      const near = gainAt(distance, FOOTSTEP_RANGE, zoom);
      if (near <= 0) continue;
      const key = `${group.squadId}:${group.surface}:${group.pace}`;
      heard.push({ group, key, gain: FOOTSTEP_LEVEL * footstepDensity(group.count) * near, pan: panAt(point, group.x, group.y), distance });
    }
    const kept = heard.sort((a, b) => a.distance - b.distance).slice(0, FOOTSTEP_CAP);
    const keys = new Set(kept.map((entry) => entry.key));
    for (const key of this.streams.keys()) if (!keys.has(key)) this.streams.delete(key);
    this.heard.clear();
    for (const entry of kept) this.heard.set(entry.key, footstepSource(entry.group));
    this.updateRattle(kept);
    if (now === null || !(rate > 0)) return;
    for (const entry of kept) this.schedule(entry, now, rate);
  }

  private schedule({ group, key, gain, pan }: Heard, now: number, rate: number): void {
    const id = footstepSource(group);
    const grains = this.output.grains(id);
    if (!grains || grains.length === 0) return;
    const count = streamsFor(group.count);
    const streams = (this.streams.get(key) ?? []).slice(0, count);
    while (streams.length < count) streams.push({ cadence: new StepCadence(this.random), stride: 1 + (this.random() * 2 - 1) * 0.04, lastGrain: -1 });
    this.streams.set(key, streams);
    // Several pairs of feet together are as loud as the group, not louder for each.
    const each = gain / Math.sqrt(count);
    const interval = stepInterval(group.pace, rate);
    const pitch = group.pace === 'run' ? 1.06 : 1;
    for (const stream of streams) {
      for (const when of stream.cadence.due(now, now + STEP_LOOKAHEAD, interval * stream.stride)) {
        let index = Math.floor(this.random() * grains.length);
        if (index === stream.lastGrain && grains.length > 1) index = (index + 1) % grains.length;
        stream.lastGrain = index;
        const level = each * (1 - this.random() * STEP_LEVEL_JITTER);
        const spread = Math.max(-1, Math.min(1, pan + (this.random() * 2 - 1) * 0.08));
        this.output.step(id, grains[index]!, when, level, spread, pitch * (1 + (this.random() * 2 - 1) * STEP_PITCH));
      }
    }
  }

  private updateRattle(kept: readonly Heard[]): void {
    const wanted = new Map(
      kept
        .filter((entry) => entry.group.pace === 'run')
        .slice(0, RATTLE_CAP)
        .map((entry) => [entry.key, { gain: (RATTLE_LEVEL / FOOTSTEP_LEVEL) * entry.gain, pan: entry.pan }]),
    );
    for (const [key, handle] of this.rattles) {
      if (wanted.has(key)) continue;
      handle.setGain(0, STEP_GLIDE);
      handle.stop(STEP_GLIDE);
      this.rattles.delete(key);
    }
    for (const [key, { gain, pan }] of wanted) {
      let handle = this.rattles.get(key);
      if (!handle) {
        const started = this.output.loop('rattle');
        if (!started) continue;
        handle = started;
        this.rattles.set(key, handle);
      }
      handle.setGain(gain, STEP_GLIDE);
      handle.setPan?.(pan, STEP_GLIDE);
    }
  }

  stop(): void {
    for (const handle of this.rattles.values()) {
      handle.setGain(0, STEP_GLIDE);
      handle.stop(STEP_GLIDE);
    }
    this.rattles.clear();
    this.streams.clear();
    this.heard.clear();
  }
}

/** The simulation's ticks a second at the game's normal speed. */
export const TICKS_PER_SECOND = 10;
/** No new tick for this long (s) means the game is paused: the men's feet are still. */
const PAUSED_AFTER = 0.4;
/** Seconds of ticks the speed is measured over: the frames arrive unevenly, a quarter second is too short. */
const MEASURE_OVER = 1;

/**
 * The game's speed as heard from the frames' ticks on the slow clock: 0
 * while paused, otherwise the ticks' pace against `TICKS_PER_SECOND`
 * measured over a second, so the frames' uneven arrival does not make the
 * cadence waver (two ticks in 0.3 s is not half speed). It is the pace the
 * men really move at: the game's speed (0.5× to 4×), or slower when the
 * simulation lags behind it.
 */
export class GaitClock {
  /** The last tick seen and when it changed. */
  private tick: number | null = null;
  private changedAt = 0;
  /** Where the current measure began. */
  private fromTick = 0;
  private fromAt = 0;
  private speed = 1;

  /** `tick` is the frame's on screen, `now` the wall clock (s). */
  update(tick: number | undefined, now: number): number {
    if (tick === undefined) return 1;
    if (tick === this.tick) return now - this.changedAt > PAUSED_AFTER ? 0 : this.speed;
    // The first frame, a restart, or the first tick after a pause: measure afresh, not across the gap.
    if (this.tick === null || tick < this.tick || now - this.changedAt > PAUSED_AFTER) {
      this.fromTick = tick;
      this.fromAt = now;
    } else if (now - this.fromAt >= MEASURE_OVER) {
      this.speed = (tick - this.fromTick) / TICKS_PER_SECOND / (now - this.fromAt);
      this.fromTick = tick;
      this.fromAt = now;
    }
    this.tick = tick;
    this.changedAt = now;
    return this.speed;
  }
}
