## ADDED Requirements

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
