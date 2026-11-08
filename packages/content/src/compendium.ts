import { DOC_ENTRY_META, COMPENDIUM_IMAGE_REGISTER, type ImageRef } from './compendium-docs';
import { COMPENDIUM_TEXT_EN } from './compendium-notes/en';
import { COMPENDIUM_TEXT_PT_BR } from './compendium-notes/pt-BR';
import type { ContentLabel } from './figures';
import type { Locale, MessageKey } from './locales';
import { isSourceKey } from './sources';

export type { ImageRef, RegisteredImage } from './compendium-docs';
export { COMPENDIUM_IMAGE_REGISTER } from './compendium-docs';

/**
 * The compendium of the Coluna Prestes: a field book in four sections plus the
 * known corrections. Every entry comes from material already sourced in
 * docs/history (Macaulay 1974 as the baseline) and carries its source and the
 * confidence recorded there; nothing here is new research.
 */
export type CompendiumSection = 'figures' | 'events' | 'places' | 'weapons' | 'corrections';
export type Confidence = 'high' | 'medium' | 'low';

export interface CompendiumEntry {
  id: string;
  section: CompendiumSection;
  /** ISO-like date for events (`1922-07-05`, `1925-04`). */
  date?: string;
  sourceRefs: readonly string[];
  /** Page or chapter reference, as printed in the history documents. */
  cite: string;
  confidence: Confidence;
  /** Content label, for entries imported from docs/campaign/compendium/entries. */
  label?: ContentLabel;
  /** Registered images (polish-menu-desk); captions and credits live in the long text. */
  images?: readonly ImageRef[];
}

/** One section of an extended note: an optional heading and its paragraphs. */
export interface NoteSection {
  heading?: string;
  paragraphs: readonly string[];
}

/** Long, localized compendium text kept out of the message catalogs (design D12). */
export interface CompendiumText {
  place?: string;
  note: readonly NoteSection[];
  images?: Readonly<Record<string, { caption: string; credit: string }>>;
}

export const COMPENDIUM_TEXT: Readonly<Record<Locale, Readonly<Record<string, CompendiumText>>>> = {
  en: COMPENDIUM_TEXT_EN,
  'pt-BR': COMPENDIUM_TEXT_PT_BR,
};

/** The long text of an entry in a locale, if it has one. */
export function compendiumText(id: string, locale: Locale): CompendiumText | undefined {
  return COMPENDIUM_TEXT[locale][id];
}

export const COMPENDIUM_SECTIONS: readonly CompendiumSection[] = [
  'figures',
  'events',
  'places',
  'weapons',
  'corrections',
];

const M = 'macaulay-1974';

const BASE: readonly CompendiumEntry[] = [
  // Figures (docs/history/FIGURES.md)
  { id: 'siqueira-campos', section: 'figures', sourceRefs: [M, 'helio-1922', 'castro-2022'], cite: 'Macaulay, ch. II', confidence: 'high' },
  { id: 'luis-carlos-prestes', section: 'figures', sourceRefs: [M, 'blanc-2024', 'amado-1942', 'anita-1991'], cite: 'Macaulay, ch. II–IV', confidence: 'high' },
  { id: 'miguel-costa', section: 'figures', sourceRefs: [M], cite: 'Macaulay, ch. III, pp. 86–89', confidence: 'high' },
  { id: 'isidoro-dias-lopes', section: 'figures', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 4–6; ch. III, pp. 80–89', confidence: 'high' },

  // Events (docs/history/TIMELINE.md)
  { id: 'revolt-1922', section: 'events', date: '1922-07-05', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 37–38', confidence: 'high' },
  { id: 'rs-civil-war-1923', section: 'events', date: '1923-01', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 7–8', confidence: 'high' },
  { id: 'sao-paulo-1924', section: 'events', date: '1924-07-05', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 4–6', confidence: 'high' },
  { id: 'sao-paulo-retaken-1924', section: 'events', date: '1924-07', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 4–6', confidence: 'high' },
  { id: 'rs-revolt-1924', section: 'events', date: '1924-10-28', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 43–48', confidence: 'high' },
  { id: 'sao-luiz-1924', section: 'events', date: '1924-12', sourceRefs: [M], cite: 'Macaulay, ch. II–III', confidence: 'medium' },
  { id: 'ramada-1925', section: 'events', date: '1925-01-03', sourceRefs: [M], cite: 'Macaulay, ch. II–III', confidence: 'medium' },
  { id: 'iguacu-1925', section: 'events', date: '1925-04', sourceRefs: [M], cite: 'Macaulay, ch. IV, p. 93', confidence: 'medium' },
  { id: 'parana-crossing-1925', section: 'events', date: '1925-04-26', sourceRefs: [M], cite: 'Macaulay, ch. IV, p. 93', confidence: 'high' },
  { id: 'serra-nova-1926', section: 'events', date: '1926-04', sourceRefs: [M], cite: 'Macaulay, frontispiece map', confidence: 'medium' },
  { id: 'exile-1927', section: 'events', date: '1927-02', sourceRefs: [M], cite: 'Macaulay, ch. IX, pp. 223–238', confidence: 'medium' },
  { id: 'la-gaiba-1927', section: 'events', date: '1927-07-05', sourceRefs: [M], cite: 'Macaulay, ch. IX (page pending); secondary sources', confidence: 'low' },

  // Places named in those events
  { id: 'forte-copacabana', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 37–38', confidence: 'high' },
  { id: 'vila-militar', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 37–38', confidence: 'high' },
  { id: 'sao-luiz-gonzaga', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. II–III', confidence: 'medium' },
  { id: 'foz-do-iguacu', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. IV, p. 93', confidence: 'medium' },
  { id: 'porto-mendes', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. IV, p. 93', confidence: 'high' },
  { id: 'serra-nova', section: 'places', sourceRefs: [M], cite: 'Macaulay, frontispiece map', confidence: 'medium' },
  { id: 'pantanal', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. IX, pp. 223–238', confidence: 'medium' },
  { id: 'la-gaiba', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. IX (page pending)', confidence: 'low' },
  // Battlefields (add-battle-maps): fictional places in sourced settings.
  { id: 'map-fazenda', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. III, pp. 71, 82, 85', confidence: 'high' },
  { id: 'map-serra-rio', section: 'places', sourceRefs: [M], cite: 'Macaulay, pp. 122–124', confidence: 'high' },
  { id: 'map-bairro', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 4–6, 10, 15', confidence: 'high' },

  // Weapons (docs/history/WEAPONS.md)
  { id: 'mauser-7mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 113', confidence: 'high' },
  { id: 'machine-guns-7mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 113', confidence: 'high' },
  { id: 'automatic-rifles-7mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 113', confidence: 'high' },
  { id: 'winchester-44', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 152', confidence: 'high' },
  { id: 'irregular-arms', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 54', confidence: 'high' },
  { id: 'field-gun-75mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 93', confidence: 'high' },
  { id: 'howitzer-105mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 85', confidence: 'high' },
  { id: 'cartridges', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 113', confidence: 'high' },

  // Known corrections (docs/history/TIMELINE.md)
  { id: 'prestes-not-at-fort', section: 'corrections', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 37–38', confidence: 'high' },
  { id: 'sao-paulo-separate', section: 'corrections', sourceRefs: [M], cite: 'Macaulay, ch. I–IV', confidence: 'high' },
  { id: 'miguel-costa-command', section: 'corrections', sourceRefs: [M], cite: 'Macaulay, ch. IV', confidence: 'high' },
  { id: 'historical-borders', section: 'corrections', sourceRefs: [M], cite: 'Macaulay, frontispiece map', confidence: 'high' },
  { id: 'macaulay-perspective', section: 'corrections', sourceRefs: [M], cite: 'docs/history/SOURCE_POLICY.md', confidence: 'high' },
];

/**
 * The compendium: the base registry, with the label, confidence, sources and
 * images recorded in the doc entries applied over it.
 */
export const COMPENDIUM: readonly CompendiumEntry[] = BASE.map((entry) => {
  const doc = DOC_ENTRY_META[entry.id];
  if (!doc) return entry;
  return {
    ...entry,
    label: doc.label,
    confidence: doc.confidence,
    sourceRefs: doc.sourceRefs,
    ...(doc.images ? { images: doc.images } : {}),
  };
});

export const compendiumTitleKey = (entry: CompendiumEntry) =>
  `compendium.${entry.id}.title` as MessageKey;
export const compendiumBodyKey = (entry: CompendiumEntry) =>
  `compendium.${entry.id}.body` as MessageKey;

export function validateCompendium(entries: readonly CompendiumEntry[] = COMPENDIUM): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) errors.push(`duplicate compendium entry: ${entry.id}`);
    ids.add(entry.id);
    if (entry.sourceRefs.length === 0 || !entry.cite)
      errors.push(`compendium entry without source: ${entry.id}`);
    if (!['high', 'medium', 'low'].includes(entry.confidence))
      errors.push(`compendium entry without confidence: ${entry.id}`);
    if (entry.section === 'events' && !entry.date)
      errors.push(`compendium event without date: ${entry.id}`);
    for (const source of entry.sourceRefs) {
      if (!isSourceKey(source))
        errors.push(`compendium entry ${entry.id} references unknown source: ${source}`);
    }
  }
  return errors;
}

/**
 * Images and long text: every image is registered, and every caption, credit,
 * place and note exists in both locales (polish-menu-desk). File existence is
 * checked by tools/check-content.ts, which can read the disk.
 */
export function validateCompendiumMedia(
  entries: readonly CompendiumEntry[] = COMPENDIUM,
  register: readonly { path: string }[] = COMPENDIUM_IMAGE_REGISTER,
  text: Readonly<Record<Locale, Readonly<Record<string, CompendiumText>>>> = COMPENDIUM_TEXT,
): string[] {
  const errors: string[] = [];
  const registered = new Set(register.map((image) => image.path));
  const ids = new Set(entries.map((entry) => entry.id));
  const locales = Object.keys(text) as Locale[];
  for (const entry of entries) {
    for (const image of entry.images ?? []) {
      if (!registered.has(image.path)) {
        errors.push(`compendium entry ${entry.id} uses unregistered image: ${image.path}`);
      }
      for (const locale of locales) {
        const caption = text[locale][entry.id]?.images?.[image.slot];
        if (!caption?.caption || !caption.credit) {
          errors.push(`compendium entry ${entry.id} has no ${locale} caption for ${image.slot}`);
        }
      }
    }
  }
  for (const locale of locales) {
    for (const [id, long] of Object.entries(text[locale])) {
      if (!ids.has(id)) errors.push(`compendium text for unknown entry: ${id} (${locale})`);
      for (const other of locales) {
        const twin = text[other][id];
        if (!twin) {
          errors.push(`compendium entry ${id} has a note in ${locale} but not in ${other}`);
          continue;
        }
        if (Boolean(long.place) !== Boolean(twin.place)) {
          errors.push(`compendium entry ${id} has a place in ${locale} but not in ${other}`);
        }
        if (long.note.length !== twin.note.length) {
          errors.push(`compendium entry ${id} note sections differ between ${locale} and ${other}`);
        }
      }
    }
  }
  return errors;
}
