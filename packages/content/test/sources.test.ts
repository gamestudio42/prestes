import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIGURES, SOURCE_KEYS, SOURCE_RIGHTS, isQuotable, isSourceKey, parseSourceRightsTable, validateSourceRights } from '../src';

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

  it('declares rights and consultation for every key', () => {
    for (const key of SOURCE_KEYS) {
      const entry = SOURCE_RIGHTS[key];
      expect(entry, key).toBeDefined();
      expect(['public-domain', 'free-licence', 'copyrighted', 'unknown'], key).toContain(entry.rights);
      if (entry.rights === 'free-licence') expect(entry.licence, key).toBeTruthy();
    }
    expect(isQuotable('manifesto-1925')).toBe(true);
    expect(isQuotable('lima-1931')).toBe(true);
    expect(isQuotable('rosa-1956')).toBe(false);
    expect(SOURCE_RIGHTS['superoitocine-2012'].consulted).toBe('not-consulted');
  });

  it('keeps the SOURCES.md rights table in step with SOURCE_RIGHTS', () => {
    expect(validateSourceRights(parseSourceRightsTable(sourcesText))).toEqual([]);
  });

  it('reports a rights mismatch and a missing row', () => {
    const rows = parseSourceRightsTable(sourcesText)
      .filter((row) => row.key !== 'macaulay-1974')
      .map((row) => (row.key === 'rosa-1956' ? { ...row, rights: 'public-domain' } : row));
    const errors = validateSourceRights(rows);
    expect(errors.some((e) => e.includes('macaulay-1974') && e.includes('missing'))).toBe(true);
    expect(errors.some((e) => e.includes('rosa-1956') && e.includes('differ'))).toBe(true);
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
