## 1. Research and the catalog

- [x] 1.1 Read Macaulay for the government's forces and the column's organisation, phase by phase; write `docs/history/FORCES.md` (force, period name, phase and region, arms, source key and page, confidence) and register any new source in `SOURCES.md`; verify: every row has a source key and a page or chapter, and `pnpm check:content` passes
  - Apply note (2026-11-11): `docs/history/FORCES.md` written from Macaulay alone (text layer; pages checked against the running heads, not against the page images). No new source: `SOURCES.md` is unchanged. Blanc and the regional studies were not read. `pnpm check:content` passes.
- [x] 1.2 Answer in `FORCES.md` whether and where the state police forces fought on the government's side and on the rebels', with pages; move what stays unconfirmed to `docs/campaign/open-questions.md`; verify: the owner's question of 2026-11-11 has a sourced answer or an open question, not a guess
  - Apply note (2026-11-11): answered in `FORCES.md` ("Did the police fight for the government?", pp. 9–10, 19, 24, 71, 90) and ticked in `open-questions.md`; five questions the source does not settle (Portuguese names of the state forces and of the provisionals, uniforms, small-unit make-up, the strength of a Patriotic Battalion) are logged there.
- [x] 1.3 Propose the catalog: a table of section types per army (name, men, weapons, values, sourced or game organization) and the reviewed names of the present types; verify: the owner approves the table, and the approval is recorded in `docs/status.md`
  - Apply note (2026-11-11): the table is in `catalog-proposal.md` in this change, awaiting the owner; the task stays open until he answers its five questions.
  - Apply note (2026-11-11, later): approved by the owner with five decisions, recorded at the head of `catalog-proposal.md` and in `docs/status.md`: the army names stand; Fogão and Potreada; only the Brigada Militar among the state forces; cangaceiros in, hollow-nosed bullets out; no ammunition handicap (a future difficulty selector).
- [x] 1.4 Write the `force-roster` deltas ("Section types", "Skirmish setup screen") from the approved table with the `openspec-update-change` workflow; verify: `openspec validate faction-armies --type change --strict`

## 2. Data

Before section 2: read `docs/handoff.md`, `catalog-proposal.md` (the approved table) and `docs/history/FORCES.md`.

- [ ] 2.1 `packages/shared/src/armies.ts`: `ArmyId` (`coluna`, `legalista`, `patriotico`), the registry (name and description keys, side, uniform set id, values: morale, suppression resistance, accuracy, cohesion) and `armyOf(sectionType)`; `army` on `MutableUnit` and `UnitSnapshot` (`protocol.ts`, `systems/model.ts`, `systems/snapshot.ts`, `systems/spawning.ts`); verify with unit tests of the registry and of a frame carrying each army
- [ ] 2.2 `packages/shared/src/sections.ts`: the nineteen types of `catalog-proposal.md`, each with one `army` in place of `sides`; the seven present ids stay as the column's types (comando, fuzileiros, esquadra-4, esquadra-5, fuzil-metralhador, metralhadora, irregulares) so the column's saved rosters and goldens keep their ids, and the legalist and patriotic types get new ids; limits (one command, one machine gun, one cangaceiros, two automatic rifles) in the roster validation, which also refuses a type of another army; verify with unit tests of both scenarios of "Sections by army" and of each limit (`packages/shared/test/sections.test.ts`, `deploy-roster.test.ts`)
- [ ] 2.3 The successor table for the enemy side (`fuzileiros` to Infantaria do Exército and so on, design D6) in shared code, used by the map loader and the stored setup; verify with a unit test of every old id on the legalist side
- [ ] 2.4 Names and descriptions in EN and PT-BR for the three armies and nineteen types (`packages/content/src/locales`), a compendium note per army and per type with its `FORCES.md` source or the game-organization label, the Cangaceiros' note labelled dramatized and naming no person; a name register the content check reads (`tools/check-content.ts`); verify with a unit test of an unrecorded name, `pnpm check:content` and `pnpm check:locales`

## 3. Simulation

- [ ] 3.1 Army and section values applied where units are built (`systems/model.ts` rostered units, `systems/spawning.ts`): starting morale, suppression resistance, accuracy, cohesion, ammunition, speed, from the catalog's "Values" columns as first numbers; verify with the "Armies fight differently" test and a determinism test of a three-army battle (two runs, same hashes)
- [ ] 3.2 The command aura reaches only sections of the commander's own army; "Chefe e capangas" gives it to the Patriotic Battalions; verify with a simulation test of a legalist officer beside a jagunço section (no aura) and a chief beside one (aura)
- [ ] 3.3 The enemy commander with a mixed force (it plans by section; check `enemy-commander.ts` and `enemy-deployment.ts` for anything that assumes one army); verify with `pnpm battle:report` on a mixed preset ending with an outcome inside the report's bands
- [ ] 3.4 Re-record the determinism goldens with a reason and review the battle-report bands for the three pairings (column against regulars, against patriotic battalions, against a mix); verify: `pnpm check:determinism`, `pnpm test`, and the new values noted in `docs/status.md`

## 4. Maps, roster and editor

- [ ] 4.1 Map document version 6: enemy presets are migrated through the successor table on load (a section id names its army, so no new field is stored); `tools/check-maps.ts` reports a preset section that is not of an enemy army; `campo-de-provas` and `paiolzinho` change by the migration only; `tools/make-test-map.ts`, `tools/battle-report.ts`, `tools/check-determinism.ts` and `tools/sim-bench.ts` updated to the new ids; verify with unit tests of the migration and the check, and `pnpm check:maps`
- [ ] 4.2 The editor's enemy presets (`apps/game/src/editor/EnemyForces.tsx`): types grouped by army, a preset may mix the two enemy armies, the preset shows the armies it holds; verify with an editor e2e that saves and reloads a mixed preset (`tests/e2e/editor.spec.ts`)
- [ ] 4.3 Setup screen (`ui/menu/RosterBuilder.tsx`, `SkirmishSetup.tsx`, `setupState.ts`): the player's roster lists the column's types; a built enemy roster is of one chosen enemy army; presets show their armies; the default roster is three Fogões; the stored setup (`prestes.roster.v1`) migrates through the successor table and says so once; verify with `tests/hud/setup-state.test.ts` (migration, the two new scenarios) and `tests/e2e/skirmish-setup.spec.ts`
- [ ] 4.4 Section cards and the troop summary show the section's new name and its army; verify with the HUD e2e

## 5. Gates

- [ ] 5.1 `pnpm verify` and `openspec validate faction-armies --type change --strict`; verify: all pass, bundle sizes and goldens in `docs/status.md`; `docs/handoff.md` updated
- [ ] 5.2 Hand check by the owner: a skirmish against the regulars, against the Patriotic Battalions with cangaceiros, and against a mix; findings in `docs/status.md`
