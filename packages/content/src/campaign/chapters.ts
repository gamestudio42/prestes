/**
 * The campaign book's chapter registry (polish-menu-desk, design D12-D14).
 * Imported from docs/campaign/book and docs/campaign/missions; the docs are the
 * authoring source. No chapter is playable until its mission exists.
 */
import { COMPENDIUM, COMPENDIUM_TEXT } from '../compendium';
import { FIGURES, type ContentLabel, type HistoricalFigure } from '../figures';
import type { Locale } from '../locales';
import { isSourceKey } from '../sources';
import { CHAPTER_TEXT_EN } from './text/en';
import { CHAPTER_TEXT_PT_BR } from './text/pt-BR';

export interface ChapterImage {
  /** Compendium entry whose registered image, caption and credit are used. */
  entryId: string;
  slot: string;
}

export interface CampaignChapter {
  id: string;
  number: number;
  /** ISO-like start date, as in docs/history/TIMELINE.md. */
  date: string;
  dateEnd?: string;
  commanderId: string;
  label: ContentLabel;
  sourceRefs: readonly string[];
  /** Plate image; without one the book shows the section emblem. */
  image?: ChapterImage;
  /** Compendium entries the chapter links to. */
  links: readonly string[];
  playable: boolean;
  /** Mission id, required once the chapter is playable. */
  missionId?: string;
}

export const CAMPAIGN_CHAPTERS: readonly CampaignChapter[] = [
  {
    id: 'prologue-18-do-forte',
    number: 1,
    date: '1922-07-05',
    dateEnd: '1922-07-06',
    commanderId: 'siqueira-campos',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'helio-1922', 'castro-2022', 'amado-1942'],
    image: { entryId: 'revolt-1922', slot: 'hero-photo' },
    links: [
      'siqueira-campos',
      'luis-carlos-prestes',
      'forte-copacabana',
      'revolt-1922',
      'mauser-7mm',
    ],
    playable: false,
  },
  {
    id: 'anel-de-ferro',
    number: 2,
    date: '1924-10-28',
    dateEnd: '1925-01',
    commanderId: 'luis-carlos-prestes',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'castro-2016', 'vitor-2011', 'tavora-1928'],
    links: [
      'luis-carlos-prestes',
      'rs-revolt-1924',
      'sao-luiz-1924',
      'ramada-1925',
      'sao-luiz-gonzaga',
      'mauser-7mm',
    ],
    playable: false,
  },
  {
    id: 'a-divisao',
    number: 3,
    date: '1925-04-03',
    dateEnd: '1925-04-29',
    commanderId: 'miguel-costa',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'castro-2016', 'blanc-2024', 'tavora-1928'],
    image: { entryId: 'foz-do-iguacu', slot: 'group-photo' },
    links: ['miguel-costa', 'luis-carlos-prestes', 'foz-do-iguacu', 'porto-mendes', 'mauser-7mm'],
    playable: false,
  },
  {
    id: 'frente-do-parana',
    number: 4,
    date: '1924',
    dateEnd: '1925',
    commanderId: 'isidoro-dias-lopes',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'castro-2022', 'blanc-2024'],
    image: { entryId: 'map-fazenda', slot: 'hero-photo' },
    links: ['isidoro-dias-lopes', 'sao-paulo-1924', 'map-fazenda', 'mauser-7mm'],
    playable: false,
  },
  {
    id: 'ponte-de-verdinho',
    number: 5,
    date: '1925-06-27',
    dateEnd: '1925-06-28',
    commanderId: 'luis-carlos-prestes',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'teles-2008'],
    links: ['luis-carlos-prestes', 'map-serra-rio', 'mauser-7mm'],
    playable: false,
  },
  {
    id: 'serra-nova',
    number: 6,
    date: '1926-04-22',
    dateEnd: '1926-04-26',
    commanderId: 'luis-carlos-prestes',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'anita-1991', 'nascimento-2026', 'almg-2026'],
    links: ['luis-carlos-prestes', 'serra-nova', 'mauser-7mm'],
    playable: false,
  },
  {
    id: 'pantanal',
    number: 7,
    date: '1927-01',
    dateEnd: '1927-03',
    commanderId: 'luis-carlos-prestes',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'blanc-2024', 'anita-1991'],
    image: { entryId: 'luis-carlos-prestes', slot: 'column-photo' },
    links: ['luis-carlos-prestes', 'pantanal', 'mauser-7mm'],
    playable: false,
  },
  {
    id: 'la-gaiba',
    number: 8,
    date: '1927-07-05',
    commanderId: 'luis-carlos-prestes',
    label: 'dramatized',
    sourceRefs: ['macaulay-1974', 'anita-1991', 'blanc-2024'],
    links: ['luis-carlos-prestes', 'la-gaiba'],
    playable: false,
  },
];

/** One page of chapter prose: a section heading and its paragraphs. */
export interface ChapterPage {
  heading: string;
  paragraphs: readonly string[];
}

/** A chapter's long, localized text (design D12). */
export interface ChapterText {
  title: string;
  place: string;
  perspective: string;
  pages: readonly ChapterPage[];
  briefing: {
    pitch: string;
    objectives: readonly string[];
  };
}

export const CHAPTER_TEXT: Readonly<Record<Locale, Readonly<Record<string, ChapterText>>>> = {
  en: CHAPTER_TEXT_EN,
  'pt-BR': CHAPTER_TEXT_PT_BR,
};

/** Words a prose page may hold and still fit one book page at 1280 x 720. */
export const CHAPTER_PAGE_WORD_BUDGET = 180;

export function chapterText(id: string, locale: Locale): ChapterText | undefined {
  return CHAPTER_TEXT[locale][id];
}

const words = (page: ChapterPage) =>
  page.paragraphs.reduce(
    (sum, paragraph) => sum + paragraph.split(/\s+/).filter(Boolean).length,
    0,
  );

/**
 * Chapter validation: commander, sources, links, image, text in every locale,
 * page budget, and no playable chapter without a mission.
 */
export function validateChapters(
  chapters: readonly CampaignChapter[] = CAMPAIGN_CHAPTERS,
  text: Readonly<Record<Locale, Readonly<Record<string, ChapterText>>>> = CHAPTER_TEXT,
  figures: readonly HistoricalFigure[] = FIGURES,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const entries = new Set(COMPENDIUM.map((entry) => entry.id));
  chapters.forEach((chapter, index) => {
    if (ids.has(chapter.id)) errors.push(`duplicate chapter: ${chapter.id}`);
    ids.add(chapter.id);
    if (index > 0 && chapter.number <= chapters[index - 1]!.number) {
      errors.push(`chapter out of order: ${chapter.id}`);
    }
    if (!figures.some((figure) => figure.id === chapter.commanderId)) {
      errors.push(`chapter ${chapter.id} has unknown commander: ${chapter.commanderId}`);
    }
    if (chapter.sourceRefs.length === 0) errors.push(`chapter without sources: ${chapter.id}`);
    for (const source of chapter.sourceRefs) {
      if (!isSourceKey(source))
        errors.push(`chapter ${chapter.id} references unknown source: ${source}`);
    }
    for (const link of chapter.links) {
      if (!entries.has(link))
        errors.push(`chapter ${chapter.id} links to unknown compendium entry: ${link}`);
    }
    if (chapter.image) {
      const entry = COMPENDIUM.find((candidate) => candidate.id === chapter.image!.entryId);
      if (!entry?.images?.some((image) => image.slot === chapter.image!.slot)) {
        errors.push(
          `chapter ${chapter.id} uses unknown image: ${chapter.image.entryId}/${chapter.image.slot}`,
        );
      }
      for (const locale of Object.keys(COMPENDIUM_TEXT) as Locale[]) {
        if (!COMPENDIUM_TEXT[locale][chapter.image.entryId]?.images?.[chapter.image.slot]) {
          errors.push(`chapter ${chapter.id} image has no ${locale} caption`);
        }
      }
    }
    if (chapter.playable && !chapter.missionId) {
      errors.push(`playable chapter without mission: ${chapter.id}`);
    }
    for (const locale of Object.keys(text) as Locale[]) {
      const long = text[locale][chapter.id];
      if (!long) {
        errors.push(`chapter ${chapter.id} has no ${locale} text`);
        continue;
      }
      if (!long.title || !long.place || !long.perspective) {
        errors.push(`chapter ${chapter.id} is missing ${locale} title, place or perspective`);
      }
      if (long.pages.length === 0) errors.push(`chapter ${chapter.id} has no ${locale} pages`);
      long.pages.forEach((page, pageIndex) => {
        if (words(page) > CHAPTER_PAGE_WORD_BUDGET) {
          errors.push(
            `chapter ${chapter.id} ${locale} page ${pageIndex + 1} exceeds the word budget`,
          );
        }
      });
      if (!long.briefing.pitch || long.briefing.objectives.length === 0) {
        errors.push(`chapter ${chapter.id} has no ${locale} briefing`);
      }
    }
  });
  const locales = Object.keys(text) as Locale[];
  for (const chapter of chapters) {
    const counts = locales.map((locale) => text[locale][chapter.id]?.pages.length ?? 0);
    if (new Set(counts).size > 1)
      errors.push(`chapter ${chapter.id} page counts differ between locales`);
  }
  return errors;
}
