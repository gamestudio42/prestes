## ADDED Requirements

### Requirement: Non-lethal training fire

The simulation SHALL support units that fire non-lethal training rounds. A
non-lethal attacker SHALL apply suppression and bounded morale pressure to its
target, but SHALL NOT reduce target health, create a wound, incapacitate, rout or
kill a player soldier. A non-lethal attacker SHALL remain a normal target that the
player troop can wound or kill. The hash and deterministic behavior SHALL include
the non-lethal flag and role.

#### Scenario: Non-lethal hit

- **WHEN** a non-lethal training shot hits a player soldier
- **THEN** the soldier remains alive, unwounded and not incapacitated

#### Scenario: Non-lethal suppression

- **WHEN** a non-lethal training shot hits or near-misses a player soldier
- **THEN** suppression rises and morale falls but remains above the training floor

#### Scenario: Training enemy remains vulnerable

- **WHEN** the player troop fires at a training enemy
- **THEN** the training enemy can be wounded or killed normally

#### Scenario: No training rout

- **WHEN** a player soldier is under sustained non-lethal fire
- **THEN** the soldier does not enter panic or rout from that fire

### Requirement: Training roles and phase setup

Spawned units SHALL optionally expose a training role and a non-lethal flag to the
frame. The simulation SHALL accept a training-only phase setup command that clears
active orders, removes prior training enemies, repositions the player troop and
officer at the phase checkpoint, resets their training state and spawns the phase
enemy. The simulation SHALL accept a training-only despawn command for a role.
Both commands SHALL be rejected outside training or sandbox contexts.

#### Scenario: Spawn training troop

- **WHEN** the bootcamp spawns a training troop with a training role and non-lethal
  flag
- **THEN** the frame exposes that role and flag and the troop behaves as a
  non-lethal attacker

#### Scenario: Phase setup

- **WHEN** the bootcamp sends a valid phase setup command
- **THEN** prior training enemies are removed, the player troop is placed at the
  phase checkpoint and the new training enemy is spawned

#### Scenario: Despawn role

- **WHEN** the bootcamp despawns the training-enemy role
- **THEN** training enemies are removed and their orders and target references are
  cleared

#### Scenario: Reject outside training

- **WHEN** a phase setup or role despawn command is sent outside training or
  sandbox mode
- **THEN** the simulation rejects it and leaves the state hash unchanged
