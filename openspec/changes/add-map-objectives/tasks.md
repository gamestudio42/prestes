## 0. Prerequisites

- [x] 0.1 Archive `add-battle-maps` and `add-deployment-phase` (verify: `openspec validate --specs`)
  - Apply note (2026-11-10): both were already archived (2026-11-08-add-battle-maps, 2026-11-09-add-deployment-phase); `openspec validate --specs` 23/23.
  - Plan is stale (2026-11-10): proposal, design, tasks and specs name the removed hand-written maps (Vila Militar, Fazenda, Serra e Rio, Bairro, the engenho) 31 times; author-game-maps (archived 2026-11-10) made every battle map an authored document and `campo-de-provas` the default. Before 1.1, revise the plan (openspec-update-change): objectives come from map documents (1.3 becomes the data source, 1.1 the type only), the test map carries the first objectives, tests and the battle report run on it, and the 4.1 bands cover the test map presets A-C (A and C stand off at 900 s without objectives).

## 1. Data

- [ ] 1.1 `Objective` type and `objectives` on `BattleMap`; the table's objectives on the four maps; EN and PT-BR names (verify: typecheck; locale check)
- [ ] 1.2 Content check: reachable from both zones, no overlap, not in deep water or inside a footprint (except the flag), 3-5 per battle map (verify: unit test with a broken map; `pnpm check:content`)
- [ ] 1.3 Objectives in authored maps: map document version 4 with `objectives` (area polygon, flag point, value, initial owner, EN and PT-BR names); the editor's objective tool in the gameplay layers; the map check applies 1.2's rules (verify: editor e2e places an objective and the playtest shows its flag; migration unit test; locale check)

## 2. Simulation

- [ ] 2.1 Protocol: start request `timeLimitTicks`; frame `objectives` and `clock`; events `objective_taken`, `objective_contested`; `Outcome` gains `draw` (verify: typecheck; host test)
- [ ] 2.2 Capture system with presence, progress, contest and decay; hashed state (verify: tests "taking the engenho", "contested", "held without staying"; determinism test)
- [ ] 2.3 Clock and outcome order with `decidedBy` and the objective summary in the end event (verify: tests "time runs out", "all objectives held", "draw")
- [ ] 2.4 Commander goals: garrison value ≥ 2, attack by value, retake within 60 s, last-minutes push (verify: tests "retake" and "last minutes"; fog test that the commander does not target unseen men)
- [ ] 2.5 Goldens re-recorded with the reason (verify: `pnpm check:determinism`)
- [ ] 2.6 The clock and capture start at `battle_started` (after the deployment phase); the commander's deployment anchors include its objectives (verify: test "clock waits for the deployment"; test "enemy deploys on its objectives")

## 3. Presentation

- [ ] 3.1 `ObjectiveLayer`: flagpole placeholder with owner colour, area outline, capture ring (verify: screenshot review on each map; asset register entry `placeholder:flag`)
- [ ] 3.2 Top bar `ObjectiveStrip` and clock; tooltips; contested pulse; PT-BR and EN (verify: e2e reads owner changes through the strip; locale check)
- [ ] 3.3 Skirmish setup screen: time limit choice (saved with the other choices) and the chosen map's objectives listed and flagged over its preview (verify: e2e chooses 15 min and the clock shows 15:00; e2e "objectives shown before the battle" on the Fazenda)
- [ ] 3.4 End panel: decided-by line and objectives table (verify: e2e "decided on objectives" with a short limit through the bridge)

## 4. Close

- [ ] 4.1 Battle report: `decidedBy`, objectives held, capture times; bands on all maps and three seeds, with the enemy deployed (`pnpm battle:report --deployment`; the Bairro stalled there without objectives, see add-deployment-phase design.md Apply findings; with garrison-and-assault the enemy garrisons a section at the start, so the report's player must take positions and assaults must show on the Bairro: `pnpm battle:report --garrisons`, see garrison-and-assault design.md Apply findings 3.4; empty STALLED_UNTIL_OBJECTIVES in tests/simulation/battle-maps-report.test.ts, LONG_UNTIL_OBJECTIVES in tests/simulation/battle-feel.test.ts and restore the Bairro gun's 10 bursts in tests/simulation/battle-report-weapons.test.ts) (verify: report tests pass)
- [ ] 4.2 Gates: `pnpm verify`, `pnpm e2e`, `openspec validate add-map-objectives --type change --strict`
- [ ] 4.3 Hand check by the user: one battle on each battle map played for the objectives; findings in `docs/status.md`
