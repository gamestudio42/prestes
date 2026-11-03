Detailed sequencing, exit criteria and metrics live in
`docs/design/INFANTRY_COMMAND_IMPLEMENTATION.md`.

## 0. Baseline and test harness

- [x] 0.1 Record the current test, build, E2E and simulation-hash baseline; verify the numbers match `docs/design/INFANTRY_COMMAND_IMPLEMENTATION.md`.
- [x] 0.2 Add a deterministic scenario/test harness for wounded, incapacitated, carried and recovering soldiers; verify no test needs to cast the engine to `any` for a wound.
- [x] 0.3 Add a six- and twelve-unit tick benchmark; verify two runs produce the same hash and record timing.
## 1. Contracts and state

- [x] 1.1 Define order, interrupt, group, task and soldier-state contracts; verify every exclusive state rejects incompatible orders.
- [x] 1.2 Add the order manager and unit controller boundaries; verify concurrent orders share one parent unit and one hash.
- [x] 1.3 Add priority, interruption, safe transition and event tests for target loss, officer loss and blocked routes.

## 2. Movement and formations

- [x] 2.1 Implement advance with per-soldier slots, obstacle recalculation, laggard handling and cohesion limits; verify flat, blocked and laggard tests.
- [x] 2.2 Add column, line, wedge and free formation parameters; verify changing formation keeps the primary order.
- [x] 2.3 Add fatigue accumulation and recovery; verify speed and efficiency change without healing wounds.

## 3. Defence and support orders

- [x] 3.1 Implement defend and reserve with region ownership, cover distribution and no uncontrolled pursuit; verify area limits.
- [x] 3.2 Implement ambush, recon and pursue with activation, discovery and stop conditions; verify single activation and target-loss tests.
- [x] 3.3 Implement regroup, disperse and protect officer; verify eligible soldiers, officer link and reversible dispersion.

## 4. Casualties and rescue

- [x] 4.1 Add wound categories, incapacitation, death and persistent soldier records; verify state exclusivity.
- [x] 4.2 Implement the rescue pipeline with rescuer selection, carry, cover, first aid and evacuation; verify one-rescuer, cancellation and casualty-death tests.
- [x] 4.3 Add recovery, availability and return with stable id; verify persistence across a battle boundary.

## 5. Concurrency

- [x] 5.1 Implement defend + rescue with a detached rescue team; verify defence slots remain occupied.
- [x] 5.2 Implement flank + rescue, withdraw + rescue, ambush + casualty and carrier-incapacity safe transitions; verify no duplicate or invalid state.
- [x] 5.3 Implement new-order-during-carry and two-casualty queue resolution; verify deterministic outcomes.

## 6. Presentation and verification

- [x] 6.1 Add the categorized order menu, primary/interrupt/progress and rescue indicator; verify localized feedback.
- [x] 6.2 Run `pnpm check`, `pnpm build`, `pnpm e2e`, exhaustive engine tests, `openspec validate`, and two `pnpm sim` runs.
- [x] 6.3 Update architecture/status and archive after implementation.

