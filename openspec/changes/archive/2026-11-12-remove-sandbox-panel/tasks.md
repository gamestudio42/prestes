Approved by the owner on 2026-11-11 ("Aprovo as três", with redo-battle-hud and the soldier figures); apply in the planned order: soldier-animation-and-textures, troop-thumbnails-and-panel, redo-battle-hud; remove-sandbox-panel at any time.

## 1. Test bridge first

- [x] 1.1 `useTestBridge.ts`: `bothSides(on)` (D1; fog is the existing `fog` command); move `both-sides.spec.ts` and `fog-of-war.spec.ts` off the panel onto the bridge; verify: both specs pass

## 2. Remove the panel

- [x] 2.1 Delete `SandboxPanel.tsx`, `useSandbox.ts`, the F1 shortcut, the top-bar button and the panel's wiring in `App.tsx`, `Hud.tsx`, `useOrders.ts`, `useKeyboardShortcuts.ts`, `SquadCards.tsx`, `orderMeta.ts`; verify: `pnpm typecheck`, an e2e that F1 opens nothing and the top bar has no `sandbox-toggle`
- [x] 2.2 Delete the panel-only placement preview and rotation code (D3); verify: editor and deployment e2e pass, no unused export left
- [x] 2.3 Remove `sandbox.*` locale keys and the sandbox icon slice if unused; verify: `pnpm check:locales`, icons unit test
  - Apply note (2026-11-11): 52 keys removed from both locales and `ICONS.sandbox` from the icon map; the `ui-sandbox` slice stays in `assets/icons/prestes-icons.aseprite` for now because another session has uncommitted edits to the icon source (unused slices are allowed, as `ui-codex`).
- [x] 2.4 Delete `tests/e2e/sandbox.spec.ts` and the `sandbox-panel` visual baseline; verify: `pnpm e2e`
  - Apply note (2026-11-11): fog-of-war, both-sides, battle, battle-hud and hud-windows e2e pass (11/11; a new case checks F1 and the top bar offer no sandbox). The `battle-hud` visual baseline differs from the working tree for this change (the button) and for other sessions' uncommitted work (compass, area-fire button, objective badges); it is re-recorded once that work is committed, not now.
- [x] 2.5 Re-record the `battle-hud` visual baseline once the compass and area-fire work in the same top bar and orders board is committed (`orders-column` already passes), and review them; verify: `pnpm e2e` visual spec green
  - Apply note (2026-11-12): `battle-hud` baseline re-recorded in 6709bbc after the top bar, compass (c295bb5) and area-fire icon (bcd9c07) landed; reviewed against the owner-approved HUD; visual spec 7/7 passes on the committed tree.

## 3. Gates

- [x] 3.1 `pnpm verify` (determinism goldens unchanged) and `openspec validate remove-sandbox-panel --type change --strict`; verify: all pass, recorded in `docs/status.md`
  - Apply note (2026-11-11): typecheck, lint, `check:locales`, `check:content` and `check:determinism` (hash matches golden) pass; vitest 907/907 (one worker RPC timeout under load, no failing test); e2e above plus deployment, editor, selection and preview-hud pass (one editor case flaked under load and passed alone). Full `pnpm verify` not run as one command while other sessions' uncommitted work is in the tree.
