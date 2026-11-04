## MODIFIED Requirements

### Requirement: Order catalogue

The order board SHALL offer nine orders grounded in infantry doctrine: Move,
Advance (always by bounds), Withdraw and Halt for movement; Attack (which
follows a running target), Suppress and Flank for fire and manoeuvre; Defend
and Recon for position. Rescue SHALL be reached from a wounded comrade rather
than the board. Aim, disperse, regroup, reserve, ambush, pursue and
protect-officer SHALL be expressed through the facing and spacing drag, fire
control, posture and automatic behaviour, and the simulation SHALL still
accept their commands, mapped to the new behaviour.

#### Scenario: Nine orders
- **WHEN** the player opens the order board
- **THEN** it shows Move, Advance, Withdraw, Halt, Attack, Suppress, Flank,
  Defend and Recon, each with its availability

#### Scenario: Ambush through fire control
- **WHEN** the player orders Defend with fire control on contact and an enemy
  troop walks into 25 m of the section
- **THEN** the section holds fire until then and opens fire together

#### Scenario: Old command still works
- **WHEN** a replay sends the old `disperse` order
- **THEN** the section moves to the point with 6 m between soldiers

#### Scenario: Unavailable order explains itself
- **WHEN** an order cannot run because of state, strength, officer or target
- **THEN** the board shows a localized reason instead of silently doing nothing

## ADDED Requirements

### Requirement: Fire control

A section SHALL have one fire control setting: free fire, on contact, or
hold fire. On contact SHALL hold fire until an enemy is within 25 m of any of
its soldiers or the section is fired upon, then switch the section to free
fire.

#### Scenario: Contact opens fire
- **WHEN** a section on contact sees an enemy at 60 m and later at 20 m
- **THEN** it does not fire at 60 m and opens fire at 20 m

### Requirement: Automatic officer cover

When an officer is under fire, up to three soldiers within 10 m of him SHALL
prefer cover slots between him and the threat, in every posture.

#### Scenario: Officer screened
- **WHEN** the instructor is fired upon with the section around him
- **THEN** soldiers take the free slots that put them between him and the
  shooter
