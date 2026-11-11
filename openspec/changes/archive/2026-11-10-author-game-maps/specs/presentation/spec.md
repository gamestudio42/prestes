## ADDED Requirements

### Requirement: Skirmish map fan of authored maps

The skirmish object SHALL present the saved skirmish maps (and, in
development builds, the test map) as a perspective fan of folded map
sheets, posed like a folded map on the desk, with soft fold creases; the
fan SHALL hold any number of maps, from one up. The fan SHALL carry the
localized "Mapas"/"Maps" label below the art. The active sheet SHALL carry
a printed legend strip that is part of the map art, with the localized
name, description and deploy action. Each sheet SHALL be selectable;
selecting a non-active sheet raises it, and activating the active sheet
cycles to the next map. The deploy action SHALL start the 3 vs 3 on the
selected map, and the selected map SHALL survive a tidy desk or a return to
the start screen during the session. With no map to show, the object SHALL
show a single blank sheet reading "Nenhum mapa ainda — abra o editor" /
"No maps yet — open the editor", with no deploy action.

#### Scenario: Fan shows every saved map

- **WHEN** the player opens the map fan with three skirmish maps saved
- **THEN** all three maps are reachable with their localized names and the "Mapas"/"Maps" label sits below the fan

#### Scenario: Empty fan

- **WHEN** the player opens the map fan in the published game with no skirmish map saved
- **THEN** a blank sheet says there are no maps yet and points to the editor, and nothing can be deployed

#### Scenario: Legend is part of the sheet

- **WHEN** the player looks at the active map
- **THEN** its name, description and deploy action are printed on the parchment strip that is part of the map sheet

#### Scenario: Select a map

- **WHEN** the player selects a sheet
- **THEN** it comes to the front and its legend is shown

#### Scenario: Cycle the fan

- **WHEN** the player activates the active sheet
- **THEN** the next map comes to the front with its legend

#### Scenario: Start on the selected map

- **WHEN** the player activates deploy
- **THEN** the 3 vs 3 starts on the selected map

#### Scenario: Selected map survives

- **WHEN** the player tidies the desk or returns to the start screen
- **THEN** the selected map is still selected

## REMOVED Requirements

### Requirement: Skirmish map fan

**Reason**: It showed the four generated maps, which leave the game.
**Migration**: Replaced by "Skirmish map fan of authored maps".
