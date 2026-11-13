import type { CatalogObject, LineCatalogEntry } from '../packages/shared/src';

/**
 * revise-buildings-and-stone 6.2: every building, stone, object and line
 * kind of the editor's catalog, and every model file the game ships, is in
 * the asset register (`docs/assets.md`) on a row that names its author or
 * source and its licence. Trees and plants have their own check
 * (`tools/flora-check.ts`).
 */

/** The register's table rows, as their cells. */
function rows(register: string): string[][] {
  return register
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

/** The model files a register row names, one by one or grouped as `stones{,-basalt}.glb`. */
export function namedFiles(register: string): Set<string> {
  const files = new Set<string>();
  for (const match of register.matchAll(/([a-z0-9/-]*)\{([^}]*)\}([a-z0-9-]*)\.glb/g)) {
    for (const part of match[2]!.split(',')) files.add(`${match[1]!.split('/').pop()}${part}${match[3]}`);
  }
  for (const match of register.matchAll(/([a-z0-9-]+)\.glb/g)) files.add(match[1]!);
  return files;
}

export function structuresRegisterProblems(
  catalog: readonly CatalogObject[],
  lines: readonly LineCatalogEntry[],
  files: readonly string[],
  register: string,
): string[] {
  const problems: string[] = [];
  const table = rows(register);
  const check = (what: string, name: string): void => {
    const row = table.find((cells) => cells.some((cell) => cell.includes(`\`${name}\``)));
    if (!row) problems.push(`${what} ${name} is not in docs/assets.md`);
    else if (row.length < 5 || !row[2] || !row[3]) problems.push(`${what} ${name}: its row in docs/assets.md has no author or licence`);
  };
  for (const entry of catalog) if (entry.group !== 'tree') check('object', entry.id);
  for (const line of lines) check('line kind', line.kind);
  const named = namedFiles(register);
  for (const file of files) if (!named.has(file)) problems.push(`${file}.glb is not in docs/assets.md`);
  return problems;
}
