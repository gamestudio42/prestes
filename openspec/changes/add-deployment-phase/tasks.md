## 0. Prerequisites

- [x] 0.1 `pre-battle-roster` and `refine-map-editor` are archived, so sections by type and trench lines exist (verify: `openspec list`; `openspec validate --specs`)
  - Apply note: 2026-11-09: pre-battle-roster and refine-map-editor are archived (openspec list shows neither); openspec validate --specs passes, 21 of 21. Main specs now carry force-roster (sections by type) and the trench lines (battle-maps, map-editor).

## 1. Areas

- [x] 1.1 `DeploymentZone.area`, default area builder, hand-drawn areas for the hand-written maps, content check (verify: unit tests "old document gets areas" and the content check failing on overlap)
  - Apply note: Areas are required on DeploymentZone; defaultDeploymentArea (box of points + 30 m, clipped to the map and own side of the bisector) in shared/maps/deployment-areas.ts; hand-written maps carry band() areas with fronts 130 m apart; validateDeploymentAreas (six slots inside, no overlap, half walkable on a 2 m grid) runs in check:content. Tests: deployment-areas.test.ts (old document gets areas, overlap fails naming the map, slot outside, unwalkable).
- [x] 1.2 Map document version 3 with areas and migration; editor deployment tool edits the polygon; map check errors for points outside, overlap and unwalkable areas; EN and PT-BR (verify: e2e "shape a deployment area"; unit test of the migration; locale check)
  - Apply note: Document version 3 (migrateV2 gives default areas; fazenda-doc rebuilt as v3). The deployment tool (K) drags an area's corners, moves the whole area from inside, double-click on an edge adds a corner, Delete removes the selected one while three remain; areas drawn in side colours. Map check errors section-outside-area, areas-overlap, area-not-walkable (EN, PT-BR). e2e 'shape a deployment area'; migration test in deployment-areas.test.ts. The scenario's playtest refusal is checked in 3.3, once the phase exists.

## 2. Simulation

- [x] 2.1 Phase state, `deployment` start option, `start_battle` command, `battle_started` event, `phase` in frames; worker holds ticks in deployment (verify: test "time stands still"; host test; goldens unchanged with the phase skipped)
  - Apply note: SimulationEngine gains phase and the deployment start option (battle maps only); in deployment step() applies the queue and no tick passes (runTicks runs at most one such step). start_battle emits battle_started and ends the phase; reset_deployment puts the column back where the phase opened it; other commands go to systems/deployment.ts. Frames carry phase in battles with one; the phase is hashed only while it lasts. The host answers each command in deployment with one frame. Tests: deployment-phase.test.ts (time stands still, start_battle, fight order refused, goldens hold, host). check:determinism unchanged.
- [x] 2.2 Instant move, defend (trench preference within 10 m), set-up orders; refusals `not-during-deployment`, `outside-deployment-area`, `blocked` (verify: tests "instant move", "into the trench", "fight orders refused", "outside the area")
  - Apply note: systems/deployment.ts runs the battle's own command (move, move_line, hold, stance, formation, face, fire control, posture; defend, ambush, disperse, regroup, reserve), then puts each man at the end of his route as on arrival, facing as ordered or as his slot faces. A planned position outside the side's area (outside_deployment_area) or in deep water or a footprint (blocked) undoes the whole order. A defend order within 10 m of a fire step is given on the nearest step (TRENCH_PREFERENCE_RADIUS). Other orders: not_during_deployment. Enter waits for garrison-and-assault. Tests: deployment-orders.test.ts (instant move matches the battle's plan, into the trench, fight orders refused, outside the area, stance).
- [x] 2.3 Enemy deployment by the commander from map anchors (verify: tests "same seed, same deployment" and "enemy takes the trenches"; fog test that the commander ignores player units)
  - Apply note: systems/enemy-deployment.ts: anchors are cover slots inside the legalist area facing the column's area (trench 3, walls and sandbags 2, fences 1; buildings wait for garrison-and-assault, objectives for add-map-objectives). Sections in roster order take the best free anchor 25 m from the others, ties by the seeded RNG, and are placed by the instant defend order facing the column's area; the column's men are set aside while it runs, so the planners cannot see them. Engine option enemyDeployment, independent of the phase (the game's worker sets it with deployment), so an untouched deployment still equals no phase. Tests: enemy-deployment.test.ts (same seed, enemy takes the trenches, inside the area on the four maps, another column roster leaves it unchanged).
- [x] 2.4 Determinism: empty deployment equals no phase; replay of deployment commands (verify: `pnpm check:determinism` unchanged; test "replay a deployment")
  - Apply note: pnpm check:determinism now also runs every battle map through an empty deployment phase (start_battle at once) and fails unless it hashes as the golden; goldens unchanged. Test 'replay a deployment' in deployment-orders.test.ts: a move, a defend and a stance in deployment, with enemy deployment, replayed from the same commands reach the same hash at tick 1,000, and differ from the untouched battle. The empty-phase equality is also a unit test (deployment-phase.test.ts).

## 3. Presentation

- [ ] 3.1 Banner, "Start battle" (with key) and "Reset deployment", zone outlines, speed controls hidden, refusal toasts; EN and PT-BR (verify: e2e deploys a section, starts the battle and sees the clock run; locale check)
- [ ] 3.2 Placement preview: nearby slots with counts and classes, planned positions (verify: e2e "preview along a wall" reads the slot count through the scene bridge)
- [ ] 3.3 Playtest from the editor opens in deployment too (verify: editor e2e playtest starts in the deployment phase)

## 4. Close

- [ ] 4.1 Battle report with and without enemy deployment on every map, three seeds; bands hold (verify: report table in `design.md` Apply findings)
- [ ] 4.2 Docs: `docs/status.md`, `docs/architecture.md` (phase, instant planners), `docs/map-editor.md` (areas) (verify: `pnpm check`)
- [ ] 4.3 Gates: `pnpm check`, `pnpm e2e`, `pnpm check:determinism`, `openspec validate add-deployment-phase --type change --strict` (verify: all pass)
- [ ] 4.4 Hand check by the user: deploy into a trench line and behind walls on two maps, then fight; findings in `docs/status.md`
