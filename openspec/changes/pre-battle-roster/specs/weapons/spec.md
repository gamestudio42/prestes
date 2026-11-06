## ADDED Requirements

### Requirement: Period weapon set

The weapon catalog SHALL hold the Mauser 7 mm rifle, the fuzil automático
7 mm, the metralhadora 7 mm, the Winchester .44 and the revólver, each with
its own magazine, reserve, fire rates, reload, range, accuracy, damage and
suppression, and a localized name and description in PT-BR and EN. Where the
source does not name a model, the game SHALL NOT name one; identities follow
`docs/history/WEAPONS.md` and statistics SHALL be labelled abstracted. The
Winchester SHALL have a shorter range and a faster aimed rate than the
Mauser; the revólver SHALL reach 25 m; the automatic rifle SHALL fire short
bursts with more suppression than a rifle.

#### Scenario: Ranges differ
- **WHEN** a revolver, a Winchester and a Mauser have an enemy at 60 m in sight
- **THEN** only the Winchester and the Mauser can fire at him

#### Scenario: Burst fire suppresses
- **WHEN** an automatic rifle and a Mauser fire the same number of seconds at a section
- **THEN** the automatic rifle's fire adds more suppression

### Requirement: Crew-served machine gun

The metralhadora 7 mm SHALL be served by a crew: it fires only after it has
been set up for 4 s where it halts, never while moving; when its gunner
falls, the next fit crewman takes it over; it fires belts of long reach and
heavy suppression, and its ammunition is the crew's. Its tripod and the crew
SHALL be drawn by the view.

#### Scenario: No fire on the move
- **WHEN** the machine-gun crew is ordered to move
- **THEN** the gun does not fire until it has halted and been set up for 4 s

#### Scenario: Crewman takes over
- **WHEN** the gunner is incapacitated
- **THEN** a fit crewman takes the gun and it fires again after setting up

### Requirement: Per-weapon ammunition

Each soldier SHALL carry his weapon's magazine and reserve, and the HUD
weapon card SHALL show the selected section's weapons and rounds, localized.
A section's riflemen SHALL NOT feed the machine gun or the automatic rifle
except the crew and team members who carry its magazines.

#### Scenario: Weapon card shows the mix
- **WHEN** the player selects an Esquadra de 5
- **THEN** the weapon card lists the Mauser and the automatic rifle with their rounds
