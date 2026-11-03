## Context

See proposal.md (Why). Current state the design builds on:

- `pnpm check` chains typecheck, lint, Vitest, locale and content checks.
- `pnpm sim` (`tools/headless-sim.ts`) runs 60 ticks of two move commands and
  prints the hash; nothing compares it with anything.
- `pnpm e2e` runs 18 Playwright specs with one worker against the `dev:test`
  server on port 4317, which takes a few minutes.
- The last build has `index-*.js` at 952,852 bytes, `sim.worker-*.js` at 73,561
  bytes and `index-*.css` at 70,670 bytes. Vite already warns about chunk size.
- The repository is local-only (no remote); the GitHub Actions workflow is
  dormant and stays as it is.

The simulation/presentation boundary is unchanged: the determinism check
imports only `@prestes/simulation` and drives it through `enqueue` and
`runTicks`, the same command boundary the worker uses, with `hashState()` as the
oracle. No content schema, low-poly pipeline, historical research or figure
roster is affected.

## Goals / Non-Goals

**Goals:**

- One command, cross-platform (Windows PowerShell, Git Bash, WSL), no new
  global tools beyond the `openspec` CLI the project already requires.
- Failures are fast and named: the cheapest steps run first.

**Non-Goals:**

- Replacing or editing the GitHub workflow.
- Parallel step execution or caching between runs.

## Decisions

**Orchestrator as a TypeScript script (`tools/verify.ts`, run with `tsx`).**
Each step is spawned with `spawnSync(..., { stdio: 'inherit', shell: true })` so
`pnpm` and `openspec` resolve on Windows. It times each step and prints a
summary table (passed / failed / skipped / not run). Alternative: a long `&&`
chain in `package.json`. Rejected: no summary, no skipped-step report, and
`&&` behaves differently in PowerShell 5.1.

**Step order:** check → build → bundle budget → determinism → OpenSpec
validate → e2e. The budget needs the build; e2e is last because it is the
slowest. `verify:quick` is the same script with `--quick`.

**Determinism scenario in its own tool (`tools/check-determinism.ts`).**
It builds a fixed scenario from the default seed 1922: a group move, an attack
order, a suppress order and an area defend order, run for 600 ticks (60 s of
game time), so that movement, pathing, combat, morale and orders all feed the
hash. Two fresh engines run it in the same process; the hashes must match, then
they are compared with `tools/determinism-golden.json`
(`{ seed, ticks, hash }`). `--update` rewrites that file and prints old → new.
`pnpm sim` stays as the exploratory printout. Alternative: compare two `pnpm
sim` processes. Rejected: slower, and process-level runs hide nothing that an
in-process rerun with a fresh engine would not catch.

**Bundle budget as a checked-in JSON (`tools/bundle-budget.json`).**
Groups match built files by prefix: `index` JS (limit 1,000,000 bytes),
`sim.worker` JS (90,000 bytes), `index` CSS (85,000 bytes). Raw bytes, not
gzip, so the check needs no compression step and matches what Vite prints.
Limits start about 5% to 20% above the current sizes; raising one is a reviewed
edit to the JSON. Alternative: Vite `chunkSizeWarningLimit`. Rejected: it only
warns and does not cover CSS or the worker.

**Coverage with `@vitest/coverage-v8`** pinned to the installed Vitest major
(3.x). `coverage.include` covers `packages/{kernel,shared,simulation,content}/src`;
reporters are `text-summary` and `html` into the ignored `coverage/` folder.
The line threshold is set at apply time to the measured baseline rounded down
to the nearest 5%. Coverage is a separate `pnpm coverage` command and is not
part of `verify`, so the gate's time does not grow with instrumentation.
Alternative: istanbul. Rejected: v8 needs no transform and is the Vitest default.

## Risks / Trade-offs

- [The golden hash changes with every intended simulation change] → `--update`
  prints old and new hashes; the commit that changes behavior also updates the
  golden, which makes the change visible in history.
- [e2e is slow and may be flaky with WebGL in headless Chromium] → it runs last,
  and `verify:quick` exists for the inner loop. A flaky spec is fixed in its own
  change, not retried silently.
- [`openspec` missing from PATH on some shells] → the step fails with a message
  that names the missing CLI instead of a generic spawn error.
- [Budget limits too tight block unrelated work] → limits have headroom and live
  in one JSON file.

## Migration Plan

Additive: new scripts and files only. Rollback is deleting the new scripts and
tools; nothing else depends on them.
