## 0. Prerequisites

- [ ] 0.1 Archive `add-battle-maps` (its open items: kits and hand check stay tracked in `docs/maps/REVIEW.md`) so `battle-maps` is a durable capability (verify: `openspec validate --specs`)

## 1. Review tooling and record

- [ ] 1.1 `tools/map-review.ts`: flood fill reachability, crossing probes, sight matrix, cover density, crop-edge probes, props check; prints a per-map table (verify: runs on all four maps; output pasted into `docs/maps/REVIEW.md`)
- [ ] 1.2 `docs/maps/REVIEW.md`: per-map findings with status (fix / keep / log), seeded with the known items from `design.md` (verify: every item has a status and an owner task)
- [ ] 1.3 Battle report per map in the test suite: Fazenda, Serra e Rio and Bairro on seeds 1922, 7, 42, bands from the spec (verify: tests exist and fail today on Serra e Rio and Bairro, as expected)

## 2. Battles end

- [ ] 2.1 Search: `searchAreas(side)` from knowledge, sweep rule, ordering, swept marking; maps gain `yards` polygons (Bairro quintais) (verify: tests "search the cane" and "no cheating")
- [ ] 2.2 Decided battle: broken side at < 20 % with 60 s without contact falls back to its edge; `side_fell_back` event; end panel counts routed men (verify: test "last survivors fall back"; e2e end panel shows routed count)
- [ ] 2.3 Battle report bands pass on all three maps and three seeds (verify: 1.3's tests pass; goldens re-recorded with the reason)

## 3. Performance

- [ ] 3.1 Cover slots cached by the covers key and indexed by cell; slot lookups by map (verify: bench Bairro; unit tests of slots unchanged)
- [ ] 3.2 Static sight blockers per cell for battle maps (verify: sight tests unchanged; bench)
- [ ] 3.3 Budget test: every battle map under 3 ms a tick (mean of two runs) in `pnpm bench` and a CI-style check (verify: bench numbers recorded in `design.md` Apply findings)

## 4. Review fixes (data)

- [ ] 4.1 Fazenda fixes from `REVIEW.md` (verify: map review tool shows the items closed; content check; golden re-recorded)
- [ ] 4.2 Serra e Rio fixes from `REVIEW.md` (verify: as 4.1)
- [ ] 4.3 Bairro fixes from `REVIEW.md`, including no fully closed quintal unless intended (verify: as 4.1; flood fill lists no unintended closed yard)

## 5. Look

- [ ] 5.1 Plastered walls and board or wire fences on battle maps (`fenceStyle` per map) (verify: screenshot review on Bairro and Fazenda at tactical zoom; test that stone blocks are not drawn for battle-map walls)
- [ ] 5.2 Houses, vendas, sobrados, matriz and coreto placeholders with doors, windows, awnings, tower and roof; no text on signs (verify: screenshot review; asset register updated)
- [ ] 5.3 Fazenda trench bays dug in: 1 m detail heightfield patch under the lines and `cut` shapes (verify: test that a soldier in a bay stands > 0.8 m below the parapet ground; screenshot)
- [ ] 5.4 Riverbanks: gravel strips and reed clumps; ford drawn lighter with ripples; ferry raft marker and waiting icon in the HUD (verify: screenshot review on Serra e Rio; e2e reads the ferry state in the HUD)

## 5b. Fazenda feedback (2026-11-05)

- [ ] 5.5 Road ditches: `ditch` strips in map data (side, depth 0.8, width 1.5) baked as `channel` shapes and as trench-like covers with slots; Fazenda main road both sides, branch roads one side; speed along the floor (verify: tests "cover in the ditch" and "slots along the ditch"; golden re-recorded)
- [ ] 5.6 Roads drawn as rutted earth following the heightfield: two wheel ruts, grass crown, cambered verges; no floating ribbons (verify: screenshot review on Fazenda at tactical zoom)
- [ ] 5.7 Cover clutter per map: field walls (stone, taipa), hedgerows, bamboo, woodpiles, carts, haystacks, trough, termite mounds, logs (Fazenda); gullies, fallen trees, more outcrops (Serra e Rio); carts, barrels, sacks, tram stop (Bairro); as covers with slots or fences (verify: map review tool reports no axis gap over 60 m; test "Fazenda is no longer open")
- [ ] 5.8 Crops and grass: corn rows with leaves and tassels aligned to the field, cane stalks, capim blade clumps, scrub bushes, headland paths and soil colour, gentle sway in the vertex shader; instanced; frame budget kept (verify: test "corn in rows" via a view unit test of the row orientation; screenshot review; 30 fps at strategic zoom)

## 5c. Serra e Rio feedback (2026-11-05)

- [ ] 5.9 Terrain shading: smooth normals on the heightfield mesh, toon ramp with soft slope steps, sun angle tuned per map palette; no banding on the hill masses (verify: screenshot review of both hill masses at tactical and strategic zoom)
- [ ] 5.10 Ford look: gravel bar mesh, stone props, lighter shallow-water material with ripple animation, a clear edge against deep water (verify: test "ford reads as a ford" via a view unit test of the ford material colour against deep water; screenshot review)
- [ ] 5.11 Capim along the riverbanks and veredas in Serra e Rio data (most within 30 m of the banks), buriti with it; concealment tests re-checked (verify: test "grass by the river"; map scenario tests pass; golden re-recorded)
- [ ] 5.12 Capim drawn as blade cards (crossed thin quads with a blade texture from the pixel atlas, 8-14 blades per clump) in dense clusters; the massed look at strategic zoom kept (verify: test "capim as blades"; screenshot review at both zooms)

## 5d. Concealment fix (bug 2026-11-05)

- [ ] 5.13 Reveal radius: firing from concealment reveals only to observers within 50 m; farther observers get the unseen-fire marker (verify: tests "long-range shot from the capim" and "close shot gives him away"; the Serra e Rio reproduction of men in the capim by the bridge stays hidden at 117 m)
- [ ] 5.14 Concealed sections default to fire on contact (60 m) unless the player set their fire control; "Revelado" in ring and HUD (verify: test "concealed section holds its fire"; e2e sees "Revelado" after a close shot; locale check)

## 6. Start view and previews

- [ ] 6.1 Camera opens at tactical span on squad 1; Home frames the map (verify: e2e "camera on the sections" via the scene bridge; e2e "frame the map")
- [ ] 6.2 Deployment marks for 10 s with PT-BR and EN labels (verify: e2e sees the marks then their fade; locale check)
- [ ] 6.3 `tools/map-previews.ts` and `pnpm maps:previews`; images in `apps/game/public/maps/`; skirmish page shows them; content check requires one per map (verify: previews committed; e2e sees four images; asset register entry)

## 7. Close

- [ ] 7.1 Gates: `pnpm verify`, `pnpm e2e`, `openspec validate refine-battle-maps --type change --strict` (verify: all pass)
- [ ] 7.2 Hand check by the user: one battle on each map, with `REVIEW.md` open; findings recorded and closed or logged
