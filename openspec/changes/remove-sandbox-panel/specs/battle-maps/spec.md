## MODIFIED Requirements

### Requirement: Authored maps in the catalog

Map documents in the project's authored maps folder SHALL be registered in
the map catalog at build time. The skirmish maps SHALL be offered on the
skirmish page; campaign maps SHALL be reached through their chapter; the
test map SHALL be offered only in development builds.
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

### Requirement: Map choice from authored maps

The game SHALL offer the 3 vs 3 only on authored maps: the saved skirmish
maps on the start menu, and in development builds
the test map too. With no skirmish map saved, the start menu SHALL say so
and point to the editor instead of offering a battle. Map names and
one-line descriptions SHALL be localized in PT-BR and EN, from the map
documents. A 3 vs 3 started without a map choice (tests, tools) SHALL run on the test map.

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
