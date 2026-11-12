# presentation Specification

## Purpose
Defines the browser boot flow, the low-poly graybox scene and the read-only HUD
shell that prove the presentation pipeline before historical content is produced.

## Requirements

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

The tactical-span character SHALL be the Blender-built soldier: one 1.75 m
model with an armature (hips, spine, chest, head, arms, legs and a rifle bone)
and the Mauser as part of the model. Outfits SHALL distinguish the column, the
legalists and the officer through the shared texture atlas. The model SHALL
keep the 1.75 m proportions and the existing strategic-scale readability, and
the selection ring and shadow SHALL stay separate ground marks.

#### Scenario: Parts are visible

- **WHEN** a character is rendered at tactical span
- **THEN** body, head, hat, legs, arms and rifle are present in the model

#### Scenario: Scale stays readable

- **WHEN** the camera zooms to strategic span
- **THEN** the character scales up with the existing unit-scale rule

#### Scenario: Factions are told apart

- **WHEN** a column soldier and a legalist stand side by side
- **THEN** their outfits differ in colour and headgear

### Requirement: Procedural movement

A moving character SHALL play the walk clip (or crouch-walk or crawl for its
stance) at a rate proportional to its ground speed, and a stationary character
SHALL play the idle clip of its stance, cross-fading between them.

#### Scenario: Walking cycle

- **WHEN** a unit moves across the ground
- **THEN** its legs and arms alternate and the body bobs slightly

#### Scenario: Idle

- **WHEN** a unit is stationary
- **THEN** its limbs return toward the idle pose

### Requirement: Crouched and prone poses

The character SHALL visibly crouch and lie down when the unit stance changes,
through the crouch and prone clips. The selection ring and shadow SHALL stay on
the ground and SHALL NOT rotate with the body.

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

The view SHALL show each shot with a muzzle flash at the shooter, smoke (once
per burst for automatic fire), a short tracer and an impact effect where it
lands (dust on ground, splinters or dust on cover), and SHALL show moving
soldiers raising footstep dust and suppressed soldiers with dirt spurts
around them. Every round of a burst or belt SHALL draw its own tracer; the
machine gun's tracers SHALL be longer and faster than a rifle's and of a
different hue, so its fire is told apart at a glance; every tracer SHALL be
one render pixel wide, without a glow that widens it, in the tactical and the
strategic camera bands. Dead characters SHALL lie on the ground in the corpse pose
without a selection ring. All of it SHALL be presentation-only and SHALL NOT
mutate frames, orders, RNG or state hashes.

#### Scenario: Shot tracer

- **WHEN** a shot event is received
- **THEN** a short-lived line appears from the shooter to the target

#### Scenario: A burst draws a tracer per round

- **WHEN** a machine gun fires a burst of six rounds
- **THEN** six tracers fly from the gun, one per round, in the order fired

#### Scenario: Tracers read at strategic zoom

- **WHEN** the camera is in the strategic band and a rifle and a machine gun fire
- **THEN** both tracers are one render pixel wide and the machine gun's is longer and of its own hue

#### Scenario: Muzzle and impact

- **WHEN** a shot event is received
- **THEN** a muzzle flash appears at the shooter and an impact effect at the
  target's position, matching what it hit

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

The HUD SHALL present a field-kit command deck: a single-line top bar of
framed rails (brand, camera band, objectives and clock, language and
leave, pause and speed, routes and post), icon controls with localized
titles, and the docked Troops, Troop summary and Orders panels. All
existing controls, readouts, test ids and localized labels SHALL remain
available.

#### Scenario: Desktop command deck

- **WHEN** the game runs at desktop width
- **THEN** the top bar occupies one row, the docked panels sit at the left and right edges, and the centre of the map stays clear

#### Scenario: Icon control stays discoverable

- **WHEN** a utility control renders as an icon only
- **THEN** it exposes a localized title and aria label and keeps its active state

#### Scenario: Existing HUD controls remain

- **WHEN** the player uses Preview, Hide HUD, speed, stance, formation or orders
- **THEN** the control remains reachable and performs the same command as before

### Requirement: Period low-poly HUD styling

The HUD and menus SHALL use the pixel kit over the low-poly scene: the sepia
period palette from shared tokens, Pixelify Sans at its crisp sizes, panels and
buttons with 2 px borders and stepped corners, hard offset shadows without
blur, and pixel focus and pressed states. They SHALL NOT use rounded corners,
blurred shadows, CDN fonts or player-facing hardcoded text. The main menu SHALL
show an animated pixel-art scene of the column marching along a road at dusk,
drawn in code and held still when the player prefers reduced motion, with the
desk objects laid over it. The arrow keys SHALL move the focused object and
Enter SHALL open it. The public-domain photograph SHALL appear pixelated in the
sepia palette as the compendium's cover.

#### Scenario: Sepia treatment

- **WHEN** the HUD is visible
- **THEN** panels use the sepia ink, parchment and gold tokens of the period palette, not a green terminal palette

#### Scenario: Pixel treatment

- **WHEN** the HUD is visible
- **THEN** panels and buttons have 2 px borders, stepped corners and hard shadows, and all text uses Pixelify Sans

#### Scenario: Readable at the reference size

- **WHEN** the bootcamp HUD is shown at 1440 x 900 in PT-BR or EN
- **THEN** no HUD label, order name or objective row overflows its control

#### Scenario: Marching menu

- **WHEN** the main menu is open
- **THEN** soldiers march across the pixel scene behind the desk objects, and the arrow keys move the focused object and Enter opens it

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

### Requirement: Responsive command deck

The battle HUD SHALL keep the reference composition from 1280 x 720 up and
SHALL adapt without clipping: panels shrink and scroll inside, type steps
down one size below 1440 wide, and every control SHALL remain reachable by
pointer or keyboard.

#### Scenario: Desktop composition

- **WHEN** the game runs at 1790 x 878
- **THEN** the top bar, five troop cards, the Troop summary and every order group are visible without scrolling

#### Scenario: Narrow composition

- **WHEN** the game runs at 1280 x 720 in PT-BR or EN
- **THEN** no label overflows its control and every order is reachable without scrolling the Orders column

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

### Requirement: Visible command row status

The HUD SHALL show the selection count and the current order as visible
text in the Troop summary's header, the concealed, revealed and ferry
counts as badges in the Troop summary when they are not zero, and the body
stance by the active body control with a text alternative. No separate
command status row SHALL be drawn.

#### Scenario: Status is readable

- **WHEN** the section is selected with no order
- **THEN** the Troop summary's header visibly shows the selection count and "no order" in the active locale, and the standing body control is shown active

#### Scenario: Concealed badge

- **WHEN** four men of the selected section are hidden in vegetation
- **THEN** the Troop summary shows a concealed badge with 4

### Requirement: Command deck composition

The HUD SHALL follow the field-kit composition: a top bar with brand,
camera band control (with the strategic layer switches in the strategic
band), objectives and clock, language, leave, pause, speed, routes and post
controls, and no sandbox control; the compass at the top right; Troops docked top-left
with a card per section (portrait slot, name, army, alive count and health,
ammunition and morale bars); the Troop summary docked bottom-left with the
section's name, army, selection and order, one figure per soldier,
weapon card and status icons; and Orders docked right as a column of movement, fire
and manoeuvre, position, posture, body, pace, fire and formation groups.

#### Scenario: Reference layout

- **WHEN** the game is running at desktop width
- **THEN** the top bar, Troops, Troop summary and Orders are visible in their places

#### Scenario: Every order on the board

- **WHEN** the Orders column renders
- **THEN** every order of the order catalogue is in its group with its localized label and availability

#### Scenario: Weapon and section status

- **WHEN** the frame updates
- **THEN** the troop cards and the Troop summary update health, ammunition, morale, cover, cohesion, suppression and equipment from the frame

#### Scenario: Hide and restore

- **WHEN** the player hides the HUD
- **THEN** the panels and ornaments disappear and the restore affordance remains available as before

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

### Requirement: Blender art pipeline

In-game models SHALL be built by Blender Python scripts in `art-src/`, saved as
editable `.blend` sources and exported to glTF; `pnpm art` SHALL rebuild them
and `pnpm models` SHALL prune and deduplicate the exports into the game. The
exported models and textures SHALL be committed so building and testing do not
need Blender. All models and textures SHALL be original and recorded in the
asset register.

#### Scenario: Rebuild from source

- **WHEN** `pnpm art` runs with Blender installed
- **THEN** the `.blend` sources and glTF exports are regenerated and `pnpm
  models` writes them to `apps/game/public/models/`

#### Scenario: Build without Blender

- **WHEN** the game is built on a machine without Blender
- **THEN** it uses the committed models and textures

### Requirement: Pixel-textured low-poly world

Models SHALL use small pixel-art textures (32 to 64 px per surface) in the
sepia palette with nearest filtering and no mipmaps, over the existing toon
shading and pixel post, so the world matches the pixel interface.

#### Scenario: Crisp texels

- **WHEN** a building is seen at tactical span
- **THEN** its texture shows hard-edged texels in palette colours, not blurred
  gradients

### Requirement: Training ground models

The training ground's buildings, fortifications and props SHALL be drawn with
the modelled assets placed from the shared training-ground data: barracks,
chapel, farmhouse, barn, aid tent, flagpole, target frames and butts, trench
sections with sandbag parapets, stone and low walls, crates, barrels, trees,
hedges and fences. Cover models SHALL follow each cover's footprint and
rotation, so what the player sees matches the simulation's cover and slots.

#### Scenario: Cover matches its footprint

- **WHEN** a trench cover of 14 m is drawn
- **THEN** its model spans the same 14 m and its slots sit inside it as before

### Requirement: Every faction animates alike

Soldiers of every faction SHALL choose their clip from the same snapshot rules:
walking, running, crouching and lying down by stance and movement, the rifle at
the ready in contact, aiming and firing when shooting, staggering when hit and
the corpse when dead. An enemy soldier SHALL NOT hold one aiming clip while his
simulation state changes.

#### Scenario: Enemy takes cover
- **WHEN** an enemy soldier runs to cover and goes prone
- **THEN** he plays the run clip on the way and the prone clip in cover

#### Scenario: Enemy between shots
- **WHEN** an enemy soldier fires and then waits for his next aimed shot
- **THEN** he plays the fire clip for the shot and an aiming or ready clip in between, matching his stance

### Requirement: Menu gramophone

The start screen SHALL show a period gramophone as a closed, draggable desk
object over the menu scene. Activating it SHALL open a centered gramophone
screen with the larger machine, the current recording's title, composer,
performer, year, genre, label, catalog number, public-domain year and source, a
rack of the recordings, and previous, play/pause and next controls with
localized accessible labels. The record SHALL NOT rotate; while a track plays,
the groove highlights on the record SHALL shimmer subtly. The closed object
SHALL stay clear of the book covers at the reference desktop size, and the
screen SHALL adapt to narrow viewports. The closed gramophone SHALL carry the
localized "Gramofone"/"Gramophone" label below the art. The "From the next room"
subtitle SHALL NOT be shown.

#### Scenario: Gramophone is visible

- **WHEN** the start screen opens
- **THEN** the closed gramophone is visible without opening a separate page

#### Scenario: Closed label and no subtitle

- **WHEN** the closed gramophone is shown
- **THEN** its label sits below the art and the "From the next room" subtitle is absent

#### Scenario: Gramophone opens

- **WHEN** the player activates the closed gramophone
- **THEN** a centered screen shows the machine, the current recording, the record rack and the transport

#### Scenario: Transport is accessible

- **WHEN** the player tabs to or hovers a gramophone control
- **THEN** it shows a localized accessible label and a visible focus state

#### Scenario: Track line

- **WHEN** the current track changes
- **THEN** the screen updates the title, composer, performer, year and track position, and the active rack row moves

#### Scenario: Gramophone moves

- **WHEN** the player drags the gramophone and releases it
- **THEN** it stays where it was dropped and its transport keeps working

### Requirement: First-gesture start and hint

The gramophone SHALL NOT play before a player gesture. The first click or key
on the menu SHALL start it with a slow fade, and while it is waiting the
widget SHALL visually offer the play action. Pressing Play when game sound is
muted SHALL enable sound and start the track.

#### Scenario: Waiting state

- **WHEN** the start screen opens and no gesture has happened
- **THEN** the gramophone is paused and the play action and a short hint are
  visible

#### Scenario: First gesture

- **WHEN** the player clicks or presses a key anywhere on the menu
- **THEN** the current track fades in instead of starting abruptly

#### Scenario: Play enables sound

- **WHEN** game sound is muted and the player presses the gramophone's Play
  control
- **THEN** game sound is enabled and the track starts

### Requirement: Track metadata card

Changing track SHALL show the recording's metadata. In the book screen the
metadata appears in a localized card with the title, composer, performer, year,
genre, label, catalog number, public-domain year and a link to the source page;
the card SHALL be announced politely to assistive technology, SHALL dismiss
itself after a few seconds and SHALL NOT replace the persistent track line. In
the desk screen the open gramophone screen shows the same metadata persistently
and the active rack row moves; the source link SHALL remain reachable.

#### Scenario: Card on change

- **WHEN** the player moves to another track or a track ends and the next one
  starts in the book screen
- **THEN** the metadata card appears for the new track

#### Scenario: Desk screen metadata

- **WHEN** the current track changes on the desk screen
- **THEN** the gramophone screen shows the new title, composer, performer, year, genre, label, catalog, public-domain year and source, and the active rack row moves

#### Scenario: Card dismisses

- **WHEN** the card has been visible for its timeout
- **THEN** it disappears without stopping playback

#### Scenario: Source is reachable

- **WHEN** the player activates the source link
- **THEN** the Discografia Brasileira page for that recording opens

### Requirement: Motion and localization

The gramophone record SHALL spin only while a track is playing and SHALL stay
still when the player prefers reduced motion. Every player-facing label,
including transport labels, the hint and the card labels, SHALL come from the
PT-BR and EN catalogs.

#### Scenario: Reduced motion

- **WHEN** the player prefers reduced motion
- **THEN** the record does not spin and the controls remain usable

#### Scenario: Locale switch

- **WHEN** the player switches between PT-BR and EN
- **THEN** the gramophone labels and card labels update without a reload

### Requirement: Desk start screen with draggable objects

The start screen SHALL present the menu as physical objects on a camp table
under a tent at dusk, rasterized from the owner's drawing, which covers the
view and gives way at the sky first: a campaign book, a compendium book, a
reference pile, an options compass, a skirmish map pile, the record player
and the field glasses that open the map editor. Every closed object SHALL be
drawn at the camp table's scale, so it keeps the size of the owner's layout
at any view size. The player SHALL be able to drag each object anywhere
inside the start-screen area with a pointer, and the object SHALL stay fully
inside the viewport. Dragging SHALL NOT create a text selection. Every closed
object SHALL carry a single localized label on a small dark plate below its
art, using the same font, size and gap; the campaign label SHALL read
"Campanha"/"Campaign" and the compendium label "A Coluna Prestes"/"The Prestes
Column". The object most recently interacted with SHALL be drawn in front.
The desk SHALL expose a localized "tidy desk" action that restores the
default arrangement, the places of the owner's layout drawing, and closes the
open objects. A window resize SHALL carry placed objects with the table.
Every player-facing label SHALL come from the PT-BR and EN catalogs, and every
desk sprite and the camp table SHALL be recorded in the asset register; they
MAY be rasterized from owner-supplied references, which stay out of the
repository.

#### Scenario: Desk loads

- **WHEN** the player opens the start screen
- **THEN** the camp table covers the view and the seven desk objects appear at the places of the owner's layout

#### Scenario: Closed objects are labeled

- **WHEN** the desk is closed
- **THEN** every object shows its localized label on a plate below the art, with the same font and gap, and no title is painted on a book cover

#### Scenario: Objects follow the table's scale

- **WHEN** the view is resized
- **THEN** every closed object is drawn at the camp table's new scale and placed objects keep their place on the table

#### Scenario: Drag an object

- **WHEN** the player drags an object and releases it
- **THEN** the object stays where it was dropped, snapped to the 2 px grid, and is drawn in front

#### Scenario: Drag never selects text

- **WHEN** the player drags any object
- **THEN** the object moves and no text selection is created

#### Scenario: Object stays in view

- **WHEN** the browser window shrinks below an object's position
- **THEN** the object is moved back fully inside the view

#### Scenario: Tidy desk

- **WHEN** the player activates "tidy desk"
- **THEN** every object returns to its place in the owner's layout and the open objects close

#### Scenario: Locale switch updates the desk

- **WHEN** the locale changes between PT-BR and EN
- **THEN** every desk object name, hint and action label updates without a reload

#### Scenario: Art is registered

- **WHEN** the asset register is read
- **THEN** each desk sprite and the camp table are listed with their source, author and licence

### Requirement: Independent menu books with page turning

The campaign book and the compendium book SHALL be independent objects. Each
SHALL open into a centered, full-screen two-page spread shown as an overlay and
close back to its cover at the desk position it had before opening, both MAY be
open at the same time, and opening or closing one SHALL NOT
change the other. The closed books SHALL carry their labels below the art: the
campaign "Campanha"/"Campaign" and the compendium "A Coluna Prestes"/"The
Prestes Column". An open book SHALL turn its pages with visible previous and
next controls or the left and right arrow keys. The campaign book SHALL show the existing "campaign
in preparation" content and an action that brings the map fan to the front. The
compendium book SHALL show the existing section index and entry content.

#### Scenario: Closed books are labeled

- **WHEN** the books are closed
- **THEN** the campaign shows "Campanha"/"Campaign" and the compendium shows "A Coluna Prestes"/"The Prestes Column" below their art

#### Scenario: Both books open at once

- **WHEN** the player opens the campaign book and then the compendium book
- **THEN** both books remain open

#### Scenario: Close a book

- **WHEN** the player presses Escape or the book's close control
- **THEN** that book closes and the other book stays as it was

#### Scenario: Turn a page

- **WHEN** the player activates the next-page control
- **THEN** the book shows the next page with its turn state

#### Scenario: Campaign action opens the maps

- **WHEN** the player activates the campaign book's skirmish action
- **THEN** the map fan is brought to the front and focused

### Requirement: Options compass

The options object SHALL be a compass. The closed compass SHALL carry the
localized "Opções"/"Options" label below the art, like every desk icon.
Activating it SHALL open a centered field-manual screen with the "Options"
heading, the compass, the sound toggle and the language selector. The sound
toggle SHALL keep its no-autoplay behavior, so activating it does not start the
menu music, and its label SHALL reflect the current sound state. The compass
SHALL expose a localized accessible name and expanded state.

#### Scenario: Compass is closed

- **WHEN** the start screen opens
- **THEN** the compass shows the "Opções"/"Options" label below its art and no open screen

#### Scenario: Compass opens

- **WHEN** the player activates the compass
- **THEN** a centered screen shows the options heading, the compass, the sound toggle and the language selector

#### Scenario: Compass closes

- **WHEN** the player activates the compass again or presses Escape
- **THEN** it closes

#### Scenario: Sound and language still work

- **WHEN** the player toggles sound or changes language from the compass
- **THEN** the existing audio and locale behavior updates and the sound toggle does not start the menu music

### Requirement: Reference books dossier

The reference pile SHALL be a closed desk icon labelled "Referências"/"References"
below the art. Activating it SHALL open a centered dossier with a preface
explaining that the books inspired the game as a way of preserving the memory of
Carlos Prestes, and a list of the works consulted: Neill Macaulay, Jorge Amado,
the "O Tempo e o Vento" series by Erico Verissimo, and Jacob Blanc. Each entry
SHALL link to an external catalogue record and reproduce no protected text. The
dossier SHALL close back to the pile, and its labels SHALL come from the PT-BR
and EN catalogs.

#### Scenario: Pile opens the dossier

- **WHEN** the player activates the reference pile
- **THEN** a centered dossier shows the preface and the four linked entries

#### Scenario: Sources are reachable

- **WHEN** the player activates an entry
- **THEN** the catalogue record for that work opens in a new tab

#### Scenario: Pile closes

- **WHEN** the player activates the close control
- **THEN** the dossier closes and the pile returns to the desk

### Requirement: Desk layout persistence

The desk SHALL remember the object positions for the viewer under its own
storage key and SHALL NOT read or write the existing audio, locale, gramophone
or route keys. When storage is unavailable or the saved value is invalid, the
desk SHALL use the default arrangement. The desk SHALL keep every object inside
the view on load and on resize.

#### Scenario: Remember positions

- **WHEN** the player drags an object and reloads
- **THEN** the object returns to the dropped position

#### Scenario: Storage unavailable

- **WHEN** storage throws or contains an invalid value
- **THEN** the desk loads at the default arrangement without an error

#### Scenario: Resize keeps objects in view

- **WHEN** the viewport changes after a saved position is loaded
- **THEN** the object is clamped inside the view

### Requirement: Desk keyboard and reduced motion

Every desk object SHALL be reachable by keyboard with a visible focus state.
The arrow keys SHALL move the focused object, Shift SHALL move it by a larger
step, Enter or Space SHALL open or activate it, and Escape SHALL close an open
object. Under `prefers-reduced-motion: reduce` the open, page-turn and record-groove
animations SHALL be disabled while every action remains available.

#### Scenario: Keyboard moves an object

- **WHEN** the focused object receives an arrow key
- **THEN** it moves and stays inside the view

#### Scenario: Keyboard opens an object

- **WHEN** the focused object receives Enter or Space
- **THEN** it opens or activates

#### Scenario: Escape closes an object

- **WHEN** an object is open and Escape is pressed
- **THEN** it closes

#### Scenario: Reduced motion

- **WHEN** the player prefers reduced motion
- **THEN** no open, page-turn or record-groove animation runs and every control still works

### Requirement: Skirmish-first boot flow

The game SHALL load in a supported desktop browser and reach a start screen with
the game title, a final tagline, a language selector, an audio option, the codex
and the skirmish action. The campaign page SHALL say, localized in PT-BR and EN,
that the campaign and its manual are in preparation and SHALL lead to the
skirmish page; it SHALL NOT offer a bootcamp. Saved bootcamp progress SHALL be
ignored and cleared. The period kicker SHALL appear once.

#### Scenario: Start screen loads

- **WHEN** the player opens the built game in a browser
- **THEN** the start screen appears without a fatal error and exposes the language
  selector, the audio option and the codex

#### Scenario: No bootcamp on the menu

- **WHEN** the player opens any page of the book menu
- **THEN** no bootcamp start, continue or restart action is offered

#### Scenario: Old progress is cleared

- **WHEN** the game loads with saved bootcamp progress in local storage
- **THEN** the progress is removed and the menu shows no bootcamp action

#### Scenario: Skirmish reaches the scene

- **WHEN** the player starts the 3 vs 3 from the skirmish page
- **THEN** the scene loads and the HUD shell becomes visible

### Requirement: Battle HUD controls

The battle HUD SHALL let the player centre the view on the selected section: a
double-click on the Troop Summary SHALL focus the camera on the selected
section without changing the zoom band, and a double-click on a squad card
SHALL select that section and centre the view on it. The HUD SHALL offer a
control to leave the battle for the desk; it SHALL ask for confirmation before
leaving, and cancelling SHALL leave the battle unchanged. The battle HUD SHALL
NOT offer the codex; the menu's compendium book SHALL remain the only way to
read it. Every new label and confirmation text SHALL exist in PT-BR and EN.

#### Scenario: Double-click the Troop Summary
- **WHEN** the player double-clicks the Troop Summary
- **THEN** the camera moves to the selected section and keeps the current zoom band

#### Scenario: Double-click a squad card
- **WHEN** the player double-clicks a squad card
- **THEN** that section becomes selected and the camera centres on it

#### Scenario: Leaving asks first
- **WHEN** the player presses the leave control and confirms
- **THEN** the battle closes and the desk returns

#### Scenario: Cancelling keeps the battle
- **WHEN** the player presses the leave control and cancels
- **THEN** the battle continues unchanged

#### Scenario: No codex in battle
- **WHEN** the battle HUD is shown
- **THEN** no codex control or panel is offered, while the desk's compendium book still opens

#### Scenario: Labels in both languages
- **WHEN** the locale switches between EN and PT-BR
- **THEN** the centring, leave and confirmation labels follow it

### Requirement: Machine-gun state on the weapon card

When the selected section holds a machine gun, the HUD weapon card SHALL
show the gun's state, read from the frame: moving, setting up (with the time
left), set, or without a gunner. The labels SHALL come from the PT-BR and EN
catalogs.

#### Scenario: Setting up is shown

- **WHEN** the player selects a machine-gun section that halted 2 s ago
- **THEN** the weapon card shows the gun setting up, with about 2 s left

#### Scenario: Set gun is shown

- **WHEN** the gun has stood still for 4 s
- **THEN** the weapon card shows it set

#### Scenario: Gun state is localized

- **WHEN** the player switches locale
- **THEN** the gun state label changes without a reload

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

### Requirement: Skirmish map pile of authored maps

The skirmish object SHALL present the saved skirmish maps (and, in
development builds, the test map) as a pile of yellowed parchment cards lying
flat on the table in its perspective, one card per map, any number of them
from one up; every saved map SHALL add its own card. The chosen map SHALL lie
on top, square, with its print showing whole through the card's window, its
localized name and the deploy stamp; the other cards SHALL lie beneath it,
each turned a little so its edge shows. The pile SHALL carry the localized
"Mapas"/"Maps" label below the art. Selecting a card beneath SHALL bring it to
the top; activating the top card or its stamp SHALL open the skirmish setup on
that map. The selected map SHALL survive a tidy desk or a return to the start
screen during the session. With no map to show, the object SHALL show a
single blank card reading "Nenhum mapa ainda — abra o editor" / "No maps yet —
open the editor", with no deploy action.

#### Scenario: Pile shows every saved map

- **WHEN** the player opens the start screen with three skirmish maps saved
- **THEN** the pile holds three cards, each reachable with its localized name, and the "Mapas"/"Maps" label sits below the pile

#### Scenario: Empty pile

- **WHEN** the player opens the start screen in the published game with no skirmish map saved
- **THEN** a blank card says there are no maps yet and points to the editor, and nothing can be deployed

#### Scenario: Top card is printed

- **WHEN** the player looks at the top card
- **THEN** the map's print shows whole through its window, with its name and deploy stamp on the card's legend strip

#### Scenario: Select a map

- **WHEN** the player selects a card beneath the top one
- **THEN** it comes to the top with its print, name and stamp

#### Scenario: Open the setup

- **WHEN** the player activates the top card or its stamp
- **THEN** the skirmish setup opens on that map

#### Scenario: Selected map survives

- **WHEN** the player tidies the desk or returns to the start screen
- **THEN** the selected map is still selected

### Requirement: Field-kit HUD art

The battle HUD SHALL be framed as a field commander's kit: wood and leather
panel frames, gold pixel-caps panel titles, a parchment card for the troop
summary, the brand with the national flag emblem, a brass bezel for the
compass and ornaments (lantern, cloth drapes, slouch hat, canteen, and a
bottom strip with a bedroll, a Mauser rifle, an ammunition box and a
first-aid kit), all decorative. Frames SHALL be pixel nine-slices scaled
by whole pixels with nearest filtering. The art SHALL come from an Aseprite
source with one named slice per frame and ornament, exported to a committed
sheet and index so building and testing do not need Aseprite; it MAY be
traced or rasterized from the owner's reference image, which the owner gave
for this use, and SHALL be listed in the asset register with that origin.
Ornaments SHALL NOT cover a control, SHALL NOT receive pointer input, SHALL
NOT show game state and SHALL hide with the HUD.

Historical note: the emblem is the national flag, carried by both sides;
the ornaments are generic kit recorded in `docs/history/FORCES.md` and
`WEAPONS.md`.

#### Scenario: Framed panels

- **WHEN** a battle starts at 1790 x 878
- **THEN** the top bar, Troops, Troop summary and Orders are drawn in the wood frames with gold titles, and the Troop summary on parchment

#### Scenario: Ornaments let clicks through

- **WHEN** the player clicks the map where the bottom strip's rifle is drawn
- **THEN** the click reaches the map as if the strip were not there

#### Scenario: Registered art

- **WHEN** the asset register is read
- **THEN** the HUD frames and ornaments are listed with their Aseprite source path and as drawn from the owner's reference with the owner's permission

#### Scenario: Art follows the source

- **WHEN** a frame is redrawn in the Aseprite source and the export runs
- **THEN** the exported sheet and index change and the battle HUD shows the new frame

### Requirement: Docked HUD panels

The battle HUD SHALL dock three panels at the screen's edges: Troops (the
troop selector) top-left under the top bar, Troop summary (the selected
troop) bottom-left, and Orders (every order, posture, stance, pace, fire
control and formation control, in labelled groups) as a column on the
right. Panels SHALL NOT be dragged or resized. Each panel SHALL collapse to
its title tab toward its edge, Troops upward and Troop summary and Orders
downward, and restore from that tab; the collapsed states SHALL persist in
the browser and default to all open when storage is unavailable. A layout
saved by the earlier floating windows SHALL be ignored. Below 1440 x 900
the panels SHALL shrink and scroll inside rather than overlap each other or
the top bar.

#### Scenario: Collapse and remember

- **WHEN** the player collapses Orders and reloads the battle
- **THEN** Orders shows only its title tab at the bottom right, and clicking the tab opens it again

#### Scenario: Troops folds up

- **WHEN** the player collapses Troops
- **THEN** only its title tab remains, under the top bar at the top left

#### Scenario: No overlap at the minimum size

- **WHEN** the battle runs at 1280 x 720 with every panel open
- **THEN** no panel overlaps another or the top bar, and Troops scrolls inside to show every section

#### Scenario: Old layout ignored

- **WHEN** the browser holds a floating-window layout saved by an earlier build
- **THEN** the panels open docked in their places

### Requirement: Order prompt banner

While an order waits for a point on the map, the HUD SHALL show its prompt
and a Cancel control in a banner at the top centre of the map, under the
clock, in the active locale. The banner SHALL disappear when the order is
given or cancelled.

#### Scenario: Picking a destination

- **WHEN** the player presses Move
- **THEN** the banner asks for a point on the map and offers Cancel, and pressing Cancel removes it with no order given

### Requirement: Strategic map layers

In the strategic camera band the HUD SHALL offer two switches: contour
lines and cover. Contour lines SHALL be drawn as the map editor draws them
(1 m apart, every fifth bold). The cover layer SHALL show every cover slot
as a dot coloured by the stance it protects and concealing vegetation
hatched, as the editor's cover overlay does, from the battle's own map;
it SHALL NOT show which side holds a slot. Both switches SHALL be off at
the start of every battle. The layers SHALL NOT be drawn in the tactical
band and SHALL return when the player goes back to the strategic band with
the switch still on. Labels SHALL be localized in PT-BR and EN.

#### Scenario: Off by default

- **WHEN** a battle starts and the player changes to the strategic band
- **THEN** the switches are off and the map looks as it does today

#### Scenario: Contours on

- **WHEN** the player turns on contour lines in the strategic band on a map with a 6 m hill
- **THEN** six contour rings are drawn on the hill, the fifth bold

#### Scenario: Cover without enemy positions

- **WHEN** the player turns on the cover layer while an unseen enemy section sits in a trench
- **THEN** the trench's slots are drawn and none of them shows as taken

#### Scenario: Tactical band hides the layers

- **WHEN** the cover layer is on and the player changes to the tactical band
- **THEN** the layer is not drawn and the switches are not shown, and it is drawn again on return to the strategic band

### Requirement: Desk art standard

Every closed desk object SHALL be drawn as clean pixel art at a single on-screen
scale of 2x on every screen size, where one art pixel covers two by two screen
pixels, so that no
two closed objects show different pixel sizes. Every closed object SHALL use the
shared desk palette, one light direction from the top left and a dark outline
one art pixel wide, so it stays legible over the moving menu scene without a
drawn table surface. Each closed object's art SHALL rest on the bottom edge of
its sprite canvas, so every label sits the same distance below its art. Every
closed object SHALL cast the same hard drop shadow, offset by two art pixels and
without blur. The campaign and compendium books SHALL keep their current
silhouette, viewing angle, cover colour and default position. An open book's
frame SHALL use the same cover colour as its closed book. Sprites SHALL NOT be
rotated by arbitrary angles at runtime. Every redrawn sprite SHALL be recorded in
the asset register as original art with its source file and licence. Labels SHALL
keep coming from the PT-BR and EN catalogs; this requirement adds no new text.

#### Scenario: One pixel size on the desk

- **WHEN** the desk is shown with every object closed
- **THEN** every object's art is rendered at an integer 2x scale of its source sprite, at 1440 x 900, at 1280 x 720 and in the narrow layout

#### Scenario: Labels share a baseline distance

- **WHEN** the desk is shown with every object closed
- **THEN** the gap between the lowest opaque art pixel and the label is the same for every object

#### Scenario: Same shadow on every object

- **WHEN** the desk is shown with every object closed
- **THEN** every object casts a hard shadow with the same offset and no blur

#### Scenario: Books keep their look

- **WHEN** the desk opens with the default arrangement
- **THEN** the campaign book is navy and the compendium book is green, at the same default positions and angles as before this change

#### Scenario: Open book keeps its colour

- **WHEN** the player opens the compendium book
- **THEN** the open spread's frame uses the compendium's green; the open campaign spread's frame uses its navy

#### Scenario: Art is registered

- **WHEN** the asset register is read
- **THEN** each redrawn desk sprite is listed as original art with its Aseprite source and licence

### Requirement: Desk pick-up and drop feedback

While the player holds a desk object with the pointer, the object SHALL appear
lifted: it moves up by one art pixel and its hard shadow grows to three art
pixels. Releasing the object SHALL drop it back to the resting shadow in a short
step with no long easing. Dragging SHALL snap an object's position to a 2 px
grid, so a moved object always lands on the art pixel grid; a stored position
off that grid SHALL be snapped when the desk loads. A keyboard move SHALL move
the object by whole grid steps. Under `prefers-reduced-motion: reduce` the
object SHALL NOT move up when held; only its shadow SHALL change.

#### Scenario: Picking an object up

- **WHEN** the player presses the pointer on a closed object and starts to drag it
- **THEN** the object is drawn one art pixel higher with the larger shadow and in front of the other objects

#### Scenario: Dropping an object

- **WHEN** the player releases a held object
- **THEN** the object returns to the resting shadow at the drop position

#### Scenario: Drop lands on the grid

- **WHEN** the player drops an object at any pointer position
- **THEN** the stored x and y of the object are multiples of 2

#### Scenario: Old positions are snapped

- **WHEN** the desk loads a stored layout whose positions are not multiples of 2
- **THEN** each object is placed at the nearest grid position inside the view

#### Scenario: Reduced motion

- **WHEN** the player prefers reduced motion and holds an object
- **THEN** the object does not move up and only its shadow changes

### Requirement: Desk position kept across open and close

Opening a desk object SHALL show its open screen as a centred overlay without
changing or storing the object's desk position. While an object is open, its
closed art SHALL NOT be drawn on the desk. Closing it SHALL show the closed
object again at exactly the position it had before opening. Open screens SHALL
NOT be draggable. When several objects are open, the one most recently opened or
touched SHALL be in front. A resize while an object is open SHALL keep the open
screen centred and SHALL keep the closed position inside the view. In the
narrow layout, where the desk is a scrolling column, an open screen SHALL take
the object's place in the column at the column's width, fully inside the view.

#### Scenario: Close returns to the same place

- **WHEN** the player drags the compendium to a position, opens it and closes it
- **THEN** the closed compendium is drawn at the same position as before opening

#### Scenario: Opening does not store a position

- **WHEN** the player opens an object and reloads the page without moving anything
- **THEN** the stored desk layout holds the position the object had before opening

#### Scenario: Open screen is centred

- **WHEN** the player opens any object from any desk position
- **THEN** its open screen is centred in the view

#### Scenario: Open screen in the narrow layout

- **WHEN** the player opens a book in the narrow layout
- **THEN** the open book sits in the column at its width and no part of it is outside the view

### Requirement: Open book spreads

Both menu books SHALL open into a two-page spread with a fixed role for each
page and SHALL NOT use an inner scroll. Text that does not fit SHALL continue on
the next page. Body text SHALL render at no less than 16 CSS px. Pages SHALL
keep at most a small margin of blank parchment, so that no page shows a large
empty area apart from a deliberate plate or end page. Every spread SHALL show its
page numbers. Previous and next controls and the left and right arrow keys SHALL
turn one spread at a time. Under reduced motion, turning SHALL be instant.
Sections or chapters SHALL be reachable from ribbons on the book's edge and from
a contents page. Every visible string SHALL come from the PT-BR and EN catalogs
or the bilingual content registry, and SHALL switch with the locale without a
reload.

#### Scenario: No inner scroll

- **WHEN** any spread of either book is shown at 1440 x 900 or at 1280 x 720
- **THEN** no page content overflows its page and no page shows a scroll bar

#### Scenario: Turning pages

- **WHEN** the player presses the right arrow key on an open book
- **THEN** the next spread is shown with its page numbers

#### Scenario: Ribbon jumps to a section

- **WHEN** the player activates a section ribbon on the compendium
- **THEN** the book opens at that section's first spread

#### Scenario: Locale switch

- **WHEN** the locale changes while a book is open
- **THEN** the same spread is shown in the new language

### Requirement: Compendium book layout

The open compendium SHALL start on a contents spread that lists the sections
with their entry counts and the entries of the selected section. An entry SHALL
fill a spread. The left page SHALL show the entry's image plate with its caption,
credit and licence, or, when the entry has no registered image, a drawn section
emblem marked as a placeholder in the asset register. The right page SHALL show
the title, the label (historical, dramatized or fictional), the date and place
when known, the short body, the extended note and the sources with confidence.
An extended note longer than the right page SHALL continue on the following
spread. Entries SHALL link to the related entries they name.

#### Scenario: Entry with an image

- **WHEN** the player opens the Miguel Costa entry
- **THEN** the left page shows his portrait with caption, credit and licence, and the right page shows the title, label, body, note and sources

#### Scenario: Entry without an image

- **WHEN** the player opens an entry with no registered image
- **THEN** the left page shows the section emblem and no broken image

#### Scenario: Label and confidence are visible

- **WHEN** any entry is shown
- **THEN** its label and its confidence are visible on the spread

### Requirement: Campaign book layout

The open campaign book SHALL start on a title spread and a contents spread that
lists the prologue and chapters 2 to 8, with number, title, date and commander.
Each chapter SHALL open on a spread whose left page shows an image plate and the
chapter's number, title, date, place, commander, perspective and label, and
whose right page begins the chapter prose. The prose SHALL continue across
spreads. Each chapter SHALL end on a briefing spread with the pitch, a summary of
the objectives and links that open the chapter's compendium entries in the
compendium book. Each chapter SHALL show a play action that is disabled and
labelled "in preparation", and SHALL keep the existing action that brings the
map fan forward for a skirmish.

#### Scenario: Contents lists every chapter

- **WHEN** the player opens the campaign book
- **THEN** the contents spread lists the prologue and chapters 2 to 8 with title, date and commander

#### Scenario: Chapter opening spread

- **WHEN** the player opens chapter 3 from the contents
- **THEN** the left page shows the plate, "Miguel Costa" as commander, the date, place, perspective and the "dramatized" label, and the right page begins the prose

#### Scenario: Missions are not playable yet

- **WHEN** the player reaches any chapter's briefing spread
- **THEN** the play action is visible, disabled and labelled "in preparation"

#### Scenario: Briefing links to the compendium

- **WHEN** the player activates a compendium link on a briefing spread
- **THEN** the compendium book opens, or comes to the front, at that entry

### Requirement: Reference pile default position

The reference pile SHALL have a default position on the desk, like every other
desk object, so the default arrangement and the "tidy desk" action place it
without error. Its default position SHALL keep it below the campaign book on the
left side of the desk, clear of the books' default positions.

#### Scenario: Default arrangement includes the pile

- **WHEN** the desk opens with no stored layout
- **THEN** the reference pile appears at its default position on the left, between the two books, fully inside the view

#### Scenario: Tidy desk with the pile moved

- **WHEN** the player moves the reference pile and activates "tidy desk"
- **THEN** the pile returns to its default position and no error is raised
