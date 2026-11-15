import { DOC_ENTRY_META, COMPENDIUM_IMAGE_REGISTER, ENTRY_IMAGES, type ImageRef } from './compendium-docs';
import { COMPENDIUM_TEXT_EN } from './compendium-notes/en';
import { COMPENDIUM_TEXT_PT_BR } from './compendium-notes/pt-BR';
import { COMPENDIUM_BOOKS_EN } from './compendium-notes/books-en';
import { COMPENDIUM_BOOKS_PT_BR } from './compendium-notes/books-pt-BR';
import type { ContentLabel } from './figures';
import type { Locale, MessageKey } from './locales';
import type { Quote } from './quotes';
import { isSourceKey } from './sources';

export type { ImageLicence, ImageRef, RegisteredImage } from './compendium-docs';
export { COMPENDIUM_IMAGE_REGISTER, IMAGE_LICENCES, PENDING_IMAGE_DIR } from './compendium-docs';

/**
 * The compendium of the Coluna Prestes: a field book in four sections plus the
 * known corrections. Every entry comes from material already sourced in
 * docs/history (Macaulay 1974 as the baseline) and carries its source and the
 * confidence recorded there; nothing here is new research.
 */
export type CompendiumSection = 'figures' | 'events' | 'places' | 'weapons' | 'forces' | 'corrections';
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
  /** An attributed quotation shown after the paragraphs (enrich-texts-from-sources D2). */
  quote?: Quote;
}

/** Long, localized compendium text kept out of the message catalogs (design D12). */
export interface CompendiumText {
  place?: string;
  note: readonly NoteSection[];
  images?: Readonly<Record<string, { caption: string; credit: string }>>;
}

/**
 * What the finished books add to an entry (complete-books-and-bibliography):
 * a `note` replaces the entry's note, `addSections` are appended to it, `images`
 * add captions and `place` replaces the place.
 */
export interface CompendiumAddition {
  place?: string;
  note?: readonly NoteSection[];
  addSections?: readonly NoteSection[];
  images?: Readonly<Record<string, { caption: string; credit: string }>>;
}

function withAdditions(
  base: Readonly<Record<string, CompendiumText>>,
  additions: Readonly<Record<string, CompendiumAddition>>,
): Readonly<Record<string, CompendiumText>> {
  const out: Record<string, CompendiumText> = { ...base };
  for (const [id, add] of Object.entries(additions)) {
    const old = out[id];
    const note = [...(add.note ?? old?.note ?? []), ...(add.addSections ?? [])];
    const place = add.place ?? old?.place;
    const images = { ...(old?.images ?? {}), ...(add.images ?? {}) };
    out[id] = {
      ...(place ? { place } : {}),
      note,
      ...(Object.keys(images).length > 0 ? { images } : {}),
    };
  }
  return out;
}

export const COMPENDIUM_TEXT: Readonly<Record<Locale, Readonly<Record<string, CompendiumText>>>> = {
  en: withAdditions(COMPENDIUM_TEXT_EN, COMPENDIUM_BOOKS_EN),
  'pt-BR': withAdditions(COMPENDIUM_TEXT_PT_BR, COMPENDIUM_BOOKS_PT_BR),
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
  'forces',
  'corrections',
];

const M = 'macaulay-1974';

const BASE: readonly CompendiumEntry[] = [
  // Figures (docs/history/FIGURES.md)
  { id: 'siqueira-campos', section: 'figures', sourceRefs: [M, 'helio-1922', 'castro-2022'], cite: 'Macaulay, ch. II', confidence: 'high' },
  { id: 'luis-carlos-prestes', section: 'figures', sourceRefs: [M, 'blanc-2024', 'amado-1942', 'anita-1991'], cite: 'Macaulay, ch. II–IV', confidence: 'high' },
  { id: 'miguel-costa', section: 'figures', sourceRefs: [M], cite: 'Macaulay, ch. III, pp. 86–89', confidence: 'high' },
  { id: 'isidoro-dias-lopes', section: 'figures', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 4–6; ch. III, pp. 80–89', confidence: 'high' },
  { id: 'lourenco-moreira-lima', section: 'figures', sourceRefs: [M], cite: 'Macaulay, ch. VII, pp. 157, 172–173, 196', confidence: 'medium' },

  // Events (docs/history/TIMELINE.md)
  { id: 'positivismo-militar', section: 'events', date: '1889-11-15', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 33–34; ch. III, pp. 64–66', confidence: 'high' },
  { id: 'tenentismo', section: 'events', date: '1922-07-05', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 4–5', confidence: 'high' },
  { id: 'revolt-1922', section: 'events', date: '1922-07-05', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 37–38', confidence: 'high' },
  { id: 'rs-civil-war-1923', section: 'events', date: '1923-01', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 7–8, 44, 48', confidence: 'high' },
  { id: 'sao-paulo-1924', section: 'events', date: '1924-07-05', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 4–6', confidence: 'high' },
  { id: 'sao-paulo-retaken-1924', section: 'events', date: '1924-07-27', sourceRefs: [M, 'cohen-2007'], cite: 'Macaulay, ch. I, pp. 15–17', confidence: 'high' },
  { id: 'rs-revolt-1924', section: 'events', date: '1924-10-28', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 43–48', confidence: 'high' },
  { id: 'o-libertador-1924', section: 'events', date: '1924-11', sourceRefs: [M], cite: 'Macaulay, ch. VI, p. 165; ch. VII, pp. 172, 196', confidence: 'medium' },
  { id: 'sao-luiz-1924', section: 'events', date: '1924-12', sourceRefs: [M], cite: 'Macaulay, ch. II–III', confidence: 'medium' },
  { id: 'ramada-1925', section: 'events', date: '1925-01-03', sourceRefs: [M], cite: 'Macaulay, ch. II–III', confidence: 'medium' },
  { id: 'iguacu-1925', section: 'events', date: '1925-04-03', sourceRefs: [M, 'blanc-2024'], cite: 'Macaulay, ch. III, pp. 85–89', confidence: 'medium' },
  { id: 'parana-crossing-1925', section: 'events', date: '1925-04-27', sourceRefs: [M], cite: 'Macaulay, ch. III–IV, pp. 88–89, 93, 95', confidence: 'high' },
  { id: 'manifesto-porto-nacional-1925', section: 'events', date: '1925-10-19', sourceRefs: ['manifesto-1925'], cite: 'Manifesto, 19 Oct. 1925; Macaulay, ch. VI, pp. 163–166', confidence: 'high' },
  { id: 'serra-nova-1926', section: 'events', date: '1926-04-22', sourceRefs: [M, 'nascimento-2026', 'almg-2026'], cite: 'Macaulay, ch. VIII, pp. 220–221; frontispiece map', confidence: 'medium' },
  { id: 'exile-1927', section: 'events', date: '1927-02-03', sourceRefs: [M, 'blanc-2024'], cite: 'Macaulay, ch. IX, pp. 232–234; Blanc, ch. 7, pp. 132–143', confidence: 'high' },
  { id: 'la-gaiba-1927', section: 'events', date: '1927-07-05', sourceRefs: ['blanc-2024'], cite: 'Blanc, ch. 7, pp. 132, 142, figs. 7.1, 7.5; Correio da Manhã, 22 July 1927, p. 5', confidence: 'medium' },
  { id: 'coluna-no-grande-sertao', section: 'events', date: '1956', sourceRefs: ['mozzer-2009'], cite: 'Mozzer 2009, pp. 246–257; Rosa 1956, p. 82', confidence: 'low', label: 'dramatized' },

  // Places named in those events
  { id: 'forte-copacabana', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 37–38', confidence: 'high' },
  { id: 'vila-militar', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. II, pp. 37–38', confidence: 'high' },
  { id: 'sao-luiz-gonzaga', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. II–III', confidence: 'medium' },
  { id: 'foz-do-iguacu', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. IV, p. 93', confidence: 'medium' },
  { id: 'porto-mendes', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. IV, p. 93', confidence: 'high' },
  { id: 'porto-nacional', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. VI, pp. 163–166', confidence: 'high' },
  { id: 'serra-nova', section: 'places', sourceRefs: [M], cite: 'Macaulay, frontispiece map', confidence: 'medium' },
  { id: 'pantanal', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. IX, pp. 223–238', confidence: 'medium' },
  { id: 'la-gaiba', section: 'places', sourceRefs: ['blanc-2024', M], cite: 'Blanc, ch. 7, pp. 132, 142; Macaulay, ch. IX, p. 234', confidence: 'medium' },
  // Battlefields (add-battle-maps): fictional places in sourced settings.
  { id: 'map-fazenda', section: 'places', sourceRefs: [M], cite: 'Macaulay, ch. III, pp. 71, 82, 85', confidence: 'high' },
  { id: 'map-serra-rio', section: 'places', sourceRefs: [M], cite: 'Macaulay, pp. 122–124', confidence: 'high' },
  { id: 'map-bairro', section: 'places', sourceRefs: [M, 'cohen-2007', 'fapesp-2007'], cite: 'Macaulay, ch. I, pp. 4–6, 10, 15', confidence: 'high' },

  // Weapons (docs/history/WEAPONS.md)
  { id: 'mauser-7mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 113', confidence: 'high' },
  { id: 'machine-guns-7mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, pp. 113, 234', confidence: 'high' },
  { id: 'automatic-rifles-7mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, pp. 113, 234', confidence: 'high' },
  { id: 'winchester-44', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, pp. 152, 205', confidence: 'high' },
  { id: 'irregular-arms', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, pp. 44, 52, 54', confidence: 'high' },
  { id: 'field-gun-75mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, pp. 85, 93, 95, 113', confidence: 'high' },
  { id: 'howitzer-105mm', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, p. 85', confidence: 'high' },
  { id: 'cartridges', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, pp. 113, 234', confidence: 'high' },
  // pre-battle-roster 2.1: the skirmish's section types are a game organization.
  { id: 'skirmish-forces', section: 'weapons', sourceRefs: [M], cite: 'Macaulay, pp. 54, 113, 152; the section types are a game organization', confidence: 'high', label: 'fictional' },

  // faction-armies 2.4: the armies and their section types (docs/history/FORCES.md, "Names in the game").
  { id: 'army-coluna', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 113', confidence: 'high', label: 'historical' },
  { id: 'army-legalista', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 71, 90–91, 178, 192', confidence: 'high', label: 'historical' },
  { id: 'army-patriotico', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 15, 70–71, 189, 192–193, 218–219, 228', confidence: 'high', label: 'historical' },
  { id: 'batalhoes-patrioticos-bahia', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 189, 192–193, 218–221', confidence: 'medium', label: 'historical' },
  { id: 'vivandeiras', section: 'forces', sourceRefs: [M], cite: 'Macaulay, ch. VI, pp. 147–148', confidence: 'medium', label: 'historical' },
  { id: 'section-comando', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 112–113 (the detachment); a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-fuzileiros', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 151', confidence: 'high', label: 'historical' },
  { id: 'section-esquadra-4', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 151 (the fogão); a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-esquadra-5', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 113; a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-fuzil-metralhador', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 113; a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-metralhadora', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 113; a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-irregulares', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 111, 151–152', confidence: 'high', label: 'historical' },
  { id: 'section-veteranos-gauchos', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 44, 52, 88, 112; a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-comando-companhia', section: 'forces', sourceRefs: [M], cite: 'A game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-infantaria-exercito', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 90–91, 178, 192 (the federal army); a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-brigada-militar', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 48, 58, 82', confidence: 'high', label: 'historical' },
  { id: 'section-provisorios', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 48, 55, 81, 178 ("provisionals")', confidence: 'high', label: 'historical' },
  { id: 'section-metralhadora-legalista', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 134; a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-fuzil-metralhador-legalista', section: 'forces', sourceRefs: [M], cite: 'WEAPONS.md (no page of its own); a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-chefe-capangas', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 189, 218, 228 (the regional bosses); a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-jaguncos', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 192, 228', confidence: 'high', label: 'historical' },
  { id: 'section-jaguncos-mauser', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 189, 205; a game organization', confidence: 'high', label: 'fictional' },
  { id: 'section-voluntarios', section: 'forces', sourceRefs: [M], cite: 'Macaulay, pp. 70–71 ("volunteers")', confidence: 'high', label: 'historical' },
  { id: 'section-cangaceiros', section: 'forces', sourceRefs: [M], cite: 'Macaulay, p. 191 (fighting the column is dramatized)', confidence: 'high', label: 'dramatized' },

  // Known corrections (docs/history/TIMELINE.md)
  { id: 'sao-paulo-separate', section: 'corrections', sourceRefs: [M], cite: 'Macaulay, ch. I, pp. 16–17; ch. III, pp. 86–89', confidence: 'high' },
  { id: 'miguel-costa-command', section: 'corrections', sourceRefs: [M], cite: 'Macaulay, ch. III, pp. 85–89', confidence: 'high' },
  { id: 'historical-borders', section: 'corrections', sourceRefs: [M], cite: 'Macaulay, frontispiece map', confidence: 'high' },
  { id: 'macaulay-perspective', section: 'corrections', sourceRefs: [M, 'blanc-2024', 'anita-1991'], cite: 'docs/history/SOURCE_POLICY.md', confidence: 'high' },
];

/**
 * The compendium: the base registry, with the label, confidence, sources and
 * images recorded in the doc entries applied over it.
 */
export const COMPENDIUM: readonly CompendiumEntry[] = BASE.map((entry) => {
  const doc = DOC_ENTRY_META[entry.id];
  const images = [...(doc?.images ?? []), ...(ENTRY_IMAGES[entry.id] ?? [])];
  const withImages = images.length > 0 ? { images } : {};
  if (!doc) return { ...entry, ...withImages };
  return {
    ...entry,
    label: doc.label,
    confidence: doc.confidence,
    sourceRefs: doc.sourceRefs,
    ...withImages,
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
