## ADDED Requirements

### Requirement: Combat and squad labels

The HUD SHALL expose PT-BR and EN labels for sections, stance, pause, speed,
objective, outcome, ammunition and morale.

#### Scenario: Labels switch language

- **WHEN** the player changes language
- **THEN** the squad, stance, speed, objective and outcome labels update without a reload

#### Scenario: Rejection labels cover attack errors

- **WHEN** an attack command is rejected for an unknown target
- **THEN** the debug log shows a localized reason
