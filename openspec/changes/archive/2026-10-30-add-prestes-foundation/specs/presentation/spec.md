## Purpose

Defines the browser boot flow, the low-poly graybox scene and the read-only HUD
shell that prove the presentation pipeline before historical content is produced.

## ADDED Requirements

### Requirement: Browser boot flow

The game SHALL load in a supported desktop browser and reach a start screen with
the game title, a language selector and a start action.

#### Scenario: Start screen loads

- **WHEN** the player opens the built game in a browser
- **THEN** the start screen appears without a fatal error and exposes the language selector

#### Scenario: Start action reaches the graybox scene

- **WHEN** the player activates the start action
- **THEN** the graybox scene loads and the HUD shell becomes visible

### Requirement: Low-poly graybox scene

The scene SHALL contain placeholder terrain, buildings and unit markers rendered
with flat-shaded low-poly geometry, and SHALL be usable without final art.

#### Scenario: Placeholder scene renders

- **WHEN** the graybox scene loads
- **THEN** terrain, at least one building and at least one unit marker are visible

#### Scenario: Placeholders are named

- **WHEN** the project is inspected for placeholder assets or systems
- **THEN** each placeholder is explicitly named as a placeholder or TODO

### Requirement: Camera bands

The scene SHALL provide strategic and tactical camera bands with continuous
pan, rotate and zoom controls, and SHALL show which band is active.

#### Scenario: Camera controls respond

- **WHEN** the player uses the pan, rotate and zoom inputs
- **THEN** the camera moves continuously and the active band indicator updates

#### Scenario: Band switch preserves the world

- **WHEN** the player switches between strategic and tactical bands
- **THEN** no entity is created, duplicated or removed by the switch

### Requirement: Low-resolution render pipeline

The scene SHALL render through a low internal resolution and upscale to the
display with nearest-neighbour sampling, keeping the style close to the studio's
low-poly reference.

#### Scenario: Internal resolution is lower than display

- **WHEN** the scene runs at a normal desktop window size
- **THEN** the internal render target is smaller than the display resolution and the upscale is visible

### Requirement: Read-only HUD shell

The HUD SHALL display the current tick, the active camera band and a placeholder
selection summary, and SHALL read only from the client mirror.

#### Scenario: HUD follows the simulation

- **WHEN** the simulation advances
- **THEN** the HUD tick indicator advances without the HUD owning simulation state

#### Scenario: HUD action becomes a command

- **WHEN** the player triggers a HUD action that affects the game
- **THEN** the action is sent as a command through the command boundary
