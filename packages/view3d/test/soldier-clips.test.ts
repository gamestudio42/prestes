import { describe, expect, it } from 'vitest';
import {
  CLIP_SPEED,
  holdReady,
  isMoving,
  STOP_DELAY_MS,
  READY_HOLD_MS,
  MIN_CLIP_MS,
  soldierClip,
  soldierOutfit,
  steadyClip,
  turnToward,
  TURN_RATE,
  walkTimeScale,
} from '../src/soldier-clips';

const base = {
  alive: true,
  incapacitated: false,
  routed: false,
  stance: 'standing' as const,
  targetId: null as number | null,
};
const still = { moving: false, firing: false };

describe('soldierClip', () => {
  it('a struck soldier staggers first, even as he falls', () => {
    expect(soldierClip(base, { moving: true, firing: true, hit: true })).toBe('hit');
    expect(soldierClip({ ...base, alive: false }, { moving: false, firing: false, hit: true })).toBe('hit');
  });

  it('shows the dead and the wounded before anything else', () => {
    expect(soldierClip({ ...base, alive: false }, { moving: true, firing: true })).toBe('corpse');
    expect(soldierClip({ ...base, incapacitated: true }, { moving: true, firing: false })).toBe('wounded');
  });

  it('picks the stance variant of walk, fire, aim and idle', () => {
    expect(soldierClip(base, still)).toBe('idle');
    expect(soldierClip(base, { moving: true, firing: false })).toBe('walk');
    expect(soldierClip({ ...base, targetId: 4 }, still)).toBe('aim-stand');
    expect(soldierClip({ ...base, targetId: 4 }, { moving: false, firing: true })).toBe('fire-stand');

    const crouched = { ...base, stance: 'crouched' as const };
    expect(soldierClip(crouched, still)).toBe('crouch-idle');
    expect(soldierClip(crouched, { moving: true, firing: true })).toBe('crouch-walk');
    expect(soldierClip({ ...crouched, targetId: 2 }, still)).toBe('aim-crouch');
    expect(soldierClip(crouched, { moving: false, firing: true })).toBe('fire-crouch');

    const prone = { ...base, stance: 'prone' as const };
    expect(soldierClip(prone, still)).toBe('prone');
    expect(soldierClip(prone, { moving: true, firing: false })).toBe('crawl');
    expect(soldierClip({ ...prone, targetId: 2 }, still)).toBe('aim-prone');
    expect(soldierClip(prone, { moving: false, firing: true })).toBe('fire-prone');
  });
});

describe('engaged', () => {
  it('keeps the rifle up between shots with no target marked', () => {
    expect(soldierClip(base, { moving: false, firing: false, engaged: true })).toBe('aim-stand');
    expect(soldierClip({ ...base, stance: 'prone' }, { moving: false, firing: false, engaged: true })).toBe('aim-prone');
    expect(soldierClip(base, { moving: false, firing: false })).toBe('idle');
  });
});

describe('ready carry', () => {
  it('carries the rifle at the ready on contact orders, sloped on the march', () => {
    expect(soldierClip({ ...base, order: 'recon' }, { moving: true, firing: false })).toBe('walk-ready');
    expect(soldierClip({ ...base, order: 'advance' }, still)).toBe('idle-ready');
    expect(soldierClip({ ...base, order: 'move' }, { moving: true, firing: false })).toBe('walk');
    expect(soldierClip({ ...base, order: 'move', boundTeam: 'a' }, { moving: true, firing: false })).toBe('walk-ready');
    expect(soldierClip({ ...base, order: null, suppression: 0.4 }, still)).toBe('idle-ready');
  });
});

describe('soldierOutfit', () => {
  it('dresses officers, the column and the legalists apart', () => {
    expect(soldierOutfit({ kind: 'officer', faction: 'column' })).toBe('officer');
    expect(soldierOutfit({ kind: 'rifleman', faction: 'column' } as never)).toBe('column');
    expect(soldierOutfit({ kind: 'rifleman', faction: 'legalist' } as never)).toBe('legalist');
  });
});

describe('walkTimeScale', () => {
  it('keeps the step in time with the ground speed, within 0.75..1.25', () => {
    expect(walkTimeScale(1.5)).toBeCloseTo(1);
    expect(walkTimeScale(0)).toBe(0.75);
    expect(walkTimeScale(10)).toBe(1.25);
    expect(walkTimeScale(3.5, CLIP_SPEED.run)).toBeCloseTo(1);
  });
});

describe('gaits in the view (order-tempo-and-facing)', () => {
  const rifleman = { alive: true, incapacitated: false, routed: false, stance: 'standing' as const, targetId: null };

  it('runs on the run gait only, never on a speed spike', () => {
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 3.4, gait: 'run' })).toBe('run');
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 0.9, gait: 'run' })).toBe('run');
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 3.4, gait: 'walk' })).toBe('walk');
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 1.5 })).toBe('walk');
  });

  it('crouched and prone keep their own moving clips', () => {
    expect(soldierClip({ ...rifleman, stance: 'crouched' }, { moving: true, firing: false, speed: 3, gait: 'run' })).toBe('crouch-walk');
    expect(soldierClip({ ...rifleman, stance: 'prone' }, { moving: true, firing: false, speed: 3, gait: 'run' })).toBe('crawl');
  });

  it('turns the body at about 270 degrees a second, the short way', () => {
    const half = turnToward(0, Math.PI, 1 / 3);
    expect(Math.abs(half)).toBeCloseTo(TURN_RATE / 3);
    expect(turnToward(0, 0.1, 1)).toBeCloseTo(0.1);
    expect(turnToward(3, -3, 0.01)).toBeGreaterThan(3);
  });
});

describe('steady clips (no flicker)', () => {
  it('walks only past the start speed and stops only below the stop speed', () => {
    expect(isMoving(0.25, false).moving).toBe(false);
    expect(isMoving(0.4, false).moving).toBe(true);
    expect(isMoving(0.25, true).moving).toBe(true);
  });

  it('waits a moment before a walking soldier counts as halted', () => {
    const first = isMoving(0.05, true, 1000, null);
    expect(first.moving).toBe(true);
    expect(isMoving(0.05, true, 1200, first.stillSince).moving).toBe(true);
    expect(isMoving(0.05, true, 1000 + STOP_DELAY_MS, first.stillSince).moving).toBe(false);
    // Speed back up: the clock resets.
    expect(isMoving(0.5, true, 1250, first.stillSince).stillSince).toBeNull();
  });

  it('holds an ordinary clip a moment before changing', () => {
    expect(steadyClip('idle-ready', 1000, 'idle', 1200)).toBe('idle-ready');
    expect(steadyClip('idle-ready', 1000, 'idle', 1000 + MIN_CLIP_MS)).toBe('idle');
    expect(steadyClip('walk', 1000, 'idle', 1100)).toBe('walk');
  });

  it('lets shots, hits and stance changes cut in at once', () => {
    expect(steadyClip('aim-stand', 1000, 'fire-stand', 1010)).toBe('fire-stand');
    expect(steadyClip('walk', 1000, 'hit', 1010)).toBe('hit');
    expect(steadyClip('idle', 1000, 'crouch-idle', 1010)).toBe('crouch-idle');
  });

  it('a caller-held ready keeps the rifle up', () => {
    const rifleman = { alive: true, incapacitated: false, routed: false, stance: 'standing' as const, targetId: null };
    expect(soldierClip(rifleman, { moving: false, firing: false, ready: true })).toBe('idle-ready');
  });
});

describe('ready through a march', () => {
  it('stays at the ready for the whole walk once raised', () => {
    let until = holdReady(0, 1000, true, true);
    // Fire stops calling for it, but he keeps walking: still ready.
    for (let now = 2000; now < 20000; now += 1000) until = holdReady(until, now, false, true);
    expect(until).toBeGreaterThan(20000);
  });

  it('shoulders the rifle a while after he halts with nothing to face', () => {
    let until = holdReady(0, 1000, true, true);
    until = holdReady(until, 2000, false, false);
    expect(until).toBe(1000 + READY_HOLD_MS);
  });
});

describe('enemy soldiers animate like the player\'s (battle-feel-3v3)', () => {
  // A legalist through what the 3v3 enemy commander now makes him do.
  const legalist = { ...base, faction: 'legalist' as const, kind: 'infantry' as const };
  it('runs to cover, lies down, aims and fires, and aims between shots', () => {
    expect(soldierClip(legalist, { moving: true, firing: false, gait: 'run' })).toBe('run');
    expect(soldierClip({ ...legalist, stance: 'crouched' }, { moving: true, firing: false })).toBe('crouch-walk');
    expect(soldierClip({ ...legalist, stance: 'prone' }, still)).toBe('prone');
    expect(soldierClip({ ...legalist, stance: 'prone', targetId: 7 }, still)).toBe('aim-prone');
    expect(soldierClip({ ...legalist, stance: 'prone', targetId: 7 }, { moving: false, firing: true })).toBe('fire-prone');
    expect(soldierClip({ ...legalist, stance: 'crouched', targetId: 7 }, still)).toBe('aim-crouch');
    expect(soldierOutfit(legalist)).toBe('legalist');
  });
});
