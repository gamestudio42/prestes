## ADDED Requirements

### Requirement: Aiming pose in every stance

The character SHALL hold the rifle forward in standing, crouched and prone
stances. The arms SHALL support the weapon in front of the body rather than hang
at the sides.

#### Scenario: Standing aims

- **WHEN** a unit stands
- **THEN** its rifle points forward and both arms reach toward it

#### Scenario: Crouched aims

- **WHEN** a unit crouches
- **THEN** the rifle remains forward while the body lowers

### Requirement: Prone aims forward

A prone character SHALL lie face-down with the body near the ground and the rifle
still pointing forward. The selection ring and shadow SHALL stay flat on the
ground.

#### Scenario: Prone keeps the weapon forward

- **WHEN** a unit lies down
- **THEN** the body rotates face-down but the rifle stays aimed forward

#### Scenario: Prone does not clip

- **WHEN** the prone pose settles
- **THEN** the head and weapon remain above the ground plane
