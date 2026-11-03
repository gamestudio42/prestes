## 1. Directional cover

- [x] 1.1 Extend cover volumes with dimensions, quality and height; verify world tests distinguish front cover from a flank.
- [x] 1.2 Replace proximity cover with `coverAgainst(unit, threat, stance)` and use it in fire, snapshots and cover seeking; verify the engine tests cover the new signature.
- [x] 1.3 Keep low cover stance-aware; verify standing behind a sandbag gets less cover than crouched/prone.

## 2. Suppression and morale states

- [x] 2.1 Add suppression to unit state, frame, decay and shot accumulation; verify covered units gain less suppression than exposed units.
- [x] 2.2 Add pure morale-state thresholds and tests for steady, suppressed, pinned, panicked and routed.
- [x] 2.3 Make an uncovered suppressed unit drop stance and a pinned unit seek retrograde cover or hunker; verify stance lock is respected outside panic.

## 3. Panic, rout and outcome

- [x] 3.1 Add map bounds, panic flee paths, `unit_routed` event and routed filtering; verify a panicked unit routes only after crossing the edge.
- [x] 3.2 Make outcome and target filters ignore routed units; verify last-effective-unit victory and defeat.
- [x] 3.3 Hide routed units from picking and rendering; verify the scene and HUD do not treat them as active.

## 4. HUD and verification

- [x] 4.1 Add localized cover, suppression and state labels; verify PT-BR/EN key parity and the panel updates from the frame.
- [x] 4.2 Update architecture/status docs and verify no placeholder is described as final.
- [x] 4.3 Run `pnpm check`, `pnpm build`, `pnpm e2e`, `openspec validate "improve-cover-morale-panic" --type change --strict`, and two `pnpm sim` runs; verify matching hashes.
- [x] 4.4 Mark tasks complete, archive the change, and verify `openspec validate --specs` and `--archived`.

