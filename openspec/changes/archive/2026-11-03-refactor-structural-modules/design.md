## Context

See proposal.md (Why). The constraints that shape the approach:

- The simulation is deterministic: one seeded RNG, a fixed 100 ms tick, and
  `hashState()` as the oracle. It never imports Three.js, React, DOM or Node
  APIs, and the boundary to presentation is commands in, frames and events out.
- `pnpm check:determinism` replays a fixed seed-1922 scenario (move, attack,
  suppress, defend) and must keep the golden `eee8ea8f`. `pnpm sim` must keep
  `206ab124`. These two hashes are the proof that the engine split is
  behavior-preserving.
- Tests reach into engine internals by casting: `units` (27 uses),
  `boundingEnabled` and `assignBoundingDirect` (one use each).
- No content schema, low-poly pipeline, historical research method or figure
  roster is touched.

## Goals / Non-Goals

**Goals:**

- `engine.ts` at most about 800 lines: state, constructor, public API
  (`enqueue`, `tick`, `runTicks`, `frame`, `hashState`, `roster`) and the
  per-tick system order.
- `App.tsx` at most about 500 lines, `Hud.tsx` at most about 350 lines, no CSS
  file over about 1,200 lines.
- Each slice lands as its own commit with `pnpm verify:quick` green and both
  hashes unchanged.

**Non-Goals:**

- Renaming commands, events, frame fields or locale keys.
- Performance work, new systems, or changing any rule while moving it, including
  fixes for bugs found on the way (those are recorded and fixed in a separate
  change).
- State management libraries or a React context rewrite.

## Decisions

**Engine systems as plain functions over an explicit context.** Each module in
`packages/simulation/src/systems/` exports functions that take a
`SimContext` (the mutable state the engine owns: units, covers, sight
obstacles, rng, orders, order manager, bounding groups, id counters, config
flags and the current tick's event list) plus their own arguments. The engine
builds one context object over its own fields and calls the systems in the same
order as today's `tick()`. Alternatives: subclass chains or mixins (rejected:
the order of calls and shared state stay implicit); one class per system
(rejected: more indirection than the code needs, and every system still needs
most of the state).

**Move code, do not rewrite it.** A method moves with its body unchanged except
`this.` becoming `ctx.` and calls to other moved helpers becoming imports. Loop
order, RNG draw order and float arithmetic stay identical, which is what keeps
both hashes stable. Any change that would alter a hash is out of scope.

**One system per slice, cheapest first.** Order: snapshot and hash, formations,
movement and pathing helpers, bounding, cover, combat, morale, casualties and
rescue, tactical orders, commands and spawning. After each slice:
`pnpm check:determinism`, `pnpm sim` and `pnpm verify:quick`. Shared helpers
used by several systems (`nearestOpenPoint`, `occupied`, `nearestEnemy`,
`facingToward`, `squadCentroid`) move to `systems/geometry.ts` first.

**Engine internals used by tests stay reachable.** `units` and
`boundingEnabled` stay engine fields. The `assignBoundingDirect` test imports the
function from `systems/bounding.ts` and builds a context from a fresh engine via
a small `createContext` helper exported for tests only from
`systems/context.ts`.

**App hooks by domain.** `useGameClient` (client creation, frame state, speed,
start and reset), `useExerciseDirector` (exercise state, the per-frame director
effect, progress persistence, retry and debrief), `useSandbox`, `useOrders`
(selection, pending orders, previews and all order handlers),
`useKeyboardShortcuts` and `useTestBridge` (dev-only `window.__prestes`). Hooks
take and return explicit values. Alternative: React context (rejected for now:
it hides data flow and is not needed for a single-screen app).

**HUD subcomponents** in `apps/game/src/ui/hud/`: `OrderBoard`, `SquadCard`,
`WeaponCard`, `CommandRow`, `StatRail`, `IconButton`, and `orderMeta.ts` for the
icon, label and posture tables. `Hud.tsx` composes them; its props and every
`data-testid` stay the same.

**Styles by domain** in `apps/game/src/styles/`: `tokens.css`, `base.css`,
`start-screen.css`, `hud.css`, `order-board.css`, `training.css`,
`sandbox.css`, `codex.css`, `map-symbols.css`, imported in today's cascade order
from `styles/index.css`. Dead blocks are removed only after a search of
`apps/game/src` shows no class use, including class names built in template
strings.

**Visual regression as the CSS guard.** A new `tests/e2e/visual.spec.ts` uses
Playwright `toHaveScreenshot` on the start screen and the bootcamp HUD at
1440x900 with the game canvas masked and animations disabled. Baselines are
recorded before the CSS split and committed; the split must match them. The
spec stays as a permanent local check. Alternative: computed-style snapshots
(rejected: noisy and blind to layout).

## Risks / Trade-offs

- [A moved method silently changes RNG or iteration order] → the golden and
  `pnpm sim` hashes fail; the slice is reverted and moved again more literally.
- [The hashes miss a code path the fixed scenario never runs (rescue, recon,
  ambush, training phases)] → the 184 unit tests and 18 e2e specs cover those
  paths; `pnpm verify` runs in full after the engine group.
- [Context object makes hidden coupling explicit and large] → accepted; it is
  the honest picture of the shared state and can shrink later.
- [Screenshot flakiness from fonts or GPU] → canvas masked, animations off,
  fonts self-hosted, a small `maxDiffPixelRatio`; baselines are recorded on this
  machine, which is the only target while the project is local-only.
- [Cascade order changes when CSS is split] → files are imported in the original
  order and the visual spec checks the result.

## Migration Plan

Each slice is an independent commit, so any slice can be reverted alone. No
data, save format or public API changes.
