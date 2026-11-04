import type { UnitSnapshot } from '@prestes/shared';

/** Clip names exported by art-src/blender/target_soldier.py. */
export type SoldierClip =
  | 'idle'
  | 'walk'
  | 'idle-ready'
  | 'walk-ready'
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
  | 'wounded'
  | 'corpse';

export type SoldierOutfit = 'column' | 'legalist' | 'officer';

/** Clips that hold their last pose instead of looping. */
export const HELD_CLIPS: ReadonlySet<SoldierClip> = new Set([
  'fire-stand',
  'fire-crouch',
  'fire-prone',
  'wounded',
  'corpse',
]);

export interface ClipState {
  moving: boolean;
  /** The soldier fired in the last few tenths of a second. */
  firing: boolean;
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
  if (!unit.alive) return 'corpse';
  if (unit.incapacitated) return 'wounded';
  const aiming = unit.targetId !== null;
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
  const ready = atTheReady(unit);
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

/** Ground speed each moving clip is authored at, in metres per second. */
export const CLIP_SPEED: Partial<Record<SoldierClip, number>> = {
  walk: 1.4,
  'walk-ready': 1.4,
  'crouch-walk': 1.0,
  crawl: 0.45,
};

/** Play a moving clip in step with the ground speed. */
export function walkTimeScale(metresPerSecond: number, authored = 1.4): number {
  return Math.max(0.4, Math.min(2.2, metresPerSecond / authored));
}
