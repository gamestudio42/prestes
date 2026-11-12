import { describe, expect, it } from 'vitest';
import { CLIP_SPEED, LOWER_MS, RAISE_MS, aimTransition, deathClip, shotSide, soldierClip, steadyClip } from '../src/soldier-clips';

/**
 * soldier-animation-and-textures 2.1: one test per scenario of the wound,
 * death and crouch requirements of `soldier-art`.
 */
const base = {
  alive: true,
  incapacitated: false,
  routed: false,
  stance: 'standing' as const,
  targetId: null as number | null,
};
const still = { moving: false, firing: false };
const walking = { moving: true, firing: false };

describe('Wounded soldiers are shown by their wound', () => {
  it('A limp is seen: a moderately wounded man walks with the limp, and holds his wound halted', () => {
    expect(soldierClip({ ...base, wound: 'moderate' }, walking)).toBe('limp');
    expect(soldierClip({ ...base, wound: 'light' }, walking)).toBe('limp');
    expect(soldierClip({ ...base, wound: 'none' }, walking)).toBe('walk');
    expect(soldierClip({ ...base, wound: 'moderate' }, still)).toBe('hold-wound');
  });

  it('A man down moves: incapacitated and not reached, he plays the lying-wounded loop', () => {
    expect(soldierClip({ ...base, incapacitated: true, soldierState: 'incapacitated' }, still)).toBe('lying-wounded');
  });

  it('A rescue is readable: carry and carried on the way, kneel and lie at the cover', () => {
    expect(soldierClip({ ...base, soldierState: 'rescuing' }, { ...walking, carrying: true })).toBe('carry');
    expect(soldierClip({ ...base, incapacitated: true, soldierState: 'being-carried' }, still)).toBe('carried');
    expect(soldierClip({ ...base, soldierState: 'treating' }, still)).toBe('kneel-treat');
    expect(soldierClip({ ...base, incapacitated: true, soldierState: 'incapacitated' }, { ...still, treated: true })).toBe('treated');
    // Walking to the casualty, before he reaches him, the rescuer just walks.
    expect(soldierClip({ ...base, soldierState: 'rescuing' }, walking)).toBe('walk');
  });
});

describe('Death by stance and direction', () => {
  it('Shot from the front, standing: he falls backward', () => {
    // Facing north (-y); the shooter is north of him.
    expect(shotSide(0, -1, 0, -40)).toBe('front');
    expect(deathClip('standing', shotSide(0, -1, 0, -40))).toBe('death-stand-front');
    expect(deathClip('standing', shotSide(0, -1, 0, 40))).toBe('death-stand-back');
    expect(deathClip('standing', shotSide(0, -1, 40, 0))).toBe('death-stand-flank');
    expect(soldierClip({ ...base, alive: false }, { ...still, hit: true, death: 'death-stand-front' })).toBe('death-stand-front');
  });

  it('Prone soldiers do not stand up to die', () => {
    for (const side of ['front', 'back', 'flank'] as const) expect(deathClip('prone', side)).toBe('death-prone');
    expect(deathClip('crouched', 'back')).toBe('death-crouch');
  });

  it('The same battle, the same field: the choice depends only on its inputs', () => {
    expect(deathClip('standing', shotSide(0.6, -0.8, 12, -30))).toBe(deathClip('standing', shotSide(0.6, -0.8, 12, -30)));
    // A dead man seen already fallen lies in the plain corpse.
    expect(soldierClip({ ...base, alive: false }, still)).toBe('corpse');
  });
});

describe('Crouched movement, aiming and reloading', () => {
  it('Crouch-walk stays low: a crouched man walks with the crouch-walk, keyed to its speed', () => {
    expect(soldierClip({ ...base, stance: 'crouched' }, walking)).toBe('crouch-walk');
    expect(CLIP_SPEED['crouch-walk']).toBeLessThan(CLIP_SPEED.walk!);
  });

  it('Aim is raised, not snapped: the raise plays before the aim and the first shot', () => {
    const t0 = 1000;
    expect(aimTransition('idle-ready', 0, 'aim-stand', t0)).toBe('raise-stand');
    expect(aimTransition('raise-stand', t0, 'fire-stand', t0 + RAISE_MS / 2)).toBe('raise-stand');
    expect(aimTransition('raise-stand', t0, 'fire-stand', t0 + RAISE_MS + 1)).toBe('fire-stand');
    // steadyClip does not hold the raise back from the shot once it is done.
    expect(steadyClip('raise-stand', t0, 'fire-stand', t0 + RAISE_MS + 1)).toBe('fire-stand');
    // And it is lowered after, not dropped.
    expect(aimTransition('aim-stand', 0, 'idle-ready', t0)).toBe('lower-stand');
    expect(aimTransition('lower-stand', t0, 'idle-ready', t0 + LOWER_MS + 1)).toBe('idle-ready');
    // Crouched too; prone holds the rifle at the cheek already.
    expect(aimTransition('crouch-idle', 0, 'aim-crouch', t0)).toBe('raise-crouch');
    expect(aimTransition('prone', 0, 'aim-prone', t0)).toBe('aim-prone');
  });

  it('Reload in cover: a prone man with an empty weapon and rounds left plays the prone reload', () => {
    expect(soldierClip({ ...base, stance: 'prone', magazine: 0, reserve: 30 }, still)).toBe('reload-prone');
    expect(soldierClip({ ...base, stance: 'crouched', magazine: 0, reserve: 30 }, still)).toBe('reload-crouch');
    expect(soldierClip({ ...base, magazine: 0, reserve: 30 }, still)).toBe('reload-stand');
    // Out of rounds altogether there is nothing to load.
    expect(soldierClip({ ...base, stance: 'prone', magazine: 0, reserve: 0 }, still)).toBe('prone');
  });

  it('turning in the aim steps round instead of sliding', () => {
    expect(soldierClip({ ...base, targetId: 7 }, { ...still, turning: true })).toBe('aim-turn-stand');
    expect(soldierClip({ ...base, stance: 'crouched', targetId: 7 }, { ...still, turning: true })).toBe('aim-turn-crouch');
    expect(aimTransition('aim-stand', 0, 'aim-turn-stand', 1000)).toBe('aim-turn-stand');
  });
});
