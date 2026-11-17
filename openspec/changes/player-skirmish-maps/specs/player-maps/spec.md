## ADDED Requirements

### Requirement: Player maps on the skirmish pile

Every map the editor keeps in the player's browser, made there or imported from
a file, SHALL be a sheet of the skirmish pile on the camp table, after the
game's maps, unless its id is an authored map's. Its sheet SHALL show a print
drawn from the map itself.

#### Scenario: A made map joins the pile
- **WHEN** the player makes a map in the editor and returns to the camp table
- **THEN** the map is a sheet of the skirmish pile, with its name and a print of it

#### Scenario: An imported map joins the pile
- **WHEN** the player imports a map file in the editor and returns to the camp table
- **THEN** that map is a sheet of the skirmish pile

#### Scenario: Authored maps are never replaced
- **WHEN** a kept map has the id of an authored map
- **THEN** it is not on the pile and the authored map is unchanged

### Requirement: Skirmish on a player map

Choosing a player map SHALL open the skirmish setup on it, and the battle SHALL
play the player's document. Campaign chapters SHALL play only authored maps.

#### Scenario: Play a player map
- **WHEN** the player chooses their map on the pile and starts the battle
- **THEN** the battle opens on that map

### Requirement: Open the kept maps in the editor

The editor's Open SHALL list the maps kept in the browser, so the player can go
back to any of them, and a new map SHALL get an id that no earlier map holds by
default.

#### Scenario: Two maps
- **WHEN** the player has made two maps and opens the editor's Open
- **THEN** both are listed and either can be opened
