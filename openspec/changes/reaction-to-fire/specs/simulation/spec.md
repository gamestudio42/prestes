## ADDED Requirements

### Requirement: Reaction to fire

A soldier SHALL be under fire for 3 s after a shot is aimed at him or at a
squad mate within 6 m. While under fire, a soldier with no target SHALL turn
toward the shooter. A standing soldier without a player stance lock SHALL
crouch, unless his order keeps him moving (move, withdraw, flank, pursue,
rescue). An idle or holding soldier with the balanced or defensive posture
SHALL take a free cover slot within 6 m that guards against the shooter and
is not closer to him, when one exists. Aggressive soldiers SHALL keep their
stance and place. The reaction SHALL not replace a player's order.

#### Scenario: First shots in the open
- **WHEN** an idle balanced section in the open is fired upon
- **THEN** its soldiers crouch on the first shot, before any is suppressed

#### Scenario: Cover in reach
- **WHEN** an idle soldier under fire has a free cover slot 4 m away on his
  side, guarding against the shooter
- **THEN** he moves into it

#### Scenario: Shot from behind
- **WHEN** a soldier with no target is fired upon from outside his vision
  cone
- **THEN** he turns toward the shooter and, once he sees him, returns fire

#### Scenario: Orders and stance are kept
- **WHEN** a soldier on a move order, or with a player stance lock, is fired
  upon
- **THEN** he keeps his path and his stance

#### Scenario: Aggressive holds
- **WHEN** an aggressive soldier is fired upon
- **THEN** he turns and returns fire without crouching or moving

## MODIFIED Requirements

### Requirement: Suppress order

A suppress command SHALL target a living enemy and set the selected living units
to suppress that target. Suppressing units SHALL keep their position, fire at the
target when visible, trade some lethal accuracy for stronger morale damage and
keep the order on the target's troop: when the target dies, routs or falls, they
SHALL switch together to the nearest visible member of the same squad within
15 m of it. The order SHALL clear when no such member is in sight or the player
issues another order. They SHALL fire at the fast suppress interval while the
target is not pinned and at the weapon's normal fire interval while it is pinned.

#### Scenario: Suppress a target

- **WHEN** the player suppresses a visible enemy with a selected section
- **THEN** the units stop moving, keep firing at that enemy and reduce its morale faster than a normal attack

#### Scenario: Suppress eases on a pinned target

- **WHEN** the suppressed target is pinned
- **THEN** the suppressing units keep firing at it at the weapon's normal fire
  interval instead of the suppress interval

#### Scenario: Suppress keeps on the troop

- **WHEN** the suppressed target routs and two of his squad mates are visible
  within 15 m of him
- **THEN** the suppressing units switch together to the nearer of them and keep
  suppressing

#### Scenario: Suppression ends

- **WHEN** no member of the target's squad is left in sight, or the player
  orders a move
- **THEN** the suppress order clears and the units resume normal behaviour

#### Scenario: Suppress rejects an invalid target

- **WHEN** a suppress command targets an unknown, dead or friendly unit
- **THEN** the simulation rejects it and leaves the state unchanged
