export const SOURCE_KEYS = [
  'macaulay-1974',
  'blanc-2024',
  'amado-1942',
  'lima-1931',
  'joao-alberto-1954',
  'tavora-1928',
  'anita-1991',
  'helio-1922',
  'helio-1926',
  'meirelles-1995',
  'brum-1994',
  'castro-2016',
  'castro-2022',
  'cohen-2007',
  'campoi-2001',
  'carvalho-2001',
  'tecchio-2021',
  'silva-2022',
  'vitor-2011',
  'xavier-2011',
  'teles-2008',
  'castro-chico-2008',
  'ferreira-1980',
  'otaviano-1979',
  'bandeira-2013',
  'nascimento-2026',
  'almg-2026',
  'fapesp-2007',
  'revolucao-cultural-2025',
  'cpdoc-coluna',
  'cpdoc-prestes',
  'mvcp-portal',
  'manifesto-1925',
  'libertador-1924',
  'mozzer-2009',
  'rosa-1956',
  'historiafm-2024',
  'superoitocine-2012',
  // complete-books-and-bibliography 2.1
  'anita-1995',
  'starling-1999',
] as const;

export type SourceKey = (typeof SOURCE_KEYS)[number];

export function isSourceKey(value: string): value is SourceKey {
  return (SOURCE_KEYS as readonly string[]).includes(value);
}

/** Whether a source's text may be quoted verbatim in the game (enrich-texts-from-sources, D1). */
/**
 * `citation`: a protected work the owner accepted for brief, attributed quotation
 * for criticism or study (Lei 9.610, art. 46, III; complete-books-and-bibliography D2).
 */
export type SourceRights = 'public-domain' | 'free-licence' | 'citation' | 'copyrighted' | 'unknown';

/** How much of a source was read; `not-consulted` sources may not be cited (D3). */
export type Consultation = 'full' | 'partial' | 'citation-only' | 'pending' | 'not-consulted';

export interface SourceRightsEntry {
  rights: SourceRights;
  /** Licence name, required for `free-licence`. */
  licence?: string;
  consulted: Consultation;
}

const C = (consulted: Consultation): SourceRightsEntry => ({ rights: 'copyrighted', consulted });
const Q = (consulted: Consultation): SourceRightsEntry => ({ rights: 'citation', consulted });

/** Mirrored by the rights table in docs/history/SOURCES.md; the content check compares the two. */
export const SOURCE_RIGHTS: Readonly<Record<SourceKey, SourceRightsEntry>> = {
  'macaulay-1974': Q('full'),
  'blanc-2024': { rights: 'free-licence', licence: 'CC BY-NC 4.0', consulted: 'partial' },
  'amado-1942': Q('citation-only'),
  'lima-1931': { rights: 'public-domain', consulted: 'pending' },
  'joao-alberto-1954': Q('citation-only'),
  'tavora-1928': C('citation-only'),
  'anita-1991': Q('citation-only'),
  'helio-1922': C('citation-only'),
  'helio-1926': C('citation-only'),
  'meirelles-1995': C('citation-only'),
  'brum-1994': C('citation-only'),
  'castro-2016': C('citation-only'),
  'castro-2022': C('citation-only'),
  'cohen-2007': C('citation-only'),
  'campoi-2001': C('pending'),
  'carvalho-2001': C('pending'),
  'tecchio-2021': C('citation-only'),
  'silva-2022': C('citation-only'),
  'vitor-2011': C('citation-only'),
  'xavier-2011': C('citation-only'),
  'teles-2008': C('citation-only'),
  'castro-chico-2008': C('citation-only'),
  'ferreira-1980': C('citation-only'),
  'otaviano-1979': C('citation-only'),
  'bandeira-2013': C('citation-only'),
  'nascimento-2026': C('citation-only'),
  'almg-2026': C('full'),
  'fapesp-2007': C('full'),
  'revolucao-cultural-2025': C('full'),
  'cpdoc-coluna': C('full'),
  'cpdoc-prestes': C('full'),
  'mvcp-portal': C('partial'),
  'manifesto-1925': { rights: 'free-licence', licence: 'GNU FDL', consulted: 'full' },
  'libertador-1924': C('citation-only'),
  'mozzer-2009': C('full'),
  'rosa-1956': Q('citation-only'),
  'historiafm-2024': C('full'),
  'superoitocine-2012': { rights: 'unknown', consulted: 'not-consulted' },
  'anita-1995': Q('citation-only'),
  'starling-1999': C('citation-only'),
};

/** True when the source's text may be quoted verbatim. */
export function isQuotable(key: SourceKey): boolean {
  const { rights } = SOURCE_RIGHTS[key];
  return rights === 'public-domain' || rights === 'free-licence' || rights === 'citation';
}

/** True when the source may be quoted only briefly, with edition and page (D2). */
export function isCitationOnly(key: SourceKey): boolean {
  return SOURCE_RIGHTS[key].rights === 'citation';
}

/** One row of the rights table in docs/history/SOURCES.md. */
export interface SourceRightsRow {
  key: string;
  rights: string;
  licence: string;
  consulted: string;
}

/** Reads the `| key | rights | licence | consulted |` table from SOURCES.md. */
export function parseSourceRightsTable(markdown: string): SourceRightsRow[] {
  const rows: SourceRightsRow[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^\|\s*`([a-z0-9-]+)`\s*\|\s*([a-z-]+)\s*\|\s*([^|]*?)\s*\|\s*([a-z-]+)\s*\|\s*$/.exec(line);
    if (m) rows.push({ key: m[1]!, rights: m[2]!, licence: m[3] === '—' ? '' : m[3]!, consulted: m[4]! });
  }
  return rows;
}

/** Compares SOURCE_RIGHTS with the SOURCES.md table; returns one message per mismatch. */
export function validateSourceRights(rows: readonly SourceRightsRow[]): string[] {
  const errors: string[] = [];
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const key of SOURCE_KEYS) {
    const entry = SOURCE_RIGHTS[key];
    const row = byKey.get(key);
    if (!row) {
      errors.push(`source ${key} missing from the rights table in SOURCES.md`);
      continue;
    }
    if (row.rights !== entry.rights || row.consulted !== entry.consulted || row.licence !== (entry.licence ?? ''))
      errors.push(`source ${key} rights differ: SOURCES.md says ${row.rights}/${row.licence || '—'}/${row.consulted}`);
    if (entry.rights === 'free-licence' && !entry.licence) errors.push(`source ${key} is free-licence without a licence`);
  }
  for (const row of rows) if (!isSourceKey(row.key)) errors.push(`rights table lists unknown source: ${row.key}`);
  return errors;
}
