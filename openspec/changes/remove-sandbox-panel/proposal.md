## Why

The sandbox panel (F1, the tool button on the top bar) was the way to
build test situations before the map editor existed: spawn cover, dummies
and troops, reinforce, control both sides, lift the fog, step, reset. The
owner retired it on 2026-11-11: "vamos retirar o sandbox, hoje temos editor
de mapa, não faz sentido manter". It also has no place in the new battle
HUD (`redo-battle-hud`).

## What Changes

- **BREAKING** (developer-facing only): the sandbox panel, its top-bar
  button, the F1 shortcut, its placement tools and preview, its inspector,
  reset and both-sides / fog / reinforce buttons are removed from the game.
- The development test bridge (`window.__prestes`, development builds
  only) gains `bothSides(on)`, the one panel switch that was client state;
  the fog switch, reinforcements, spawns and incapacitation are simulation
  commands the existing `command` already sends. The published game offers none of it.
- The simulation's sandbox mode, spawn commands, target dummies and the
  test map stay: unit tests, tools (`battle-report`, `sim-bench`,
  determinism) and the e2e suite build their situations with them.
- Specs that named the panel (test map listing, fog toggle, battle start,
  casualty drill, debug readouts, top-bar controls) are reworded.

Non-goals: removing the simulation's sandbox mode or renaming it; a
developer overlay to replace the inspector.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sandbox`: panel-bound requirements removed; both-sides control and the
  combat demonstration go through the test bridge.
- `presentation`: no sandbox control or inspector in the HUD.
- `fog-of-war`: the fog toggle is a test-bridge switch.
- `battle-maps`, `map-slots`: the test map is listed in development builds
  only.
- `battle-lab`: the 3v3 starts from the skirmish setup only.
- `casualties`: the casualty drill runs through the test bridge.

## Impact

- `apps/game/src/ui/SandboxPanel.tsx`, `hooks/useSandbox.ts` (deleted);
  `App.tsx`, `hooks/useKeyboardShortcuts.ts`, `hooks/useOrders.ts`,
  `hooks/useTestBridge.ts`, `ui/Hud.tsx`, `ui/hud/TopBar.tsx`,
  `ui/hud/SquadCards.tsx`, `ui/hud/orderMeta.ts`.
- `packages/content`: `sandbox.*` and the sandbox tooltip keys removed.
- `packages/view3d`: the placement preview the panel drove, if nothing
  else uses it (`scene-view.ts`, `world-layer.ts`).
- Tests: `tests/e2e/sandbox.spec.ts` deleted; `both-sides.spec.ts`,
  `fog-of-war.spec.ts`, `visual.spec.ts` (the `sandbox-panel` baseline
  deleted) moved to the bridge.
- Independent of `redo-battle-hud`; whichever lands second drops the
  top-bar button.
