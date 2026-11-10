## ADDED Requirements

### Requirement: Time of day

Every map document SHALL carry a time of day, from early morning to late
afternoon, and a sun direction (the compass bearing the sun shines from).
The battle view SHALL light the map with them: the sun's height follows the
time of day (low in the morning and late afternoon, high at midday), the
light warms toward the ends of the day, and the sun shines from the
bearing. Maps without the fields SHALL light as midday from the north-east.
The time of day SHALL change only the picture: the simulation, line of
sight and the state hash SHALL NOT depend on it.

#### Scenario: Low sun models the hills
- **WHEN** a map is set to late afternoon with the sun from the west
- **THEN** in battle the west faces of its hills are lit and the east faces darker, more than at midday

#### Scenario: The hash ignores the time of day
- **WHEN** the same battle is run on a map set to morning and then to late afternoon
- **THEN** both runs give the same state hash

### Requirement: Performance budget on the test map

With the default rosters, the 3 vs 3 SHALL run under 3 ms per tick on the
test map in the headless bench, garrisons included, and the view SHALL hold
30 frames per second at strategic zoom on the reference machine.

#### Scenario: Test map within budget
- **WHEN** the bench runs 3,000 ticks of the 3 vs 3 on the test map
- **THEN** the mean tick time is under 3 ms

### Requirement: Terrain shading, water and sun

The heightfield ground SHALL be shaded without banding or faceted stripes on
slopes: smooth normals, a toon ramp with soft steps on slopes, and a sun
from the map's time of day that models hills. Shallow water (fords) SHALL
read as a gravel bar with stones and lighter, rippling water; deep water
darker and calm; banks with gravel and reeds.

#### Scenario: Ford reads as a ford
- **WHEN** the test map's ford is seen from strategic zoom
- **THEN** it is clearly lighter and stonier than the deep water around it

### Requirement: Cover along attack axes

Every skirmish map and the test map SHALL offer cover along each attack
axis between the deployment areas: no straight stretch longer than 60 m on
an axis SHALL be without a cover slot within 10 m of it. The map review
tool SHALL check it and report it to the author; the editor's map check
SHALL show it as a warning, not an error.

#### Scenario: Test map is not open
- **WHEN** the map review tool measures the test map's attack axes
- **THEN** no gap longer than 60 m between cover slots is reported

### Requirement: Map choice from authored maps

The game SHALL offer the 3 vs 3 only on authored maps: the saved skirmish
maps on the start menu and in the sandbox panel, and in development builds
the test map too. With no skirmish map saved, the start menu SHALL say so
and point to the editor instead of offering a battle. Map names and
one-line descriptions SHALL be localized in PT-BR and EN, from the map
documents. A 3 vs 3 started without a map choice (tests, tools, the
sandbox's default) SHALL run on the test map.

#### Scenario: Choose a map
- **WHEN** the player picks a saved skirmish map on the start menu and starts the 3 vs 3
- **THEN** the battle starts on that map with every soldier in its deployment areas

#### Scenario: No maps yet
- **WHEN** the published game has no skirmish map saved
- **THEN** the start menu shows "Nenhum mapa ainda — abra o editor" / "No maps yet — open the editor" and no deploy action

#### Scenario: Default is the test map
- **WHEN** the 3 vs 3 starts without a map choice
- **THEN** it runs on the test map

#### Scenario: Localized names
- **WHEN** the locale is PT-BR or EN
- **THEN** each map's name and description shows in that language

### Requirement: Enemy presets in the map document

A map document SHALL be able to carry the legalist forces one of which is
drawn when the player brings a roster (pre-battle-roster's map presets);
without them the enemy fields the default roster. The map check SHALL refuse
a preset that is not a valid legalist roster, and SHALL check that every
section type deploys in every slot of both sides.

#### Scenario: The test map's presets
- **WHEN** the player brings a roster to the test map and leaves the enemy to chance
- **THEN** the enemy fields one of the test map's three presets, the same one for the same seed

## MODIFIED Requirements

### Requirement: Authored maps in the catalog

Map documents in the project's authored maps folder SHALL be registered in
the map catalog at build time. The skirmish maps SHALL be offered on the
skirmish page; campaign maps SHALL be reached through their chapter; the
test map SHALL be offered only in development builds and the sandbox panel.
The content check SHALL compile and validate every authored map and SHALL
fail the check on any error.

#### Scenario: Authored map on the menu
- **WHEN** a valid skirmish map `forte.map.json` is in the authored maps folder and the game is built
- **THEN** the skirmish page lists the map with its localized name

#### Scenario: Campaign map stays off the skirmish page
- **WHEN** a campaign map for "02 O Anel de Ferro" is in the authored maps folder
- **THEN** the skirmish page does not list it and its chapter offers to play it

#### Scenario: Broken authored map fails the check
- **WHEN** an authored map's deployment zone is in deep water
- **THEN** the content check fails naming the map and the problem

## REMOVED Requirements

### Requirement: Proof authored map

**Reason**: The user authors the game's maps; the proof map re-created a
generated map that leaves the game.
**Migration**: The test map is a map document and proves the document
pipeline; the map check and the editor's tests run on it.

### Requirement: Fazenda map

**Reason**: The generated maps leave the game (user decision, 2026-11-09).
**Migration**: The Fazenda's systems (trenches, crops, ditches, buildings)
are exercised on the test map; the author can draw a farm in the editor.

### Requirement: Serra e Rio map

**Reason**: The generated maps leave the game (user decision, 2026-11-09).
**Migration**: The ford and water checks move to the test map's stream.

### Requirement: Bairro map

**Reason**: The generated maps leave the game (user decision, 2026-11-09).
**Migration**: The garrison checks (houses, sobrado, church tower) move to
the test map.

### Requirement: Battle map performance budget

**Reason**: It named the generated maps, which leave the game.
**Migration**: Replaced by "Performance budget on the test map", measured on the test map.

### Requirement: Terrain shading and water

**Reason**: It named the generated maps, which leave the game.
**Migration**: Replaced by "Terrain shading, water and sun", measured on the test map.

### Requirement: Cover density on attack axes

**Reason**: It named the generated maps, which leave the game.
**Migration**: Replaced by "Cover along attack axes", measured on the test map.

### Requirement: Map catalog and choice

**Reason**: It offered the four generated maps and kept the Vila Militar as the default.
**Migration**: Replaced by "Map choice from authored maps"; the default is the test map.
