## Why

The sandbox has combat, cover, morale and terrain, but no way to inspect the
mechanics or place test objects. The next slice turns the current map into a lab:
inspect a section, pause and step, place cover, and add target dummies without
starting the campaign.

## What Changes

- Add a sandbox panel toggled with `F1` or a HUD button.
- Show a selected unit inspector: weapon, magazine/reserve, morale, suppression,
  state, cover, elevation, speed factor, target and target distance.
- Add pause/step controls that advance exactly one simulation tick.
- Add a deterministic reset that recreates the sandbox.
- Add sandbox-only cover spawning: sandbag wall, stone wall and trench.
- Add target dummies: stationary, targetable, no AI, no fire, excluded from the
  mission outcome.
- Expose the cover set in the frame so simulation and view use the same dynamic
  covers.
- **Non-goals:** campaign missions, terrain editor, vehicles, new weapons,
  destructible cover, save/load and final art.

## Capabilities

### New Capabilities

- `sandbox`: the test panel, inspector, reset, dynamic cover and target dummies.

### Modified Capabilities

- `simulation`: dynamic cover set, sandbox spawn commands and dummy targets.
- `presentation`: sandbox panel and dynamic cover/dummy rendering.

## Impact

- `packages/shared`: cover set in frames, spawn command, dummy kind/faction and
  validation.
- `packages/simulation`: cover ownership, reset behavior, dummy spawning and
  outcome filtering.
- `packages/view3d`: dynamic cover meshes and dummy rendering.
- `apps/game`: sandbox panel, F1 shortcut, step/reset wiring.
- `packages/content`: PT-BR/EN labels for the lab.
- Tests: spawn/reject, duplicate cover, dummy targetability, inspector values,
  reset determinism and panel E2E.
- No GitHub action.

## Historical scope and legal note

The sandbox is a fictional testing space. Dummies and dynamic cover are game
objects, not historical claims. No text, map or art is copied from another source.
