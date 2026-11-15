/**
 * Quotations in the books (enrich-texts-from-sources D2-D3; complete-books-and-bibliography D2).
 * Public-domain and free-licence sources may be quoted; a `citation` source only
 * briefly (40 words), with edition and page, at most twice per work; everything
 * else is paraphrased. The text in `originalLocale` (PT-BR by default) is the
 * original, and every other locale carries a translation marked as such.
 */
import type { CampaignChapter, ChapterText } from './campaign/chapters';
import type { CompendiumEntry, CompendiumText } from './compendium';
import type { Locale } from './locales';
import { SOURCE_RIGHTS, isCitationOnly, isQuotable, isSourceKey } from './sources';

export interface Quote {
  text: string;
  /** A registered source key; its rights must allow quotation. */
  sourceKey: string;
  /** Edition and page, as printed. Identical in every locale. */
  cite: string;
  /** Who said or wrote it, where and when, as shown under the quotation. */
  attribution: string;
  /** True when the text is the project's translation of the original. */
  translated?: boolean;
  /** Language of the original wording; PT-BR when absent. */
  originalLocale?: Locale;
  /** The work the quotation was read in, when the original itself was not seen ("apud"). */
  via?: { sourceKey: string; cite: string };
  /** A line shown under the attribution, in the reader's language (e.g. how it was translated). */
  note?: string;
  /** The owner's decision; a pending quotation may not reach the player. Approved when absent. */
  approval?: 'approved' | 'pending';
}

/** A quotation of a `citation` source fits the right of quotation (art. 46, III). */
export const CITATION_WORD_LIMIT = 40;
/** At most this many quotations of one `citation` work across both books. */
export const CITATION_PER_SOURCE = 2;
const HAS_PAGE = /(^|[^a-z])pp?\.\s?\d/;

/** A quotation fits one book page and is never split across pages. */
export const QUOTE_WORD_LIMIT = 60;

const DEFAULT_ORIGINAL: Locale = 'pt-BR';

export const quoteWords = (quote: Quote) => quote.text.split(/\s+/).filter(Boolean).length;

type Located = { where: string; key: string; quote?: Quote };

function collect(
  compendiumText: Readonly<Record<string, CompendiumText>>,
  chapterText: Readonly<Record<string, ChapterText>>,
): Located[] {
  const out: Located[] = [];
  for (const [id, text] of Object.entries(compendiumText)) {
    text.note.forEach((section, i) => out.push({ where: `compendium ${id}, section ${i + 1}`, key: `c:${id}:${i}`, quote: section.quote }));
  }
  for (const [id, text] of Object.entries(chapterText)) {
    text.pages.forEach((page, i) => out.push({ where: `chapter ${id}, page ${i + 1}`, key: `p:${id}:${i}`, quote: page.quote }));
  }
  return out;
}

export function validateQuotes(
  compendiumText: Readonly<Record<Locale, Readonly<Record<string, CompendiumText>>>>,
  chapterText: Readonly<Record<Locale, Readonly<Record<string, ChapterText>>>>,
  entries: readonly Pick<CompendiumEntry, 'id' | 'sourceRefs'>[],
  chapters: readonly Pick<CampaignChapter, 'id' | 'sourceRefs'>[],
): string[] {
  const errors: string[] = [];
  const locales = Object.keys(compendiumText) as Locale[];
  const byLocale = new Map(locales.map((locale) => [locale, collect(compendiumText[locale], chapterText[locale] ?? {})]));

  for (const locale of locales) {
    for (const item of byLocale.get(locale)!) {
      const quote = item.quote;
      if (!quote) continue;
      const where = `${item.where} (${locale})`;
      if (!isSourceKey(quote.sourceKey)) {
        errors.push(`quotation in ${where} names unknown source: ${quote.sourceKey}`);
        continue;
      }
      if (!isQuotable(quote.sourceKey)) {
        errors.push(`quotation in ${where} quotes ${quote.sourceKey}, which is ${SOURCE_RIGHTS[quote.sourceKey].rights}`);
      }
      if (quote.via && !isSourceKey(quote.via.sourceKey)) {
        errors.push(`quotation in ${where} names unknown source: ${quote.via.sourceKey}`);
      }
      if (quote.approval === 'pending') {
        errors.push(`quotation in ${where} is still pending the owner's approval`);
      }
      if (isCitationOnly(quote.sourceKey)) {
        if (quoteWords(quote) > CITATION_WORD_LIMIT) {
          errors.push(`quotation in ${where} has ${quoteWords(quote)} words; a citation of ${quote.sourceKey} may have ${CITATION_WORD_LIMIT}`);
        }
        if (!HAS_PAGE.test(quote.cite)) {
          errors.push(`quotation in ${where} quotes ${quote.sourceKey} without a page in its cite`);
        }
      }
      if (!quote.text.trim() || !quote.cite.trim() || !quote.attribution.trim()) {
        errors.push(`quotation in ${where} needs text, cite and attribution`);
      }
      if (quoteWords(quote) > QUOTE_WORD_LIMIT) {
        errors.push(`quotation in ${where} has ${quoteWords(quote)} words; the limit is ${QUOTE_WORD_LIMIT}`);
      }
      const original = quote.originalLocale ?? DEFAULT_ORIGINAL;
      if (locale === original && quote.translated) {
        errors.push(`quotation in ${where} is the original and must not be marked translated`);
      }
      if (locale !== original && !quote.translated) {
        errors.push(`quotation in ${where} is not marked as a translation`);
      }
      for (const other of locales) {
        if (other === locale) continue;
        const twin = byLocale.get(other)!.find((candidate) => candidate.key === item.key)?.quote;
        if (!twin) errors.push(`quotation in ${where} has no counterpart in ${other}`);
        else if (twin.sourceKey !== quote.sourceKey || twin.cite !== quote.cite) {
          errors.push(`quotation in ${where} differs in source or cite from ${other}`);
        } else if ((twin.originalLocale ?? DEFAULT_ORIGINAL) !== (quote.originalLocale ?? DEFAULT_ORIGINAL)) {
          errors.push(`quotation in ${where} differs in original language from ${other}`);
        }
      }
    }
  }

  // Count each place once (the first locale), then cap citation works.
  const perSource = new Map<string, string[]>();
  for (const item of byLocale.get(locales[0]!) ?? []) {
    const key = item.quote?.sourceKey;
    if (!key || !isSourceKey(key) || !isCitationOnly(key)) continue;
    perSource.set(key, [...(perSource.get(key) ?? []), item.where]);
  }
  for (const [key, places] of perSource) {
    if (places.length > CITATION_PER_SOURCE) {
      errors.push(`${key} is quoted ${places.length} times (${places.join('; ')}); a citation work may be quoted ${CITATION_PER_SOURCE} times`);
    }
  }

  const notConsulted = (key: string) => isSourceKey(key) && SOURCE_RIGHTS[key].consulted === 'not-consulted';
  for (const entry of entries) {
    for (const key of entry.sourceRefs.filter(notConsulted)) {
      errors.push(`compendium entry ${entry.id} cites ${key}, which has not been consulted`);
    }
  }
  for (const chapter of chapters) {
    for (const key of chapter.sourceRefs.filter(notConsulted)) {
      errors.push(`chapter ${chapter.id} cites ${key}, which has not been consulted`);
    }
  }
  return errors;
}
