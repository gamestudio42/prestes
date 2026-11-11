## MODIFIED Requirements

### Requirement: Crew-served machine gun

The metralhadora 7 mm SHALL be served by a crew: it fires only after it has
been set up for 4 s where it halts, never while moving; when its gunner
falls, the next fit crewman takes it over; it fires belts of long reach and
heavy suppression, and its ammunition is the crew's. Its tripod and the crew
SHALL be drawn by the view.

Its reach SHALL be the gun's own 140 m, not the rifle's 120 m: the gunner
SHALL engage, up to 140 m, an enemy that his side sees (under fog of war, the
side's sighting; without fog, his own sight), when he has a line of fire to
him and the enemy lies inside his forward cone. Every other weapon SHALL keep
its range within the battle's combat range.

Under an attack, pursue or advance order the gun's crew SHALL halt and set
up the gun when an enemy its side sees is within the gun's reach and the
gunner has a line of fire to him, and SHALL go on with the order once the gun
has had no such enemy for 5 s. A move order SHALL move the gun without
halting. The halt, the set-up and the resumption SHALL be decided by the
simulation alone, from the seeded state, so the same seed and commands give
the same halts.

Historical note: the column's 7 mm machine guns are documented (Macaulay,
1974, p. 113); the model is not named, and reach, rates and set-up time are
game abstractions.

#### Scenario: No fire on the move
- **WHEN** the machine-gun crew is ordered to move
- **THEN** the gun does not fire until it has halted and been set up for 4 s

#### Scenario: Crewman takes over
- **WHEN** the gunner is incapacitated
- **THEN** a fit crewman takes the gun and it fires again after setting up

#### Scenario: Reach beyond the rifle
- **WHEN** a set gun has an enemy at 130 m whom a rifleman of its side sees, with a clear line of fire from the gunner
- **THEN** the gun fires at him, and a Mauser beside the gun does not

#### Scenario: An attacking gun halts to fire
- **WHEN** a machine-gun section ordered to attack comes within 140 m of an enemy its side sees, with a line of fire
- **THEN** the gun halts, is set up within 4 s and fires, while the order stays attack

#### Scenario: The gun moves on
- **WHEN** a halted attacking gun has had no enemy in reach and in sight for 5 s
- **THEN** its crew goes on toward the order's objective

#### Scenario: Halts are deterministic
- **WHEN** a rostered battle with a machine gun runs twice with the same seed and commands
- **THEN** the state hashes are identical tick by tick
