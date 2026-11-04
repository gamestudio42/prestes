## MODIFIED Requirements

### Requirement: Suppress order

A suppress command SHALL target a living enemy and set the selected living units
to suppress that target. Suppressing units SHALL keep their position, fire at the
target when visible, trade some lethal accuracy for stronger morale damage and
clear the order when the target dies or the player issues another order. They
SHALL fire at the fast suppress interval while the target is not pinned and at
the weapon's normal fire interval while it is pinned.

#### Scenario: Suppress a target

- **WHEN** the player suppresses a visible enemy with a selected section
- **THEN** the units stop moving, keep firing at that enemy and reduce its morale faster than a normal attack

#### Scenario: Suppress eases on a pinned target

- **WHEN** the suppressed target is pinned
- **THEN** the suppressing units keep firing at it at the weapon's normal fire
  interval instead of the suppress interval

#### Scenario: Suppression ends

- **WHEN** the suppressed target dies or the player orders a move
- **THEN** the suppress order clears and the units resume normal behaviour

#### Scenario: Suppress rejects an invalid target

- **WHEN** a suppress command targets an unknown, dead or friendly unit
- **THEN** the simulation rejects it and leaves the state unchanged
