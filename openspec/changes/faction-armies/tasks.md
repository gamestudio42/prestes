## 1. Research and the catalog

- [ ] 1.1 Read Macaulay for the government's forces and the column's organisation, phase by phase; write `docs/history/FORCES.md` (force, period name, phase and region, arms, source key and page, confidence) and register any new source in `SOURCES.md`; verify: every row has a source key and a page or chapter, and `pnpm check:content` passes
- [ ] 1.2 Answer in `FORCES.md` whether and where the state police forces fought on the government's side and on the rebels', with pages; move what stays unconfirmed to `docs/campaign/open-questions.md`; verify: the owner's question of 2026-11-11 has a sourced answer or an open question, not a guess
- [ ] 1.3 Propose the catalog: a table of section types per army (name, men, weapons, values, sourced or game organization) and the reviewed names of the present types; verify: the owner approves the table, and the approval is recorded in `docs/status.md`
- [ ] 1.4 Write the `force-roster` deltas ("Section types", "Skirmish setup screen") from the approved table with the `openspec-update-change` workflow; verify: `openspec validate faction-armies --type change --strict`

## 2. Data

- [ ] 2.1 `ArmyId`, the army registry (name and description keys, side, uniform set, values) and `army` on units and in the frame; verify with unit tests of the registry and a frame carrying each army
- [ ] 2.2 Section types per army from the approved table, one army per type; roster validation refuses a foreign type; verify with unit tests of both scenarios of "Sections by army"
- [ ] 2.3 Names and descriptions in EN and PT-BR, compendium notes per army with sources or the game-organization label; the naming check in `tools/check-content.ts`; verify with a unit test of an unrecorded name and `pnpm check:content`, `pnpm check:locales`

## 3. Simulation

- [ ] 3.1 The simulation reads army values (morale, suppression resistance, accuracy, ammunition, speed); verify with the "Armies fight differently" test and a determinism test of a three-army battle
- [ ] 3.2 The enemy commander handles a mixed force (it already works by section); verify with a battle report of a mixed preset that ends with an outcome inside the report's bands
- [ ] 3.3 Re-record the determinism goldens and review the battle-report bands per army pairing; verify: `pnpm check:determinism`, `pnpm test`

## 4. Maps, roster and editor

- [ ] 4.1 Map document version with an army per enemy preset section; older documents load as legalist regulars; `pnpm check:maps` reports unknown armies and foreign types; verify with unit tests of the loader and the check, and the two authored maps still pass
- [ ] 4.2 The editor's enemy preset panel picks the army of each section; verify with an editor e2e that saves and reloads a mixed preset
- [ ] 4.3 Roster builder and setup screen list the chosen army's types; stored rosters migrate; verify with an e2e that builds a Column roster and a unit test of the migration

## 5. Gates

- [ ] 5.1 `pnpm verify` and `openspec validate faction-armies --type change --strict`; verify: all pass, results in `docs/status.md`
- [ ] 5.2 Hand check by the owner: a skirmish against each enemy army and against a mix; findings in `docs/status.md`
