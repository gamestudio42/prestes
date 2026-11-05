## MODIFIED Requirements

### Requirement: Rifle combat

Alive units SHALL automatically engage visible enemies in range. Each shot SHALL
consume one round, emit a shot event, use the seeded RNG for hit chance and apply
damage on a hit. Units SHALL reload automatically when empty.

Aimed rifle fire SHALL come at the weapon's aimed interval (3 to 5 s for the
Mauser) with a per-soldier variation drawn from the seeded RNG, and a soldier's
first shot at an enemy he has just acquired SHALL wait a reaction delay of 0.5
to 2.5 s, so that a section's fire is spread over time rather than fired as one
volley. Suppressive fire MAY use a faster rate. A rifle hit SHALL take 35 to 55
of a soldier's 100 health, so that two or three hits put him out of action;
when he goes down he SHALL be incapacitated or, with a lower probability drawn
from the seeded RNG, killed outright (a soldier already severely wounded dies).
A soldier who fired within the last 10 s SHALL shift to a new target within
his aimed rhythm, without a fresh reaction delay. Hit chance SHALL fall to 0.6
against a target moving faster than a walk, and to 0.6 for a shooter who is
himself suppressed. These figures are game abstractions of bolt-action
practice, not sourced statistics.

#### Scenario: Shot consumes ammunition

- **WHEN** a unit fires
- **THEN** its ammunition decreases by one and a shot event is emitted

#### Scenario: Hit applies damage

- **WHEN** a shot hits
- **THEN** the target loses health and morale

#### Scenario: Empty magazine reloads

- **WHEN** a unit reaches zero ammunition
- **THEN** it reloads for a short interval and returns to full ammunition

#### Scenario: A section does not fire as one volley

- **WHEN** a section of 11 acquires an enemy section at the same tick and fires
  aimed shots for 30 s
- **THEN** no single tick holds more than three of its shots, and each
  soldier's interval between aimed shots lies between 3 and 5 s

#### Scenario: Two or three hits

- **WHEN** an unwounded soldier is hit by aimed rifle fire
- **THEN** he is out of action (incapacitated or dead) after two or three hits,
  never after one and never needing four

#### Scenario: Same seed, same fire

- **WHEN** the same battle runs twice with the same seed and commands
- **THEN** every shot happens on the same tick with the same result

### Requirement: Cover and line of sight

Hit chance and suppression accumulation SHALL account for directional cover,
distance, target stance and the equipped weapon. A cover volume SHALL protect a
unit only when it lies between that unit and the threat. Low cover SHALL require
crouching or lying down; high cover MAY protect a standing unit. The building
SHALL block line of sight and movement.

Cover SHALL lose its value at close quarters: against a shooter within 10 m a
cover volume SHALL give at most a third of its protection, and against a
shooter inside the same cover volume (in the same trench) none. Whether a cover
lies between the unit and the threat SHALL be decided exactly along the whole
line of fire, so a parapet a metre in front of a soldier counts against a
shooter at any range; line of sight SHALL be decided the same way.

#### Scenario: Cover only protects from the covered side

- **WHEN** a unit is behind a sandbag relative to the shooter
- **THEN** it receives cover against that shooter

#### Scenario: Flanking ignores the front cover

- **WHEN** a shooter is on the open side of a sandbag
- **THEN** the unit does not receive that sandbag's cover against the shooter

#### Scenario: Low cover requires a low stance

- **WHEN** a standing unit is directly behind a low sandbag
- **THEN** it receives less cover than the same unit crouched or prone

#### Scenario: Crouching or lying reduces exposure

- **WHEN** a target crouches or lies down
- **THEN** its cover value increases and incoming hit chance decreases

#### Scenario: Building blocks fire

- **WHEN** the building lies between a shooter and a target
- **THEN** the shooter does not acquire that target

#### Scenario: Assault reaches the parapet

- **WHEN** a soldier in a trench is fired at from 6 m in front of the parapet
- **THEN** the trench gives him at most a third of the cover it gives against
  the same shooter at 60 m

#### Scenario: Clearing the trench

- **WHEN** an attacker inside a trench fires at a defender in the same trench
- **THEN** the trench gives the defender no cover against him

#### Scenario: Parapet against long-range fire

- **WHEN** a crouched soldier sits 2 m behind a sandbag parapet and the shooter
  is 160 m away on the other side
- **THEN** the parapet adds its cover

### Requirement: Suppress order

A suppress command SHALL target a living enemy and set the selected living units
to suppress that target's position: the section SHALL spread its rifles over the
living men of the target's squad, nearest the named man first, rather than lay
them all on him. Suppressing units SHALL keep their position, fire at their man
when visible, trade some lethal accuracy for stronger morale damage and keep the
order on the target's troop: when a suppressor's man dies, routs or falls, he
SHALL switch to the nearest visible member of the same squad within 15 m of it.
The order SHALL clear when no such member is in sight or the player issues
another order. They SHALL fire at the fast suppress interval while their man is
not pinned and at the weapon's normal fire interval while he is pinned.

#### Scenario: Suppress a target

- **WHEN** the player suppresses a visible enemy with a selected section
- **THEN** the units stop moving, keep firing at the enemy's position and reduce
  morale there faster than a normal attack

#### Scenario: A suppressing section covers the position

- **WHEN** a section of 11 is ordered to suppress a man of an enemy section of 11
- **THEN** its rifles are laid on several different men of that section

#### Scenario: Suppress eases on a pinned target

- **WHEN** a suppressor's man is pinned
- **THEN** that suppressor keeps firing at him at the weapon's normal fire
  interval instead of the suppress interval

#### Scenario: Suppress keeps on the troop

- **WHEN** a suppressor's man routs and two of his squad mates are visible
  within 15 m of him
- **THEN** that suppressor switches to the nearer of them and keeps suppressing

#### Scenario: Suppression ends

- **WHEN** no member of the target's squad is left in sight, or the player
  orders a move
- **THEN** the suppress order clears and the units resume normal behaviour

#### Scenario: Suppress rejects an invalid target

- **WHEN** a suppress command targets an unknown, dead or friendly unit
- **THEN** the simulation rejects it and leaves the state unchanged

## ADDED Requirements

### Requirement: Suppressive fire on a position

Cover SHALL reduce the suppression a shot causes far less than it reduces the
chance of a hit (to at least 70% of the open-ground value), and a shot SHALL
also suppress every man of the target's side within 4 m of the target at half
strength.

#### Scenario: Rounds keep the bay down

- **WHEN** a shot is fired at a man in a trench bay with a mate 2 m away
- **THEN** the mate's suppression rises too

### Requirement: Nerve returns out of fire

A soldier no longer under fire (suppression under 10) SHALL regain morale
slowly, 0.3 a second, up to 60; only an officer's presence lifts him beyond.

#### Scenario: Pinned with no one shooting

- **WHEN** a soldier pinned by low morale is no longer fired at for a minute
- **THEN** his morale rises and he is no longer pinned
