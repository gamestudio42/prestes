import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMPENDIUM,
  COMPENDIUM_TEXT,
  COMPENDIUM_SECTIONS,
  compendiumBodyKey,
  compendiumTitleKey,
  messages,
  validateCompendium,
  validateCompendiumMedia,
  type CompendiumEntry,
} from '../src';

const DOC_ENTRIES = resolve(__dirname, '../../../docs/campaign/compendium/entries');

describe('compendium', () => {
  it('has every section filled from the sourced history documents', () => {
    for (const section of COMPENDIUM_SECTIONS) {
      expect(
        COMPENDIUM.some((entry) => entry.section === section),
        section,
      ).toBe(true);
    }
    expect(
      COMPENDIUM.filter((entry) => entry.section === 'figures').map((entry) => entry.id),
    ).toEqual(['siqueira-campos', 'luis-carlos-prestes', 'miguel-costa', 'isidoro-dias-lopes']);
    expect(COMPENDIUM.find((entry) => entry.id === 'revolt-1922')).toMatchObject({
      date: '1922-07-05',
      confidence: 'high',
    });
  });

  it('validates sources, confidence and event dates', () => {
    expect(validateCompendium()).toEqual([]);
    expect(
      validateCompendium([
        { id: 'x', section: 'events', sourceRefs: [], cite: '', confidence: 'high' },
      ]),
    ).toEqual(['compendium entry without source: x', 'compendium event without date: x']);
  });

  it('has a title and a text for every entry in both languages', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      for (const entry of COMPENDIUM) {
        expect(messages[locale][compendiumTitleKey(entry)], `${locale} ${entry.id}`).toBeTruthy();
        expect(messages[locale][compendiumBodyKey(entry)], `${locale} ${entry.id}`).toBeTruthy();
      }
    }
  });

  it('contains every drafted doc entry, with its label and long text in both languages', () => {
    const docIds = readdirSync(DOC_ENTRIES)
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''));
    // refine-battle-controls 4.2: the prestes-not-at-fort entry is gone.\n    expect(docIds.length).toBeGreaterThanOrEqual(19);
    for (const id of docIds) {
      const entry = COMPENDIUM.find((candidate) => candidate.id === id);
      expect(entry, id).toBeDefined();
      expect(entry!.label, id).toBeDefined();
      expect(COMPENDIUM_TEXT.en[id]?.note.length, id).toBeGreaterThan(0);
      expect(COMPENDIUM_TEXT['pt-BR'][id]?.note.length, id).toBeGreaterThan(0);
    }
  });

  it('wires the registered images, with a caption and credit in both languages', () => {
    expect(validateCompendiumMedia()).toEqual([]);
    const miguel = COMPENDIUM.find((entry) => entry.id === 'miguel-costa')!;
    expect(miguel.images).toEqual([
      { slot: 'portrait', path: 'apps/game/public/assets/compendium/miguel-costa/portrait.png' },
    ]);
    const paths = new Set(
      COMPENDIUM.flatMap((entry) => entry.images ?? []).map((image) => image.path),
    );
    expect(paths.size).toBe(14);
  });

  it('fails on an unregistered image and on a note missing in one language', () => {
    const entry: CompendiumEntry = {
      id: 'x',
      section: 'places',
      sourceRefs: ['macaulay-1974'],
      cite: 'Macaulay',
      confidence: 'high',
      images: [{ slot: 'hero', path: 'apps/game/public/assets/compendium/x/hero.png' }],
    };
    const note = { note: [{ paragraphs: ['A note.'] }] };
    const errors = validateCompendiumMedia([entry], [], {
      en: { x: { ...note, images: { hero: { caption: 'Hero.', credit: 'Unknown' } } } },
      'pt-BR': {},
    });
    expect(errors).toContain(
      'compendium entry x uses unregistered image: apps/game/public/assets/compendium/x/hero.png',
    );
    expect(errors).toContain('compendium entry x has no pt-BR caption for hero');
    expect(errors).toContain('compendium entry x has a note in en but not in pt-BR');
  });
});
