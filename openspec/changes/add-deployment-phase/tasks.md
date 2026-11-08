## 0. Prerequisites

- [ ] 0.1 `pre-battle-roster` and `refine-map-editor` are archived, so sections by type and trench lines exist (verify: `openspec list`; `openspec validate --specs`)

## 1. Areas

- [ ] 1.1 `DeploymentZone.area`, default area builder, hand-drawn areas for the hand-written maps, content check (verify: unit tests "old document gets areas" and the content check failing on overlap)
- [ ] 1.2 Map document version 3 with areas and migration; editor deployment tool edits the polygon; map check errors for points outside, overlap and unwalkable areas; EN and PT-BR (verify: e2e "shape a deployment area"; unit test of the migration; locale check)

## 2. Simulation

- [ ] 2.1 Phase state, `deployment` start option, `start_battle` command, `battle_started` event, `phase` in frames; worker holds ticks in deployment (verify: test "time stands still"; host test; goldens unchanged with the phase skipped)
- [ ] 2.2 Instant move, defend (trench preference within 10 m), set-up orders; refusals `not-during-deployment`, `outside-deployment-area`, `blocked` (verify: tests "instant move", "into the trench", "fight orders refused", "outside the area")
- [ ] 2.3 Enemy deployment by the commander from map anchors (verify: tests "same seed, same deployment" and "enemy takes the trenches"; fog test that the commander ignores player units)
- [ ] 2.4 Determinism: empty deployment equals no phase; replay of deployment commands (verify: `pnpm check:determinism` unchanged; test "replay a deployment")

## 3. Presentation

- [ ] 3.1 Banner, "Start battle" (with key) and "Reset deployment", zone outlines, speed controls hidden, refusal toasts; EN and PT-BR (verify: e2e deploys a section, starts the battle and sees the clock run; locale check)
- [ ] 3.2 Placement preview: nearby slots with counts and classes, planned positions (verify: e2e "preview along a wall" reads the slot count through the scene bridge)
- [ ] 3.3 Playtest from the editor opens in deployment too (verify: editor e2e playtest starts in the deployment phase)

## 4. Close

- [ ] 4.1 Battle report with and without enemy deployment on every map, three seeds; bands hold (verify: report table in `design.md` Apply findings)
- [ ] 4.2 Docs: `docs/status.md`, `docs/architecture.md` (phase, instant planners), `docs/map-editor.md` (areas) (verify: `pnpm check`)
- [ ] 4.3 Gates: `pnpm check`, `pnpm e2e`, `pnpm check:determinism`, `openspec validate add-deployment-phase --type change --strict` (verify: all pass)
- [ ] 4.4 Hand check by the user: deploy into a trench line and behind walls on two maps, then fight; findings in `docs/status.md`
