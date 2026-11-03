## Why

The sandbox now has movement, cover, cohesion, one-side flanking and basic
withdraw, but orders are still mostly independent behaviours. There is no formal
contract for order lifecycle, priorities, simultaneous orders, formations, wounds,
rescue or persistent campaign consequences. This change defines that contract
before implementing the remaining systems.

This is a **specification-only** change: it creates the normative requirements and
the design reference. It does not implement the remaining orders.

## What Changes

- Define a single order lifecycle: receive, validate, distribute tasks, execute,
  monitor, complete or interrupt.
- Define individual and collective unit state, including morale, cohesion, fatigue,
  leadership and availability.
- Define formations and coordinated movement as parameters of the active order.
- Define the order catalogue: attack, flank, withdraw, advance, defend, ambush,
  regroup, pursue, disperse, protect officer, recon, reserve and rescue.
- Define a priority and interruption model that allows **concurrent orders**:
  a primary order can be suspended for a higher-priority local interrupt without
  the whole unit abandoning its original function.
- Define wound classification, rescue, evacuation, recovery and persistent
  character records.
- Define player-facing feedback for active, pending, completed and interrupted
  orders.
- Add a dedicated design chapter for unexpected situations and concurrent orders.
- **Non-goals:** implementing the orders in this change, campaign missions, new
  weapons, vehicles, final art and multiplayer.

## Capabilities

### New Capabilities

- `orders`: order catalogue, lifecycle, priorities, interruption and concurrent
  order composition.
- `casualties`: wounds, rescue, evacuation, recovery and persistent records.
- `formations`: coordinated movement, formations, cohesion and fatigue.

### Modified Capabilities

- `presentation`: order menu, unit status and rescue/concurrency feedback.

## Impact

- `docs/design/INFANTRY_COMMAND.md`: comprehensive reference, including Chapter 21
  on concurrent and unexpected orders.
- `openspec/specs/orders`, `casualties`, `formations`: durable behaviour contracts.
- Future implementation: simulation, shared protocol, view and HUD, in small
  vertical slices.
- No GitHub action in this specification step.

## Player fantasy and core loop

The player is a column commander, not a puppeteer. The loop is: select a unit, give
one high-level order, read the unit's condition and the terrain, intervene only when
the situation changes. Soldiers execute locally; officers hold the unit together;
fatigue, wounds and casualties create consequences that outlive the firefight.

## MVP and historical scope

The MVP is the sandbox firefight already in the repository. The specification must
describe a coherent path from the current attack/flank/withdraw slice to the full
order catalogue, without inventing a campaign or a new historical claim. Every
tactical behaviour is a dramatised abstraction. The campaign remains
multi-perspective; no playable historical figure is added by this change.

## Legal and ethical note

All behaviour, state and order terminology is original game design. No text, art,
map or code is copied from another game. The change adds no book text and no new
sensitive historical assertion; the existing source policy remains in force.
