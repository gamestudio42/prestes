## MODIFIED Requirements

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

The HUD SHALL display the current tick, the active camera band, the active path
count and a selection summary, and SHALL read only from the client mirror. The
HUD SHALL use Barlow / Barlow Condensed and Lucide icons.

#### Scenario: HUD follows the simulation

- **WHEN** the simulation advances
- **THEN** the HUD tick and path indicators advance without the HUD owning simulation state

#### Scenario: HUD action becomes a command

- **WHEN** the player triggers a HUD action that affects the game
- **THEN** the action is sent as a command through the command boundary

## ADDED Requirements

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

Player-facing UI SHALL use self-hosted Barlow and Barlow Condensed fonts and
Lucide icons, recorded in the asset register with their OFL and ISC licences.

#### Scenario: Fonts are self-hosted

- **WHEN** the built game is inspected
- **THEN** Barlow and Barlow Condensed are served from the build and no external font request is made

#### Scenario: Icons are registered

- **WHEN** the asset register is read
- **THEN** Lucide is listed with its ISC licence

