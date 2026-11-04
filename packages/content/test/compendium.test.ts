import { describe, expect, it } from 'vitest';
import {
  COMPENDIUM,
  COMPENDIUM_SECTIONS,
  compendiumBodyKey,
  compendiumTitleKey,
  messages,
  validateCompendium,
} from '../src';

describe('compendium', () => {
  it('has every section filled from the sourced history documents', () => {
    for (const section of COMPENDIUM_SECTIONS) {
      expect(COMPENDIUM.some((entry) => entry.section === section), section).toBe(true);
    }
    expect(COMPENDIUM.filter((entry) => entry.section === 'figures').map((entry) => entry.id)).toEqual([
      'siqueira-campos',
      'luis-carlos-prestes',
    ]);
    expect(COMPENDIUM.find((entry) => entry.id === 'revolt-1922')).toMatchObject({ date: '1922-07-05', confidence: 'high' });
  });

  it('validates sources, confidence and event dates', () => {
    expect(validateCompendium()).toEqual([]);
    expect(validateCompendium([{ id: 'x', section: 'events', sourceRefs: [], cite: '', confidence: 'high' }])).toEqual([
      'compendium entry without source: x',
      'compendium event without date: x',
    ]);
  });

  it('has a title and a text for every entry in both languages', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      for (const entry of COMPENDIUM) {
        expect(messages[locale][compendiumTitleKey(entry)], `${locale} ${entry.id}`).toBeTruthy();
        expect(messages[locale][compendiumBodyKey(entry)], `${locale} ${entry.id}`).toBeTruthy();
      }
    }
  });
});
