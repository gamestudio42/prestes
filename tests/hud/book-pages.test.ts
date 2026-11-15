import { describe, expect, it } from 'vitest';
import { CAMPAIGN_CHAPTERS, COMPENDIUM } from '../../packages/content/src';
import {
  PAGE_CHARS,
  campaignBook,
  compendiumBook,
  flow,
  locate,
  relatedEntries,
  resolve,
  citedSources,
  sourceAnchor,
  SOURCES_ANCHOR,
  type TextItem,
} from '../../apps/game/src/ui/menu/bookPages';

const LOCALES = ['en', 'pt-BR'] as const;

describe('book page model', () => {
  it('flows long text onto pages within the budget, splitting between sentences', () => {
    const sentence = 'The column marched north through the dry country without rest. ';
    const items: TextItem[] = [{ kind: 'para', text: sentence.repeat(40).trim() }];
    const pages = flow(items, 300);
    expect(pages.length).toBeGreaterThan(5);
    for (const page of pages) {
      const chars = page.reduce((sum, item) => sum + (item.kind === 'para' ? item.text.length : 0), 0);
      expect(chars).toBeLessThanOrEqual(300);
      for (const item of page) {
        if (item.kind === 'para') expect(item.text.endsWith('.')).toBe(true);
      }
    }
    expect(pages[1]![0]).toMatchObject({ kind: 'para', continues: true });
  });

  it('moves a quotation whole to the next page instead of splitting it', () => {
    // The longest quotation the content check allows: 60 words of about eight characters.
    const longest = Array.from({ length: 60 }, () => 'palavras').join(' ') + '.';
    const pages = flow(
      [
        { kind: 'para', text: 'x'.repeat(PAGE_CHARS - 200) + '.' },
        { kind: 'quote', text: longest, attribution: 'Miguel Costa, Luís Carlos Prestes e Juarez Távora' },
      ],
      PAGE_CHARS,
    );
    expect(pages).toHaveLength(2);
    expect(pages[1]).toEqual([expect.objectContaining({ kind: 'quote', text: longest })]);
  });

  it('never leaves a heading at the foot of a page', () => {
    const pages = flow(
      [
        { kind: 'para', text: 'x'.repeat(PAGE_CHARS - 60) },
        { kind: 'heading', text: 'The Crossing' },
        { kind: 'para', text: 'The division crossed.' },
      ],
      PAGE_CHARS,
    );
    expect(pages).toHaveLength(2);
    expect(pages[1]![0]).toEqual({ kind: 'heading', text: 'The Crossing' });
  });

  for (const locale of LOCALES) {
    it(`builds whole spreads in ${locale}, each entry and chapter starting on a left page`, () => {
      for (const book of [compendiumBook(locale), campaignBook(locale)]) {
        expect(book.pages.length % 2).toBe(0);
        expect(book.spreadCount).toBe(book.pages.length / 2);
        for (const [anchor, spread] of Object.entries(book.anchors)) {
          if (anchor.startsWith('source:')) continue;
          expect(book.pages[spread * 2]!.anchor, anchor).toBe(anchor);
        }
      }
    });

    it(`reaches every compendium entry and chapter in ${locale}`, () => {
      const compendium = compendiumBook(locale);
      for (const entry of COMPENDIUM) expect(compendium.anchors[entry.id], entry.id).toBeDefined();
      expect(compendium.anchors.contents).toBe(0);
      const campaign = campaignBook(locale);
      expect(campaign.anchors.title).toBe(0);
      expect(campaign.anchors.contents).toBe(1);
      for (const chapter of CAMPAIGN_CHAPTERS) {
        const first = campaign.anchors[chapter.id]!;
        expect(campaign.pages[first * 2]).toMatchObject({ kind: 'chapter-plate' });
        const pages = campaign.pages.filter((page) => page.anchor === chapter.id);
        expect(pages.at(-2)).toMatchObject({ kind: 'briefing', side: 'left' });
        expect(pages.at(-1)).toMatchObject({ kind: 'briefing', side: 'right' });
      }
    });
  }

  it('gives the same book the same page numbers every time', () => {
    expect(compendiumBook('en').anchors).toEqual(compendiumBook('en').anchors);
    expect(campaignBook('pt-BR').anchors).toEqual(campaignBook('pt-BR').anchors);
  });

  it('keeps the reader on the same entry across a locale switch', () => {
    const en = compendiumBook('en');
    const pt = compendiumBook('pt-BR');
    const position = locate(en, en.anchors['luis-carlos-prestes']! + 1);
    expect(position).toEqual({ anchor: 'luis-carlos-prestes', offset: 1 });
    const spread = resolve(pt, position);
    expect(pt.pages[spread * 2]!.anchor).toBe('luis-carlos-prestes');
    // An offset past the entry's last spread stays inside the entry.
    const far = resolve(pt, { anchor: 'miguel-costa', offset: 99 });
    expect(pt.pages[far * 2]!.anchor).toBe('miguel-costa');
  });

  it('links an entry to the entries its text names, in both languages', () => {
    for (const locale of LOCALES) {
      const related = relatedEntries('porto-mendes', 'Miguel Costa commanded; Prestes was chief of staff.', locale);
      expect(related).toEqual(expect.arrayContaining(['luis-carlos-prestes', 'miguel-costa']));
      expect(related).not.toContain('porto-mendes');
    }
  });

  it('ribbons open the contents and every section or chapter', () => {
    const compendium = compendiumBook('en');
    expect(compendium.ribbons.map((ribbon) => ribbon.id)).toEqual([
      'contents',
      'figures',
      'events',
      'places',
      'weapons',
      'forces',
      'corrections',
      SOURCES_ANCHOR,
    ]);
    expect(compendium.ribbons.find((ribbon) => ribbon.id === 'events')!.anchor).toBe('positivismo-militar');
    expect(campaignBook('en').ribbons).toHaveLength(CAMPAIGN_CHAPTERS.length + 1);
  });

  // complete-books-and-bibliography D4, D5: plates inside the text and the bibliography.
  it('moves a plate whole to the next page', () => {
    const pages = flow(
      [
        { kind: 'para', text: 'x'.repeat(PAGE_CHARS - 200) + '.' },
        { kind: 'plate', entryId: 'porto-mendes', slot: 'hero-photo' },
      ],
      PAGE_CHARS,
    );
    expect(pages).toHaveLength(2);
    expect(pages[1]![0]).toEqual({ kind: 'plate', entryId: 'porto-mendes', slot: 'hero-photo' });
  });

  for (const locale of LOCALES) {
    it(`closes the compendium with a bibliography of every cited source in ${locale}`, () => {
      const book = compendiumBook(locale);
      const rows = book.pages.flatMap((page) => (page.kind === 'text' ? page.items : [])).filter((item) => item.kind === 'bib');
      expect(rows.map((row) => (row.kind === 'bib' ? row.key : ''))).toEqual(expect.arrayContaining(citedSources()));
      for (const key of citedSources()) {
        const spread = book.anchors[sourceAnchor(key)];
        expect(spread, key).toBeDefined();
        const held = [book.pages[spread! * 2]!, book.pages[spread! * 2 + 1]!].some(
          (page) => page.kind === 'text' && page.items.some((item) => item.kind === 'bib' && item.key === key),
        );
        expect(held, key).toBe(true);
      }
      expect(book.pages.at(-1)!.anchor).toBe(SOURCES_ANCHOR);
    });

    it(`gives every chapter a quotation and its opening plate in ${locale}`, () => {
      const book = campaignBook(locale);
      for (const chapter of CAMPAIGN_CHAPTERS) {
        const items = book.pages.filter((page) => page.anchor === chapter.id).flatMap((page) => (page.kind === 'text' ? page.items : []));
        const quote = items.find((item) => item.kind === 'quote');
        expect(quote, chapter.id).toBeDefined();
        if (quote?.kind === 'quote') expect(quote.cite, chapter.id).toBeTruthy();
      }
      const plates = book.pages.flatMap((page) => (page.kind === 'text' ? page.items : [])).filter((item) => item.kind === 'plate');
      expect(plates.length).toBeGreaterThanOrEqual(CAMPAIGN_CHAPTERS.length);
    });
  }
});
