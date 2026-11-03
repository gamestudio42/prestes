## ADDED Requirements

### Requirement: Icon infoboxes

Every icon-only HUD control SHALL show a localized infobox on pointer hover and
keyboard focus. The infobox SHALL name the action, state its current
availability, and remain inside the viewport without capturing pointer input.

#### Scenario: Hover an icon

- **WHEN** the pointer rests over an icon-only control
- **THEN** a localized infobox names the action and shows its state

#### Scenario: Focus an icon

- **WHEN** an icon-only control receives keyboard focus
- **THEN** the same infobox appears and is linked by `aria-describedby`

#### Scenario: Edge placement

- **WHEN** an infobox would overflow the viewport
- **THEN** it flips or shifts to remain fully visible

### Requirement: Rounded translucent command panels

The HUD SHALL use sepia translucent panels, 8-10 px rounded corners, hairline
bronze borders, a self-hosted display serif for the brand and headings, and
Barlow for data and controls. It SHALL NOT fetch fonts or icons from a CDN.

#### Scenario: Visual tokens

- **WHEN** the HUD renders
- **THEN** top rail, squad card, action row, weapon card and command row use the
  shared radius, border, ink, paper and gold tokens

#### Scenario: Readability over the map

- **WHEN** a panel floats over terrain or combat
- **THEN** its translucent fill and border keep text and icons legible without
  fully hiding the map

### Requirement: Responsive command deck

The reference composition SHALL remain usable at desktop width and SHALL adapt
without clipping at narrower widths. Every control SHALL remain reachable by
pointer or keyboard, using an accessible overflow when a region cannot fit.

#### Scenario: Desktop composition

- **WHEN** the game runs at 1440x900
- **THEN** the top rail, squad card, seven action slots, weapon/status card and
  command row are visible without scrolling

#### Scenario: Narrow composition

- **WHEN** the viewport is narrow
- **THEN** groups wrap or move to overflow and every command remains reachable

## MODIFIED Requirements

### Requirement: Reference command HUD

The HUD SHALL follow the reference command composition: a segmented top rail with
brand, tick, camera segmented control, paths, outcome, language, utility icons,
pause, speed and post; a bottom-left squad card with portrait, name, alive count
and health/ammunition/morale bars; a centered seven-slot action row; a
bottom-right weapon/status card; and a bottom command row with Position,
Maneuver, Support, Formation, stances and objective/star action.

#### Scenario: Reference layout

- **WHEN** the game is running at desktop width
- **THEN** the command rail, squad card, seven action slots, weapon/status card,
  command row, stance controls and status readouts are visible in their reference
  groups

#### Scenario: Seven action slots

- **WHEN** the action row renders
- **THEN** it exposes move, attack, suppress, flank, withdraw, hold and clear in
  that order, with withdraw using the rust active treatment

#### Scenario: Category command row

- **WHEN** the player opens Position, Maneuver or Support
- **THEN** every existing tactical order is listed with its localized label and
  current availability

#### Scenario: Weapon and section status

- **WHEN** the frame updates
- **THEN** the squad card and weapon/status card update health, ammunition,
  morale, cover, cohesion, suppression and equipment from the frame

#### Scenario: Hide and restore

- **WHEN** the player hides the HUD
- **THEN** the reference deck disappears and the restore affordance remains
  available as before
