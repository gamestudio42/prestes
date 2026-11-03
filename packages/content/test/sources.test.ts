import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIGURES, SOURCE_KEYS, isSourceKey } from '../src';

const root = process.cwd();
const sourcesPath = resolve(root, 'docs/history/SOURCES.md');
const sourcesText = readFileSync(sourcesPath, 'utf8');

describe('source resolution', () => {
  it('registers every source key in SOURCES.md', () => {
    for (const key of SOURCE_KEYS) {
      expect(sourcesText, key).toContain(`\`${key}\``);
    }
  });

  it('resolves every figure source reference', () => {
    for (const figure of FIGURES) {
      for (const source of figure.sourceRefs) {
        expect(isSourceKey(source), `${figure.id}: ${source}`).toBe(true);
        expect(sourcesText, `${figure.id}: ${source}`).toContain(`\`${source}\``);
      }
    }
  });

  it('rejects an unknown source key', () => {
    expect(isSourceKey('not-a-source')).toBe(false);
  });

  it('keeps the required history documents present', () => {
    for (const doc of [
      'docs/history/SOURCES.md',
      'docs/history/TIMELINE.md',
      'docs/history/FIGURES.md',
      'docs/history/SOURCE_POLICY.md',
      'docs/history/MACAULAY_NOTES.md',
      'docs/history/CHAPTER_SOURCES.md',
    ]) {
      expect(existsSync(resolve(root, doc)), doc).toBe(true);
    }
  });
});
