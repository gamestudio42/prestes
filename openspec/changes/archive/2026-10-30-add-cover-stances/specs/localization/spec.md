## ADDED Requirements

### Requirement: Stance controls

The HUD SHALL expose stand, crouch and prone actions for the debug column, with
PT-BR and EN labels from the locale catalog.

#### Scenario: Stance buttons issue commands

- **WHEN** the player presses stand, crouch or prone
- **THEN** the corresponding stance command is sent through the command boundary

#### Scenario: Labels are localized

- **WHEN** the language changes
- **THEN** the stance controls update without a reload
