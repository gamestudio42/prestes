import { describe, expect, it } from 'vitest';
import { messages, resolveLocale, translate, validateLocaleKeys } from '../src/locales';

describe('locale key sets', () => {
  it('has a complete PT-BR locale', () => {
    expect(validateLocaleKeys(messages['pt-BR'])).toEqual({ missing: [], extra: [] });
  });

  it('has the same keys in EN and the source catalog', () => {
    expect(validateLocaleKeys(messages.en)).toEqual({ missing: [], extra: [] });
  });

  it('names a missing key', () => {
    const candidate: Record<string, string> = { ...messages['pt-BR'] };
    delete candidate['start.newGame'];
    expect(validateLocaleKeys(candidate).missing).toContain('start.newGame');
  });

  it('names an extra key', () => {
    expect(validateLocaleKeys({ ...messages.en, 'extra.key': 'x' }).extra).toContain('extra.key');
  });
});

describe('language resolution', () => {
  it('prefers a stored supported locale', () => {
    expect(resolveLocale('fr-FR', 'pt-BR')).toBe('pt-BR');
    expect(resolveLocale('pt-BR', 'en')).toBe('en');
  });

  it('falls back from browser language to PT-BR or English', () => {
    expect(resolveLocale('pt-BR', null)).toBe('pt-BR');
    expect(resolveLocale('pt-PT', null)).toBe('pt-BR');
    expect(resolveLocale('en-US', null)).toBe('en');
    expect(resolveLocale('fr-FR', null)).toBe('en');
    expect(resolveLocale(undefined, null)).toBe('en');
  });
});

describe('translation', () => {
  it('interpolates values and keeps both locales complete', () => {
    expect(translate('en', 'hud.units', { count: 3 })).toBe('3 placeholder units');
    expect(translate('pt-BR', 'hud.units', { count: 3 })).toBe('3 unidades placeholder');
    expect(translate('pt-BR', 'app.title')).toBe('Prestes');
  });
});
