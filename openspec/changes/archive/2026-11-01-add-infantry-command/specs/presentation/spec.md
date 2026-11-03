## ADDED Requirements

### Requirement: Order menu by category

The HUD SHALL present orders grouped as attack, movement, defence, organisation and
support, with icon, name, short description, availability and a localized reason
when unavailable.

#### Scenario: Categories
- **WHEN** the player opens the order menu
- **THEN** every order appears under one of the five categories

#### Scenario: Unavailable order
- **WHEN** an order cannot be executed
- **THEN** the menu shows why instead of issuing a silent no-op

### Requirement: Unit order status

The HUD SHALL show primary order, pending condition, interrupts, progress, strength,
morale, cohesion, fatigue, wounded count and officer presence.

#### Scenario: Interrupt visible
- **WHEN** a rescue interrupts a defence
- **THEN** the panel shows the defence as primary and the rescue as an interrupt

#### Scenario: Unit state changes
- **WHEN** morale, cohesion, fatigue or strength changes
- **THEN** the panel updates from the frame

### Requirement: Rescue indicator

The HUD SHALL show rescuer, casualty, phase and progress for an active rescue.

#### Scenario: Rescue progress
- **WHEN** a rescue is active
- **THEN** the panel shows its phase and progress

#### Scenario: Completion
- **WHEN** a rescue completes or fails
- **THEN** the panel shows a localized completion or failure event
