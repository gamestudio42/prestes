## Purpose

The buildings and stones a battle map can hold: what they look like, how
their look agrees with what they do in battle, and which kinds exist.

## ADDED Requirements

### Requirement: Every building is modelled

Every building of the object catalog SHALL be drawn from a model of the art
kit in the Prestes low-poly and pixel-texture style, not from a coded box.
Each building SHALL be told from the others at the tactical camera band by
its form: roof shape and material, and at least one feature of its own
(veranda, tower, chimney, platform, arcade, bell gable). The art build SHALL
fail when a catalog building has no model, and the asset register SHALL list
every building with its licence.

Historical note: buildings follow Brazilian rural, small-town and military
architecture of the 1920s; a building's catalog note says whether it is a
documented type with its source or a generic period type.

#### Scenario: No box is left
- **WHEN** the art build runs
- **THEN** every catalog building resolves to a model, and the build fails naming any that does not

#### Scenario: Buildings are told apart
- **WHEN** a railway station, a chapel and a warehouse stand side by side at the tactical camera band
- **THEN** each is recognised by its roof and its own feature, with colour removed

### Requirement: The model agrees with the battle

A building's model SHALL show a door where the battle has a door, a window
where the battle has a firing port, an upper floor or loft where the battle
has one, and a tower where the battle has one; it SHALL NOT show a door or
window the battle does not have, on any wall a soldier can reach. The model's
walls SHALL lie on the building's battle footprint within 0.2 m. A check
SHALL compare every building's model with its battle data and fail on a
mismatch.

#### Scenario: A window is a firing port
- **WHEN** a section garrisons a house with two front windows
- **THEN** the men at the front fire from the two windows drawn on the model's front wall

#### Scenario: A drawn door that is not a door
- **WHEN** a building's model has a door on its back wall and its battle data has none
- **THEN** the check fails and names the building and the wall

#### Scenario: Footprint and walls agree
- **WHEN** a soldier takes cover at a building's corner
- **THEN** he stands against the drawn wall, not inside it or apart from it

### Requirement: More kinds of building

The catalog SHALL hold at least twenty-five buildings, among them rural,
small-town and military types. Every building SHALL be a full catalog
object: a localized name in PT-BR and EN, a footprint, a height, its doors
and windows, its garrison capacity and the cover it gives, and SHALL work in
the editor and in battle as the present buildings do.

#### Scenario: A new building fights like the others
- **WHEN** the author places a railway station and a section is ordered to enter it
- **THEN** the section enters by its door, mans its windows up to its capacity and can be assaulted

#### Scenario: Catalog is complete
- **WHEN** the content check runs
- **THEN** every building has names in both locales, a footprint, openings and a capacity

### Requirement: Building variants

A building MAY be placed in one of several looks (wall colour, roof
material, state of repair). A variant SHALL change only the drawing: the
footprint, openings, capacity and cover of the building SHALL be the same in
every variant, and the simulation's state hash SHALL NOT depend on it. A map
saved before variants existed SHALL load with each building in its default
look.

#### Scenario: Two looks, one battle
- **WHEN** the same map is played with a house whitewashed and then with the same house in bare adobe, with the same seed and commands
- **THEN** the state hashes are identical tick by tick

#### Scenario: An older map
- **WHEN** a map saved before this change is loaded
- **THEN** every building shows its default look and the map check passes

### Requirement: Rock kinds

Stones SHALL come in at least five rock kinds, each with its own shape
language and colour (among them granite boulders, sandstone ledges, plateau
rock, river cobbles and the caatinga's lajedo), and each kind in at least
three sizes. A stone's cover and whether it blocks sight SHALL come from its
size, by the rule the catalog already uses, and SHALL NOT depend on its rock
kind. Every stone SHALL have a localized name in PT-BR and EN.

#### Scenario: Kinds are told apart
- **WHEN** a granite boulder and a sandstone ledge of the same size are seen at the tactical camera band
- **THEN** they differ in shape and colour

#### Scenario: Size decides the cover
- **WHEN** a granite boulder and a sandstone block of the same footprint and height shelter the same soldier from the same shot
- **THEN** they give the same cover

### Requirement: Built stone

The catalog SHALL hold built stone in at least two rock kinds: a dry stone
wall drawn as a line like the other walls, a stone corral, steps and a
retaining wall. A dry stone wall SHALL give the cover of a wall of its
height, and its drawing SHALL follow the ground along its length.

#### Scenario: A stone wall on a slope
- **WHEN** the author draws a dry stone wall down a hillside
- **THEN** the wall follows the ground without gaps under it, and soldiers take cover along it

### Requirement: Structures stay inside the frame budget

A large map with a town of sixty buildings SHALL stay inside the frame
budget the performance check uses, at the tactical and the strategic camera
bands.

#### Scenario: A town
- **WHEN** the performance check runs on a large map with sixty buildings of mixed types
- **THEN** the mean frame time is inside the budget in both camera bands
