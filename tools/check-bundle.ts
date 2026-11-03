import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface BudgetGroup {
  name: string;
  prefix: string;
  extension: string;
  maxBytes: number;
}

interface Budget {
  assetsDir: string;
  groups: BudgetGroup[];
}

const root = fileURLToPath(new URL('..', import.meta.url));
const budget = JSON.parse(
  readFileSync(fileURLToPath(new URL('./bundle-budget.json', import.meta.url)), 'utf8'),
) as Budget;
const assetsDir = join(root, budget.assetsDir);

if (!existsSync(assetsDir)) {
  console.error(`FAIL no build output at ${budget.assetsDir}; run pnpm build first`);
  process.exit(1);
}

const files = readdirSync(assetsDir);
let failed = false;
for (const group of budget.groups) {
  const matches = files.filter((file) => file.startsWith(group.prefix) && file.endsWith(group.extension));
  const size = matches.reduce((total, file) => total + statSync(join(assetsDir, file)).size, 0);
  const over = size > group.maxBytes;
  if (matches.length === 0) {
    console.error(`FAIL ${group.name}: no ${group.prefix}*${group.extension} asset found`);
    failed = true;
    continue;
  }
  const percent = ((size / group.maxBytes) * 100).toFixed(1);
  console.log(
    `${over ? 'FAIL' : 'ok  '} ${group.name}: ${size.toLocaleString('en-US')} B / ${group.maxBytes.toLocaleString('en-US')} B (${percent}%)`,
  );
  failed ||= over;
}

process.exit(failed ? 1 : 0);
