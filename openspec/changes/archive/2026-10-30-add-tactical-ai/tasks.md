## 1. Tactical helpers and target selection

- [x] 1.1 Add pure target-score, flank-candidate and formation-slot helpers in `packages/simulation/src/tactical.ts`; verify each helper with focused unit tests for ranking, hysteresis, blocked candidates and spacing.
- [x] 1.2 Replace nearest-enemy acquisition with deterministic tactical scoring and id tie-breaks; verify the engine test shows an exposed target preferred over a covered one, overkill avoided and two seeded runs selecting the same targets.

## 2. Flanking and suppression AI

- [x] 2.1 Add flank state, candidate search and one-flanker-per-target reservation to the engine; verify a test shows one unit receiving a side path with line of sight and no second flanker on the same target.
- [x] 2.2 Add retrograde-cover search and hunkering for suppressed units, respecting `stanceLocked` and active paths; verify tests for fallback, hunkering, preserved stance and preserved player path.

## 3. Section spacing

- [x] 3.1 Assign perpendicular formation slots to multi-unit move commands with building and no-path fallback; verify a test where two units ordered to one point finish at least 2.8 m apart and a single unit keeps a direct route.
- [x] 3.2 Confirm formation paths remain visible in the existing order layer; verify `pnpm e2e` still sees a route and clears it.

## 4. Player order commands

- [x] 4.1 Add `suppress`, `flank`, `withdraw` and hold-position command payloads and validation; verify engine tests cover success, invalid target, path kind, cleared target and unchanged hash on rejection.
- [x] 4.2 Implement suppress fire, flank routes, rear withdrawal and hold-position movement blocking; verify tests show faster morale loss, flank/withdraw paths, no automatic movement while holding and normal fire while holding.
- [x] 4.3 Mark flank and withdraw paths with their order kinds; verify the existing path layer still draws routes and `pnpm test` passes.

## 5. Orders panel and interaction

- [x] 5.1 Replace the floating squad panel with a bottom orders panel: section cards left, order grid centre, status and pending prompt right; verify the panel is visible after start and follows selection.
- [x] 5.2 Wire move, attack, suppress, flank, withdraw, hold, stance and cancel buttons to commands, including right-click target picking and Escape; verify Playwright selects a section, enters suppress and flank modes, sends withdraw/hold and sees the pending mode clear.
- [x] 5.3 Add PT-BR/EN keys for every panel label, prompt and active order; verify `pnpm check:locales` passes and no hardcoded player text is reported.
- [x] 5.4 Register the section portrait as a named placeholder; verify the asset register names it as a placeholder and the panel shows a non-final silhouette.

## 6. Documentation and verification

- [x] 6.1 Update `docs/architecture.md`, `docs/status.md` and `docs/assets.md` for tactical scoring, the orders panel and the placeholder portrait; verify no unimplemented system is called final.
- [x] 6.2 Run `pnpm check`, `pnpm build`, `pnpm e2e` and `openspec validate "add-tactical-ai" --type change --strict`; verify all pass and record the deterministic hash from two `pnpm sim` runs.
- [x] 6.3 Mark the change tasks complete and archive it after the checks; verify `openspec validate --specs` and `openspec validate --archived` pass.

