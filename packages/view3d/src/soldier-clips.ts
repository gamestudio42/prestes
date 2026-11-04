import type { UnitSnapshot } from '@prestes/shared';

/** Clip names exported by art-src/blender/target_soldier.py. */
export type SoldierClip =
  | 'idle'
  | 'walk'
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

/** The clip a soldier plays for its snapshot and what it is doing. */
export function soldierClip(
  unit: Pick<UnitSnapshot, 'alive' | 'incapacitated' | 'routed' | 'stance' | 'targetId'>,
  state: ClipState,
): SoldierClip {
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
  if (state.moving) return 'walk';
  if (state.firing) return 'fire-stand';
  return aiming ? 'aim-stand' : 'idle';
}

/** The column wears the slouch hat and khaki; legalists olive and the kepi. */
export function soldierOutfit(unit: Pick<UnitSnapshot, 'kind' | 'faction'>): SoldierOutfit {
  if (unit.kind === 'officer') return 'officer';
  return unit.faction === 'column' ? 'column' : 'legalist';
}

/** Walk clips are authored at 1.4 m/s; play them in step with the ground speed. */
export function walkTimeScale(metresPerSecond: number): number {
  return Math.max(0.4, Math.min(2.2, metresPerSecond / 1.4));
}
