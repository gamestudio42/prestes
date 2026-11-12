## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Floating HUD windows

**Reason**: The owner's reference docks the panels at the screen's edges
and the owner asked for collapse only, no dragging or resizing; the
helmet-and-bars summary is replaced by the soldier figures of
`troop-thumbnails-and-panel`.

**Migration**: Replaced by "Docked HUD panels" here and "Soldier figures"
in `troop-thumbnails-and-panel`. The saved floating layout is ignored;
nothing to migrate.

### Requirement: Rounded translucent command panels

**Reason**: Stale since the pixel kit ("Period low-poly HUD styling" forbids
rounded corners and Barlow), and contrary to the reference's opaque wood
frames.

**Migration**: Covered by "Period low-poly HUD styling" and "Field-kit HUD
art".
