## 1. Shared vision and planning

- [x] 1.1 Add the 65-degree cone helper to shared and verify direction, boundary and degenerate-facing tests pass.
- [x] 1.2 Apply the shared defend-region clamp after cover selection in the preview and verify the clamp test passes.
- [x] 1.3 Keep preview non-mutating and cover-first; verify the existing preview tests still pass.

## 2. Simulation vision

- [x] 2.1 Require the forward cone in target acquisition and fire; verify a target in front is acquired and a target behind is not.
- [x] 2.2 Remove idle auto-facing to the nearest enemy while keeping target, path and explicit-order facing; verify the facing and engine tests pass.
- [x] 2.3 Verify sight-blocking cover still interrupts acquisition and fire.

## 3. Minimal sepia HUD

- [x] 3.1 Rebuild the top bar as one row with icon-only utilities, titles and the existing Preview and Hide HUD controls; verify the smoke and preview tests.
- [x] 3.2 Compact the bottom deck to one primary order row, one tactical row, a narrow status rail and clipped sepia panels; verify all tactical, formation and selection tests.
- [x] 3.3 Keep boot-camp collapse, sandbox, codex, both-sides and HUD restore behavior; verify the full E2E suite.

## 4. Verification

- [x] 4.1 Run `pnpm check` and record the test, locale and content counts.
- [x] 4.2 Run `pnpm build`, `pnpm e2e` and two `pnpm sim` runs; record the bundle size and matching hash.
- [x] 4.3 Update `docs/status.md` and `docs/architecture.md`; run `openspec validate` and the gs42 checks.
