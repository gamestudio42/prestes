# Refloreste species inventory (task 1.1)

Sources: `C:\projetos\Refloreste\assets\vegetacao\<biome>\<species>\`, each model's `preview/<file>.md` (altura_m, tris LOD0, archetype) and `.opencode/skill/blender-lowpoly-trees/reference/species-catalog.md` (design height range, flower colour). 19 species + 3 bushes + 3 stumps. Every species has exactly three .glb (and .blend) forms; no `muda` (young) .glb on disk, only `_<sp>_muda.png` review images at the Refloreste root (growth stage, out of scope).

File pattern: `assets/vegetacao/<biome>/<sp>/<biome>_<sp>_{adulta,adulta_florida,morta}.glb`. Biome folder ids: `mata_atlantica`, `cerrado`, `amazonia`. Bushes: `<biome>/bush/<biome>_bush_{adulta,morta}.glb`; stumps: `<biome>/stump/<biome>_stump_adulta.glb`.
Review sheets are at the Refloreste root as `_<abbr>_ficha*.png` (abbr: acai, and, ara, aro, bar, bur, cag, cast, ery, ipe, jeq, juc, manaca, pb, peq, per, ser, sum, tuc).

Height columns: "model" = altura_m of the adulta .glb (Refloreste preview md); "range" = Refloreste's design adult range (species-catalog.md); "real" = general knowledge (GK). Several models exceed their design range (castanheira 43 vs 20-30, ipe 15 vs 6-12, andiroba 27 vs 15-25), so catalog heights should come from a stated range, not the model.

| Species id | PT-BR / scientific (GK; not in Refloreste) | Forms on disk | Model h (m) | Refloreste range (m) | Real adult (GK, m) | Biome | Family for target_trees.py | In Prestes now |
|---|---|---|---|---|---|---|---|---|
| araucaria | Araucaria / Araucaria angustifolia | adulta, florida, morta | 33.9 | 20-35 | 20-35 | Atlantic forest (south) | tiered conifer (`cone_layers`) | yes: `tree-araucaria`, 14 m |
| erythrina | Mulungu / Erythrina verna or speciosa (uncertain) | adulta, florida, morta | 12.4 | 8-18 | 8-18 | Atlantic forest | broadleaf (ornamental) | no |
| jequitiba | Jequitiba / Cariniana legalis | adulta, florida, morta | 34.4 | 25-40 | 30-50 | Atlantic forest | giant | no |
| manaca | Manaca-da-serra / Pleroma mutabile (uncertain; could be Brunfelsia) | adulta, florida, morta | 6.3 | 4-10 | 4-12 | Atlantic forest | broadleaf, small tree | no |
| palmito_jucara | Palmito-jucara / Euterpe edulis | adulta, florida, morta | 9.5 | 8-15 | 8-20 | Atlantic forest | palm | no |
| pau_brasil | Pau-brasil / Paubrasilia echinata | adulta, florida, morta | 19.1 | 10-20 | 10-30 | Atlantic forest (coast) | broadleaf | no |
| peroba | Peroba-rosa / Aspidosperma polyneuron | adulta, florida, morta | 29.1 | 20-30 | 20-40 | Atlantic forest | broadleaf (sphere) | yes: `tree-broad`, 8 m |
| aroeira | Aroeira / Myracrodruon urundeuva (uncertain; or Schinus) | adulta, florida, morta | 6.7 | 5-10 | 6-14 | Cerrado (also caatinga) | broadleaf (sparse) | no |
| barbatimao | Barbatimao / Stryphnodendron adstringens | adulta, florida, morta | 4.4 | 2-5 | 3-8 | Cerrado | broadleaf, small tree (twisted) | no |
| buriti | Buriti / Mauritia flexuosa | adulta, florida, morta | 16.4 | 12-20 | 20-35 | Cerrado (veredas) | palm | yes: `buriti`, 12 m |
| cagaita | Cagaita / Eugenia dysenterica | adulta, florida, morta | 4.5 | 4-8 | 4-10 | Cerrado | broadleaf, small tree | no |
| ipe | Ipe-amarelo / Handroanthus (Tabebuia) | adulta, florida, morta | 15.2 | 6-12 | 8-30 | Cerrado | broadleaf (ornamental); florida form is a landmark | no |
| pequi | Pequi / Caryocar brasiliense | adulta, florida, morta | 7.8 | 5-10 | 6-10 | Cerrado | broadleaf, small tree (twisted) | yes: `cerrado-tree`, 6 m |
| acai | Acai / Euterpe oleracea | adulta, florida, morta | 15.3 | 10-20 | 10-25 | Amazon | palm (clumping) | no |
| andiroba | Andiroba / Carapa guianensis | adulta, florida, morta | 27.1 | 15-25 | 25-35 | Amazon | broadleaf / giant | no |
| castanheira | Castanheira-do-para / Bertholletia excelsa | adulta, florida, morta | 43.3 | 20-30 | 30-50 | Amazon | giant | no |
| seringueira | Seringueira / Hevea brasiliensis | adulta, florida, morta | 20.9 | 15-25 | 20-40 | Amazon | broadleaf (sparse) | no |
| sumauma | Sumauma / Ceiba pentandra | adulta, florida, morta | 27.1 | 25-35 | 40-60 | Amazon | giant (buttressed, umbrella) | no |
| tucuma | Tucuma / Astrocaryum aculeatum | adulta, florida, morta | 13.9 | 8-15 | 10-20 | Amazon | palm (spiny) | no |
| bush x3 | Arbusto / moita | adulta, morta (no florida) | MA 0.90, cerrado 1.11, Amazon 0.92 | 0.4-1.6 | n/a | one per biome | bush | cerrado bush only: `bush`, 1.3 m, 160 tris |
| stump x3 | Toco | adulta only | 0.60 | 0.3-1.0 | n/a | one per biome | prop | no |

Biome counts: Atlantic forest 7, cerrado 6, Amazon 6 (19 trees). Scientific names are general knowledge only; Refloreste's docs carry slug, common name and archetype.

Refloreste LOD0 triangle counts (adulta): 120 (bushes), 365 barbatimao, 560 tucuma, 679 pequi, 767 palmito, 854 buriti, 897 cagaita, 1878-1947 seringueira/aroeira/ipe/manaca/erythrina/pau-brasil, 2481-3482 castanheira/andiroba/peroba, 3488 acai, 4012 jequitiba, 4591 araucaria, 4846 sumauma. Dead forms: 8 (palms) to 259.

## How target_trees.py adapts the five today

`TREES` table; trunk from a low LOD (1; buriti 0), foliage LOD 0 (buriti 1). Species with `cards=True` get a crown rebuilt as k-means icospheres (subdivisions 0) over the leaf cards, coloured leaf x baked shade, flattened; the buriti keeps its real fronds (`cards=False`). Scaled to the catalog height, foot on the origin.

| Catalog id | Source | Clumps | Leaf | Flat | Height (m) | Triangles in trees.glb |
|---|---|---|---|---|---|---|
| tree-broad | peroba | 26 | green | 0.8 | 8 | 689 |
| tree-araucaria | araucaria | 28 | dark green | 0.55 | 14 | 766 |
| buriti | buriti | real fronds | green | 1.0 | 12 | 663 |
| cerrado-tree | pequi | 18 | green | 0.8 | 6 | 506 |
| bush | cerrado/bush | 8 | green | 0.75 | 1.3 (width 2.6) | 160 |

Counted from the index accessors of `apps/game/public/models/trees.glb` (334,652 bytes; docs say 328 KB). The older `vegetation.glb` holds tree-broad 120, tree-araucaria 120, tree-pine 60 (legacy boxes, tree-pine still in use as `tree-pine`).

Note: juazeiro, mandacaru, xique-xique and macambira have catalog entries (`packages/shared/src/maps/catalog-objects.ts` lines 102-105) but NO builder in `art-src/blender` (`target_vegetation.py` has only trees, hedge, fence; no other script mentions them). `docs/assets.md` calls them "own models or named placeholders". Design D5 ("like the present mandacaru...") is therefore inaccurate: those builders must be written, not extended.

## Candidate caatinga plants (Refloreste has no caatinga)

Refloreste partial matches: aroeira (grows in caatinga as well as cerrado; its cerrado model could double as caatinga "aroeira-do-sertao") and barbatimao (cerrado/caatinga transition). Everything else below must be modelled in `target_vegetation.py`. Heights are general knowledge.

| # | Plant | Type | Real height (m) | In catalog now | Note |
|---|---|---|---|---|---|
| 1 | Mandacaru (Cereus jamacaru) | tall columnar cactus | 3-6 | yes (placeholder) | the sertao icon; build first |
| 2 | Facheiro (Pilosocereus pachycladus) | tall columnar cactus, blue-grey | 3-8 | no | in the proposal |
| 3 | Xique-xique (Pilosocereus gounellei) | low sprawling clump | 0.5-2 | yes (placeholder) | conceals prone |
| 4 | Coroa-de-frade (Melocactus) | ground globe, red cap | 0.2-0.8 | no | in the proposal; ground cover |
| 5 | Palmatoria / palma-forrageira (Opuntia, Nopalea) | pad cactus | 1-3 | no | in the proposal; typical of the period (forage) |
| 6 | Macambira (Bromelia laciniosa) | spiny ground rosette | 0.5-1 | yes (placeholder) | thorn patch that slows (D8) |
| 7 | Quipa (Tacinga inamoena) | thin branching cactus | 0.5-2 | no | in the proposal; optional |
| 8 | Juazeiro (Ziziphus joazeiro) | evergreen shade tree | 5-10 | yes (placeholder) | stays green in drought; landmark |
| 9 | Umbuzeiro (Spondias tuberosa) | wide round-crowned tree | 4-9 | no | famous sertao tree |
| 10 | Catingueira (Cenostigma pyramidale) | scrub tree, grey in dry season | 4-8 | no | very common caatinga tree |
| 11 | Jurema-preta (Mimosa tenuiflora) | thorny scrub tree | 3-5 | no | thorn scrub; alternative: marmeleiro (Croton, dense shrub 1.5-3 m) |
| 12 | Umburana-de-cheiro (Amburana cearensis) | peeling-trunk tree | 6-10 | no | optional |

Suggested set of 9 for the spec (at least six cactus/thorn plants, at least three trees/shrubs beside juazeiro): cactus and thorn: mandacaru, facheiro, xique-xique, coroa-de-frade, palmatoria, macambira (6; quipa as a 7th if wanted); trees and shrubs: umbuzeiro, catingueira, jurema-preta (3) beside the juazeiro. I did not read `docs/history/TIMELINE.md`, so the Column's exact route through each state is not checked; these are general caatinga icons of the northeast interior.

## Observations

- Catalog heights need a decision per species (model vs range vs real); several Refloreste models run over their own range.
- Refloreste has one bush per biome and no sizes, so the three-sizes-by-two-shapes family (D6) is all new work from three source bushes.
- Dead forms are cheap (8-259 tris); florida forms are costlier for palms (acai 5,328, buriti 3,054).
