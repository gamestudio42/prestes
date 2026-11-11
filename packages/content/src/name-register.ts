/**
 * faction-armies 2.4 ("Period names"): the register of army and section type
 * names in `docs/history/FORCES.md` ("Names in the game"). Each row is a
 * period term with a source key and a page, or a game organization; the
 * content check fails for a name that is neither.
 */
export type NameStatus = 'period term' | 'game organization';

export interface NameRow {
  /** `army:<id>` or `section:<id>`. */
  id: string;
  name: string;
  status: string;
  source: string;
}

const ROW = /^\|\s*((?:army|section):[a-z0-9-]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/;

/** The register's rows, read from the forces document's markdown. */
export function parseNameRegister(markdown: string): NameRow[] {
  const rows: NameRow[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = ROW.exec(line);
    if (match) rows.push({ id: match[1]!, name: match[2]!, status: match[3]!, source: match[4]! });
  }
  return rows;
}

/**
 * Problems with the register against the names the game shows: every id has
 * a row; a period term names a known source key and a page or chapter; a
 * status is one of the two.
 */
export function validateNameRegister(rows: readonly NameRow[], ids: readonly string[], sourceKeys: readonly string[]): string[] {
  const errors: string[] = [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      errors.push(`${id}: its name is neither sourced nor marked as a game organization in docs/history/FORCES.md`);
      continue;
    }
    if (row.status === 'game organization') continue;
    if (row.status !== 'period term') {
      errors.push(`${id}: unknown name status "${row.status}"`);
      continue;
    }
    const key = sourceKeys.find((source) => row.source.startsWith(`${source},`));
    if (!key || !/\b(pp?\.|ch\.)\s*\S/.test(row.source)) {
      errors.push(`${id}: the period term "${row.name}" has no source key and page`);
    }
  }
  return errors;
}
