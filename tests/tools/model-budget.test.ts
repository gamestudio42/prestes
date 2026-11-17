import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkModelLimits, type ModelLimit } from '../../tools/model-budget';

// improve-soldier-models 1.1: the model limits of `pnpm check:bundle`.

let dir: string | null = null;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

function build(files: Record<string, number>): string {
  dir = mkdtempSync(join(tmpdir(), 'prestes-models-'));
  mkdirSync(join(dir, 'textures'));
  writeFileSync(join(dir, 'textures', 'soldier-b-0.png'), Buffer.alloc(100));
  for (const [path, bytes] of Object.entries(files)) writeFileSync(join(dir, path), Buffer.alloc(bytes));
  return dir;
}

const LIMITS: ModelLimit[] = [{ name: 'soldier model', file: 'soldier.glb', maxBytes: 1000 }];

describe('model limits', () => {
  it('prints a line per model and passes within the limits', () => {
    const result = checkModelLimits(build({ 'soldier.glb': 900 }), [LIMITS[0]!]);
    expect(result.failed).toBe(false);
    expect(result.lines).toEqual(['ok   soldier model: 900 B / 1,000 B (90.0%)']);
  });

  it('fails over the limit and names the model', () => {
    const result = checkModelLimits(build({ 'soldier.glb': 1001 }), [LIMITS[0]!]);
    expect(result.failed).toBe(true);
    expect(result.lines[0]).toMatch(/^FAIL soldier model: 1,001 B/);
  });

  it('sums a group and fails when a model is missing', () => {
    const root = build({ 'soldier-a-0.png': 300, 'soldier-a-1.png': 300, 'trees.png': 900 });
    const group = checkModelLimits(root, [{ name: 'soldier textures', prefix: 'soldier-', extension: '.png', maxBytes: 500 }]);
    expect(group.failed).toBe(true);
    expect(group.lines[0]).toMatch(/600 B \/ 500 B/);
    expect(checkModelLimits(root, [LIMITS[0]!]).failed).toBe(true);
  });

  it('looks in a subfolder when the limit names one', () => {
    const result = checkModelLimits(build({ 'soldier.glb': 10 }), [{ name: 'soldier textures', subdir: 'textures', prefix: 'soldier-', extension: '.png', maxBytes: 500 }]);
    expect(result.lines).toEqual(['ok   soldier textures: 100 B / 500 B (20.0%)']);
  });
});
