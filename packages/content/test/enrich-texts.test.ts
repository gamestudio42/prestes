import { describe, expect, it } from 'vitest';
import { CAMPAIGN_CHAPTERS, CHAPTER_TEXT, COMPENDIUM, COMPENDIUM_TEXT } from '../src';

// enrich-texts-from-sources 3.2–4.2: the approved entries, notes and chapter
// pages are in the content, with the labels, sources and quotations of the design.

const NEW_IDS = [
  'manifesto-porto-nacional-1925',
  'porto-nacional',
  'o-libertador-1924',
  'lourenco-moreira-lima',
  'batalhoes-patrioticos-bahia',
  'coluna-no-grande-sertao',
  'vivandeiras',
  'tenentismo',
  'positivismo-militar',
];

const entry = (id: string) => COMPENDIUM.find((candidate) => candidate.id === id);
const noteText = (locale: 'en' | 'pt-BR', id: string) =>
  (COMPENDIUM_TEXT[locale][id]?.note ?? []).flatMap((section) => section.paragraphs).join(' ');

describe('enrich-texts-from-sources content', () => {
  it('imports the nine entries, each with a note in both locales', () => {
    for (const id of NEW_IDS) {
      expect(entry(id), id).toBeDefined();
      expect(COMPENDIUM_TEXT.en[id]?.note.length, id).toBeGreaterThan(0);
      expect(COMPENDIUM_TEXT['pt-BR'][id]?.note.length, id).toBeGreaterThan(0);
    }
  });

  it('keeps the Grande sertão entry dramatized, quoting Rosa only briefly, with page and the edition it was read through', () => {
    expect(entry('coluna-no-grande-sertao')?.label).toBe('dramatized');
    for (const locale of ['en', 'pt-BR'] as const) {
      const quotes = COMPENDIUM_TEXT[locale]['coluna-no-grande-sertao']!.note.flatMap((section) => (section.quote ? [section.quote] : []));
      const rosa = quotes.filter((quote) => quote.sourceKey === 'rosa-1956');
      expect(rosa).toHaveLength(1);
      expect(rosa[0]!.cite).toMatch(/p\. 82/);
      expect(rosa[0]!.via?.sourceKey).toBe('mozzer-2009');
    }
  });

  it('puts positivism first among the events and tenentismo before 1922', () => {
    const events = COMPENDIUM.filter((candidate) => candidate.section === 'events').map((candidate) => candidate.id);
    expect(events[0]).toBe('positivismo-militar');
    expect(events.indexOf('tenentismo')).toBe(events.indexOf('revolt-1922') - 1);
  });

  it('adds "Living off the land" to the Column, with its sources and no count of Black soldiers', () => {
    const army = entry('army-coluna')!;
    for (const source of ['historiafm-2024', 'mozzer-2009', 'blanc-2024']) expect(army.sourceRefs).toContain(source);
    expect(COMPENDIUM_TEXT.en['army-coluna']!.note[0]!.heading).toBe('Living off the land');
    expect(COMPENDIUM_TEXT['pt-BR']['army-coluna']!.note[0]!.heading).toBe('Viver da terra');
    for (const locale of ['en', 'pt-BR'] as const) {
      for (const paragraph of COMPENDIUM_TEXT[locale]['army-coluna']!.note.flatMap((section) => section.paragraphs)) {
        if (/Black|negros/.test(paragraph)) {
          const sentence = paragraph.split('. ').find((part) => /Black|negros/.test(part))!;
          expect(sentence).not.toMatch(/\d/);
        }
      }
    }
  });

  it('frames the motto as memory in the Prestes note, and links Serra Nova to the battalions', () => {
    expect(noteText('pt-BR', 'luis-carlos-prestes')).toMatch(/lembrada como "a maior marcha revolucionária do mundo"/);
    expect(noteText('en', 'luis-carlos-prestes')).toMatch(/remembered as "the greatest revolutionary march in the world"/);
    expect(noteText('pt-BR', 'serra-nova')).toMatch(/batalhões patrióticos/);
    expect(CAMPAIGN_CHAPTERS.find((chapter) => chapter.id === 'serra-nova')!.links).toContain('batalhoes-patrioticos-bahia');
  });

  it('opens chapter 6 at Porto Nacional with the manifesto, and keeps its date', () => {
    const chapter = CAMPAIGN_CHAPTERS.find((candidate) => candidate.id === 'serra-nova')!;
    expect(chapter.date).toBe('1926-04-22');
    for (const source of ['manifesto-1925', 'mozzer-2009']) expect(chapter.sourceRefs).toContain(source);
    for (const link of ['porto-nacional', 'manifesto-porto-nacional-1925', 'coluna-no-grande-sertao']) {
      expect(chapter.links).toContain(link);
    }
    for (const locale of ['en', 'pt-BR'] as const) {
      const first = CHAPTER_TEXT[locale]['serra-nova']!.pages[0]!;
      expect(first.heading).toBe('Porto Nacional');
      expect(first.quote?.sourceKey).toBe('manifesto-1925');
    }
  });

  it("quotes Moreira Lima's farewell in chapter 8, and his speech at the monument", () => {
    const chapter = CAMPAIGN_CHAPTERS.find((candidate) => candidate.id === 'la-gaiba')!;
    expect(chapter.sourceRefs).toContain('lima-1931');
    expect(chapter.links).toContain('lourenco-moreira-lima');
    for (const locale of ['en', 'pt-BR'] as const) {
      // The Monument page now quotes his speech as the Correio da Manhã printed it (Blanc);
      // the farewell from Marchas e combates has its own page.
      const monument = CHAPTER_TEXT[locale]['la-gaiba']!.pages.find((candidate) => candidate.heading === (locale === 'en' ? 'The Monument' : 'O Monumento'));
      expect(monument?.quote?.sourceKey).toBe('blanc-2024');
      const page = CHAPTER_TEXT[locale]['la-gaiba']!.pages.find((candidate) => candidate.quote?.sourceKey === 'lima-1931');
      expect(page?.heading).toBe(locale === 'en' ? 'The Dead' : 'Os Mortos');
      expect(page?.quote?.cite).toMatch(/p\. 523/);
    }
  });

  it('links the prologue to tenentismo and chapter 4 to positivism', () => {
    const links = (id: string) => CAMPAIGN_CHAPTERS.find((chapter) => chapter.id === id)!.links;
    expect(links('prologue-18-do-forte')).toContain('tenentismo');
    expect(links('frente-do-parana')).toContain('positivismo-militar');
  });
});
