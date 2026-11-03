## ADDED Requirements

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
