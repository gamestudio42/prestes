## Why

The editor offers ten trees and plants. Five come from the owner's
Refloreste project (peroba, araucária, buriti, pequi and one bush); the
caatinga has one tree, one tall cactus and two low plants; every biome has
the same single bush. The owner asked (2026-11-11) to bring over the whole
Refloreste tree suite by biome, fitted to Prestes, and for more bushes and
more kinds of cactus.

## What Changes

- **The Refloreste suite, by biome.** Every adult tree of Refloreste's
  three biomes is adapted for Prestes: Atlantic forest (araucária,
  erythrina, jequitibá, manacá, palmito-juçara, pau-brasil, peroba),
  cerrado (aroeira, barbatimão, buriti, cagaita, ipê, pequi) and Amazon
  (açaí, andiroba, castanheira, seringueira, sumaúma, tucumã), with each
  biome's bush and stump. Dead trees and the flowering stage come over
  where Refloreste has them, as separate catalog entries.
- **Fitted to Prestes, not copied.** Each species goes through the
  existing adaptation (leaf cards turned into low-poly crowns, the Prestes
  palette, a triangle budget, a height from the species' real range) and
  gets the battle data every catalog object has: trunk footprint, whether
  it blocks sight, and its concealment radius.
- **More bushes.** A family of bushes per biome in three sizes (knee, waist
  and head high) with different shapes, so scrub is not one model repeated;
  each with its concealment for a standing, crouched or prone man.
- **More cactus and caatinga plants**, authored for Prestes (Refloreste has
  no caatinga): facheiro, coroa-de-frade, quipá and palmatória beside the
  present mandacaru and xique-xique, and caatinga trees and shrubs beside
  the juazeiro (the list is confirmed by the owner in task 1.1).
- **Biome mixes and the trees tool** offer the new species, with a mix for
  the Amazon edge; maps already saved keep their trees and their look.
- All species names in PT-BR and EN, with the common name used in Brazil.

Design intent. Player fantasy: marching through a country that changes,
from the pines of the south to the caatinga. Pillar: the land is a
character, and terrain you can read. Loop beat: authoring a map, and
reading cover and concealment in battle. Hypothesis: a player names the
region of a map from its trees alone, and uses a thicket to hide a section.

MVP: the adult trees of the three Refloreste biomes, three bush sizes per
biome, four new caatinga plants, the mixes. Non-goals: growth over time,
seasons, wind animation, fruit or harvest (Refloreste's own mechanics),
destructible trees, and an Amazon campaign map.

Historical and legal note. Where the column marched, biome by biome, is
recorded in `docs/history/TIMELINE.md` from `macaulay-1974`; a species is
offered for the biomes it grows in, and the Amazon set is labelled as
outside the column's main route unless a source places a mission there. The
Refloreste models are the owner's own work and are adapted with his
licence, recorded in `docs/assets.md`; the caatinga plants are original
work under CC-BY-4.0. No third-party model is used. The campaign's
multi-perspective approach and its playable figures are unchanged.

## Capabilities

### New Capabilities

- `flora`: the species catalog by biome, how a species is adapted and
  budgeted, bush families, caatinga plants, and what each gives in battle.

### Modified Capabilities

None. `map-editor` "Trees tool" and "Every object affects the battle"
already cover any catalog tree; the new species enter through the catalog.

## Impact

- `art-src/blender/target_trees.py` (the species table and the adaptation),
  `target_vegetation.py`; `apps/game/public/models/trees.glb`, which is
  328 KB today and grows; it may be split per biome and loaded on demand.
- `packages/shared/src/maps`: `catalog-objects.ts`, `tree-scatter.ts`
  (biomes and mixes), concealment data.
- `packages/view3d`: tree instancing and level of detail in
  `battle-map-layer.ts`; `thumbnails.ts` for the editor's species list.
- `apps/game/src/editor`: the trees tool's list grouped by biome.
- Locale catalogs; `docs/assets.md`; the frame budget e2e.
