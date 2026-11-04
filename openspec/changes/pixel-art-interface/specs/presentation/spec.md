## ADDED Requirements

### Requirement: Floating HUD windows

The in-game HUD SHALL present three floating pixel windows over the map instead
of a docked bottom bar: Orders (every order, posture, stance and HUD control),
Troops (the troop selector) and Troop summary (the selected troop). The player
SHALL be able to drag each window by its title bar anywhere inside the view and
minimize it to its title bar; positions and minimized states SHALL persist in
the browser and fall back to default positions when storage is unavailable.
The Troop summary SHALL show one helmet per soldier of the selected troop with
three vertical bars for health, morale and ammunition, the helmet coloured by
the soldier's state, and the troop's weapon, cover and cohesion.

#### Scenario: Drag and remember

- **WHEN** the player drags the Orders window to the top left and reloads
- **THEN** the Orders window opens at the top left again

#### Scenario: Minimize

- **WHEN** the player minimizes the Troop summary
- **THEN** only its title bar remains and clicking the restore button shows
  the full window again

#### Scenario: One helmet per soldier

- **WHEN** a troop of 11 is selected and one soldier is wounded
- **THEN** the Troop summary shows 11 helmets, the wounded one in the wounded
  colour, each with health, morale and ammunition bars matching that soldier

#### Scenario: Windows stay in view

- **WHEN** the browser window shrinks
- **THEN** every HUD window is moved back inside the view and none covers the
  top bar

## MODIFIED Requirements

### Requirement: Period typography and icons

Player-facing UI SHALL use the self-hosted Pixelify Sans font and the project's
original pixel icon set, recorded in the asset register with the font's OFL
licence and the icons as original work. The icon source SHALL be an Aseprite
file with one named slice per icon; the exported PNG sheet and JSON index SHALL
be committed so building and testing do not need Aseprite.

#### Scenario: Fonts are self-hosted

- **WHEN** the built game is inspected
- **THEN** Pixelify Sans is served from the build and no external font request is made

#### Scenario: Icons are registered

- **WHEN** the asset register is read
- **THEN** Pixelify Sans is listed with its OFL licence and the icon set as
  original work with its Aseprite source path

#### Scenario: Icons follow the source

- **WHEN** an icon is redrawn in the Aseprite source and `pnpm icons` runs
- **THEN** the exported sheet and index change and the game shows the new icon

### Requirement: Period low-poly HUD styling

The HUD and menus SHALL use the pixel kit over the low-poly scene: the sepia
period palette from shared tokens, Pixelify Sans at its crisp sizes, panels and
buttons with 2 px borders and stepped corners, hard offset shadows without
blur, and pixel focus and pressed states. They SHALL NOT use rounded corners,
blurred shadows, CDN fonts or player-facing hardcoded text. The main menu SHALL
show an animated pixel-art scene of the column marching along a road at dusk,
drawn in code and held still when the player prefers reduced motion, behind a
vertical menu with a cursor that the arrow keys and Enter can drive. The
public-domain photograph SHALL appear pixelated in the sepia palette as the
compendium's cover.

#### Scenario: Sepia treatment

- **WHEN** the HUD is visible
- **THEN** panels use the sepia ink, parchment and gold tokens of the period
  palette, not a green terminal palette

#### Scenario: Pixel treatment

- **WHEN** the HUD is visible
- **THEN** panels and buttons have 2 px borders, stepped corners and hard
  shadows, and all text uses Pixelify Sans

#### Scenario: Readable at the reference size

- **WHEN** the bootcamp HUD is shown at 1440 x 900 in PT-BR or EN
- **THEN** no HUD label, order name or objective row overflows its control

#### Scenario: Marching menu

- **WHEN** the main menu is open
- **THEN** soldiers march across the pixel scene behind the menu, and the
  arrow keys move the cursor between the menu entries

#### Scenario: Localized labels

- **WHEN** the locale changes between PT-BR and EN
- **THEN** every HUD label, title and status string changes with it

### Requirement: Distinct control icons

Every order, posture, stance and HUD control SHALL use one icon from a single
icon map pointing at a slice of the pixel icon sheet, and no two controls that
are visible at the same time SHALL share a slice. Icons SHALL match their
meaning and the period: the codex a book, the sandbox a tool, Hold Fire a
no-fire mark, the preview toggle an icon that differs from recon and ambush.
Icons SHALL take the colour of their control's state.

#### Scenario: No repeated icons

- **WHEN** the bootcamp HUD is shown with the orders panel open
- **THEN** every order button, posture button, stance button and utility control
  renders a different icon slice

#### Scenario: Icon map covers the catalogue

- **WHEN** a new order is added to the order catalogue without an icon slice
- **THEN** a unit test fails instead of the button falling back to a shared icon

#### Scenario: Icons follow the control state

- **WHEN** a control becomes active, disabled or hovered
- **THEN** its icon changes colour with the control's text colour
