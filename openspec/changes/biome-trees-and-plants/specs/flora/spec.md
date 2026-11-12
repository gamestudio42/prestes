## Purpose

The trees, bushes and cacti a battle map can hold: which species exist in
which biome, how each is adapted and budgeted, and what each does in battle.

## ADDED Requirements

### Requirement: Species catalog by biome

The object catalog SHALL hold the tree species of four biomes: Atlantic
forest, cerrado, caatinga and Amazon. It SHALL include every adult tree of
the owner's Refloreste project for the Atlantic forest, the cerrado and the
Amazon, each biome's stump, and the dead and flowering forms Refloreste
provides as separate entries. Every species SHALL have a localized name in
PT-BR and EN (the common Brazilian name in both, with an English gloss in
EN where one exists), a biome, a height at battle scale and a thumbnail in
the editor. No tree SHALL stand taller than 14 m (owner, 2026-11-12: no
giant trees on the battle maps); within that, species keep their real order
of size, so a tall forest tree stands over a small cerrado tree. The content check SHALL fail for a
catalog species without a model, a name in both locales or a biome.

Historical note: the biomes the column crossed are recorded in
`docs/history/TIMELINE.md` (`macaulay-1974`); the Amazon set is labelled in
the editor as outside the column's main route.

#### Scenario: The suite is present
- **WHEN** the content check runs
- **THEN** every adult tree species of Refloreste's three biomes has a catalog entry with a model, names and a biome

#### Scenario: A species without a name
- **WHEN** a species has no PT-BR name
- **THEN** the locale check fails and names the key

#### Scenario: Heights are plausible
- **WHEN** a sumaúma and a manacá stand beside a 1.75 m soldier
- **THEN** the sumaúma is among the tallest trees in the catalog, no taller than 14 m, and the manacá is a small tree

#### Scenario: No giant trees
- **WHEN** the content check reads the catalog
- **THEN** it fails for any tree taller than 14 m and names it

### Requirement: Species are adapted to the Prestes look

Every tree SHALL be drawn in the Prestes style: a low-poly crown and trunk,
colours from the Prestes palette, lit and outlined like the rest of the
battle. A species SHALL keep the silhouette that identifies it (the
araucária's candelabra, a palm's fronds, the sumaúma's buttresses). Each
model SHALL stay inside a triangle budget set per size class, and the art
build SHALL fail for a model over its budget.

#### Scenario: A species is recognised
- **WHEN** the araucária is seen at the tactical camera band
- **THEN** its tiered, candelabra crown is visible, not a round clump

#### Scenario: Over budget
- **WHEN** a species' model exceeds its size class's triangle budget
- **THEN** the art build fails and names the species and the count

### Requirement: Bush families

Each biome SHALL have bushes in three sizes: knee-high, waist-high and
head-high, with at least two shapes per size. A bush SHALL conceal by its
height: a knee-high bush conceals a prone soldier, a waist-high bush a prone
or crouched soldier, a head-high bush a soldier in any stance. Bushes SHALL
NOT stop bullets.

#### Scenario: A crouched man in a waist-high bush
- **WHEN** a crouched soldier stands inside a waist-high bush and an enemy observer is 40 m away with a clear line
- **THEN** he is concealed as the concealment rules define, and a standing soldier in the same bush is not

#### Scenario: A bush is no cover
- **WHEN** a soldier behind a head-high bush is fired at
- **THEN** the bush gives him no protection from the shot

### Requirement: Cacti and caatinga plants

The caatinga SHALL have at least six cactus and thorn plants in the catalog
(tall columnar cacti, low clumps and ground rosettes), among them the
mandacaru, the xique-xique and the macambira already present, and at least
three caatinga trees or shrubs beside the juazeiro. A tall cactus SHALL be a
thin obstacle that does not block sight; a low clump or rosette SHALL
conceal a prone soldier and SHALL slow a soldier who crosses it.

Historical note: the species are plants of the sertão the column crossed in
1926 (`docs/history/TIMELINE.md`); the slowing is a game abstraction.

#### Scenario: Six cacti to choose from
- **WHEN** the author opens the trees tool on the caatinga
- **THEN** at least six cactus and thorn plants are listed with their thumbnails

#### Scenario: Thorns slow a crossing
- **WHEN** a section walks through a patch of macambira
- **THEN** it crosses slower than on open ground, by the factor the terrain data gives

### Requirement: Biome mixes

The trees tool's scatter SHALL offer a mix for each biome, built from that
biome's species with weights, and SHALL offer the Amazon edge beside the
present biomes. A mix SHALL draw only species of its biome. Scattering SHALL
stay deterministic: the same stroke, biome and seed give the same trees.

#### Scenario: A cerrado stroke
- **WHEN** the author scatters trees with the cerrado mix
- **THEN** only cerrado species are placed, in about the mix's proportions

#### Scenario: The same stroke twice
- **WHEN** the same stroke is scattered twice with the same seed
- **THEN** the same species stand at the same points

### Requirement: Saved maps keep their trees

A map saved before the new species existed SHALL load with every tree it
had, at the same place, with the same battle data. A catalog id that is
renamed SHALL be mapped to its new id on load.

#### Scenario: An older map
- **WHEN** `paiolzinho` as saved today is loaded after this change
- **THEN** its trees stand where they stood, the map check passes and its determinism golden is unchanged

### Requirement: Trees stay inside the frame budget

A large map with the densest biome mix over a third of its ground SHALL
stay inside the frame budget the performance check uses, at the tactical
and the strategic camera bands.

#### Scenario: A wooded large map
- **WHEN** the performance check runs on a large map with a third of its ground under the Atlantic forest mix
- **THEN** the mean frame time is inside the budget in both camera bands

### Requirement: Soldiers stay visible under trees

A soldier under a tree crown SHALL stay visible and selectable from the
battle camera. A crown between the camera and one of the player's soldiers,
or close over one, SHALL turn see-through while it hides him, and come back
when he leaves; trunks stay solid. A soldier still hidden by foliage SHALL
show his outline in his side's colour. Enemy soldiers SHALL NOT be revealed
by this: a crown fades only over the player's own men, and an enemy under a
crown is shown only as fog of war allows.

#### Scenario: A section in a wood
- **WHEN** the player's section moves into a dense Atlantic forest stand at the tactical camera band
- **THEN** the crowns over its men turn see-through, every man can be seen and clicked, and the crowns elsewhere stay solid

#### Scenario: The enemy in the same wood
- **WHEN** an enemy section hides in the same stand
- **THEN** the crowns over it stay solid and it is shown only as the fog of war allows
