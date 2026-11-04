## MODIFIED Requirements

### Requirement: Order catalogue

The unit controller SHALL support attack, flank, withdraw, advance, defend, ambush,
regroup, pursue, disperse, protect officer, recon, reserve and rescue, and the
order board SHALL show a button for every catalogue order plus move, hold,
suppress and face.

#### Scenario: All catalogue orders are addressable
- **WHEN** the player opens the order menu
- **THEN** every catalogue order, including advance, disperse, reserve and
  regroup, is listed under its category and shows availability

#### Scenario: Unavailable order explains itself
- **WHEN** an order cannot run because of state, strength, officer or target
- **THEN** the menu shows a localized reason instead of silently doing nothing

### Requirement: Officer loss

The loss of an officer (killed or incapacitated) SHALL update leadership and apply
a bounded morale and cohesion consequence without disabling the unit permanently.
The officer's morale aura SHALL stop while the officer is out of action. Every
living soldier of the officer's faction within 25 m SHALL lose 20 morale once, and
the section's cohesion SHALL drop by 15 points once, never below zero.
Protect-officer orders SHALL be interrupted.

#### Scenario: Officer dies
- **WHEN** the officer is killed
- **THEN** the aura is removed, morale/cohesion drop and the unit remains commandable

#### Scenario: Officer incapacitated
- **WHEN** the officer is incapacitated
- **THEN** nearby soldiers lose 20 morale once, the aura stops, protect-officer
  orders are interrupted and the aura resumes if the officer recovers

#### Scenario: Consequence applies once
- **WHEN** the officer stays out of action for many ticks
- **THEN** the morale and cohesion drop is applied only once per loss
