## ADDED Requirements

### Requirement: Suspected contacts can be targeted

Where fog of war is on, a "?" unseen-fire marker and the faded ghost of a
lost enemy SHALL be pickable while they are shown, as the target of the Area
fire order only: with Area fire armed, a click within the marker's ring or on
a ghost SHALL give the order at that marker's or ghost's position. Without
Area fire armed, a click on them SHALL do what a click on the ground does.
The marker and the ghost SHALL NOT reveal the enemy or make him selectable or
targetable by any other order. While an area-fire order lasts, the view SHALL
draw its disc on the ground for the player's own sections only.

#### Scenario: Pick a marker
- **WHEN** the player arms Area fire and clicks inside the ring of a "?"
  marker
- **THEN** the order is sent at the marker's position

#### Scenario: Other orders ignore markers
- **WHEN** the player arms Attack and clicks a "?" marker
- **THEN** no attack order is sent and no enemy is selected

#### Scenario: The disc is the player's
- **WHEN** an enemy section fires area fire at the player's men
- **THEN** the player sees its shots and markers as for any fire, but no
  area disc
