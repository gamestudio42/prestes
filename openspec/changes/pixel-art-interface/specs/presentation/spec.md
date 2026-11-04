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
blurred shadows, CDN fonts or player-facing hardcoded text. The start screen
SHALL show the public-domain photograph pixelated under the sepia palette.

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
