import { describe, expect, it } from 'vitest';
import { ringColorFor, shortestAngleDelta } from '../src/character-layer';
import { PALETTE } from '../src/palette';

describe('character ring colour', () => {
  it('does not use the casualty red for a prone soldier', () => {
    expect(ringColorFor({ incapacitated: false, stance: 'prone' })).toBe(PALETTE.orderMarker);
    expect(ringColorFor({ incapacitated: false, stance: 'prone' })).not.toBe(PALETTE.scarf);
  });

  it('keeps red for incapacitated soldiers and selection colour for standing', () => {
    expect(ringColorFor({ incapacitated: true, stance: 'prone' })).toBe(PALETTE.scarf);
    expect(ringColorFor({ incapacitated: false, stance: 'standing' })).toBe(PALETTE.selection);
    expect(ringColorFor({ incapacitated: false, stance: 'crouched' })).toBe(PALETTE.orderMarker);
  });
});
describe('character facing smoothing', () => {
  it('takes the shortest turn across the angle wrap', () => {
    expect(shortestAngleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(shortestAngleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(shortestAngleDelta(0, (Math.PI * 3) / 2)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('concealed ring', () => {
  it('marks a soldier hidden in vegetation', () => {
    expect(ringColorFor({ incapacitated: false, stance: 'crouched', concealed: true })).toBe(PALETTE.concealed);
    expect(ringColorFor({ incapacitated: true, stance: 'prone', concealed: true })).toBe(PALETTE.scarf);
  });
});
