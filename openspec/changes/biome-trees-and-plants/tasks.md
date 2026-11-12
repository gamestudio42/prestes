## 0. Before starting

- [x] 0.1 Read `docs/handoff.md`, then this change's proposal, design and spec. Prerequisites: the Refloreste project on disk at `C:/projetos/Refloreste` (or `REFLORESTE` set) and Blender for `art-src/blender/target_trees.py`; never paint in the editor inside the shared preview pane (its autosave overwrites the owner's maps); verify: the tree target reproduces the present five trees before any change
  - Done 2026-11-12: Blender 5.2 rebuilds `trees.glb` byte-identical (bush 160, cerrado tree 506, buriti 663, broadleaf 689, araucária 766 triangles).

## 1. Inventory and budgets

- [x] 1.1 List every Refloreste species with its adult, flowering and dead models, real height range and biome, and the candidate caatinga plants; verify: the owner confirms the list (species, forms, caatinga plants), recorded in `docs/status.md`
  - Done 2026-11-12: the owner left the fit to Claude; list and heights in `docs/status.md`, inventory in `docs/review/biome-trees/species-inventory.md`.
- [x] 1.2 Size classes and triangle budgets measured from the five trees already adapted; the build fails over budget; verify with a build test on a fixture over budget
  - Done 2026-11-12: `tools/tree-budgets.ts` (bush under 2 m 300, small tree under 6 m 600, tree to 15 m 800, giant 1200); `pnpm models` fails naming the species and count; `tests/tools/tree-budgets.test.ts`.

## 2. Adaptation

- [x] 2.1 `target_trees.py`: one table row per species with its family (broadleaf, palm, tiered conifer, giant), the tier crown method, and the araucária rebuilt with it; verify: the review sheet shows the araucária's candelabra and the owner closes the open point
  - Done 2026-11-12: families in the table; the tiered crown cuts the low branches, bends the rest upward and sets flat tufts at the tips; araucária 714 triangles; sheet `docs/review/biome-trees/araucaria-2.1.png`; the owner approved it, closing the 2026-11-09 open point.
- [x] 2.2 Atlantic forest species adapted and exported; verify on the review sheet and by the budget check
  - Done 2026-11-12: seven species in `trees-mata-atlantica.glb` (389-1080 triangles); sheet `docs/review/biome-trees/mata-atlantica-2.2-2.4.png`.
- [x] 2.3 Cerrado species adapted and exported; verify as 2.2
  - Done 2026-11-12: six species in `trees-cerrado.glb` (541-729 triangles); sheet `docs/review/biome-trees/cerrado-2.2-2.4.png`.
- [x] 2.4 Amazon species adapted and exported; verify as 2.2
  - Done 2026-11-12: six species in `trees-amazonia.glb` (562-1092 triangles; palms collapsed to fit); sheet `docs/review/biome-trees/amazonia-2.2-2.4.png`.
- [x] 2.4b Heights cut to battle scale, no tree over 9 m (owner, 2026-11-12: no giant trees, then lower); the species already in maps are the legacy ids, lowered too (araucária 9, peroba 6, pequi 4.5, buriti 8 m), not new rows; verify: the build and the review sheets, and the content check fails a tree over 9 m
  - Done 2026-11-12: every tree at 9 m or under (a first cut to 14 m was still too tall); the araucária, peroba, pequi and buriti adults are the legacy ids, lowered in the catalog too; the model check fails a tree over 9 m; sheet `docs/review/biome-trees/battle-scale-9m.png`.
- [x] 2.5 Stumps, dead trees and the flowering forms chosen in 1.1; verify as 2.2
  - Done 2026-11-12 (Sonnet subagent, reviewed): a dead form for each of the 19 species, a stump per biome, flowering ipê-amarelo, mulungu, manacá and pau-brasil; on the same sheet.
- [x] 2.6 Bush families per biome, three sizes and two shapes each; verify on the review sheet
  - Done 2026-11-12 (Sonnet subagent, reviewed): `bush-<biome>-<knee|waist|head>-<a|b>` in each Refloreste biome's file (100-200 triangles); the caatinga's marmeleiro family in `trees-caatinga.glb` (2.7); sheet `docs/review/biome-trees/bushes-2.6.png`.
- [x] 2.7 Caatinga cacti, thorn plants, trees and shrubs in `target_vegetation.py`; verify on the review sheet and by the budget check
  - Done 2026-11-12: `art-src/blender/target_caatinga.py` (design D5), `trees-caatinga.glb`: mandacaru, facheiro, xique-xique, coroa-de-frade, palmatória, macambira, juazeiro, umbuzeiro, catingueira, jurema-preta and the marmeleiro bushes (32-420 triangles); sheet `docs/review/biome-trees/caatinga-2.7.png`.

## 3. Catalog and battle data

- [ ] 3.1 Catalog entries for every species: footprint, sight, concealment radius or height class, biome; old ids kept as aliases mapped on load; verify with unit tests of the aliases and that `campo-de-provas` and `paiolzinho` load unchanged with their goldens
- [ ] 3.2 Bush concealment by height class and the thorn patches' movement factor; verify with simulation tests of the bush and thorn scenarios
- [ ] 3.3 Names in EN and PT-BR for every species and bush; the content check for model, names and biome; verify with `pnpm check:locales`, `pnpm check:content`

## 4. View and editor

- [ ] 4.1 Models split per biome and loaded by the map's species; strategic-band impostors; verify with a view test that a caatinga map does not request the Atlantic forest file, and the wooded-map performance e2e
- [ ] 4.1b Soldiers stay visible under trees: crowns over or hiding the player's own soldiers turn see-through (trunks solid), a soldier still hidden shows his outline, enemies are not revealed; verify with a view test of which crowns fade, a Playwright check that a soldier in a wood can be clicked, and the wooded-map performance e2e
- [ ] 4.2 Biome mixes, the Amazon edge, and the trees tool's list grouped by biome with thumbnails; verify with unit tests of the mixes and the determinism of a stroke, and an editor e2e that scatters a cerrado stroke

## 5. Gates

- [ ] 5.1 `docs/assets.md`: every species with its source (Refloreste, the owner's work, or original) and licence; verify: the register check passes
- [ ] 5.2 `pnpm verify` and `openspec validate biome-trees-and-plants --type change --strict`; verify: all pass, model sizes in `docs/status.md`
- [ ] 5.3 Hand check by the owner in the editor and in a skirmish on a wooded map; findings in `docs/status.md`
