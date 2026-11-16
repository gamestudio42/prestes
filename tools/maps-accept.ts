/**
 * make-campaign-playable D7: `pnpm maps:accept <map-id> --reason "<why>"`
 * accepts a deliberate edit to one authored map in one step: the map check
 * for that map, its determinism goldens re-recorded with the reason, and its
 * preview redrawn. It stops at the first failure; the map check runs before
 * anything is written. `--dry-run` checks the map and compares its goldens
 * without writing.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authoredMapIds } from '../packages/shared/src';

export interface AcceptPlan {
  map: string;
  reason: string;
  dryRun: boolean;
  steps: { name: string; args: string[] }[];
}

/** The steps for the arguments, or why they are refused. */
export function acceptPlan(argv: readonly string[], ids: readonly string[]): AcceptPlan | { error: string } {
  const dryRun = argv.includes('--dry-run');
  const reasonIndex = argv.indexOf('--reason');
  const reason = reasonIndex >= 0 ? argv[reasonIndex + 1]?.trim() : undefined;
  const map = argv.find((arg, index) => !arg.startsWith('--') && !(reasonIndex >= 0 && index === reasonIndex + 1));
  if (!map) return { error: 'usage: pnpm maps:accept <map-id> --reason "<why>" [--dry-run]' };
  if (!ids.includes(map)) return { error: `unknown authored map: ${map}` };
  if (!dryRun && !reason) return { error: 'a reason is required: --reason "<why>"' };
  const steps = dryRun
    ? [
        { name: 'map check', args: ['tools/check-maps.ts', '--map', map] },
        { name: 'determinism (compare)', args: ['tools/check-determinism.ts', '--map', map] },
      ]
    : [
        { name: 'map check', args: ['tools/check-maps.ts', '--map', map] },
        { name: 'determinism goldens', args: ['tools/check-determinism.ts', '--update', '--map', map, '--reason', reason!] },
        { name: 'preview', args: ['tools/map-previews.ts', map] },
      ];
  return { map, reason: reason ?? '', dryRun, steps };
}

/** Runs the steps in order and stops at the first that fails; returns the exit code. */
export function runAccept(plan: AcceptPlan, run: (args: string[]) => number, log: (line: string) => void = console.log): number {
  for (const step of plan.steps) {
    log(`maps:accept ${plan.map}: ${step.name}`);
    const status = run(step.args);
    if (status !== 0) {
      log(`maps:accept ${plan.map}: ${step.name} failed (exit ${status}); stopped`);
      return status || 1;
    }
  }
  log(`maps:accept ${plan.map}: ${plan.dryRun ? 'unchanged, goldens match' : 'accepted'}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const plan = acceptPlan(process.argv.slice(2), authoredMapIds());
  if ('error' in plan) {
    console.error(plan.error);
    process.exit(1);
  }
  const code = runAccept(plan, (args) => spawnSync('pnpm', ['exec', 'tsx', ...args], { stdio: 'inherit', shell: true }).status ?? 1);
  process.exit(code);
}
