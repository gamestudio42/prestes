## 0. Before starting

- [x] 0.1 Read `docs/handoff.md`, then this change's proposal, design and spec. Prerequisites: Blender for `art-src/blender/target_buildings.py`; the present buildings' openings must not move (goldens), so run `pnpm check:determinism` first as the baseline; verify: the baseline hashes are noted under this task
  - Baseline 2026-11-12: seed 1922 `0ae3084b`; campo-de-provas 3v3 `94b68f47`; paiolzinho 3v3 `06d97225`; mixed-roster `60476373`. Blender 5.2 present.

## 1. Choices

- [x] 1.1 Candidate list of new buildings (rural, town, military), each with a source or "generic period type"; of rock kinds with the regions they stand for; of waterside, farm, town and camp objects (the tractor and the camp objects with a source or "generic period type"); and of new fences and walls; verify: the owner approves the lists, recorded in `docs/status.md`
- [x] 1.2 Review sheet of the seventeen present buildings as drawn today, with the features each should gain; verify: the owner marks the sheet

## 2. Openings as one source

- [x] 2.1 `tools/export-openings.ts`: doors, windows, upper floors and towers of every catalog building to JSON for the art build; verify with a unit test against `openings.ts` for three buildings
- [x] 2.2 Explicit openings in shared data for buildings that declare them, beside the rule; verify with unit tests that a declared building's positions come from its declaration and the present buildings' positions are unchanged
- [x] 2.3 The model check: every exported building's opening markers and wall lines against the shared data (0.2 m), failing with the building and wall; verify with fixtures for a missing window, an extra door and a wall off its footprint

## 3. Buildings

- [x] 3.1 The roof and feature library in `buildings_kit.py` (gable, hip, lean-to, thatch, zinc; veranda, tower, chimney, plinth, frames); verify on the review sheet
- [x] 3.2 Rural buildings remodelled (farmhouse, barn, chapel, casa-sede, colonist-house, engenho, ferry-house); verify with the model check and the review sheet
- [x] 3.3 Town buildings remodelled (terraced-house, terraced-house-wide, sobrado, casa-terrea, venda, armazem, coreto, church, factory, warehouse); verify as 3.2
- [x] 3.4 The approved new buildings: builder, catalog row, openings, capacity, names in EN and PT-BR; verify with the model check, `pnpm check:content`, and a simulation test that a section enters, mans and is assaulted in one new building of each group
- [x] 3.5 Variants: atlas regions, the map document's `variant` (a new version that loads the older ones), the editor's picker; verify with the two-looks determinism test and a loader test of an older map
- [x] 3.6 The coded box buildings are removed and placement moves to `structures-layer.ts`; verify: `pnpm test`, the battle-map e2e and unchanged goldens

## 4. Stone

- [x] 4.1 Rock kind builders and palettes, three sizes each, as a kind axis on the present stone ids; verify on the review sheet and with a unit test that cover and sight depend on size only
- [x] 4.2 Built stone: the dry stone wall line by rock kind, the corral, steps and retaining wall; verify with a view test of the wall on a slope and a simulation test of cover along it
- [ ] 4.3 Names in EN and PT-BR, editor list grouped by kind with thumbnails; verify with `pnpm check:locales` and an editor e2e

## 5. Objects, fences and walls

- [ ] 5.1 The approved waterside, farm and town objects: builders in the props target, catalog rows with footprint, height and cover class (D9), the `water` group and its placement on water and banks; verify with the review sheet, a unit test that a boat in water leaves passability and cover unchanged, and a simulation test of cover behind a canoe on a bank
- [ ] 5.2 The Column's camp and train: tents (with the kit's aid tent), carts, pack saddles, barrels, ammunition boxes, campfire, rifle stack, saddle rail, horse line and the abandoned 75 mm gun as approved, the `camp` group and the per-side variants (D11); verify with the review sheet and the variant determinism test
- [ ] 5.3 The approved fences and walls as appended `LINE_KINDS` (D10); verify with a view test of each on a slope, a simulation test of a fence's and a wall's cover, and a loader test of an older map's lines
- [ ] 5.4 Names in EN and PT-BR and thumbnails for every new object and line; verify with `pnpm check:locales`, `pnpm check:content` and an editor e2e placing one object of each group and drawing one new line

## 6. Gates

- [ ] 6.1 Models split by group and loaded by what the map uses; strategic-band meshes; verify with the sixty-building performance e2e
- [ ] 6.2 `docs/assets.md`: every building, stone, object and line with source and licence; verify: the register check passes
- [ ] 6.3 `pnpm verify` and `openspec validate revise-buildings-and-stone --type change --strict`; verify: all pass, model sizes in `docs/status.md`
- [ ] 6.4 Hand check by the owner: the two authored maps before and after, a town and a river camp built in the editor; findings in `docs/status.md`
