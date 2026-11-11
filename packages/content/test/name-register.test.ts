import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseNameRegister, SOURCE_KEYS, validateNameRegister } from '../src';

const REGISTER = `
| Id | Name shown | Status | Source |
| --- | --- | --- | --- |
| section:fuzileiros | Fogão | period term | macaulay-1974, p. 151 |
| section:esquadra-4 | Meio fogão | game organization | — |
| section:lanceiros | Lanceiros | period term | somewhere |
`;

describe('name register', () => {
  it('a sourced name and a game organization pass', () => {
    const rows = parseNameRegister(REGISTER);
    expect(rows.map((row) => row.id)).toEqual(['section:fuzileiros', 'section:esquadra-4', 'section:lanceiros']);
    expect(validateNameRegister(rows, ['section:fuzileiros', 'section:esquadra-4'], SOURCE_KEYS)).toEqual([]);
  });

  it('an unrecorded name fails and names the section type', () => {
    const rows = parseNameRegister(REGISTER);
    expect(validateNameRegister(rows, ['section:voluntarios'], SOURCE_KEYS)).toEqual([
      'section:voluntarios: its name is neither sourced nor marked as a game organization in docs/history/FORCES.md',
    ]);
    expect(validateNameRegister(rows, ['section:lanceiros'], SOURCE_KEYS)).toEqual(['section:lanceiros: the period term "Lanceiros" has no source key and page']);
  });

  it('the forces document records every army and section type', () => {
    const rows = parseNameRegister(readFileSync(resolve(__dirname, '../../../docs/history/FORCES.md'), 'utf8'));
    expect(rows).toHaveLength(22);
    expect(validateNameRegister(rows, rows.map((row) => row.id), SOURCE_KEYS)).toEqual([]);
  });
});
