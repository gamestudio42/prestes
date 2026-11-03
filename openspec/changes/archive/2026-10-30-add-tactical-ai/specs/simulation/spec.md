## ADDED Requirements

### Requirement: Tactical target selection

Alive units SHALL choose a visible enemy in range using a deterministic tactical
score. The score SHALL prefer closer enemies, enemies with less cover, suppressed
enemies, officers and enemies not already engaged by an ally. Ties SHALL resolve
to the lowest unit id. A unit SHALL keep its current target while that target
remains visible and its score is close to the best alternative.

#### Scenario: Prefers an exposed target

- **WHEN** a unit can see a nearby enemy in the open and a farther enemy behind cover
- **THEN** it selects the nearer exposed enemy

#### Scenario: Avoids overkill

- **WHEN** two allies already target one visible enemy and another visible enemy has no attacker
- **THEN** the unit prefers the unengaged enemy

#### Scenario: Selection is deterministic

- **WHEN** two simulations run with the same seed and commands
- **THEN** both select the same target for every unit at every tick

#### Scenario: Stable target

- **WHEN** a unit's current target stays visible and no alternative is clearly better
- **THEN** the unit keeps its current target

### Requirement: Flanking movement

A unit with a visible target in cover SHALL flank when an ally is already
engaging that target. The unit SHALL move to a side position with line of sight to
the target, outside the building and not occupied by another unit. At most one
unit SHALL flank a given target at a time, and a flank move SHALL respect its
cooldown.

#### Scenario: One unit flanks a covered target

- **WHEN** a target is in cover and one ally is engaging it
- **THEN** one other unit receives a path to a side position with line of sight

#### Scenario: No duplicate flankers

- **WHEN** a unit is already flanking a target
- **THEN** no second unit receives a flank path to that target

#### Scenario: No flank without line of sight

- **WHEN** every side position is blocked by the building or occupied
- **THEN** the unit keeps its current position and continues firing when possible

### Requirement: Suppression reaction

A suppressed unit below the morale threshold SHALL react when it is not following
a player move order. It SHALL seek nearby cover that is farther from its target
than its current position. When no such cover exists, it SHALL hunker down by
crouching or lying prone. A player stance lock SHALL take precedence over the
automatic posture change.

#### Scenario: Suppressed unit falls back

- **WHEN** a suppressed unit in the open has retrograde cover within reach
- **THEN** it moves to that cover and gains its cover value

#### Scenario: Suppressed unit hunkers down

- **WHEN** a suppressed unit has no retrograde cover
- **THEN** it crouches or lies prone without leaving its position

#### Scenario: Player stance is preserved

- **WHEN** a suppressed unit has an explicit player stance
- **THEN** the reaction does not change that stance

#### Scenario: Player move order is preserved

- **WHEN** a suppressed unit is following a player move order
- **THEN** the reaction does not replace that path

### Requirement: Section movement spacing

A move command that targets more than one unit SHALL assign distinct formation
slots instead of sending every unit to the same point. Slots SHALL be spaced
perpendicular to the travel direction and SHALL remain outside the building. A
unit whose slot has no path SHALL fall back to the ordered destination.

#### Scenario: Section arrives spaced

- **WHEN** two units are ordered to the same destination
- **THEN** their final positions are at least the formation spacing apart

#### Scenario: Single unit keeps a direct route

- **WHEN** one unit is ordered to a destination with a clear line
- **THEN** its path contains only the destination waypoint

#### Scenario: Blocked slot falls back

- **WHEN** a formation slot lies inside the building
- **THEN** that unit uses the ordered destination instead of the blocked slot

### Requirement: Player intent authority

Automatic tactical movement SHALL NOT replace an active player move order. An
explicit attack target SHALL be kept while it remains alive and visible. An
explicit stance SHALL remain locked against automatic posture changes.

#### Scenario: Active move order is not interrupted

- **WHEN** a unit is moving on a player order and a tactical AI opportunity appears
- **THEN** the unit continues on its player path

#### Scenario: Explicit attack survives

- **WHEN** a player orders an attack on a visible enemy
- **THEN** the unit keeps that target while it remains valid

#### Scenario: Stance lock survives

- **WHEN** a player sets a stance and the AI wants another posture
- **THEN** the unit keeps the player's stance

### Requirement: Suppress order

A suppress command SHALL target a living enemy and set the selected living units
to suppress that target. Suppressing units SHALL keep their position, fire at the
target when visible, trade some lethal accuracy for stronger morale damage and
clear the order when the target dies or the player issues another order.

#### Scenario: Suppress a target

- **WHEN** the player suppresses a visible enemy with a selected section
- **THEN** the units stop moving, keep firing at that enemy and reduce its morale faster than a normal attack

#### Scenario: Suppression ends

- **WHEN** the suppressed target dies or the player orders a move
- **THEN** the suppress order clears and the units resume normal behaviour

#### Scenario: Suppress rejects an invalid target

- **WHEN** a suppress command targets an unknown, dead or friendly unit
- **THEN** the simulation rejects it and leaves the state unchanged

### Requirement: Flank order

A flank command SHALL target a living enemy and assign the selected living units a
side route around that enemy. Each unit SHALL use a valid side position with line
of sight, outside the building and not occupied; when no side position exists it
SHALL keep its current position. A flank order SHALL use the `flank` order kind.

#### Scenario: Player flanks a target

- **WHEN** the player flanks a living enemy with a selected section
- **THEN** each unit receives a flank route around the target and the frame exposes a flank order

#### Scenario: Flank falls back safely

- **WHEN** no flank position has a valid route
- **THEN** the unit stays in place and the command still reports a clear result

### Requirement: Withdraw order

A withdraw command SHALL move the selected living units away from the nearest
enemy toward a reachable rear position. The path SHALL avoid the building and
SHALL use the `withdraw` order kind. Withdrawing units SHALL clear an active
target and stop suppressing or flanking.

#### Scenario: Section withdraws

- **WHEN** the player orders a section to withdraw
- **THEN** every living unit receives a route away from the nearest enemy and the frame marks it as a withdraw order

#### Scenario: Withdraw clears attack state

- **WHEN** a unit with an attack or suppress target withdraws
- **THEN** its target clears and it does not fire while following the withdraw route

### Requirement: Hold position order

A hold-position command SHALL stop the selected living units and mark them as
holding. Holding units SHALL NOT start automatic movement, cover seeking,
flanking or withdrawal, but SHALL keep engaging visible enemies. A move, flank or
withdraw command SHALL clear the hold.

#### Scenario: Hold stops automatic movement

- **WHEN** a unit is holding and a tactical AI opportunity appears
- **THEN** the unit keeps its position

#### Scenario: Hold still fires

- **WHEN** a holding unit sees an enemy in range
- **THEN** it fires without moving
