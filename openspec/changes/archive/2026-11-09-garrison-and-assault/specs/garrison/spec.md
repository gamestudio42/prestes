## ADDED Requirements

### Requirement: Enterable positions

Buildings and fortified works on the battle maps SHALL be positions with a
capacity, one or more entrances and firing ports, as data shared by the
simulation and the view. Capacities SHALL follow the building model (one-
storey house 4, venda 5, armazém 6, sobrado 8, casa-sede 8, engenho 8,
church 10, factory 12) and the works (a fire trench line one man per 1.2 m
of its fire step, a communication trench one man per 2 m). The content check SHALL verify that every
entrance is reachable.

#### Scenario: Positions on the Bairro
- **WHEN** the Bairro is loaded
- **THEN** every house, venda, sobrado, the matriz and the factory are positions with their capacities and reachable entrances

### Requirement: Enter a position

The player SHALL order a selected section to enter (Ocupar) a position with
a button and a click on it. The section SHALL walk to the nearest entrances
and its soldiers SHALL go in one by one, up to the capacity; those over the
capacity SHALL take cover slots outside. A position held by the enemy
SHALL NOT be entered (Assaltar instead). Two friendly sections MAY share a
position up to its capacity. A house or a business SHALL have a door at the
front and one at the back and none in its side walls; the church a wide
front portal and a door in each side wall. A building SHALL have windows on
every wall (none where a door is), and on the upper floor of a two-storey building;
each window SHALL be a port, and the view SHALL draw a window at every
port. Soldiers inside a building SHALL NOT be drawn: only each man's weapon
SHALL show, out of his window, and his shots SHALL leave from it; the
building SHALL show a garrison marker with the side's colour, the men
inside and a strength bar. Soldiers in a trench line SHALL
stay drawn at their places on the fire step (it is an open work); the
trench position SHALL serve only for capacity, cover and assault.

#### Scenario: Enter a house
- **WHEN** an Esquadra de 4 is ordered to enter a one-storey house
- **THEN** all four go in and the house shows a marker with 4 men

#### Scenario: Over capacity
- **WHEN** a section of eleven is ordered into a house of capacity 4
- **THEN** four go in and seven take slots outside

#### Scenario: Only the weapon at the window
- **WHEN** four men hold a one-storey house
- **THEN** no soldier is drawn at the house; four rifle barrels show, each out of a window of the house, on whatever wall faces the man's threat

#### Scenario: Doors front and back
- **WHEN** a casa-térrea, a venda or a sobrado is a position
- **THEN** its entrances are its front and back doors only; the matriz's are its front portal and its two side doors

#### Scenario: Windows all round
- **WHEN** any building position is drawn
- **THEN** it has a window at each of its ports, on all four walls and on the upper floor of a sobrado, and none at a door

#### Scenario: Men in a trench stay visible
- **WHEN** a section enters a fire trench line
- **THEN** its soldiers are drawn on the fire step and no garrison marker is shown

### Requirement: Elevated positions

Tall buildings SHALL have elevated ports: the matriz's tower (capacity 2,
eye at 9 m), the upper floor of a sobrado (eye at 4.6 m), the factory's and
the armazéns' upper windows (eye at 5 m) and the casa-sede's and the
engenho's lofts (eye at 4 m). A soldier at an elevated port SHALL see and
fire over low walls, hedges and crops whose top lies below his line of
sight, and SHALL be seen from farther in turn. Roofs SHALL NOT be posts
(user, 2026-11-09): no section stands on a roof. The view SHALL draw a
marker at an occupied tower or upper floor.

#### Scenario: Over the walls from the tower
- **WHEN** a rifleman in the matriz's tower faces a quintal behind a 1.8 m wall
- **THEN** he sees and can fire at a soldier crouched in that quintal

#### Scenario: Over the corn from the loft
- **WHEN** a rifleman in the casa-sede's loft looks across the Fazenda cornfield
- **THEN** the crop does not cut his line of sight to a standing man beyond it

#### Scenario: At most two in the tower
- **WHEN** a section of 8 enters the matriz with its threat beyond the quintal walls
- **THEN** no more than two of its men take the tower's ports

### Requirement: Fire from inside

Garrisoned soldiers SHALL be assigned to the ports facing their threats and
SHALL fire from them with the position's cover (building 0.6, trench 0.5)
added to their stance cover, within the 0.75 cap. A shot at the position
SHALL be resolved against a defender at a port facing the shooter, with
that cover. Suppression from fire at the position SHALL apply to every
defender and lower their rate of fire as it does outside. The view SHALL
show muzzle flashes and tracers from the ports.

#### Scenario: Good cover, real losses
- **WHEN** a garrison of 4 in a house and a section of 4 in the open exchange aimed fire at 60 m for 60 s
- **THEN** the garrison suffers fewer casualties than the men in the open, and more than none

#### Scenario: Suppressed garrison fires less
- **WHEN** a garrison is pinned by suppressive fire
- **THEN** its shots per minute fall as for pinned soldiers outside

### Requirement: Close assault

A section within 15 m of an entrance of an enemy-held position SHALL be
able to assault it (Assaltar). The assault SHALL be resolved as a close-
quarters fight over seconds: each second both sides lose men with a chance
from their fit numbers, the defenders' suppression and morale, the
attackers' morale, close-quarters weapon factors (revolver, automatic rifle
and Winchester better than a rifle) and a defender's bonus. It SHALL end
when one side has no fit man in the fight; the winners SHALL hold the
position; surviving attackers who lose SHALL fall back to cover. The view
SHALL show two opposing strength bars over the position for the length of
the fight, and nothing else of the men inside. The resolution SHALL be
deterministic.

#### Scenario: Suppress, then assault
- **WHEN** a pinned garrison of 4 is assaulted by a section of 8
- **THEN** the attackers win in most seeds and hold the position

#### Scenario: Assault without suppression
- **WHEN** a steady garrison of 4 is assaulted by a section of 4
- **THEN** the defenders win in most seeds

#### Scenario: Bars during the fight
- **WHEN** an assault is under way
- **THEN** the position shows both sides' strength bars until the fight ends

### Requirement: Leave a position

The player SHALL order a garrison to leave (Sair) with a button that asks
for a deploy point: a click within 30 m of the position, previewed as
placement. The garrison SHALL leave by the entrance nearest the point and
take positions around it. A point farther than 30 m or on blocked ground
SHALL be refused with a localized reason.

#### Scenario: Leave to the back yard
- **WHEN** the player orders a garrison out and clicks a point 12 m behind the house
- **THEN** the men leave by the back entrance and form around that point

#### Scenario: Too far
- **WHEN** the player clicks a point 50 m away
- **THEN** the exit is refused and the reason is shown

### Requirement: The commander uses positions

The enemy commander SHALL garrison buildings and trench lines on its side of
the field and on the objectives it holds, SHALL suppress an enemy-held
position before assaulting it (assault only when the garrison is pinned or
outnumbered 2 to 1), and SHALL leave a position whose garrison is down to
one man or which is surrounded. It SHALL use only what its side knows.

#### Scenario: Suppress before assault
- **WHEN** the player garrisons a house facing a legalist section
- **THEN** the legalists fire on it until it is pinned before ordering an assault

### Requirement: Garrisons under fog of war

An enemy garrison SHALL be known to the player only when its position was
seen occupied or fired from; until then the position shows no marker, and
after contact its marker shows "?" for strength until a man inside is seen
at a port. Orders and labels SHALL be localized in PT-BR and EN.

#### Scenario: Hidden garrison
- **WHEN** a legalist garrison holds fire in a house the player has not seen occupied
- **THEN** the house shows no marker

#### Scenario: Revealed by fire
- **WHEN** that garrison fires
- **THEN** the house shows a legalist marker with "?" strength
