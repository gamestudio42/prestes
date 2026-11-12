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

The bottom command row SHALL show the selection count, the current order and the
body stance as visible text, or the row SHALL be removed so that no empty bar is
rendered.

#### Scenario: Status is readable

- **WHEN** the section is selected with no order
- **THEN** the command row visibly shows the selection count, "no order" and the
  stance in the active locale

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
