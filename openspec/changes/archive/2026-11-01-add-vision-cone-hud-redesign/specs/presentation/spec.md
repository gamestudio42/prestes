## ADDED Requirements

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

The HUD SHALL use the sepia period palette, Barlow Condensed typography, clipped
low-poly panels and hairline gold borders. It SHALL NOT introduce new art assets,
CDN fonts or player-facing hardcoded text.

#### Scenario: Sepia treatment

- **WHEN** the HUD is visible
- **THEN** panels use sepia ink, parchment text and gold accents instead of the
  former green terminal palette

#### Scenario: Localized labels

- **WHEN** the locale changes between PT-BR and EN
- **THEN** every HUD label, title and status string changes with it
