## Why

The project is local-only for now: there is no GitHub remote, so the CI
workflow never runs. `pnpm check` covers typecheck, lint, unit tests and
content, but the browser suite, the determinism oracle, OpenSpec validation and
the bundle size are only checked by hand and recorded in `docs/status.md`. Before
the campaign adds more content, one local command must catch regressions in all
of them.

## What Changes

- Add `pnpm verify`: one local gate that runs `pnpm check`, `pnpm build`, the
  bundle budget, the determinism check, `openspec validate --specs` and
  `pnpm e2e`, in that order, stopping at the first failure with a summary.
- Add `pnpm verify:quick` for the fast subset (check, build, budget,
  determinism, OpenSpec), leaving out the Playwright suite.
- Add a determinism check: a fixed headless scenario runs twice in-process and
  must produce the same `hashState()`, and that hash must match a recorded
  golden value. An intentional simulation change updates the golden through an
  explicit `--update` flag.
- Add a bundle budget: the built JS and CSS sizes are compared against limits in
  a checked-in budget file; the gate fails when a limit is exceeded.
- Add a unit-test coverage report with a minimum threshold set from the
  measured baseline.
- Keep the GitHub Actions workflow file untouched and dormant; it is not removed.

Non-goals: visual regression, axe accessibility audits, real-GPU FPS
measurement, git hooks, and any push, remote or Pages deploy.

Player fantasy, core loop, historical scope and playable figures: unchanged.
This is engineering tooling with no player-facing behavior.

Legal/ethical note: no book text, historical content or third-party assets are
touched. Coverage and verification reports stay in ignored local folders.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery`: adds the local verification gate, the determinism golden check,
  the bundle budget and the coverage threshold.

## Impact

- `package.json`: new `verify`, `verify:quick`, `check:determinism`,
  `check:bundle` and `coverage` scripts; new dev dependency
  `@vitest/coverage-v8` (matching the installed Vitest major).
- `tools/`: new `verify.ts`, `check-determinism.ts`, `check-bundle.ts`, plus
  `determinism-golden.json` and `bundle-budget.json`.
- `vitest.config.ts`: coverage provider, include list and thresholds.
- `.gitignore`: already ignores `coverage/`.
- `docs/status.md`, `README.md`: document the local gate and replace the
  hand-recorded verification list with the `pnpm verify` result.
