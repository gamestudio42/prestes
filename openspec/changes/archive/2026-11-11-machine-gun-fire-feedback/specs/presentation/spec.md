## MODIFIED Requirements

### Requirement: Combat feedback

The view SHALL show each shot with a muzzle flash at the shooter, smoke (once
per burst for automatic fire), a short tracer and an impact effect where it
lands (dust on ground, splinters or dust on cover), and SHALL show moving
soldiers raising footstep dust and suppressed soldiers with dirt spurts
around them. Every round of a burst or belt SHALL draw its own tracer; the
machine gun's tracers SHALL be longer and faster than a rifle's and of a
different hue, so its fire is told apart at a glance; every tracer SHALL be
one render pixel wide, without a glow that widens it, in the tactical and the
strategic camera bands. Dead characters SHALL lie on the ground in the corpse pose
without a selection ring. All of it SHALL be presentation-only and SHALL NOT
mutate frames, orders, RNG or state hashes.

#### Scenario: Shot tracer

- **WHEN** a shot event is received
- **THEN** a short-lived line appears from the shooter to the target

#### Scenario: A burst draws a tracer per round

- **WHEN** a machine gun fires a burst of six rounds
- **THEN** six tracers fly from the gun, one per round, in the order fired

#### Scenario: Tracers read at strategic zoom

- **WHEN** the camera is in the strategic band and a rifle and a machine gun fire
- **THEN** both tracers are one render pixel wide and the machine gun's is longer and of its own hue

#### Scenario: Muzzle and impact

- **WHEN** a shot event is received
- **THEN** a muzzle flash appears at the shooter and an impact effect at the
  target's position, matching what it hit

#### Scenario: Dead unit

- **WHEN** a unit dies
- **THEN** its body lies down and its selection ring is hidden

## ADDED Requirements

### Requirement: Machine-gun state on the weapon card

When the selected section holds a machine gun, the HUD weapon card SHALL
show the gun's state, read from the frame: moving, setting up (with the time
left), set, or without a gunner. The labels SHALL come from the PT-BR and EN
catalogs.

#### Scenario: Setting up is shown

- **WHEN** the player selects a machine-gun section that halted 2 s ago
- **THEN** the weapon card shows the gun setting up, with about 2 s left

#### Scenario: Set gun is shown

- **WHEN** the gun has stood still for 4 s
- **THEN** the weapon card shows it set

#### Scenario: Gun state is localized

- **WHEN** the player switches locale
- **THEN** the gun state label changes without a reload
