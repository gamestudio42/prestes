## ADDED Requirements

### Requirement: Battle compass

The battle HUD SHALL show a small compass rose whose north mark points the
way true north runs on screen (a north-running road on the tilted view lies
along it) at every camera rotation and zoom, turning as the camera turns. Clicking it SHALL turn the view by the shortest way until
north is up. Its letter and accessible name SHALL come from the locale
catalogs in PT-BR and EN.

#### Scenario: Default camera
- **WHEN** a map with north 0 is shown at the default camera rotation (45°)
- **THEN** the compass's north mark points up and to the right, along the grid's columns as drawn on screen

#### Scenario: After rotating
- **WHEN** the player rotates the view one step on a map with north 30
- **THEN** the north mark turns the same way as the map, by about 45°

#### Scenario: Click to north
- **WHEN** the player clicks the compass
- **THEN** the view turns until the north mark points straight up
