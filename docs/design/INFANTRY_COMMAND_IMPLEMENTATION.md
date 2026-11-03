# Infantry Command â€” Implementation Plan

Status: implementation plan for `add-infantry-command`. This is a sequencing and
verification document; the normative behaviour remains in
`docs/design/INFANTRY_COMMAND.md` and the OpenSpec delta specs.

## Baseline

Verified baseline when this plan started:

- `pnpm check`: 94 tests, 15 files, 127 locale keys.
- `pnpm build`: passes.
- `pnpm e2e`: 3 tests (smoke, sandbox, selection).
- `pnpm sim`: deterministic hash `1d8a5956`.
- `gs42-standards check` and `doctor`: pass with 1.2.0 installed in WSL.
- Existing gameplay: six-person troop, five riflemen and one officer, Mauser,
  directional cover, terrain, cohesion, morale/suppression, panic/rout,
  one-side flank split, cover-aware withdraw, sandbox cover and dummies.

Rules for every phase:

1. Keep the full suite green; add tests before or with the implementation.
2. Do not weaken simulation boundaries: no Three.js, React, DOM or Node APIs in
   `packages/simulation`.
3. Every new order is validated and deterministic.
4. Run the phase's tests, then the full suite, then update `docs/status.md`.
5. Record measured results; do not claim a playtest was run unless it was.
6. Update the relevant OpenSpec spec if the implementation reveals a behaviour
   change. Do not rewrite the durable spec from memory.

## Phase 0 â€” Baseline and scenario harness

**Goal:** make the remaining features testable without relying on combat luck.

Deliverables:

- `packages/simulation/test/support/scenario.ts`: helper that creates an engine
  with deterministic unit positions, states, morale, cover and casualties.
- A documented test-only way to place a soldier in `incapacitated`, `wounded`,
  `being_carried` and `recovering` states.
- `tools/sim-bench.ts` or a Vitest benchmark helper that records ticks/ms for the
  six-person and twelve-person cases.
- Baseline record in `docs/status.md`: tests, e2e, hashes and simulation timing.

Verification:

- A smoke scenario creates one incapacitated soldier and one rescuer without
  relying on random combat.
- `pnpm check` remains green.
- Two repeated benchmark runs produce the same hash; timing is recorded, not used
  as a correctness oracle.

Exit criteria:

- Any order can be tested with a known unit layout.
- No test needs to cast the engine to `any` to create a wound.

## Phase 1 â€” State and order contracts

**Goal:** lock the vocabulary before behaviour.

Files:

- `packages/shared/src/orders.ts` (new): `OrderKind`, `OrderScope`,
  `OrderPriority`, `OrderStatus`, `OrderInstance`, `UnitOrderState`,
  `SoldierState`, state-transition guards.
- `packages/shared/src/protocol.ts`: order command payloads, snapshot fields,
  order events and rejection reasons.
- `packages/simulation/src/orders.ts` (new): pure lifecycle/priority validation.
- `packages/simulation/src/engine.ts`: use the contracts; keep existing behaviour.
- `packages/content/src/locales/*`: order names and rejection reasons.

Deliverables:

- One primary order and a scoped interrupt list per unit.
- Exclusive states: `being_carried`, `treating`, `evacuating`, `recovering`, `dead`.
- Stable order ids and unit ids.
- Events: order accepted/rejected/started/completed/interrupted/failed, state
  changed, casualty/rescue events.
- Every order command has a validation result and a machine-readable reason.

Tests:

- Valid and invalid order for every kind.
- Exclusive-state command rejection.
- Primary order replacement preserves compatible interrupts.
- Target loss, officer loss and blocked route produce the expected transition.
- Snapshot serialization and hash include order/state fields.
- Determinism under the same command sequence.

Measurements:

- Test count added; hash stability across two runs; no regression in 94 tests.

Exit criteria:

- The order state cannot contain two primaries or duplicate exclusive soldiers.
- A rejected command leaves the hash unchanged.
- The UI can display primary, interrupts and reason from the frame.

## Phase 2 â€” Order manager and unit controller

**Goal:** move orchestration out of the engine without rewriting combat.

Files:

- `packages/simulation/src/order-manager.ts`: receives commands, validates,
  owns the primary/interrupt stack, resolves priority and records completion.
- `packages/simulation/src/unit-controller.ts`: distributes tasks, owns groups
  and unit reference, monitors cohesion and requests regroup.
- `packages/simulation/src/engine.ts`: becomes the tick orchestrator delegating
  to the manager/controller.
- Existing `tactical.ts` helpers remain the shared geometry/scoring source.

Deliverables:

- Primary order + interrupts; resource locks for soldiers and cover points.
- Safe transition API: `suspend`, `resume`, `replace`, `abort`.
- Group records with parent unit id and membership.
- Task records: move, hold, attack, suppress, cover, carry, treat, evacuate.

Tests:

- Replace primary while an interrupt runs.
- Suspend/resume preserves tasks.
- Two orders cannot own the same soldier or cover.
- Order manager has no renderer/DOM dependency.
- All existing combat, flank, withdraw, cover, panic and cohesion tests.

Measurements:

- Tick time before/after extraction; no >20% regression on the six-person
  benchmark. If exceeded, profile and fix before Phase 3.
- Two identical command runs produce identical order events.

Exit criteria:

- Engine no longer contains ad-hoc per-order branch logic beyond dispatch.
- The controller can answer "what is this unit doing, what is detached, why?"

## Phase 3 â€” Movement, formations and fatigue

**Goal:** make coordinated advance, formations, regroup and fatigue real.

Files:

- `packages/shared/src/formations.ts` (new): column, line, wedge, free slots.
- `packages/simulation/src/movement.ts` (new): unit reference, slot assignment,
  separation, laggard handling, route recalculation.
- `packages/simulation/src/engine.ts`: movement, cohesion and fatigue integration.
- `packages/view3d/src/path-layer.ts`: formation-aware path display if needed.

Deliverables:

- `advance` uses one destination per fit soldier and a shared reference.
- Formation is a parameter; changing it does not replace the primary order.
- Separation cap and laggard wait/slow behavior; no teleporting.
- Fatigue accumulates with distance, combat and carrying; recovers while idle;
  reduces speed/efficiency.
- Regroup and disperse use the same slot engine.

Tests:

- Flat advance, blocked advance, obstacle reroute, laggard wait, formation change.
- Regroup with a detached soldier, an incapacitated soldier and a dead soldier.
- Disperse minimum spacing and reversible return.
- Fatigue changes speed but not wounds.
- Determinism with different frame rates (tick-based).

Measurements:

- Path length and completion ticks for a fixed advance scenario.
- Maximum separation during advance; target below the cohesion limit.
- Fatigued vs fresh completion time; record ratio.
- Benchmark a twelve-person unit.

Exit criteria:

- The unit visibly stays together without input micro-management.
- Formation change is observable and does not cancel the order.
- Fatigue is visible in the HUD and in movement timing.

## Phase 4 â€” Defence and support orders

**Goal:** implement defend, reserve, ambush, recon, pursue, protect officer.

Files:

- `packages/simulation/src/orders/defend.ts`, `reserve.ts`, `ambush.ts`,
  `recon.ts`, `pursue.ts`, `protect.ts`.
- Shared order payloads and localized labels.
- Sandbox panel exposes order selection and target/area picking.
- HUD status for active/waiting/completed/interrupted.

Deliverables:

- Defend: region ownership, cover slots, no uncontrolled pursuit.
- Reserve: no auto-engagement, available for new orders.
- Ambush: prepare/wait/monitor/activate once/follow-up.
- Recon: move, reveal, report, avoid unnecessary engagement.
- Pursue: valid target only, separation cap, stop conditions.
- Protect officer: formation around officer, loss handling.

Tests:

- Defend with many/limited cover slots; enemy leaves region; player replaces order.
- Reserve ignores auto-target; explicit order wakes it.
- Ambush activates once and cannot retrigger for the same event.
- Recon reveals and disengages.
- Pursue stops on target loss, critical fatigue or morale.
- Protect officer with officer death and replacement.

Measurements:

- Order completion/failure ticks.
- Region containment rate (soldiers inside radius over time).
- Uncontrolled pursuit count (must be zero).
- Auto-engagement count in reserve (must be zero).

Exit criteria:

- Each order is visually distinct and readable in the sandbox.
- No order silently leaves the unit in an invalid state.

## Phase 5 â€” Wounds, rescue, evacuation and recovery

**Goal:** make casualties a visible collective operation.

Files:

- `packages/simulation/src/casualties.ts`: wound thresholds, state transitions,
  records and recovery clock.
- `packages/simulation/src/rescue.ts`: rescuer selection, carry, cover, first aid,
  evacuation, return.
- `packages/shared/src/protocol.ts`: casualty/rescue snapshots and events.
- `packages/content/src/locales/*`: rescue phase labels.
- `packages/view3d`: carried/treating/incapacitated visuals or clear placeholders.

Deliverables:

- Light/moderate/severe/fatal classification.
- Stable ID and persistent record.
- One rescuer per casualty; one casualty per rescuer.
- Carry is one logical operation; no duplicate movers.
- Treatment timer, evacuation, recovery and return.
- Safe cancel/transfer/abort paths.

Tests:

- One casualty, several casualties, rescuer incapacitated, casualty dies,
  no cover, cancel, evacuation complete, recovery end, return with same ID.
- No duplicated casualty; no invalid attached state.
- Rescue queue and deterministic assignment.
- Two battles with recovery persistence.

Measurements:

- Rescue completion ticks and phases.
- Casualty state validity at every tick.
- Recovery duration and availability.
- No duplicate IDs in frame.

Exit criteria:

- The player can see the rescue progress and the casualty is never deleted early.
- Recovery persists beyond a battle boundary.

## Phase 6 â€” Concurrent orders

**Goal:** prove the Chapter 21 contract.

Deliverables:

- Defend + rescue detached team.
- Flank + rescue with parent unit.
- Withdraw + rescue with safe rally/abort.
- Ambush + casualty without revealing the ambush.
- Carrier incapacitation safe transfer/abort.
- New order during carry: complete/transfer/abort.
- Two-casualty queue; no double assignment.

Tests:

- Each scenario above, with two runs producing the same event sequence and hash.
- Primary order remains visible while suspended.
- The rest of the unit keeps its primary tasks during rescue.
- No duplicate controller, no orphan casualty, no invalid animation state.

Measurements:

- Number of defence slots still occupied during rescue (must remain >0 unless the
  region is actually lost).
- Rescue completion while defence continues.
- Event sequence and hash equality across runs.
- Manual visual review of one defend+revive scenario.

Exit criteria:

- The unit behaves as a unit, not as isolated robots.
- Concurrency can be explained in the HUD in one sentence.

## Phase 7 â€” Presentation and feedback

**Goal:** make every order and state readable.

Files:

- `apps/game/src/ui/OrderMenu.tsx` (new) or an expanded HUD order selector.
- `apps/game/src/ui/Hud.tsx`, `SandboxPanel.tsx`, `styles.css`.
- `packages/content` locale catalogs.
- `packages/view3d` casualty/carry indicators and order markers.

Deliverables:

- Categorized order menu with icons, names, descriptions, availability and reason.
- Primary/interrupt/status/progress display.
- Unit stats: strength, morale, cohesion, fatigue, wounded, officer.
- Rescue indicator with rescuer, casualty, phase and progress.
- Visual distinction for wounded, incapacitated, carried, treating, evacuated,
  dead.

Tests:

- PT-BR/EN key parity.
- Playwright: issue one order from each category; verify pending/active/completed.
- Rescue progress appears and clears.
- Interrupt leaves primary visible.
- No hardcoded player text.

Measurements:

- E2E duration and failures.
- Locale key count.
- Visual review at 1440Ã—900 and 1280Ã—720.

Exit criteria:

- A new player can tell what the unit is doing and why without reading debug logs.

## Phase 8 â€” Final verification and archive

Run in this order:

```bash
pnpm check
pnpm build
pnpm e2e
pnpm sim
pnpm sim
gs42-standards check
gs42-standards doctor
openspec validate "add-infantry-command" --type change --strict
```

Record:

- Test count, files and locale keys.
- E2E count and duration.
- Two identical simulation hashes.
- Benchmark ticks/ms and peak memory if measured.
- Any failed check and the fix.
- Archive only after all tasks are complete; then run `openspec validate --specs`
  and `openspec validate --archived`.

## Test matrix

| Area | Normal | Reduced | Unexpected |
|---|---|---|---|
| Attack | full section | casualties | target loss, officer loss |
| Flank | six fit | one group empty | casualty inside manoeuvre, blocked side |
| Withdraw | cover available | no cover | position occupied, critical fatigue |
| Advance | flat | obstacles | laggard, wounded member, new destination |
| Defend | many slots | few slots | enemy leaves, region invalid, order replaced |
| Ambush | activation | no target | casualty before activation, repeat event |
| Regroup | dispersed | dead/incapacitated | detached rescue team |
| Pursue | valid target | fatigued | target lost, critical morale |
| Disperse | open area | narrow area | obstacle, order replaced |
| Protect officer | officer alive | officer wounded | officer dead |
| Recon | clear route | blocked route | contact, disengage |
| Reserve | idle | under fire | explicit recall, rescue request |
| Rescue | one casualty | several casualties | rescuer down, casualty death, cancel |
| Concurrency | defend+rescue | flank+rescue | withdraw+rescue, carry+new order |

## Metrics ledger

For each phase record:

| Metric | Baseline | Result | Decision |
|---|---|---|---|
| Unit tests | 94 | 140 pass in 20 files | Keep; add remaining phase tests as work lands |
| E2E tests | 3 | 7 pass (both-sides video, smoke, sandbox, selection, tactical, formation, rescue completion) | Keep; add more concurrency cases |
| `pnpm check` | pass | pass; 184 locale keys | Keep |
| `pnpm build` | pass | pass; 794 kB JS before gzip | Keep |
| Simulation hash | `1d8a5956` | `5e5ec6cc`, identical across two runs | Keep; rerun after any state change |
| Rescue progress HUD | none | active row added; browser drill passes | Keep; extend to completion |
| Tick benchmark, 6 units | not measured | 0.103 ms/tick on latest host run; 0.052 on earlier idle run; hash stable | Recheck on idle host; host Chrome load is high |
| Tick benchmark, 12 units | not measured | 0.232 ms/tick on latest host run; 0.111 on earlier idle run; hash stable | Recheck on idle host |
| Advance completion ticks | not measured | | |
| Max separation | not measured | | |
| Rescue completion ticks | not measured | engine test reaches recovery within 150 ticks from 14 m; browser drill completes within 480 stepped ticks | Keep; travel + 30 carry + 30 treat + 300 recovery |
| Defence slots during rescue | not measured | 4 of 5 remaining defenders keep `defend` while one rescuer detaches | Keep; add cover-slot assertion |

Do not mark a phase complete on "code compiles" alone. Use the exit criteria and
record the measurement or explicitly state why it could not be measured.

## Risks and rollbacks

- **State explosion** â†’ keep one primary and scoped interrupts; no arbitrary order
  combinations.
- **Extraction breaks combat** â†’ Phase 2 is behaviour-preserving; keep existing
  black-box tests before adding new orders.
- **Rescue stalls** â†’ one rescuer, cover fallback, timeout/abort.
- **Concurrency oscillates** â†’ resource locks, cooldowns, resumption conditions.
- **UI becomes unreadable** â†’ categories and a compact status panel, not 13
  permanent buttons.
- **Performance regression** â†’ benchmark after every phase; revert the phase if
  tick time exceeds the agreed threshold.

## Delivery order

1. Phase 0 and 1 in one local commit-sized slice.
2. Phase 2 as a behaviour-preserving extraction.
3. Phase 3.
4. Phase 4, one order group per commit.
5. Phase 5, rescue first, persistence second.
6. Phase 6, one concurrency pair per test.
7. Phase 7.
8. Phase 8 and archive.

No commit, push or PR is performed without explicit authorization. The game
remains local until the full sequence passes.

