import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPENDIUM_IMAGE_REGISTER, PENDING_IMAGE_DIR } from '../packages/content/src';

/**
 * prepare-online-release D6: `pnpm check:release` reads the built game and
 * fails on anything that must not be published, and budgets what a first
 * visit downloads and the build's total size.
 */

export interface ReleaseBudget {
  /** Bytes a first visit downloads before the desk is ready. */
  firstVisitMaxBytes: number;
  totalMaxBytes: number;
}

export interface RegisterRow {
  path: string;
  licence: string;
}

export interface ReleaseReport {
  failures: string[];
  firstVisitBytes: number;
  totalBytes: number;
}

/** The build's manifest entry for one chunk (Vite's `build.manifest`). */
interface ManifestChunk {
  file: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
  assets?: string[];
}

const PUBLIC_PREFIX = 'apps/game/public/';
const COMPENDIUM_PUBLIC = 'assets/compendium/';
/** make-campaign-playable D6: the campaign book's "Edit this map" link is for the dev server only. */
export const DEV_ONLY_STRINGS = ['Edit this map', 'Editar este mapa', 'editor.html?map='];

function walk(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else found.push(path);
  }
  return found;
}

/** Where a registered image lands in the build (a pending image would be served at its compendium place). */
function builtPath(row: RegisterRow): string {
  if (row.path.startsWith(PENDING_IMAGE_DIR)) return `${COMPENDIUM_PUBLIC}${row.path.slice(PENDING_IMAGE_DIR.length)}`;
  return row.path.replace(PUBLIC_PREFIX, '');
}

/** D6: the first visit's bytes: the page, its entry chunk and every static import, their styles and assets. */
function firstVisit(dist: string, size: (file: string) => number): { bytes: number; failure?: string } {
  const manifestPath = join(dist, '.vite', 'manifest.json');
  if (!existsSync(manifestPath)) return { bytes: 0, failure: 'no .vite/manifest.json in the build (build.manifest is off)' };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, ManifestChunk>;
  const entry = Object.entries(manifest).find(([key, chunk]) => chunk.isEntry && key.endsWith('index.html'));
  if (!entry) return { bytes: 0, failure: 'the manifest has no index.html entry' };
  const files = new Set<string>(['index.html']);
  const seen = new Set<string>();
  const visit = (key: string): void => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const asset of chunk.assets ?? []) files.add(asset);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  visit(entry[0]);
  return { bytes: [...files].reduce((sum, file) => sum + size(file), 0) };
}

/** Checks the built game in `dist` against the image register and the budget. */
export function checkRelease(dist: string, budget: ReleaseBudget, register: readonly RegisterRow[] = COMPENDIUM_IMAGE_REGISTER): ReleaseReport {
  const failures: string[] = [];
  if (!existsSync(dist)) return { failures: [`no build at ${dist}; run pnpm build first`], firstVisitBytes: 0, totalBytes: 0 };
  const files = walk(dist).map((path) => relative(dist, path).split('\\').join('/'));
  const sizes = new Map(files.map((file) => [file, statSync(join(dist, file)).size]));
  const size = (file: string): number => sizes.get(file) ?? 0;
  const shipped = files.filter((file) => !file.startsWith('.vite/'));

  // Images still under a permission request, and anything from the pending folder or the review build.
  const byBuilt = new Map(register.map((row) => [builtPath(row), row]));
  for (const row of register.filter((entry) => entry.licence === 'permission-pending')) {
    const file = builtPath(row);
    if (sizes.has(file)) failures.push(`${file}: the image ${row.path} is still permission-pending`);
  }
  for (const file of shipped) {
    if (/compendium-pending|dist-review/.test(file)) failures.push(`${file}: from the pending images or the review build`);
    if (file.endsWith('.map')) failures.push(`${file}: a source map`);
    if (file.startsWith(COMPENDIUM_PUBLIC) && /\.(png|jpe?g|webp|gif)$/i.test(file) && !byBuilt.has(file)) {
      failures.push(`${file}: a compendium image missing from the image register`);
    }
    if (file.endsWith('.js') || file.endsWith('.html')) {
      const text = readFileSync(join(dist, file), 'utf8');
      for (const word of DEV_ONLY_STRINGS) if (text.includes(word)) failures.push(`${file}: holds the dev-only "${word}"`);
      if (file.endsWith('.js') && text.includes('sourceMappingURL=')) failures.push(`${file}: points at a source map`);
    }
  }

  const visit = firstVisit(dist, size);
  if (visit.failure) failures.push(visit.failure);
  const totalBytes = shipped.reduce((sum, file) => sum + size(file), 0);
  if (visit.bytes > budget.firstVisitMaxBytes) failures.push(`first visit ${visit.bytes} B is over its ${budget.firstVisitMaxBytes} B limit`);
  if (totalBytes > budget.totalMaxBytes) failures.push(`the build's ${totalBytes} B is over its ${budget.totalMaxBytes} B limit`);
  return { failures, firstVisitBytes: visit.bytes, totalBytes };
}

const megabytes = (bytes: number): string => `${(bytes / 1_000_000).toFixed(2)} MB`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const budget = JSON.parse(readFileSync(join(root, 'tools', 'release-budget.json'), 'utf8')) as ReleaseBudget & { dist: string };
  const report = checkRelease(join(root, budget.dist), budget);
  console.log(`${report.firstVisitBytes > budget.firstVisitMaxBytes ? 'FAIL' : 'ok  '} first visit: ${megabytes(report.firstVisitBytes)} / ${megabytes(budget.firstVisitMaxBytes)}`);
  console.log(`${report.totalBytes > budget.totalMaxBytes ? 'FAIL' : 'ok  '} total build: ${megabytes(report.totalBytes)} / ${megabytes(budget.totalMaxBytes)}`);
  for (const failure of report.failures) console.error(`FAIL ${failure}`);
  if (report.failures.length === 0) console.log('Release check passed.');
  process.exit(report.failures.length > 0 ? 1 : 0);
}
