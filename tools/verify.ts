import { spawnSync } from 'node:child_process';
import { constants, setPriority } from 'node:os';
import { fileURLToPath } from 'node:url';

// Local verification gate. Runs every step in order, stops at the first
// failure and prints a summary. It never touches git or the network.

type Result = 'passed' | 'failed' | 'skipped' | 'not run';

interface Step {
  name: string;
  command: string;
  requires?: string;
  slow?: boolean;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const quick = process.argv.includes('--quick');
const openspec = process.env.VERIFY_OPENSPEC_BIN ?? 'openspec';

const steps: Step[] = [
  { name: 'check', command: 'pnpm check' },
  // make-campaign-playable D4: the published build has a map for every chapter.
  { name: 'published content', command: 'pnpm check:content --published' },
  { name: 'build', command: 'pnpm build' },
  { name: 'bundle budget', command: 'pnpm check:bundle' },
  // prepare-online-release D6: nothing unpublishable in the build, and its sizes in budget.
  { name: 'release check', command: 'pnpm check:release' },
  { name: 'determinism', command: 'pnpm check:determinism' },
  // add-difficulty-levels 4.2: 60 headless battles in parallel, a few minutes.
  { name: 'difficulty', command: 'pnpm check:difficulty', slow: true },
  { name: 'tick budget', command: 'pnpm check:budget' },
  { name: 'openspec validate', command: `${openspec} validate --specs`, requires: openspec },
  { name: 'e2e', command: 'pnpm e2e', slow: true },
];

// Run at low priority so the machine stays usable during the gate. The steps
// are children of this process and inherit its priority (on Windows too).
try {
  setPriority(constants.priority.PRIORITY_BELOW_NORMAL);
} catch {
  // Not allowed here: run at normal priority.
}

function run(command: string, quiet = false): number {
  const result = spawnSync(command, { cwd: root, shell: true, stdio: quiet ? 'ignore' : 'inherit' });
  return result.status ?? 1;
}

const results: Array<{ step: Step; result: Result; seconds?: number; note?: string }> = [];
let failed = false;

for (const step of steps) {
  if (quick && step.slow) {
    results.push({ step, result: 'not run', note: 'quick mode' });
    continue;
  }
  if (failed) {
    results.push({ step, result: 'skipped' });
    continue;
  }
  console.log(`\n=== ${step.name}: ${step.command}`);
  if (step.requires && run(`${step.requires} --version`, true) !== 0) {
    results.push({ step, result: 'failed', note: `'${step.requires}' CLI not found on PATH` });
    failed = true;
    continue;
  }
  const started = performance.now();
  const status = run(step.command);
  const seconds = (performance.now() - started) / 1000;
  results.push({ step, result: status === 0 ? 'passed' : 'failed', seconds, note: status === 0 ? undefined : `exit ${status}` });
  failed ||= status !== 0;
}

console.log(`\n=== verify${quick ? ' (quick)' : ''} summary`);
for (const { step, result, seconds, note } of results) {
  const time = seconds === undefined ? '' : `${seconds.toFixed(1)} s`;
  console.log(`${result.padEnd(8)} ${step.name.padEnd(18)} ${time.padStart(8)}${note ? `  ${note}` : ''}`);
}
process.exit(failed ? 1 : 0);
