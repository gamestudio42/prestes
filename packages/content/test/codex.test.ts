import { describe, expect, it } from 'vitest';
import { validateCodexEntry, type CodexEntry } from '../src';
import type { ContentLabel } from '../src';

const entry: CodexEntry = {
  id: 'forte-1922',
  title: 'The Forte de Copacabana',
  body: 'Placeholder codex body.',
  label: 'historical',
  sourceRefs: ['macaulay-1974', 'helio-1922'],
};

describe('codex entries', () => {
  it('accepts a complete entry', () => {
    expect(validateCodexEntry(entry)).toEqual([]);
  });

  it('rejects a missing label', () => {
    const withoutLabel: CodexEntry = { ...entry };
    delete withoutLabel.label;
    expect(validateCodexEntry(withoutLabel)).toContain('codex entry without label: forte-1922');
  });

  it('rejects an invalid label', () => {
    expect(
      validateCodexEntry({ ...entry, label: 'legendary' as ContentLabel }),
    ).toContain('codex entry with invalid label: forte-1922');
  });

  it('rejects an unknown source', () => {
    expect(
      validateCodexEntry({ ...entry, sourceRefs: ['nope'] }),
    ).toContain('codex entry forte-1922 references unknown source: nope');
  });

  it('accepts all three labels', () => {
    for (const label of ['historical', 'dramatized', 'fictional'] as const) {
      expect(validateCodexEntry({ ...entry, label })).toEqual([]);
    }
  });
});
