## MODIFIED Requirements

### Requirement: Read-only HUD shell

The player HUD SHALL display the active camera band and a selection summary, and
SHALL read only from the client mirror. The current tick, active path count and
outcome SHALL NOT be shown in the player HUD; tests read them from the frame
through the development test bridge. The HUD
SHALL use Barlow / Barlow Condensed and Lucide icons.

#### Scenario: HUD follows the simulation

- **WHEN** the simulation advances
- **THEN** the HUD indicators update without the HUD owning simulation state

#### Scenario: Debug readouts live in the sandbox

- **WHEN** a battle runs
- **THEN** the player top rail shows no tick, path count or outcome readout,
  and the development test bridge returns them in the frame

#### Scenario: HUD action becomes a command

- **WHEN** the player triggers a HUD action that affects the game
- **THEN** the action is sent as a command through the command boundary

### Requirement: Minimal sepia command deck

The HUD SHALL present a minimalist sepia command deck: a single-line top command
bar, icon-only utility controls with localized titles, compact clipped-corner
panels, one primary order row, one tactical order row and a narrow status rail.
All existing controls, readouts, test ids and localized labels SHALL remain
available.

#### Scenario: Desktop command deck

- **WHEN** the game runs at desktop width
- **THEN** the top bar occupies one row, the primary and tactical orders occupy
  one row each, and the bottom deck leaves most of the map visible

#### Scenario: Icon control stays discoverable

- **WHEN** a utility control renders as an icon only
- **THEN** it exposes a localized title and aria label and keeps its active state

#### Scenario: Existing HUD controls remain

- **WHEN** the player uses Preview, Hide HUD, speed, stance, formation or orders
- **THEN** the control remains reachable and performs the same command as before

### Requirement: Command deck composition

The HUD SHALL follow the command-deck composition: a top rail with brand, camera
band control, language, pause, speed and post controls; a
bottom-left squad card with portrait, name, alive count and health, ammunition and
morale bars; a central order board with Fire, Movement and Troop sectors that
list every order button; a posture, stance, Hold Fire, alternating movement and
clear row with the formation selector; a bottom-right weapon and status card; and
a visible command status row.

#### Scenario: Reference layout

- **WHEN** the game is running at desktop width
- **THEN** the top rail, squad card, order board, passive row, weapon and status
  card and command status row are visible in their groups

#### Scenario: Every order on the board

- **WHEN** the order board renders
- **THEN** it exposes attack and suppress under Fire; move, withdraw, hold, face
  and advance under Movement; and flank, rescue, recon, ambush, pursue, defend,
  disperse, reserve and regroup under Troop, each with its localized label and
  availability

#### Scenario: Weapon and section status

- **WHEN** the frame updates
- **THEN** the squad card and weapon and status card update health, ammunition,
  morale, cover, cohesion, suppression and equipment from the frame

#### Scenario: Hide and restore

- **WHEN** the player hides the HUD
- **THEN** the command deck disappears and the restore affordance remains
  available as before

### Requirement: Distinct control icons

Every order, posture, stance and HUD control SHALL use one icon from a single
icon map pointing at a slice of the pixel icon sheet, and no two controls that
are visible at the same time SHALL share a slice. Icons SHALL match their
meaning and the period: the codex a book, Hold Fire a
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
