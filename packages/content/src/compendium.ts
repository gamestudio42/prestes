import type { MessageKey } from './locales';
import { isSourceKey } from './sources';

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
}

export const COMPENDIUM_SECTIONS: readonly CompendiumSection[] = [
  'figures',
  'events',
  'places',
  'weapons',
  'corrections',
];

const M = 'macaulay-1974';

export const COMPENDIUM: readonly CompendiumEntry[] = [
  // Figures (docs/history/FIGURES.md)
  { id: 'siqueira-campos', section: 'figures', sourceRefs: [M, 'helio-1922', 'castro-2022'], cite: 'Macaulay, ch. II', confidence: 'high' },
  { id: 'luis-carlos-prestes', section: 'figures', sourceRefs: [M, 'blanc-2024', 'amado-1942', 'anita-1991'], cite: 'Macaulay, ch. II–IV', confidence: 'high' },

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

export const compendiumTitleKey = (entry: CompendiumEntry) => `compendium.${entry.id}.title` as MessageKey;
export const compendiumBodyKey = (entry: CompendiumEntry) => `compendium.${entry.id}.body` as MessageKey;

export function validateCompendium(entries: readonly CompendiumEntry[] = COMPENDIUM): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) errors.push(`duplicate compendium entry: ${entry.id}`);
    ids.add(entry.id);
    if (entry.sourceRefs.length === 0 || !entry.cite) errors.push(`compendium entry without source: ${entry.id}`);
    if (!['high', 'medium', 'low'].includes(entry.confidence)) errors.push(`compendium entry without confidence: ${entry.id}`);
    if (entry.section === 'events' && !entry.date) errors.push(`compendium event without date: ${entry.id}`);
    for (const source of entry.sourceRefs) {
      if (!isSourceKey(source)) errors.push(`compendium entry ${entry.id} references unknown source: ${source}`);
    }
  }
  return errors;
}
