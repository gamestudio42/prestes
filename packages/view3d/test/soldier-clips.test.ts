import { describe, expect, it } from 'vitest';
import { CLIP_SPEED, soldierClip, soldierOutfit, turnToward, TURN_RATE, walkTimeScale } from '../src/soldier-clips';

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
    expect(walkTimeScale(1.6)).toBeCloseTo(1);
    expect(walkTimeScale(0)).toBe(0.75);
    expect(walkTimeScale(10)).toBe(1.25);
    expect(walkTimeScale(3.5, CLIP_SPEED.run)).toBeCloseTo(1);
  });
});

describe('gaits in the view (order-tempo-and-facing)', () => {
  const rifleman = { alive: true, incapacitated: false, routed: false, stance: 'standing' as const, targetId: null };

  it('runs above the run speed, walks below it', () => {
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 3.4 })).toBe('run');
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 1.5 })).toBe('walk');
  });

  it('a run gait runs once he is under way', () => {
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 1.8, gait: 'run' })).toBe('run');
    expect(soldierClip(rifleman, { moving: true, firing: false, speed: 1.0, gait: 'run' })).toBe('walk');
  });

  it('crouched and prone keep their own moving clips', () => {
    expect(soldierClip({ ...rifleman, stance: 'crouched' }, { moving: true, firing: false, speed: 3 })).toBe('crouch-walk');
    expect(soldierClip({ ...rifleman, stance: 'prone' }, { moving: true, firing: false, speed: 3 })).toBe('crawl');
  });

  it('turns the body at about 270 degrees a second, the short way', () => {
    const half = turnToward(0, Math.PI, 1 / 3);
    expect(Math.abs(half)).toBeCloseTo(TURN_RATE / 3);
    expect(turnToward(0, 0.1, 1)).toBeCloseTo(0.1);
    expect(turnToward(3, -3, 0.01)).toBeGreaterThan(3);
  });
});
