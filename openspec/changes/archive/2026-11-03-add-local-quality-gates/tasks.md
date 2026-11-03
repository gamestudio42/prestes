## 1. Determinism golden check

- [x] 1.1 Create `tools/check-determinism.ts` with the fixed seed-1922 scenario (group move, attack, suppress, area defend, 600 ticks) run on two fresh engines, and verify it prints both hashes and exits zero when they match
- [x] 1.2 Add the golden comparison against `tools/determinism-golden.json` and the `--update` flag, record the initial golden with `--update`, and verify a plain run then exits zero
- [x] 1.3 Verify the failure paths: temporarily edit the golden hash and confirm a non-zero exit that prints expected and actual hashes, then restore it
- [x] 1.4 Add the `check:determinism` script to `package.json` and verify `pnpm check:determinism` passes

## 2. Bundle budget

- [x] 2.1 Create `tools/bundle-budget.json` with the `index` JS (1,000,000 B), `sim.worker` JS (90,000 B) and `index` CSS (85,000 B) limits, and `tools/check-bundle.ts` that prints each group against its limit, and verify `pnpm build && pnpm check:bundle` exits zero
- [x] 2.2 Verify the failure paths: a temporarily lowered limit exits non-zero naming the group, and a missing `apps/game/dist` exits non-zero asking for a build; restore the limit afterwards

## 3. Verify orchestrator

- [x] 3.1 Create `tools/verify.ts` running check, build, bundle budget, determinism, `openspec validate --specs` and e2e in order, with a per-step summary (passed, failed, skipped, not run) and durations, and add the `verify` and `verify:quick` scripts; verify `pnpm verify:quick` passes and reports e2e as not run
- [x] 3.2 Verify first-failure behavior: with a temporary lowered bundle limit, `pnpm verify:quick` stops at the budget step, marks later steps skipped and exits non-zero; restore the limit
- [x] 3.3 Verify a missing `openspec` CLI yields a message naming the CLI (simulated by pointing `VERIFY_OPENSPEC_BIN` at a missing command), not a raw spawn error
- [x] 3.4 Run the full `pnpm verify` and verify every step passes, including the 18 Playwright specs, and that `git status` shows no changes made by the gate

## 4. Coverage threshold

- [x] 4.1 Add `@vitest/coverage-v8` at the installed Vitest 3.x version and verify `pnpm install` succeeds and the lockfile updates
- [x] 4.2 Configure coverage in `vitest.config.ts` for `packages/{kernel,shared,simulation,content}/src` with `text-summary` and `html` reporters into `coverage/`, add the `coverage` script, and record the measured baseline line coverage
- [x] 4.3 Set the line threshold to the baseline rounded down to the nearest 5% and verify `pnpm coverage` exits zero and writes `coverage/index.html`

## 5. Documentation

- [x] 5.1 Document `pnpm verify`, `pnpm verify:quick`, `pnpm check:determinism [--update]`, `pnpm check:bundle` and `pnpm coverage` in `README.md`, and verify the command list matches `package.json`
- [x] 5.2 Update `docs/status.md` Verification to point at `pnpm verify`, note that the repository is local-only and the GitHub workflow is dormant, and record the first verify result
- [x] 5.3 Run `openspec validate add-local-quality-gates --type change --strict` and `pnpm verify:quick`, and verify both pass
