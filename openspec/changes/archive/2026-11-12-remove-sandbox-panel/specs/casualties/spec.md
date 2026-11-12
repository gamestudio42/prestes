## MODIFIED Requirements

### Requirement: Rescue feedback

The unit panel SHALL show rescuer, casualty, rescue phase and progress.
Wounded, incapacitated, carried, treating, evacuated and dead soldiers SHALL be
visually distinguishable.

#### Scenario: Rescue progress
- **WHEN** a rescue is active
- **THEN** the panel shows rescuer, casualty, phase and progress

#### Scenario: Carried visual
- **WHEN** a soldier is being carried
- **THEN** the view shows the casualty attached to the rescuer rather than walking independently

#### Scenario: Sandbox casualty drill
- **WHEN** a test incapacitates the selected soldier through the development test bridge
- **THEN** the soldier enters the incapacitated state deterministically and a rescue can be assigned without combat randomness
