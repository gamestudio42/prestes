import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * improve-soldier-models 1.1 (D8): byte limits for the built models, checked
 * by `pnpm check:bundle` beside the JS groups. An entry names one file or a
 * group of files by prefix and extension.
 */
export interface ModelLimit {
  name: string;
  /** A folder under the models folder, for example `textures`. */
  subdir?: string;
  file?: string;
  prefix?: string;
  extension?: string;
  maxBytes: number;
}

export interface LimitResult {
  failed: boolean;
  lines: string[];
}

export function checkModelLimits(dir: string, limits: readonly ModelLimit[]): LimitResult {
  const lines: string[] = [];
  let failed = false;
  for (const limit of limits) {
    const folder = limit.subdir ? join(dir, limit.subdir) : dir;
    const files = existsSync(folder) ? readdirSync(folder) : [];
    const matches = limit.file
      ? files.filter((file) => file === limit.file)
      : files.filter((file) => file.startsWith(limit.prefix ?? '') && file.endsWith(limit.extension ?? ''));
    if (matches.length === 0) {
      lines.push(`FAIL ${limit.name}: no ${limit.file ?? `${limit.prefix ?? ''}*${limit.extension ?? ''}`} found in ${folder}`);
      failed = true;
      continue;
    }
    const size = matches.reduce((total, file) => total + statSync(join(folder, file)).size, 0);
    const over = size > limit.maxBytes;
    const percent = ((size / limit.maxBytes) * 100).toFixed(1);
    lines.push(`${over ? 'FAIL' : 'ok  '} ${limit.name}: ${size.toLocaleString('en-US')} B / ${limit.maxBytes.toLocaleString('en-US')} B (${percent}%)`);
    failed ||= over;
  }
  return { failed, lines };
}
