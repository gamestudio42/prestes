# presentation Specification

## Purpose
Defines the browser boot flow, the low-poly graybox scene and the read-only HUD
shell that prove the presentation pipeline before historical content is produced.

## Requirements

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

### Requirement: Low-poly graybox scene

The scene SHALL render a period low-poly world with terrain, buildings and
original 1920s character silhouettes using flat-shaded geometry, toon materials
and a single theme palette. A graybox remainder SHALL stay explicitly named.

#### Scenario: Placeholder scene renders

- **WHEN** the scene loads
- **THEN** terrain, at least one building and at least one 1.75 m character silhouette are visible

#### Scenario: Placeholders are named

- **WHEN** the project is inspected for placeholder assets or systems
- **THEN** each remaining placeholder is explicitly named as a placeholder or TODO

### Requirement: Camera bands

The scene SHALL use a continuous orthographic camera with tactical, transition
and strategic bands, 40â€“45Â° tactical tilt, top-down strategic view, pan, rotate
and zoom controls, texel snapping and an active-band indicator.

#### Scenario: Camera controls respond

- **WHEN** the player uses the pan, rotate and zoom inputs
- **THEN** the camera moves continuously and the active band indicator updates

#### Scenario: Band switch preserves the world

- **WHEN** the player switches between strategic and tactical bands
- **THEN** no entity is created, duplicated or removed by the switch

### Requirement: Low-resolution render pipeline

The scene SHALL render through a low internal resolution and upscale to the
display with nearest-neighbour sampling. The composite SHALL apply a depth-edge
outline, restrained bloom, soft shoulder, colour grade, posterized dither and
vignette, with a player-facing toggle between the strong Vazante-like look and a
cleaner mode.

#### Scenario: Internal resolution is lower than display

- **WHEN** the scene runs at a normal desktop window size
- **THEN** the internal render target is smaller than the display resolution and the upscale is visible

#### Scenario: Post toggle changes the look

- **WHEN** the player toggles the post effect
- **THEN** the strong outline/dither/vignette composite is replaced by the cleaner mode without reloading

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

### Requirement: Small-character readability

Character models SHALL stand about 1.75 m tall and SHALL scale up with camera
span so they remain readable at strategic zoom without becoming oversized at
tactical zoom.

#### Scenario: Strategic zoom keeps units readable

- **WHEN** the camera zooms from tactical to strategic
- **THEN** the character screen size stays above a readable minimum

#### Scenario: Tactical zoom preserves scale

- **WHEN** the camera is at tactical span
- **THEN** character scale is 1.0 relative to their 1.75 m model height

### Requirement: Movement path visualization

The view SHALL draw a dashed route, waypoint crosses and an order marker for each
active move order. Paths SHALL clear when the order completes and SHALL be
limited to the selected or explicitly requested order set.

#### Scenario: Debug move draws a path

- **WHEN** the player triggers the debug move action
- **THEN** a dashed route and at least one waypoint cross appear and the HUD path count is greater than zero

#### Scenario: Arrival clears the path

- **WHEN** every unit in the order reaches its target
- **THEN** the route disappears and the HUD path count returns to zero

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

### Requirement: Character part rig

The character proxy SHALL be built from named parts: body, head, hat, two legs,
two arms, rifle, gear, selection ring and shadow. The rig SHALL keep the 1.75 m
proportions and the existing strategic-scale readability.

#### Scenario: Parts are visible

- **WHEN** a character is rendered at tactical span
- **THEN** body, head, hat, legs, arms and rifle are present in the scene graph

#### Scenario: Scale stays readable

- **WHEN** the camera zooms to strategic span
- **THEN** the character scales up with the existing unit-scale rule

### Requirement: Procedural movement

A moving character SHALL animate its legs and arms with a walk cycle proportional
to distance travelled. A stationary character SHALL settle into an idle pose.

#### Scenario: Walking cycle

- **WHEN** a unit moves across the ground
- **THEN** its legs and arms alternate and the body bobs slightly

#### Scenario: Idle

- **WHEN** a unit is stationary
- **THEN** its limbs return toward the idle pose

### Requirement: Crouched and prone poses

The character SHALL visibly crouch and lie down when the unit stance changes. The
selection ring and shadow SHALL stay on the ground and SHALL NOT rotate with the
body.

#### Scenario: Crouch

- **WHEN** a unit enters crouched stance
- **THEN** its body lowers, its legs bend and its head drops below the standing height

#### Scenario: Prone

- **WHEN** a unit enters prone stance
- **THEN** its body lies near the ground while the ring and shadow remain flat

#### Scenario: Return to standing

- **WHEN** a unit returns to standing
- **THEN** the body rises back to the standing pose

### Requirement: Aiming pose in every stance

The character SHALL hold the rifle forward in standing, crouched and prone
stances. The arms SHALL support the weapon in front of the body rather than hang
at the sides.

#### Scenario: Standing aims

- **WHEN** a unit stands
- **THEN** its rifle points forward and both arms reach toward it

#### Scenario: Crouched aims

- **WHEN** a unit crouches
- **THEN** the rifle remains forward while the body lowers

### Requirement: Prone aims forward

A prone character SHALL lie face-down with the body near the ground and the rifle
still pointing forward. The selection ring and shadow SHALL stay flat on the
ground.

#### Scenario: Prone keeps the weapon forward

- **WHEN** a unit lies down
- **THEN** the body rotates face-down but the rifle stays aimed forward

#### Scenario: Prone does not clip

- **WHEN** the prone pose settles
- **THEN** the head and weapon remain above the ground plane

### Requirement: Squad selection and orders

The HUD SHALL show the two player sections with alive counts, and SHALL let the
player select a section. Clicking a friendly unit SHALL select its section.
Right-clicking the ground SHALL move the selected section; right-clicking a living
enemy SHALL attack it.

#### Scenario: HUD selects a section

- **WHEN** the player presses a section button
- **THEN** that section becomes selected and subsequent orders target its living units

#### Scenario: Click selects a unit's section

- **WHEN** the player left-clicks a friendly unit
- **THEN** its section becomes selected

#### Scenario: Right-click orders

- **WHEN** the player right-clicks the ground or a living enemy
- **THEN** the selected section receives a move or attack command

### Requirement: Squad status HUD

The HUD SHALL show the selected section's alive count, health, ammunition and
morale, the objective and the current outcome.

#### Scenario: Status follows the frame

- **WHEN** combat changes health, ammunition or morale
- **THEN** the selected section's HUD values update from the frame

#### Scenario: Outcome is visible

- **WHEN** the outcome becomes victory or defeat
- **THEN** the HUD shows it without a reload

### Requirement: Pause and speed

The HUD SHALL pause the simulation and offer four speeds labelled 0.5x, 1x,
2x and 4x. 1x SHALL be real time, one 0.1 s tick per 100 ms interval; 0.5x
SHALL step one tick every other interval, and 2x and 4x two and four ticks
per interval. The game SHALL start at 1x, and starting, retrying or
continuing an exercise SHALL reset the speed to 1x.

#### Scenario: Pause stops ticks

- **WHEN** the player pauses
- **THEN** the simulation tick stops advancing until resumed

#### Scenario: Default speed

- **WHEN** the player starts or retries the bootcamp or the sandbox
- **THEN** the 1x speed is selected and the client requests one tick per
  100 ms interval

#### Scenario: Speed multiplies ticks

- **WHEN** the player selects 0.5x, 2x or 4x
- **THEN** the client requests on average one half, two or four ticks per
  100 ms interval

### Requirement: Combat feedback

The view SHALL draw a short tracer for each shot and SHALL show dead characters
lying on the ground without a selection ring.

#### Scenario: Shot tracer

- **WHEN** a shot event is received
- **THEN** a short-lived line appears from the shooter to the target

#### Scenario: Dead unit

- **WHEN** a unit dies
- **THEN** its body lies down and its selection ring is hidden

### Requirement: Character yaw

The rendered character SHALL rotate to match the unit's facing direction, so the
rifle points at the target.

#### Scenario: Aim at the enemy

- **WHEN** a unit faces an enemy
- **THEN** the character model and rifle rotate toward it

#### Scenario: Face the route

- **WHEN** a unit moves without a target
- **THEN** the character turns along its path

### Requirement: Path route

The movement path layer SHALL draw the actual waypoint route returned by
pathfinding, not a straight line through the building.

#### Scenario: Detour is visible

- **WHEN** a unit is ordered across the building
- **THEN** the dashed route bends around the building footprint

### Requirement: Basic orders panel

The HUD SHALL show a bottom orders panel in the spirit of Men of War, with a
selected-section card on the left, an order grid in the centre and the current
order and section status on the right. The panel SHALL use the existing Barlow
fonts, Lucide icons and Prestes palette, and SHALL NOT copy another game's art or
layout.

#### Scenario: Panel appears after start

- **WHEN** the player starts the skirmish
- **THEN** the orders panel is visible with section cards, order buttons and status

#### Scenario: Panel follows selection

- **WHEN** the player selects another section
- **THEN** the card, alive count, health, ammunition and morale in the panel update

### Requirement: Section cards

The panel SHALL show a card for each player section with a named placeholder
portrait, section name, alive count and compact health, ammunition and morale
bars. The portrait SHALL be explicitly named as a placeholder until final art
exists.

#### Scenario: Section card status

- **WHEN** combat changes a section's health, ammunition or morale
- **THEN** its card bars and values update from the frame

#### Scenario: Placeholder portrait is named

- **WHEN** the asset register is inspected
- **THEN** the section portrait is listed as a placeholder

### Requirement: Order buttons and modes

The panel SHALL expose move, attack, suppress, flank, withdraw and hold-position
orders, plus standing, crouched and prone stances. Selecting move, attack,
suppress or flank SHALL enter a pending order mode and SHALL show a localized
prompt to pick a target. Withdraw and hold SHALL execute immediately.

#### Scenario: Pending order prompt

- **WHEN** the player presses Suppress
- **THEN** the button becomes active and the panel asks for an enemy target

#### Scenario: Pending order is sent

- **WHEN** the player picks a living enemy while Suppress is pending
- **THEN** the selected section receives a suppress command and the pending mode clears

#### Scenario: Cancel pending order

- **WHEN** the player presses Cancel or Escape
- **THEN** the pending mode clears without sending a command

### Requirement: Immediate orders

Withdraw and hold-position SHALL send their commands immediately for every living
unit in the selected section. The panel SHALL show the resulting current order
without waiting for a target click.

#### Scenario: Withdraw is immediate

- **WHEN** the player presses Withdraw
- **THEN** the panel shows a withdraw order and the selected units receive a withdraw command

#### Scenario: Hold is immediate

- **WHEN** the player presses Hold
- **THEN** the panel shows a hold order and the selected units receive a hold command

### Requirement: Localized order feedback

Every panel label, prompt, active-order label and rejection message SHALL come
from the PT-BR and EN locale catalogs. The panel SHALL contain no hardcoded
player-facing text.

#### Scenario: Locale switch updates the panel

- **WHEN** the player switches between PT-BR and EN
- **THEN** every order label, prompt and status updates without a reload

#### Scenario: Locale catalogs match

- **WHEN** `pnpm check:locales` runs
- **THEN** both catalogs contain the same panel keys

### Requirement: Weapon and ammunition HUD

The selected section's orders panel SHALL show the equipped weapon name and its
magazine and reserve rounds, read from the frame. The labels SHALL come from the
PT-BR and EN catalogs.

#### Scenario: Weapon is visible

- **WHEN** a section is selected
- **THEN** the panel shows its weapon name

#### Scenario: Ammunition updates

- **WHEN** a unit fires or reloads
- **THEN** the panel's magazine and reserve values update from the frame

#### Scenario: Weapon labels are localized

- **WHEN** the player switches locale
- **THEN** the weapon name and note change without a reload

### Requirement: Cover and morale status

The selected section's orders panel SHALL show effective cover, suppression and
the current morale state, using localized labels. The values SHALL come from the
frame and SHALL update as combat changes them.

#### Scenario: Suppressed state is visible

- **WHEN** a section's suppression crosses the threshold
- **THEN** the panel shows the suppressed state

#### Scenario: Routed state is visible

- **WHEN** a unit becomes routed
- **THEN** it is no longer counted as alive and the panel can show the routed state

#### Scenario: Values update

- **WHEN** cover or suppression changes
- **THEN** the panel values update without a reload

### Requirement: Heightfield rendering

The scene SHALL render a low-poly heightfield generated from the shared sandbox
terrain. Characters, movement paths, markers and tracers SHALL be placed at the
terrain height.

#### Scenario: Units follow the ridge

- **WHEN** a unit crosses the ridge
- **THEN** its rendered model rises and falls with the terrain

#### Scenario: Ground picking uses terrain

- **WHEN** the player right-clicks on a slope
- **THEN** the move destination is the terrain point under the cursor, not the flat plane

#### Scenario: Paths follow height

- **WHEN** a path crosses the ridge
- **THEN** its dashes and markers follow the terrain height

### Requirement: Sandbox rendering

The view SHALL render dynamic cover and target dummies from the frame.

#### Scenario: Dynamic cover appears

- **WHEN** a cover is spawned
- **THEN** its mesh appears at the picked point

#### Scenario: Dummy appears

- **WHEN** a target dummy is spawned
- **THEN** a target board appears instead of a soldier

#### Scenario: Dummy hit feedback

- **WHEN** a dummy is hit
- **THEN** its health feedback updates through the existing hit path

### Requirement: Selection feedback

The view SHALL draw a blue rectangle for a leftward drag and a green rectangle for a
rightward drag. The HUD SHALL show how many player units are selected.

#### Scenario: Blue box
- **WHEN** the player drags leftward
- **THEN** a blue selection rectangle appears

#### Scenario: Green box
- **WHEN** the player drags rightward
- **THEN** a green selection rectangle appears

### Requirement: Context cursor hints

Hovering a valid defensive ground point SHALL show a shield icon; hovering a living
enemy SHALL show a target icon. Hints SHALL not issue commands.

#### Scenario: Shield hint
- **WHEN** the cursor is over ground with cover against a legalist
- **THEN** a shield hint is shown

#### Scenario: Target hint
- **WHEN** the cursor is over a living enemy
- **THEN** a target hint is shown

### Requirement: Obstacle rendering

Walls, barrels, low walls, sandbags and the trench SHALL be rendered from the
simulation cover list, and the central house SHALL be absent.

#### Scenario: Mixed cover is visible
- **WHEN** the sandbox loads
- **THEN** walls, barrels, low walls, sandbags and the trench are visible

#### Scenario: House removed
- **WHEN** the sandbox loads
- **THEN** no central house mesh is rendered

### Requirement: Cohesion HUD

The orders panel and sandbox inspector SHALL show the selected troop's cohesion.

#### Scenario: Cohesion updates
- **WHEN** the troop spreads out or regroups
- **THEN** the cohesion value updates from the frame

### Requirement: Order menu by category

The HUD SHALL present orders grouped as attack, movement, defence, organisation and
support, with icon, name, short description, availability and a localized reason
when unavailable.

#### Scenario: Categories
- **WHEN** the player opens the order menu
- **THEN** every order appears under one of the five categories

#### Scenario: Unavailable order
- **WHEN** an order cannot be executed
- **THEN** the menu shows why instead of issuing a silent no-op

### Requirement: Unit order status

The HUD SHALL show primary order, pending condition, interrupts, progress, strength,
morale, cohesion, fatigue, wounded count and officer presence.

#### Scenario: Interrupt visible
- **WHEN** a rescue interrupts a defence
- **THEN** the panel shows the defence as primary and the rescue as an interrupt

#### Scenario: Unit state changes
- **WHEN** morale, cohesion, fatigue or strength changes
- **THEN** the panel updates from the frame

### Requirement: Rescue indicator

The HUD SHALL show rescuer, casualty, phase and progress for an active rescue.

#### Scenario: Rescue progress
- **WHEN** a rescue is active
- **THEN** the panel shows its phase and progress

#### Scenario: Completion
- **WHEN** a rescue completes or fails
- **THEN** the panel shows a localized completion or failure event

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

### Requirement: Preview control

The command bar SHALL expose a visible Preview toggle. It SHALL be off by
default, change state with a button and show the active state.

#### Scenario: Preview toggle is off by default
- **WHEN** the HUD loads
- **THEN** the Preview control is inactive and no preview overlay is drawn

#### Scenario: Toggle preview
- **WHEN** the player clicks Preview
- **THEN** the control becomes active and hover previews are enabled

### Requirement: Hide and restore HUD

The HUD SHALL provide an explicit control to hide the whole HUD and a visible
restore affordance while hidden.

#### Scenario: Hide HUD
- **WHEN** the player activates Hide HUD
- **THEN** the command bar and all HUD panels disappear while the map remains
  interactive

#### Scenario: Restore HUD
- **WHEN** the player activates the restore control
- **THEN** the HUD returns in the same state

#### Scenario: Keyboard restore
- **WHEN** the HUD is hidden and the player presses the hide-HUD shortcut
- **THEN** the HUD is restored

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

- **WHEN** the player uses Preview, Hide HUD, speed, stance, formation, orders,
  sandbox or codex
- **THEN** the control remains reachable and performs the same command as before

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

### Requirement: Mission objective HUD

During the bootcamp exercise the HUD SHALL show the current phase, the active
mission objectives, live objective progress, instructor text and phase progress.
It SHALL NOT require the player to complete a permanent list of every HUD action.
Optional drill hints SHALL be collapsible.

#### Scenario: Objective cards

- **WHEN** a phase is active
- **THEN** the panel lists that phase's objectives with their current progress

#### Scenario: Objective updates live

- **WHEN** the simulation frame changes soldier positions, suppression or the phase
  timer
- **THEN** the objective values update from the frame

#### Scenario: Optional drills

- **WHEN** the player expands the drill hints
- **THEN** the relevant commands are shown without gating phase progress

### Requirement: Objective markers

The scene SHALL render the active phase objective zones, enemy approach and
fallback positions as localized, readable markers. Markers SHALL be presentation
only and SHALL NOT create simulation cover or collision.

#### Scenario: Zone marker

- **WHEN** the current objective is a reach, secure or hold zone
- **THEN** the scene shows a ring and translucent area at that zone

#### Scenario: Approach marker

- **WHEN** the hold phase starts
- **THEN** the scene marks the expected enemy approach

#### Scenario: Marker cleanup

- **WHEN** a phase completes
- **THEN** markers for the previous phase are removed

### Requirement: Failure and debrief HUD

The HUD SHALL show a localized failure reason and retry controls when the exercise
fails, and a localized debrief with exercise values when it completes. Failure
SHALL pause the simulation. The debrief SHALL offer replay and continue.

#### Scenario: Failure

- **WHEN** the hold phase fails
- **THEN** the simulation pauses and the HUD shows the reason and retry actions

#### Scenario: Debrief

- **WHEN** the hold phase succeeds
- **THEN** the simulation pauses and the HUD shows completion time and unit status

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

### Requirement: Cover slot markers

Hovering a cover object SHALL show its slots as small markers, distinguishing
free and taken slots, and the number of free slots. Slot markers SHALL follow the
terrain height and SHALL not be drawn when no cover is hovered and no order is
pending.

#### Scenario: Hover a trench

- **WHEN** the player hovers the training trench
- **THEN** its slots appear with free and taken markers and a free count

#### Scenario: Markers hidden

- **WHEN** no cover is hovered and no order is pending
- **THEN** no slot markers are drawn

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

### Requirement: Legs follow the ground

Each movement clip SHALL declare the ground speed it was authored for (walk
1.5, walk-ready 1.4, run 3.5, crouch-walk 1.0, crawl 0.4 m/s). The view
SHALL choose the clip by the soldier's ground speed (idle below 0.2, walk
below 2.2, run above; crouched and prone keep their own clips) and play it
at the actual speed over the authored one, clamped to 0.75..1.25. Movement
clips SHALL cross-fade over about 0.3 s.

#### Scenario: A walking soldier
- **WHEN** a soldier on a move order walks at 1.5 m/s at 1x
- **THEN** he plays the walk clip at its authored rate

#### Scenario: A withdrawing soldier runs
- **WHEN** a section withdraws
- **THEN** its soldiers play the run clip

#### Scenario: No skating
- **WHEN** a soldier slows from a run to a stop
- **THEN** the clip changes from run to walk to idle with cross-fades, and
  no clip plays outside 0.75..1.25 of its rate

### Requirement: Smooth turning

The soldier's body SHALL turn toward his facing at up to about 270 degrees a
second, the shortest way round, rather than snapping.

#### Scenario: About face
- **WHEN** a halted soldier's facing turns 180 degrees in one tick
- **THEN** his body takes about two thirds of a second to turn round

### Requirement: Front mark

At tactical span the ring under each soldier SHALL carry a small arrowhead
on its edge pointing where he faces, turning with him, in the ring's colour.
The vision cone SHALL NOT be drawn; it is a mechanic only. The strategic
proxies SHALL keep the plain ring.

#### Scenario: Front at a glance
- **WHEN** a section faces north at tactical span
- **THEN** each soldier's ring mark points north and no cone is drawn

#### Scenario: Recon sweep shows
- **WHEN** a recon section sweeps
- **THEN** the marks swing left and right with the soldiers' facing
