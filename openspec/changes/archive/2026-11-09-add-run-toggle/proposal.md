## Why

Sections walk most of their moves (1.5 m/s), so crossing open ground keeps
them exposed for a long time. The player wants to choose when a section
hurries: a run takes the same ground in less than half the time, at the
cost of fatigue.

## What Changes

- A per-section pace toggle, Walk or Run, in the order board ("Passo":
  "Andar", "Correr") and on the key `R`.
- While Run is on, a section's soldiers move at the run gait (3.5 m/s) in
  every order except recon. Winded soldiers still drop to a walk, so running
  tires them as before.
- A new command `hurry` sets the toggle; it is also allowed during the
  deployment phase (it changes nothing there but carries into the battle).
- The toggle is absent from the state hash while off, so recorded goldens
  do not change.

## Capabilities

### New Capabilities

### Modified Capabilities

- `formations`: a player-chosen run gait on top of the gaits by order.

## Impact

`packages/shared` (command, snapshot field), `packages/simulation`
(command, gait), `apps/game` (order board, shortcut, locales), tests.
