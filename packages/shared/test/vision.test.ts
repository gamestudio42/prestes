import { describe, expect, it } from 'vitest';
import { isPointInVision } from '../src';

const observer = { x: 0, y: 0, facingX: 0, facingY: -1 };

describe('vision cone', () => {
  it('sees forward but not behind', () => {
    expect(isPointInVision(observer, { x: 0, y: -5 })).toBe(true);
    expect(isPointInVision(observer, { x: 0, y: 5 })).toBe(false);
  });

  it('uses the configured half-angle', () => {
    expect(isPointInVision(observer, { x: 5, y: -5 })).toBe(false);
    expect(isPointInVision(observer, { x: 1, y: -5 }, 45)).toBe(true);
  });

  it('treats the observer position as visible', () => {
    expect(isPointInVision(observer, { x: 0, y: 0 })).toBe(true);
  });
});

