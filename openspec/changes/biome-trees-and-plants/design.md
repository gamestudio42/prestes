## Context

See proposal.md. Observed:

- `art-src/blender/target_trees.py` reads Refloreste models from
  `REFLORESTE` (default `C:/projetos/Refloreste`), folder
  `assets/vegetacao/<biome>/<species>/<biome>_<species>_adulta.glb`, and
  adapts five entries through a `TREES` table (trunk and foliage level of
  detail, crown clumps by k-means over the leaf cards, leaf colour,
  flattening, height). It is not part of the default `pnpm art` run.
- Refloreste has `amazonia` (açaí, andiroba, castanheira, seringueira,
  sumaúma, tucumã), `cerrado` (aroeira, barbatimão, buriti, cagaita, ipê,
  pequi) and `mata_atlantica` (araucária, erythrina, jequitibá, manacá,
  palmito-juçara, pau-brasil, peroba), each with `bush` and `stump`;
  species folders also hold `_adulta_florida` and `_morta` models (seen for
  the pequi; to be listed per species at task 1.1). It has no caatinga.
- The catalog (`packages/shared/src/maps/catalog-objects.ts`) has ten tree
  entries; `tree-scatter.ts` has four biomes (`atlantic-edge`, `cerrado`,
  `caatinga`, `pasture`) and their mixes.
- `apps/game/public/models/trees.glb` is 328 KB.
- An open point from 2026-11-09: the araucária's crown reads as dark clumps
  without its candelabra shape.

Boundary: the simulation reads catalog footprints and concealment as it
does today; models are view-only. The low-poly pipeline stays script-built.

## Goals / Non-Goals

**Goals:**

- One table row per species; adding a species is data, not code.
- The species' identifying silhouette survives the adaptation.
- Old maps unchanged, goldens unchanged.

**Non-Goals:**

- Importing Refloreste's Godot shaders, growth stages (`muda`) or wind.

## Decisions

**D1. Extend the table, add a crown method per species family.** The
k-means clump crown suits broadleaf trees. Palms keep real fronds (as the
buriti does). Tiered conifers (araucária) get a tier method: clumps grouped
by height into whorls on bare branches, which also closes the open point.
Buttressed giants (sumaúma) keep their trunk level of detail 0. The family
is a column in the table.

**D2. Size classes and budgets.** Bush, small tree (under 6 m), tree (6 to
15 m), giant (over 15 m), each with a triangle budget measured from the
five trees already adapted and fixed at task 1.2. The build fails over
budget (spec).

**D3. Split models by biome, load on demand.** `trees.glb` becomes one file
per biome, loaded when a map uses a species of it (the map lists its object
ids). A single file was considered: simpler, but every battle would pay for
four biomes. The editor loads all of them.

**D4. Level of detail at the strategic band.** A species gets a flat
impostor crown (the existing strategic instancing for props) built by the
same script, so a wooded large map stays in budget.

**D5. Caatinga plants are authored in the Prestes kit.** New builders in
`target_vegetation.py`: columnar cacti from ribbed prisms, rosettes from
blade fans. The mandacaru, xique-xique, macambira and juazeiro have catalog
entries but no builder yet (found at task 1.1), so every caatinga builder
is new. The species list is fixed at task 1.1 and recorded in
`docs/status.md`.

**D5b. Forms in the editor's menu (owner, 2026-11-12).** The adult,
flowering and dead forms stay separate catalog entries (maps mix them
freely), but the editor's object menu shows one tile per species with an
Adult / Flowering / Dead switch, so the list does not triple. Dead forms
for every species; flowering forms only for the ipê-amarelo, mulungu,
manacá-da-serra and pau-brasil.

**D5c. Battle scale, no giants (owner, 2026-11-12).** Real heights put
the sumaúma at 38 m, far over the maps and the camera. A first cut to 14 m
was still too tall beside the soldier on the review sheet, so no tree
stands over 9 m, about five soldiers. Species keep their order of size:
araucária and sumaúma 9 m, jequitibá and castanheira 8.5, the forest trees
6-8, the cerrado trees 3-6, the bush 1.3. The four species already in maps
keep their legacy ids, lowered with the rest (araucária `tree-araucaria`
14 → 9 m, peroba `tree-broad` 8 → 6, pequi `cerrado-tree` 6 → 4.5, buriti
12 → 8), and are those species' adults, with no second row. The battle
does not change: a solid object blocks sight from 1.75 m up, and every tree
stays over that. The giant size class stays in the budget table, unused.

**D5d. Soldiers under the canopy.** A wood must not swallow the player's
men. Each frame the view tests, per crown instance, whether it covers one of
the player's soldiers seen from the camera (a ray from the camera to the
soldier's chest, plus a radius over his head) and fades that crown with a
screen-door dither (no sorting of transparent foliage); trunks stay solid.
A soldier still behind foliage gets an outline in his side's colour, drawn
over the crowns. Only the player's own men count, so the fade never shows
an enemy that the fog of war hides. A considered alternative, cutting all
crowns to trunks near the cursor, hides the wood's shape and was dropped.

The owner likes the trees' look in battle (2026-11-12: the pixelated
clumps, their outlines and light-and-dark shading): it must not be lost.
The new species go through the same view path as the five trees already in
the game (vertex-coloured clumps, the pixel render, the outline pass), and
the fade keeps it: a screen-door dither in whole pixels with the outlines
kept, never a smooth transparency or a change of shading. Species leaf
colours stay in the game's palette; the in-game look of each biome is
checked against a screenshot of today's trees before section 4 closes.

**D6. Bushes are a family, not a species.** Per biome: three sizes, two
shapes each, generated from the biome bush with different clump counts and
flattening. Concealment by height reuses the stance rule the concealment
system already has; the bush's height class is catalog data.

**D7. Ids are stable.** Present ids (`tree-broad`, `cerrado-tree`, `bush`
and so on) stay as aliases of the species they were (peroba, pequi, the
cerrado bush), mapped on load, so saved maps and goldens do not move.

**D8. Thorn patches slow movement through terrain data.** The low caatinga
plants get a movement factor the same way vegetation kinds already slow a
soldier; no new mechanic.

## Risks / Trade-offs

- [Refloreste is outside the repository; the build needs it on disk] → the
  adapted `.glb` files are committed, as today; the build that reads
  Refloreste stays an opt-in target and the docs say so.
- [Twenty-odd species blow the frame budget] → D2, D3, D4 and the
  performance scenario in the spec.
- [Species look alike after flattening to low-poly] → a review sheet of all
  species at the tactical band, approved by the owner before the catalog
  entries land.
- [The Amazon set is unused by the campaign] → it costs nothing at run time
  under D3; it is kept because the owner asked for the whole suite.

## Open Questions

- Which flowering forms are worth a catalog entry (an ipê in flower is a
  landmark; others may not read at this scale): decided on the review sheet.
