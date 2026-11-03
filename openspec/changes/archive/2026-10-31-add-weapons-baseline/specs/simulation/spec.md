## ADDED Requirements

### Requirement: Weapon-driven shooting

A unit SHALL fire using the range, accuracy, fire interval, damage and suppression
of its equipped weapon profile. Global combat constants SHALL NOT override the
equipped profile.

#### Scenario: Weapon defines the shot

- **WHEN** a unit fires
- **THEN** the shot uses its weapon's range, accuracy, damage and suppression values

#### Scenario: Weapon defines the cadence

- **WHEN** a weapon has a fire interval
- **THEN** the unit waits that many ticks between shots

### Requirement: Per-unit ammunition

Each unit SHALL track magazine rounds and reserve rounds for its equipped weapon.
Reloading SHALL move rounds from the reserve into the magazine.

#### Scenario: Ammunition is per unit

- **WHEN** two units fire different amounts
- **THEN** each unit exposes its own magazine and reserve values

#### Scenario: Reload preserves state

- **WHEN** a reload begins
- **THEN** the unit cannot fire until the reload timer ends and the magazine is filled from reserve
