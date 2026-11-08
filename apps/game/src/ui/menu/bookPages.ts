import {
  CAMPAIGN_CHAPTERS,
  COMPENDIUM,
  COMPENDIUM_SECTIONS,
  compendiumBodyKey,
  compendiumText,
  compendiumTitleKey,
  chapterText,
  translate,
  type CompendiumSection,
  type ImageRef,
  type Locale,
} from '@prestes/content';

/**
 * The page model of the two menu books (polish-menu-desk, design D10). Both
 * books are a flat list of pages built by pure functions; a spread is a pair of
 * pages. Text is flowed onto pages by a character budget sized to fit a page at
 * 1280 x 720, splitting long paragraphs between sentences, so a book never
 * scrolls and its page numbers do not depend on the viewport.
 */

/** Characters of body text a page holds at the 16 px body size. */
export const PAGE_CHARS = 900;

/** What a text page holds, in order. Costs are in characters of body text. */
export type TextItem =
  | { kind: 'entry-head'; entryId: string }
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string; continues?: boolean }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'sources'; entryId: string }
  | { kind: 'related'; ids: readonly string[] };

export type BookPage =
  | { kind: 'title'; anchor: 'title' }
  | { kind: 'foreword'; anchor: 'title' }
  | { kind: 'contents'; anchor: 'contents'; part: 0 | 1 }
  | { kind: 'plate'; anchor: string; entryId: string; image?: ImageRef }
  | { kind: 'chapter-plate'; anchor: string; chapterId: string }
  | { kind: 'text'; anchor: string; items: readonly TextItem[] }
  | { kind: 'briefing'; anchor: string; chapterId: string; side: 'left' | 'right' }
  | { kind: 'end'; anchor: string };

export interface Ribbon {
  id: string;
  /** Anchor the ribbon opens. */
  anchor: string;
}

export interface Book {
  pages: readonly BookPage[];
  spreadCount: number;
  /** First spread of each anchor. */
  anchors: Readonly<Record<string, number>>;
  ribbons: readonly Ribbon[];
}

/** A place in a book that survives a re-pagination (a locale switch). */
export interface BookPosition {
  anchor: string;
  offset: number;
}

const ITEM_COST = {
  'entry-head': 200,
  heading: 70,
  sources: 200,
} as const;

function cost(item: TextItem): number {
  switch (item.kind) {
    case 'para':
      return item.text.length;
    case 'list':
      return item.items.reduce((sum, text) => sum + text.length + 40, 0);
    case 'related':
      return 60 + item.ids.length * 30;
    default:
      return ITEM_COST[item.kind];
  }
}

const SENTENCE = /(?<=[.!?…])\s+/;

/**
 * Lays items onto pages of `budget` characters. A paragraph that does not fit
 * continues on the next page at a sentence boundary; a heading is never left at
 * the foot of a page.
 */
export function flow(items: readonly TextItem[], budget: number = PAGE_CHARS): TextItem[][] {
  const pages: TextItem[][] = [];
  let page: TextItem[] = [];
  let used = 0;
  const breakPage = () => {
    if (page.length > 0) pages.push(page);
    page = [];
    used = 0;
  };
  for (const item of items) {
    if (item.kind !== 'para') {
      const need = cost(item) + (item.kind === 'heading' ? 110 : 0);
      if (used > 0 && used + need > budget) breakPage();
      page.push(item);
      used += cost(item);
      continue;
    }
    let sentences = item.text.split(SENTENCE);
    let continues = item.continues ?? false;
    while (sentences.length > 0) {
      let take = 0;
      let length = 0;
      while (take < sentences.length) {
        const next = length + sentences[take]!.length + (take > 0 ? 1 : 0);
        if (used + next > budget && (take > 0 || used > 0)) break;
        length = next;
        take += 1;
      }
      if (take === 0) {
        breakPage();
        continue;
      }
      page.push({ kind: 'para', text: sentences.slice(0, take).join(' '), continues });
      used += length;
      sentences = sentences.slice(take);
      continues = true;
      if (sentences.length > 0) breakPage();
    }
  }
  breakPage();
  return pages;
}

function build(pages: BookPage[], ribbons: Ribbon[]): Book {
  if (pages.length % 2 === 1) pages.push({ kind: 'end', anchor: pages[pages.length - 1]!.anchor });
  const anchors: Record<string, number> = {};
  pages.forEach((page, index) => {
    const spread = Math.floor(index / 2);
    if (!(page.anchor in anchors)) anchors[page.anchor] = spread;
  });
  return { pages, spreadCount: pages.length / 2, anchors, ribbons };
}

/** Pads an anchor's pages so the next anchor starts on a left page. */
function padToSpread(pages: BookPage[], anchor: string) {
  if (pages.length % 2 === 1) pages.push({ kind: 'end', anchor });
}

export function locate(book: Book, spread: number): BookPosition {
  const clamped = Math.max(0, Math.min(book.spreadCount - 1, spread));
  const anchor = book.pages[clamped * 2]!.anchor;
  return { anchor, offset: clamped - (book.anchors[anchor] ?? 0) };
}

/** The spread of a position, kept inside the anchor's own spreads. */
export function resolve(book: Book, position: BookPosition): number {
  const first = book.anchors[position.anchor];
  if (first === undefined) return 0;
  let last = first;
  while (last + 1 < book.spreadCount && book.pages[(last + 1) * 2]!.anchor === position.anchor) {
    last += 1;
  }
  return Math.max(first, Math.min(last, first + position.offset));
}

/** Page number shown on a page: the title page is page 1. */
export const folio = (pageIndex: number) => pageIndex + 1;

// --- Compendium ---------------------------------------------------------

export const COMPENDIUM_ORDER = COMPENDIUM_SECTIONS.flatMap((section) =>
  COMPENDIUM.filter((entry) => entry.section === section),
);

/** Shorter names an entry is mentioned by, besides its title. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  'luis-carlos-prestes': ['Prestes'],
  'siqueira-campos': ['Siqueira'],
  'isidoro-dias-lopes': ['Isidoro'],
  'miguel-costa': ['Miguel Costa'],
  'forte-copacabana': ['Forte de Copacabana'],
  'porto-mendes': ['Porto Mendes'],
  'foz-do-iguacu': ['Foz do Iguaçu', 'Foz'],
  'sao-luiz-gonzaga': ['São Luiz Gonzaga'],
  'mauser-7mm': ['Mauser'],
  'vila-militar': ['Vila Militar'],
};

/** Entries a text names, in compendium order, without the entry itself. */
export function relatedEntries(entryId: string, text: string, locale: Locale): string[] {
  return COMPENDIUM_ORDER.filter((entry) => {
    if (entry.id === entryId) return false;
    const names = [translate(locale, compendiumTitleKey(entry)), ...(ALIASES[entry.id] ?? [])];
    return names.some((name) => text.includes(name));
  })
    .map((entry) => entry.id)
    .slice(0, 6);
}

export function compendiumBook(locale: Locale): Book {
  const pages: BookPage[] = [
    { kind: 'contents', anchor: 'contents', part: 0 },
    { kind: 'contents', anchor: 'contents', part: 1 },
  ];
  for (const entry of COMPENDIUM_ORDER) {
    const long = compendiumText(entry.id, locale);
    const body = translate(locale, compendiumBodyKey(entry));
    const items: TextItem[] = [
      { kind: 'entry-head', entryId: entry.id },
      { kind: 'para', text: body },
    ];
    for (const section of long?.note ?? []) {
      if (section.heading) items.push({ kind: 'heading', text: section.heading });
      for (const text of section.paragraphs) items.push({ kind: 'para', text });
    }
    const named = [body, ...(long?.note ?? []).flatMap((section) => section.paragraphs)].join(' ');
    const related = relatedEntries(entry.id, named, locale);
    if (related.length > 0) items.push({ kind: 'related', ids: related });
    items.push({ kind: 'sources', entryId: entry.id });

    const texts: BookPage[] = flow(items).map((page) => ({
      kind: 'text',
      anchor: entry.id,
      items: page,
    }));
    const [first, ...images] = entry.images ?? [];
    pages.push({ kind: 'plate', anchor: entry.id, entryId: entry.id, image: first }, texts.shift()!);
    // Continuation spreads: a further image on the left when there is one.
    while (texts.length > 0 || images.length > 0) {
      const left: BookPage =
        images.length > 0
          ? { kind: 'plate', anchor: entry.id, entryId: entry.id, image: images.shift() }
          : texts.shift()!;
      const right: BookPage =
        texts.shift() ??
        (images.length > 0
          ? { kind: 'plate', anchor: entry.id, entryId: entry.id, image: images.shift() }
          : { kind: 'end', anchor: entry.id });
      pages.push(left, right);
    }
  }
  const ribbons: Ribbon[] = [
    { id: 'contents', anchor: 'contents' },
    ...COMPENDIUM_SECTIONS.map((section: CompendiumSection) => ({
      id: section,
      anchor: COMPENDIUM_ORDER.find((entry) => entry.section === section)!.id,
    })),
  ];
  return build(pages, ribbons);
}

// --- Campaign -------------------------------------------------------------

export function campaignBook(locale: Locale): Book {
  const pages: BookPage[] = [
    { kind: 'title', anchor: 'title' },
    { kind: 'foreword', anchor: 'title' },
    { kind: 'contents', anchor: 'contents', part: 0 },
    { kind: 'contents', anchor: 'contents', part: 1 },
  ];
  for (const chapter of CAMPAIGN_CHAPTERS) {
    const text = chapterText(chapter.id, locale);
    const items: TextItem[] = (text?.pages ?? []).flatMap((page) => [
      { kind: 'heading' as const, text: page.heading },
      ...page.paragraphs.map((paragraph) => ({ kind: 'para' as const, text: paragraph })),
    ]);
    pages.push({ kind: 'chapter-plate', anchor: chapter.id, chapterId: chapter.id });
    for (const page of flow(items)) pages.push({ kind: 'text', anchor: chapter.id, items: page });
    padToSpread(pages, chapter.id);
    pages.push(
      { kind: 'briefing', anchor: chapter.id, chapterId: chapter.id, side: 'left' },
      { kind: 'briefing', anchor: chapter.id, chapterId: chapter.id, side: 'right' },
    );
  }
  const ribbons: Ribbon[] = [
    { id: 'contents', anchor: 'contents' },
    ...CAMPAIGN_CHAPTERS.map((chapter) => ({ id: chapter.id, anchor: chapter.id })),
  ];
  return build(pages, ribbons);
}
