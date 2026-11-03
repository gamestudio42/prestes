## 1. Mechanics regression suite

- [x] 1.1 Create `packages/simulation/test/mechanics.test.ts` from the review audit with one scenario per order (attack, suppress, hold fire, move, withdraw, hold, face, flank, recon, ambush, pursue, defend, advance, disperse, reserve, regroup, protect-officer), rescue chain, stance, posture, formation, bounding, officer aura and morale states; mark the attack, suppress and ambush LOS cases and the officer-loss case as expected failures, and verify the rest pass with `pnpm test`

## 2. Simulation fixes

- [x] 2.1 Make `advanceTowardTarget` stop at `combatRange` clamped to the weapon range, and reposition to a reachable point with line of sight when the target is in range but not visible; verify the attack and suppress LOS cases in the suite now pass
- [x] 2.2 Reject automatic cover that blocks the sightline to the unit's ordered target, and apply the LOS reposition to ambush and defend once a target is acquired; verify the ambush case passes and existing cover and flank tests still pass
- [x] 2.3 Implement the officer-loss consequence once per loss (−20 morale to living allies within 25 m, −15 squad cohesion floored at 0, aura stops, protect-officer interrupted, flag cleared on recovery); verify the officer-loss cases pass
- [x] 2.4 Extend the training phase setup with ammunition refill, `pinInstructor` and a casualty list (soldiers or instructor to incapacitate), and add the training-only instructor follow system (follow beyond 15 m, stop within 12 m, cover-first); verify with simulation unit tests for refill, pin, casualty drill and follow
- [x] 2.5 Run `pnpm check:determinism`, confirm the golden changes only because of 2.1 to 2.4, record it with `--update`, and verify `pnpm sim` stays deterministic across two runs

## 3. Stations content and objectives

- [x] 3.1 Extend the objective union and the exercise types in `packages/content` with the new objective kinds and station setup fields (refill, pin, casualties); verify `pnpm typecheck`
- [x] 3.2 Define the seven stations in `bootcamp-exercise.ts` with markers, setups, objectives and failures per the design table; add a content test that every order in the catalogue, every stance and posture, formation, Hold Fire, bounding, rescue, officer aura and officer loss is required by at least one objective
- [x] 3.3 Add EN and PT-BR locale keys for every station title, briefing, instructor line, objective label, failure reason and debrief line; verify `pnpm check:locales` and the encoding test
- [x] 3.4 Implement one pure evaluator per objective kind in `apps/game/src/training/objectives.ts`, with ordered objectives inside a station, and unit-test each evaluator with synthetic frames and events
- [x] 3.5 Update the exercise director for stations (sequential objectives, station transitions, per-station failure, retry, debrief with stations completed) and its unit tests
- [x] 3.6 Migrate progress from `prestes.bootcamp.exercise.v1` to `prestes.bootcamp.stations.v2` (assembly → 1, assault → 2, hold → 7, completed stays completed; legacy 27-step starts at 1), and unit-test each migration path

## 4. HUD, icons and start screen

- [x] 4.1 Add advance, disperse, reserve and regroup to the order catalogue and board sectors, with localized labels and tips; verify the tactical e2e spec and a unit test that the board lists every catalogue order
- [x] 4.2 Replace the icon tables with one `ICONS` map per the design table (codex BookOpen, sandbox FlaskConical, Hold Fire Ban, preview Route, clear Eraser), and add a unit test that every order and posture has an icon and that icons shown together are unique
- [x] 4.3 Move tick, path count and outcome from the top rail to a Simulation block in the sandbox inspector, make the command row text visible on one line, and update the e2e specs that read `tick-value`; verify the smoke, preview-hud and sandbox specs
- [x] 4.4 Show the active station number, title and ordered objectives in the training panel, with the instructor callout naming the current order; verify in the training e2e spec
- [x] 4.5 Rework the start screen: final tagline in EN and PT-BR, single period kicker, Continue and Restart when progress exists, audio toggle; verify with a new start-screen e2e test
- [x] 4.6 Review the new HUD, panel and start screen in Chrome at desktop and narrow widths, then re-record the visual baselines and verify the visual spec passes twice in a row

## 5. Tutorial end to end

- [x] 5.1 Rewrite `tests/e2e/training-campaign.spec.ts` with one test per station driven by the dev bridge and `stepUntil`, plus failure and retry for stations 6 and 7
- [x] 5.2 Add one e2e test that plays all seven stations in order, reloads after station 3 to check Continue, and reaches the debrief
- [ ] 5.3 Play the full bootcamp manually in Chrome in PT-BR and EN, record timings per station and any confusing instruction in `docs/status.md`, and fix issues found before closing the change

## 6. Documentation and final check

- [x] 6.1 Update `README.md`, `docs/status.md` (bootcamp, mechanics review results, open items) and `docs/architecture.md` (objective evaluators, instructor follow), and record the player-controlled command troop (commander + 2) for campaign and skirmish as future scope
- [x] 6.2 Run `openspec validate complete-bootcamp-tutorial --type change --strict` and the full `pnpm verify`, and verify both pass
