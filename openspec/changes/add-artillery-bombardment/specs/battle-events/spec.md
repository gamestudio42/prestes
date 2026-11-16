## ADDED Requirements

### Requirement: Bombardment

An event action `bombardment` SHALL call down shelling. It SHALL name:
whose guns fire (Column or legalists); the gun (75 mm field gun or 105 mm
howitzer); the target, either an event area (shells aimed at its middle)
or the enemy's positions; a rate of 1 to 30 shells per minute; a spread of
5 to 60 m; and how long it lasts, 10 s to 10 min, or until another event
fires. Values out of range SHALL be brought into range when the map is
compiled. When the event fires, the first shell SHALL be announced at once
and land 2 s later; the following shells SHALL be spaced at the rate, each
interval varied by up to a quarter either way by the seeded RNG. No shell
SHALL be announced after the bombardment ends; shells already announced
SHALL still land. At most 4 bombardments SHALL run at once; a fifth that
fires SHALL replace the oldest.

With the enemy's positions as the target, each shell SHALL be aimed at a man
of the other side, fit and not routed, whom the firing side sees or saw in
the last 30 s (any such man when fog of war is off), chosen by the seeded
RNG among them in unit id order, at the position the firing side last knew.
When the firing side knows of no enemy, that shell SHALL NOT be fired.

Historical note: in July 1924 the government's guns shelled São Paulo for
about two weeks (`docs/history/TIMELINE.md`; `cohen-2007`; `macaulay-1974`
ch. I); the government's artillery pressed the rebels again at Catanduvas
(Macaulay p. 85). Which bombardments a map has is authored per map.

#### Scenario: Shelling an area
- **WHEN** an event fires at 5:00 with "legalist 75 mm guns on area 'Mooca', 6 shells per minute, 25 m spread, for 2:00"
- **THEN** about twelve shells land within 25 m of the area's middle between 5:02 and 7:02, and none is announced after 7:00

#### Scenario: Until another event
- **WHEN** a bombardment lasts "until event 'Cessar fogo'" and that event fires
- **THEN** no further shell is announced, and the shells already announced land

#### Scenario: Guns fire on what they see
- **WHEN** a legalist bombardment targets the enemy's positions and the legalists have not seen any Column man for a minute, with fog of war on
- **THEN** no shell is fired until a Column man is seen again

### Requirement: Bombardment in the event state

Active bombardments (their next shell tick, end, target and gun) SHALL be
part of the battle events' hashed state. A bombardment SHALL NOT be
announced to the player as a message; the player learns of it by the
whistle and the bursts, unless the same event has a card. The playtest's
"fire now" SHALL start a bombardment like any other action.

#### Scenario: Rehearse the shelling
- **WHEN** the author presses "fire now" on a bombardment event in the playtest
- **THEN** the first whistle sounds at once and the first shell lands 2 s later
