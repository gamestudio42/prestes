## MODIFIED Requirements

### Requirement: Section cards

The panel SHALL show a card for each player section with the section type's
thumbnail, section name, alive count and compact health, ammunition and
morale bars. The thumbnail SHALL be the one the roster builder shows for
that section type and SHALL carry the type's localized name as its text
alternative.

#### Scenario: Section card status

- **WHEN** combat changes a section's health, ammunition or morale
- **THEN** its card bars and values update from the frame

#### Scenario: Card shows the section's thumbnail

- **WHEN** a battle starts with a machine-gun section in the player's force
- **THEN** its card shows the machine-gun section's thumbnail, not a placeholder

#### Scenario: Placeholder portrait is named

- **WHEN** the asset register is inspected
- **THEN** the section thumbnails are listed as built from the soldier kit, and no section portrait is listed as a placeholder

### Requirement: Floating HUD windows

The in-game HUD SHALL present three floating pixel windows over the map instead
of a docked bottom bar: Orders (every order, posture, stance and HUD control),
Troops (the troop selector) and Troop summary (the selected troop). The player
SHALL be able to drag each window by its title bar anywhere inside the view and
minimize it to its title bar; positions and minimized states SHALL persist in
the browser and fall back to default positions when storage is unavailable.
The Troop summary SHALL show the troop panel (header, alerts, one figure per
soldier and the condition gauges, as the `troop-panel` capability defines
them) and the troop's weapon.

#### Scenario: Drag and remember

- **WHEN** the player drags the Orders window to the top left and reloads
- **THEN** the Orders window opens at the top left again

#### Scenario: Minimize

- **WHEN** the player minimizes the Troop summary
- **THEN** only its title bar remains and clicking the restore button shows
  the full window again

#### Scenario: One helmet per soldier

- **WHEN** a troop of 11 is selected and one soldier is wounded
- **THEN** the Troop summary shows 11 soldier figures, the wounded one with the wounded body colour and the bandage mark

#### Scenario: Windows stay in view

- **WHEN** the browser window shrinks
- **THEN** every HUD window is moved back inside the view and none covers the
  top bar
