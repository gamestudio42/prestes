import { describe, expect, it } from 'vitest';
import {
  CRITICAL_MORALE,
  PANIC_MORALE,
  PINNED_SUPPRESSION,
  SUPPRESSION_THRESHOLD,
  moraleStateFor,
} from '../src/morale';

describe('morale state', () => {
  it('is steady with high morale and low suppression', () => {
    expect(moraleStateFor(100, 0)).toBe('steady');
  });

  it('becomes suppressed at the suppression threshold', () => {
    expect(moraleStateFor(100, SUPPRESSION_THRESHOLD)).toBe('suppressed');
    expect(moraleStateFor(SUPPRESSION_THRESHOLD, 0)).toBe('pinned');
  });

  it('becomes pinned at high suppression', () => {
    expect(moraleStateFor(100, PINNED_SUPPRESSION)).toBe('pinned');
  });

  it('becomes panicked at low morale under suppression', () => {
    expect(moraleStateFor(PANIC_MORALE, SUPPRESSION_THRESHOLD)).toBe('panicked');
    expect(moraleStateFor(CRITICAL_MORALE, 0)).toBe('panicked');
  });

  it('reports routed over every other state', () => {
    expect(moraleStateFor(100, 0, true)).toBe('routed');
  });
});


