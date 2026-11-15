import { describe, expect, it } from 'vitest';
import {
  COMPENDIUM_IMAGE_REGISTER,
  PENDING_IMAGE_DIR,
  provisionalPhrase,
  validateProvisionalText,
} from '../src';

// complete-books-and-bibliography D3a and D7.
describe('complete books', () => {
  it('finds provisional phrases in both languages and passes an honest gap', () => {
    expect(provisionalPhrase('The page is still to be checked.')).toBe('still to be checked');
    expect(provisionalPhrase('Placeholder codex entry.')).toBe('Placeholder');
    expect(provisionalPhrase('Data a confirmar.')).toBe('a confirmar');
    expect(provisionalPhrase('Página pendente na edição.')).toBe('Página pendente');
    expect(provisionalPhrase('The sources do not say how many died.')).toBeUndefined();
  });

  it('ships both books without provisional text', () => {
    expect(validateProvisionalText()).toEqual([]);
  });

  it('keeps every image awaiting permission in the gitignored folder, with its holder and request', () => {
    const pending = COMPENDIUM_IMAGE_REGISTER.filter((image) => image.licence === 'permission-pending');
    expect(pending.length).toBeGreaterThan(0);
    for (const image of pending) {
      expect(image.path.startsWith(PENDING_IMAGE_DIR), image.path).toBe(true);
      expect(image.holder, image.path).toBeTruthy();
      expect(image.request, image.path).toMatch(/^docs\/rights\/permission-requests\/.+\.md$/);
    }
    for (const image of COMPENDIUM_IMAGE_REGISTER.filter((candidate) => candidate.licence !== 'permission-pending')) {
      expect(image.path.startsWith('apps/game/public/assets/compendium/'), image.path).toBe(true);
    }
  });
});
