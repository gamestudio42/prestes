## ADDED Requirements

### Requirement: Distinct control icons

Every order, posture, stance and HUD control SHALL use one icon from a single
icon map, and no two controls that are visible at the same time SHALL share an
icon. Icons SHALL match their meaning: the codex SHALL use a book icon, the
sandbox a laboratory or tool icon, Hold Fire a no-fire icon, and the preview
toggle an icon that differs from recon and ambush.

#### Scenario: No repeated icons

- **WHEN** the bootcamp HUD is shown with the orders panel open
- **THEN** every order button, posture button, stance button and utility control
  renders a different icon

#### Scenario: Icon map covers the catalogue

- **WHEN** a new order is added to the order catalogue without an icon
- **THEN** a unit test fails instead of the button falling back to a shared icon

### Requirement: Visible command row status

The bottom command row SHALL show the selection count, the current order and the
body stance as visible text, or the row SHALL be removed so that no empty bar is
rendered.

#### Scenario: Status is readable

- **WHEN** the section is selected with no order
- **THEN** the command row visibly shows the selection count, "no order" and the
  stance in the active locale

### Requirement: Command deck composition

The HUD SHALL follow the command-deck composition: a top rail with brand, camera
band control, language, codex, sandbox, pause, speed and post controls; a
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

## MODIFIED Requirements

### Requirement: Browser boot flow

The game SHALL load in a supported desktop browser and reach a start screen with
the game title, a final tagline, a language selector, an audio option, the codex
and the bootcamp actions. When bootcamp progress exists the start screen SHALL
offer Continue (resume the saved station) and Restart; otherwise it SHALL offer
Start. The period kicker SHALL appear once.

#### Scenario: Start screen loads

- **WHEN** the player opens the built game in a browser
- **THEN** the start screen appears without a fatal error and exposes the language
  selector, the audio option and the codex

#### Scenario: Continue saved progress

- **WHEN** bootcamp progress exists and the player activates Continue
- **THEN** the saved station opens at its checkpoint

#### Scenario: Restart

- **WHEN** bootcamp progress exists and the player activates Restart
- **THEN** progress resets and station 1 opens

#### Scenario: Start action reaches the graybox scene

- **WHEN** the player activates the start action with no saved progress
- **THEN** the scene loads and the HUD shell becomes visible

### Requirement: Read-only HUD shell

The player HUD SHALL display the active camera band and a selection summary, and
SHALL read only from the client mirror. The current tick, active path count and
outcome SHALL be shown in the sandbox inspector, not in the player HUD. The HUD
SHALL use Barlow / Barlow Condensed and Lucide icons.

#### Scenario: HUD follows the simulation

- **WHEN** the simulation advances
- **THEN** the HUD indicators update without the HUD owning simulation state

#### Scenario: Debug readouts live in the sandbox

- **WHEN** the sandbox panel is open
- **THEN** it shows the current tick, active path count and outcome, and the
  player top rail does not

#### Scenario: HUD action becomes a command

- **WHEN** the player triggers a HUD action that affects the game
- **THEN** the action is sent as a command through the command boundary

### Requirement: Boot Camp entry and tutorial shell

The start screen SHALL expose localized bootcamp actions. During the bootcamp, the
HUD SHALL show the active station, its mandatory objectives with live progress,
instructor text, failure or completion status and progression through the seven
stations. The panel SHALL read only from frames and exercise state.

#### Scenario: Start screen offers boot camp
- **WHEN** the start screen is shown
- **THEN** it offers a localized bootcamp action without replacing the existing
  language and codex actions

#### Scenario: Tutorial HUD is active
- **WHEN** a bootcamp station is playing
- **THEN** the HUD shows the station number and title, objectives, instructor text
  and live progress

#### Scenario: Feedback resolves through locales
- **WHEN** the active locale changes
- **THEN** bootcamp labels, objectives, failure and debrief update without
  reloading the scene

#### Scenario: Normal HUD is unchanged
- **WHEN** the normal skirmish or sandbox session is played
- **THEN** the exercise panel is absent and the existing orders HUD remains
  available

## REMOVED Requirements

### Requirement: Reference command HUD

**Reason**: It describes a seven-slot action row and Position/Maneuver/Support
category menus that the HUD no longer has; the order board uses Fire, Movement
and Troop sectors.

**Migration**: Replaced by "Command deck composition", which lists every order
button by sector and moves tick, paths and outcome to the sandbox inspector.
