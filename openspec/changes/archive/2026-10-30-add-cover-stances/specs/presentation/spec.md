## ADDED Requirements

### Requirement: Character part rig

The character proxy SHALL be built from named parts: body, head, hat, two legs,
two arms, rifle, gear, selection ring and shadow. The rig SHALL keep the 1.75 m
proportions and the existing strategic-scale readability.

#### Scenario: Parts are visible

- **WHEN** a character is rendered at tactical span
- **THEN** body, head, hat, legs, arms and rifle are present in the scene graph

#### Scenario: Scale stays readable

- **WHEN** the camera zooms to strategic span
- **THEN** the character scales up with the existing unit-scale rule

### Requirement: Procedural movement

A moving character SHALL animate its legs and arms with a walk cycle proportional
to distance travelled. A stationary character SHALL settle into an idle pose.

#### Scenario: Walking cycle

- **WHEN** a unit moves across the ground
- **THEN** its legs and arms alternate and the body bobs slightly

#### Scenario: Idle

- **WHEN** a unit is stationary
- **THEN** its limbs return toward the idle pose

### Requirement: Crouched and prone poses

The character SHALL visibly crouch and lie down when the unit stance changes. The
selection ring and shadow SHALL stay on the ground and SHALL NOT rotate with the
body.

#### Scenario: Crouch

- **WHEN** a unit enters crouched stance
- **THEN** its body lowers, its legs bend and its head drops below the standing height

#### Scenario: Prone

- **WHEN** a unit enters prone stance
- **THEN** its body lies near the ground while the ring and shadow remain flat

#### Scenario: Return to standing

- **WHEN** a unit returns to standing
- **THEN** the body rises back to the standing pose
