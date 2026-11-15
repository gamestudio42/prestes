/**
 * The books carry no provisional text (complete-books-and-bibliography D7): a
 * phrase that says something is still to be checked fails the content check,
 * with the place and the phrase. An honest gap ("the sources do not say") is
 * not provisional and passes.
 */
import { CAMPAIGN_CHAPTERS, CHAPTER_TEXT } from './campaign/chapters';
import { COMPENDIUM, COMPENDIUM_TEXT, compendiumBodyKey } from './compendium';
import { messages, type Locale } from './locales';

export const PROVISIONAL_PHRASES: readonly RegExp[] = [
  /still to be (checked|confirmed|verified|written)/i,
  /\bto be (checked|confirmed|verified)\b/i,
  /\bpage pending\b/i,
  /\bplaceholder\b/i,
  /\b(TODO|TBD|FIXME)\b/,
  /lorem ipsum/i,
  /ainda (será|serão|precisa ser) (conferid|confirmad|verificad)/i,
  /\ba (confirmar|conferir|verificar)\b/i,
  /\bprovisório:/i,
  /página pendente/i,
];

/** The first provisional phrase in a text, if any. */
export function provisionalPhrase(text: string): string | undefined {
  for (const phrase of PROVISIONAL_PHRASES) {
    const match = phrase.exec(text);
    if (match) return match[0];
  }
  return undefined;
}

type Place = { where: string; text: string };

function bookTexts(locale: Locale): Place[] {
  const out: Place[] = [];
  const catalog = messages[locale] as Readonly<Record<string, string>>;
  for (const entry of COMPENDIUM) {
    out.push({ where: `compendium ${entry.id} body`, text: catalog[compendiumBodyKey(entry)] ?? '' });
    const long = COMPENDIUM_TEXT[locale][entry.id];
    if (!long) continue;
    if (long.place) out.push({ where: `compendium ${entry.id} place`, text: long.place });
    long.note.forEach((section, i) => {
      const where = `compendium ${entry.id}, section ${i + 1}`;
      if (section.heading) out.push({ where, text: section.heading });
      section.paragraphs.forEach((text) => out.push({ where, text }));
      if (section.quote) out.push({ where, text: `${section.quote.text} ${section.quote.attribution} ${section.quote.note ?? ''}` });
    });
    for (const [slot, caption] of Object.entries(long.images ?? {})) {
      out.push({ where: `compendium ${entry.id} caption ${slot}`, text: `${caption.caption} ${caption.credit}` });
    }
  }
  for (const chapter of CAMPAIGN_CHAPTERS) {
    const text = CHAPTER_TEXT[locale][chapter.id];
    if (!text) continue;
    out.push({ where: `chapter ${chapter.id} title`, text: `${text.title} ${text.place} ${text.perspective}` });
    text.pages.forEach((page, i) => {
      const where = `chapter ${chapter.id}, page ${i + 1}`;
      out.push({ where, text: page.heading });
      page.paragraphs.forEach((paragraph) => out.push({ where, text: paragraph }));
      if (page.quote) out.push({ where, text: `${page.quote.text} ${page.quote.attribution} ${page.quote.note ?? ''}` });
    });
    out.push({ where: `chapter ${chapter.id} briefing`, text: [text.briefing.pitch, ...text.briefing.objectives].join(' ') });
  }
  for (const [key, text] of Object.entries(catalog)) {
    if (key.startsWith('book.') || key.startsWith('campaign.')) out.push({ where: `message ${key}`, text });
  }
  return out;
}

/** Every provisional phrase in both books, in every locale. */
export function validateProvisionalText(locales: readonly Locale[] = Object.keys(COMPENDIUM_TEXT) as Locale[]): string[] {
  const errors: string[] = [];
  for (const locale of locales) {
    for (const place of bookTexts(locale)) {
      const phrase = provisionalPhrase(place.text);
      if (phrase) errors.push(`provisional text in ${place.where} (${locale}): "${phrase}"`);
    }
  }
  return errors;
}
