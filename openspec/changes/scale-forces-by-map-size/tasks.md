## 0. Before starting

- [x] 0.1 Read this change's proposal, design and specs.
  - Check `git status` for other sessions' edits to `sections.ts`, `deploy-roster.ts`, `setupState.ts` and the campaign maps before touching them.
  - Keep the game muted (`prestes.audio.v1`) in the preview pane.
  - Commit with explicit paths (`git commit -- <paths>`).
  - Verify: `pnpm check` passes before any change.

## 1. Limits by map size

- [x] 1.1 Add the force-limit table by size (design D1, D2) and make `validateRoster` / `canAdd` take `{ size, army }`, with small as the default.
  - Verify with unit tests in `packages/shared/test/sections.test.ts`:
    - 44 men are refused for small and accepted for medium;
    - a second machine gun is accepted on medium and a third is refused;
    - a second command section is refused on every size;
    - existing small-map refusals keep their values (`max: 33`).
- [x] 1.2 Pass the map size at every call site: setup state, worker host, `validate-document.ts` (column force), `validateMapRosters` (presets), `columnSectionCount`.
  - Verify:
    - `pnpm typecheck` passes;
    - a unit test shows the worker host refusing a 44-man roster on a small map and accepting it on a medium one;
    - `deploy-roster.test.ts` refuses a 44-man preset on a small fixture map and accepts it on a medium one.

## 2. Deployment of up to sixteen sections

- [x] 2.1 Add places 7–16 to `deploymentSlots` (D3), each inside the side's deployment area and on walkable ground, and drop the `ROSTER_MAX_SECTIONS` slice in `deployRoster` for the size's section limit.
  - Verify with unit tests:
    - six sections stand where they stood before (positions compared with a snapshot taken before the edit);
    - twelve sections on `campo-de-provas` have every man on walkable ground inside the column's area;
    - `pnpm check:content` passes for every authored map with the size's full count deployed.
- [x] 2.2 Squad ids by side (D4, as applied): the first six keep 1–6 and 11–16; then column 101+, legalist 151+; arrivals from 20.
  - The ids of rosters of up to six do not change, so no golden hash moves.
  - Verify:
    - `pnpm test` passes;
    - the default 3v3 report on seeds 1922, 7 and 42 has the same outcome and casualties as before the edit (written down from a run before it);
    - a unit test with twelve sections a side plus two arrivals finds 26 distinct squad ids.

## 3. Setup screen and editor

- [x] 3.1 The setup screen counts against the chosen map. Changing to a smaller map keeps the roster, shows the limit it breaks and disables "Combater". A saved roster is judged against its saved map.
  - Verify with e2e in `tests/e2e/skirmish-setup.spec.ts`:
    - the existing small-map tests still read 29/33 and 33/33;
    - on a medium map 41 men read "Homens 41/66" in PT-BR and "Men 41/66" in EN;
    - 50 men moved to a small map show the refusal and a disabled start button, which is enabled again after removing sections.
- [x] 3.2 The map properties dialog counts presets against the edited map's size, and a resize reports presets and the column force that no longer fit.
  - Verify with e2e in `tests/e2e/editor.spec.ts`:
    - the small-map 33-men refusal still holds;
    - five rifle sections on a medium map read 55 of 66;
    - resizing that map to small reports the preset and fails the map check.
- [x] 3.3 Section cards: past what the Troops window holds, the cards keep their size and scroll inside it (the owner's choice, 2026-11-17, instead of twelve fitting without scroll).
  - Verify with an e2e that starts a twelve-section roster on `campo-de-provas` at 1280 x 720: the window stays inside the screen and keeps its size, the last card is out of view until the wheel scrolls the window, and every card is attached.
  - The panel scrolled to its end is in `twelve-cards.png` in the change folder.

## 4. Cost of big forces

- [x] 4.1 Add a twelve-against-twelve case to `tools/sim-bench.ts` and a test of a mean under 8 ms over 3,000 ticks on `campo-de-provas`.
  - Add the vision spatial grid (D6) only if the bench misses the budget, and verify that the hashes are unchanged by it.
  - Verify: the bench test passes, and the measured mean is written into design.md.
- [x] 4.2 Movement preview with twelve sections: extend `tests/simulation/preview-cost.test.ts` with a twelve-section order.
  - Verify: it stays within the test's budget, or the budget for twelve is set from a measurement and recorded in design.md.

## 5. Campaign maps

- [x] 5.1 Record the battle report's baseline (the report already had `firstShot`, in seconds; `tools/campaign-length.ts` runs the maps) and run the five medium campaign maps on seeds 1922, 7 and 42 with today's forces.
  - Verify: the table of first shot, battle time, outcome and casualties is written into design.md.
- [ ] 5.2 São Luiz / Ramada (D5):
  - column force of 40–55 men under Prestes;
  - presets of 40–60;
  - a north-east entry point, with the earlier arrival routed through it;
  - a north-east legalist post in one preset;
  - timed arrivals from 180 s to 540 s.
  - Verify: `pnpm check:content` passes; the report on three seeds has the first shot within 120 s and a decided battle within 720 s; a muted run in the preview pane shows legalists in the north-east by 300 s (screenshot).
- [ ] 5.3 Catanduvas: the same force and timing bands.
  - Verify: `pnpm check:content` passes and the report on three seeds is within the bands.
- [ ] 5.4 Porto Mendes: the same force and timing bands.
  - Verify: `pnpm check:content` passes and the report on three seeds is within the bands.
- [ ] 5.5 Serra Nova: the same force and timing bands.
  - Verify: `pnpm check:content` passes and the report on three seeds is within the bands.
- [ ] 5.6 Pantanal: the same force and timing bands.
  - Verify: `pnpm check:content` passes and the report on three seeds is within the bands.
- [ ] 5.7 Content check rules:
  - medium campaign forces within the bands;
  - no empty quarter on a medium campaign map;
  - the small campaign maps unchanged.
  - Verify with unit tests: a São Luiz fixture with its column cut to 30 men fails naming the band; a fixture with its north-east emptied fails naming the quarter; Copacabana's sections equal a snapshot taken before this change.
- [ ] 5.8 The campaign battle length test (battle-lab "Campaign battle length report"): five maps by three seeds.
  - Verify: the test passes, and the bands and the measured figures are written into design.md.

## 6. Wrap-up

- [ ] 6.1 Update the main docs that state 33 men: `docs/status.md` and the field manual text, if it names the limit.
  - Verify: `rg "33 (men|homens)"` finds only small-map statements.
- [ ] 6.2 `pnpm check`, `pnpm test:e2e` and `openspec validate scale-forces-by-map-size` pass.
- [ ] 6.3 Hand check by the owner, muted:
  - a skirmish on a medium map with a twelve-section roster;
  - the São Luiz / Ramada chapter, played through;
  - confirm the maps no longer feel empty and the battles are shorter;
  - retune the bands in design.md if asked.
