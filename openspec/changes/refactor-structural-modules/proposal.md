## Why

Four files hold most of the game: `packages/simulation/src/engine.ts` (4,627
lines, about 90 private methods on one class), `apps/game/src/App.tsx` (1,646
lines, 38 state hooks, 11 effects, 48 handlers), `apps/game/src/ui/Hud.tsx` (999
lines) and `apps/game/src/styles.css` (5,004 lines, including dead blocks for
removed screens). Every feature touches them, so review, navigation and bug
hunting get slower. The bounding bug fixed in the previous change hid inside the
engine for that reason. The campaign will add more systems, so split them now,
while `pnpm verify` and the determinism golden can prove nothing changed.

## What Changes

- Split the simulation engine into system modules (movement, bounding,
  formations, combat, morale, cover, casualties and rescue, tactical orders,
  commands and spawning, snapshot and hash). The `SimulationEngine` class keeps
  its state, public API and tick order and becomes a thin orchestrator.
- Split `App.tsx` into hooks by domain: game client lifecycle, exercise
  director, sandbox, orders and selection, keyboard shortcuts and the dev test
  bridge.
- Split `Hud.tsx` into subcomponents and a shared order-metadata module.
- Split `styles.css` into domain stylesheets and remove dead rules for screens
  that no longer exist (the training campaign overview and the duplicated
  mission briefing sheet).
- Add a local visual regression spec for the start screen and the HUD, with the
  3D canvas masked, so the CSS split is checked against pixels.

No behavior changes. No player-facing string, rule, balance value, command,
event or frame field changes.

Player fantasy, core loop, historical scope and playable figures: unchanged.
This is a structural refactor with no player-facing change.

Legal/ethical note: no book text, historical content or third-party assets are
touched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change sets `skip_specs: true`: it restructures code without changing
any spec-level behavior.

## Impact

- `packages/simulation/src/`: new `systems/` modules; `engine.ts` shrinks to
  state, public API and the tick loop. `index.ts` exports are unchanged.
- `packages/simulation/test/engine.test.ts`: the one test that reaches into
  `assignBoundingDirect` imports the bounding module instead.
- `apps/game/src/`: new `hooks/` and `ui/hud/` folders and a `styles/` folder;
  `main.tsx` imports the stylesheet index.
- `tests/e2e/visual.spec.ts` with committed screenshot baselines.
- The determinism golden (`eee8ea8f`), `pnpm sim` hash (`206ab124`), bundle
  budget and every existing test stay as they are.
