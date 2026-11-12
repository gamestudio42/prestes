# map-slots Specification

## Purpose
Gives every campaign chapter one authored map slot and holds the skirmish
maps beside it: the editor's New and Open dialogs choose a slot, a slot holds
at most one map, a mission plays the map saved for it, and the test map stays
out of the player's map list.

## Requirements

### Requirement: Campaign mission slots

The campaign SHALL offer one map slot per chapter of the campaign book, in
the book's order, named by the chapter's number and localized title (the
eight missions from "Os Dezoito do Forte" to "La Gaiba"). A map document
saved for a campaign slot SHALL record that chapter's mission id; a slot
SHALL hold at most one map, and saving a second map for a filled slot SHALL
ask the author to replace the first. Slots, numbers and titles SHALL come
from the campaign content, so a chapter's text and photos can change
without touching its map.

#### Scenario: Eight slots in book order
- **WHEN** the author lists the campaign slots in the editor
- **THEN** eight slots show, from "01 Os Dezoito do Forte" to "08 La Gaiba", each marked empty or with its map's name

#### Scenario: Replacing a mission's map asks first
- **WHEN** the author saves a new map for "05 A Ponte de Verdinho", which already has a map
- **THEN** the editor asks to replace it, and the old map stays until the author confirms

### Requirement: Choose the slot on New and Open

The editor's New map dialog SHALL ask the slot first: a campaign mission
(from the slot list) or a skirmish map. Open SHALL list the project's maps
grouped by slot: the campaign missions with their maps, then the skirmish
maps. The chosen slot SHALL set the document's use and mission id; the map
properties dialog SHALL show the slot and allow moving a map to an empty
slot. All slot labels SHALL be localized in PT-BR and EN.

#### Scenario: New map for a mission
- **WHEN** the author creates a new map and picks "02 O Anel de Ferro"
- **THEN** the new document is a campaign map with the mission id `anel-de-ferro`, and the save requires its setting label and source note

#### Scenario: Open by slot
- **WHEN** the author opens the Open dialog with two campaign maps and three skirmish maps saved
- **THEN** the dialog shows the eight mission slots (two filled) and the three skirmish maps, in Portuguese or English

### Requirement: Play a mission's map

A campaign chapter whose mission has a saved map SHALL offer "Jogar o mapa"
/ "Play the map" in the campaign book, which starts a 3 vs 3 on that map
with the default rosters (no mission scripting, briefing or progression).
A chapter without a map SHALL stay as it is today.

#### Scenario: A mission with a map plays
- **WHEN** "02 O Anel de Ferro" has a saved map and the player opens its chapter
- **THEN** the chapter offers "Play the map", which starts the 3 vs 3 on that map

#### Scenario: A mission without a map
- **WHEN** "06 Serra Nova" has no map
- **THEN** its chapter offers no play action

### Requirement: The test map

The project SHALL keep one test map: a map document laid out so the
systems can be checked in a short battle. Within the deployment areas'
reach it SHALL hold at least a house, a sobrado and a church with its
tower, a trench line, a walled yard, a stream with a ford, open ground
crossed by cover lines, and open room for objectives. It SHALL be listed
only in development builds, never in the
published skirmish list. The determinism goldens, the battle reports, the
benchmarks and the end-to-end suites SHALL run on it; it SHALL be editable
in the editor like any map.

#### Scenario: Not in the published game
- **WHEN** the published build's skirmish map fan opens
- **THEN** the test map is not among the maps

#### Scenario: Garrisons and a ford close at hand
- **WHEN** the 3 vs 3 starts on the test map
- **THEN** a house, a sobrado, the church tower, a trench line, a walled yard and the ford are each within 150 m of a column section

#### Scenario: Goldens on the test map
- **WHEN** the determinism check runs
- **THEN** its 3 vs 3 cases run on the test map and match the recorded goldens
