## 1. Inventory and budgets

- [ ] 1.1 List every Refloreste species with its adult, flowering and dead models, real height range and biome, and the candidate caatinga plants; verify: the owner confirms the list (species, forms, caatinga plants), recorded in `docs/status.md`
- [ ] 1.2 Size classes and triangle budgets measured from the five trees already adapted; the build fails over budget; verify with a build test on a fixture over budget

## 2. Adaptation

- [ ] 2.1 `target_trees.py`: one table row per species with its family (broadleaf, palm, tiered conifer, giant), the tier crown method, and the araucária rebuilt with it; verify: the review sheet shows the araucária's candelabra and the owner closes the open point
- [ ] 2.2 Atlantic forest species adapted and exported; verify on the review sheet and by the budget check
- [ ] 2.3 Cerrado species adapted and exported; verify as 2.2
- [ ] 2.4 Amazon species adapted and exported; verify as 2.2
- [ ] 2.5 Stumps, dead trees and the flowering forms chosen in 1.1; verify as 2.2
- [ ] 2.6 Bush families per biome, three sizes and two shapes each; verify on the review sheet
- [ ] 2.7 Caatinga cacti, thorn plants, trees and shrubs in `target_vegetation.py`; verify on the review sheet and by the budget check

## 3. Catalog and battle data

- [ ] 3.1 Catalog entries for every species: footprint, sight, concealment radius or height class, biome; old ids kept as aliases mapped on load; verify with unit tests of the aliases and that `campo-de-provas` and `paiolzinho` load unchanged with their goldens
- [ ] 3.2 Bush concealment by height class and the thorn patches' movement factor; verify with simulation tests of the bush and thorn scenarios
- [ ] 3.3 Names in EN and PT-BR for every species and bush; the content check for model, names and biome; verify with `pnpm check:locales`, `pnpm check:content`

## 4. View and editor

- [ ] 4.1 Models split per biome and loaded by the map's species; strategic-band impostors; verify with a view test that a caatinga map does not request the Atlantic forest file, and the wooded-map performance e2e
- [ ] 4.2 Biome mixes, the Amazon edge, and the trees tool's list grouped by biome with thumbnails; verify with unit tests of the mixes and the determinism of a stroke, and an editor e2e that scatters a cerrado stroke

## 5. Gates

- [ ] 5.1 `docs/assets.md`: every species with its source (Refloreste, the owner's work, or original) and licence; verify: the register check passes
- [ ] 5.2 `pnpm verify` and `openspec validate biome-trees-and-plants --type change --strict`; verify: all pass, model sizes in `docs/status.md`
- [ ] 5.3 Hand check by the owner in the editor and in a skirmish on a wooded map; findings in `docs/status.md`
