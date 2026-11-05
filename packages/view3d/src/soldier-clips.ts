import type { UnitSnapshot } from '@prestes/shared';

/** Clip names exported by art-src/blender/target_soldier.py. */
export type SoldierClip =
  | 'idle'
  | 'walk'
  | 'idle-ready'
  | 'walk-ready'
  | 'run'
  | 'crouch-idle'
  | 'crouch-walk'
  | 'prone'
  | 'crawl'
  | 'aim-stand'
  | 'fire-stand'
  | 'aim-crouch'
  | 'fire-crouch'
  | 'aim-prone'
  | 'fire-prone'
  | 'hit'
  | 'wounded'
  | 'corpse';

export type SoldierOutfit = 'column' | 'legalist' | 'officer';

/** Clips that hold their last pose instead of looping. */
export const HELD_CLIPS: ReadonlySet<SoldierClip> = new Set([
  'hit',
  'fire-stand',
  'fire-crouch',
  'fire-prone',
  'wounded',
  'corpse',
]);

export interface ClipState {
  moving: boolean;
  /** Ground speed (m/s, smoothed): above RUN_SPEED a standing soldier runs. */
  speed?: number;
  /**
   * At the ready, decided by the caller with a hold (see READY_HOLD_MS);
   * when absent, from the snapshot alone.
   */
   ready?: boolean;
  /** The simulation's gait while moving: a run gait runs from the first step. */
  gait?: UnitSnapshot['gait'];
  /** The soldier fired in the last few tenths of a second. */
  firing: boolean;
  /** The soldier was struck a moment ago (also just before he falls). */
  hit?: boolean;
  /**
   * He fired in the last few seconds: he keeps the rifle up between shots
   * even when no target is marked, instead of shouldering it each time.
   */
  engaged?: boolean;
}

/**
 * Orders that expect contact: the soldier carries the rifle at the ready,
 * muzzle forward, instead of sloped on the shoulder for the march.
 */
export const READY_ORDERS: ReadonlySet<UnitSnapshot['order']> = new Set<UnitSnapshot['order']>([
  'advance',
  'recon',
  'attack',
  'flank',
  'pursue',
  'defend',
  'ambush',
  'suppress',
  'aim',
  'protect-officer',
  'withdraw',
]);

type ClipUnit = Pick<UnitSnapshot, 'alive' | 'incapacitated' | 'routed' | 'stance' | 'targetId'> &
  Partial<Pick<UnitSnapshot, 'order' | 'suppression' | 'boundTeam'>>;

/** At the ready: a contact order, bounding, or under fire. */
export function atTheReady(unit: ClipUnit): boolean {
  return (
    READY_ORDERS.has(unit.order ?? null) ||
    (unit.boundTeam ?? null) !== null ||
    (unit.suppression ?? 0) > 0.15
  );
}

/** The clip a soldier plays for its snapshot and what it is doing. */
export function soldierClip(unit: ClipUnit, state: ClipState): SoldierClip {
  if (state.hit) return 'hit';
  if (!unit.alive) return 'corpse';
  if (unit.incapacitated) return 'wounded';
  const aiming = unit.targetId !== null || state.engaged === true;
  if (unit.stance === 'prone') {
    if (state.moving) return 'crawl';
    if (state.firing) return 'fire-prone';
    return aiming ? 'aim-prone' : 'prone';
  }
  if (unit.stance === 'crouched') {
    if (state.moving) return 'crouch-walk';
    if (state.firing) return 'fire-crouch';
    return aiming ? 'aim-crouch' : 'crouch-idle';
  }
  const ready = state.ready ?? atTheReady(unit);
  // Only the simulation's run gait runs: a hitch in the frame positions can
  // spike the measured speed, and the legs must not answer it.
  if (state.moving && state.gait === 'run') {
    return 'run';
  }
  if (state.moving) return ready ? 'walk-ready' : 'walk';
  if (state.firing) return 'fire-stand';
  if (aiming) return 'aim-stand';
  return ready ? 'idle-ready' : 'idle';
}

/** The column wears the slouch hat and khaki; legalists olive and the kepi. */
export function soldierOutfit(unit: Pick<UnitSnapshot, 'kind' | 'faction'>): SoldierOutfit {
  if (unit.kind === 'officer') return 'officer';
  return unit.faction === 'column' ? 'column' : 'legalist';
}

/**
 * A halted soldier starts walking above START_SPEED and a walking one stops
 * below STOP_SPEED (m/s): the gap keeps a nudge from his mates, or a soldier
 * easing onto his slot, from flicking the legs between walk and stand.
 */
export const START_SPEED = 0.35;
export const STOP_SPEED = 0.12;

/** A walking soldier counts as halted only after this long below STOP_SPEED (ms). */
export const STOP_DELAY_MS = 300;

/**
 * Walking or halted, with hysteresis on speed and a short delay before a
 * halt: a late frame from the simulation freezes the drawn position for a
 * moment, and the legs must not stop for it. `stillSince` is when the speed
 * last fell below STOP_SPEED (null while above it); returns it updated.
 */
export function isMoving(
  speed: number,
  wasMoving: boolean,
  now = 0,
  stillSince: number | null = null,
): { moving: boolean; stillSince: number | null } {
  if (!wasMoving) return { moving: speed > START_SPEED, stillSince: null };
  if (speed > STOP_SPEED) return { moving: true, stillSince: null };
  const since = stillSince ?? now;
  return { moving: now - since < STOP_DELAY_MS, stillSince: since };
}

/** Once at the ready, a soldier keeps the rifle up this long (ms). */
export const READY_HOLD_MS = 3000;

/**
 * Until when the rifle stays at the ready. Anything that calls for it (a
 * contact order, a target, recent fire, suppression) holds it READY_HOLD_MS;
 * once up during a march it stays up until he halts, so a walking soldier
 * never swaps between the ready and the shoulder at every flicker of fire.
 */
export function holdReady(readyUntil: number, now: number, wantsReady: boolean, moving: boolean): number {
  if (wantsReady || (moving && now < readyUntil)) return now + READY_HOLD_MS;
  return readyUntil;
}

/** A clip plays at least this long (ms) before an ordinary change. */
export const MIN_CLIP_MS = 600;

/** Clips that cut in at once: a shot, a hit, a fall. */
const URGENT: ReadonlySet<SoldierClip> = new Set([
  'hit',
  'fire-stand',
  'fire-crouch',
  'fire-prone',
  'wounded',
  'corpse',
]);

/**
 * The clip to play now: the wanted one, unless the current one began less
 * than MIN_CLIP_MS ago and neither is urgent (stance changes still show at
 * once through the urgent shot and hit clips, and a stance change is a new
 * clip family the player asked for, so it passes too).
 */
export function steadyClip(
  current: SoldierClip | null,
  since: number,
  wanted: SoldierClip,
  now: number,
): SoldierClip {
  if (current === null || current === wanted) return wanted;
  if (URGENT.has(wanted) || URGENT.has(current)) return wanted;
  if (stanceOf(current) !== stanceOf(wanted)) return wanted;
  return now - since < MIN_CLIP_MS ? current : wanted;
}

function stanceOf(clip: SoldierClip): 'standing' | 'crouched' | 'prone' {
  if (clip.startsWith('crouch') || clip.endsWith('crouch')) return 'crouched';
  if (clip === 'prone' || clip === 'crawl' || clip.endsWith('prone')) return 'prone';
  return 'standing';
}

/**
 * Ground speed each moving clip is authored at, in metres per second at 1x
 * (real time since order-tempo-and-facing): two steps a second for the walk,
 * three for the run.
 */
export const CLIP_SPEED: Partial<Record<SoldierClip, number>> = {
  walk: 1.6,
  'walk-ready': 1.5,
  run: 3.5,
  'crouch-walk': 1.0,
  crawl: 0.45,
};

/**
 * Play a moving clip in step with the ground speed, clamped to 0.75..1.25 of
 * its authored rate: beyond that the next clip (walk or run) takes over, so
 * the feet never visibly skate or blur.
 */
export function walkTimeScale(metresPerSecond: number, authored = 1.6): number {
  return Math.max(0.75, Math.min(1.25, metresPerSecond / authored));
}

/** Body turn rate (radians a second): about 270 degrees, not a snap. */
export const TURN_RATE = (270 * Math.PI) / 180;

/** Turn `from` toward `to` by at most TURN_RATE * seconds, the short way. */
export function turnToward(from: number, to: number, seconds: number): number {
  let delta = (to - from + Math.PI) % (Math.PI * 2);
  if (delta < 0) delta += Math.PI * 2;
  delta -= Math.PI;
  const limit = TURN_RATE * seconds;
  return from + Math.max(-limit, Math.min(limit, delta));
}
