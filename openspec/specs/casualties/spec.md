# casualties Specification

## Purpose
Defines wounds, incapacitation, rescue, evacuation, recovery and roster persistence.

## Requirements

### Requirement: Wound classification

Each soldier SHALL enter a coherent wound category: light, moderate, severe or
fatal. Light and moderate remain mobile with penalties; severe becomes
incapacitated; fatal becomes dead.

#### Scenario: Light wound
- **WHEN** damage leaves a soldier lightly wounded
- **THEN** the soldier remains active with reduced movement or accuracy

#### Scenario: Severe wound
- **WHEN** damage reaches the incapacitation threshold
- **THEN** the soldier becomes incapacitated and can be rescued

#### Scenario: Fatal wound
- **WHEN** damage exceeds the fatal threshold
- **THEN** the soldier becomes dead and cannot be rescued

### Requirement: State exclusivity

A soldier SHALL have one exclusive state. Carried, treating, evacuating, recovering
and dead soldiers SHALL NOT receive incompatible movement or combat orders.

#### Scenario: Carried cannot be ordered
- **WHEN** the player orders a soldier in `being_carried`
- **THEN** the command is rejected with an incompatible-state reason

#### Scenario: Dead cannot be rescued
- **WHEN** the player targets a dead soldier for rescue
- **THEN** the command is rejected and no rescuer is assigned

### Requirement: Rescue pipeline

A rescue SHALL follow identify, select rescuer, prepare support, approach, carry,
reach cover, first aid, evacuate, recover and return.

#### Scenario: One rescuer per casualty
- **WHEN** a rescue is assigned
- **THEN** exactly one fit rescuer owns the casualty until completion, transfer or abort

#### Scenario: Reach the casualty
- **WHEN** the rescuer reaches the casualty
- **THEN** the casualty becomes `being_carried` and both move as one operation

#### Scenario: Reach cover
- **WHEN** the rescuer reaches an accessible cover position
- **THEN** the casualty is placed and first aid begins

#### Scenario: First aid completes
- **WHEN** the treatment timer ends
- **THEN** the casualty becomes evacuating and is removed from the active field

### Requirement: Rescue interruption

The rescue SHALL transfer, complete safely or abort when the rescuer is
incapacitated, the casualty dies, cover is unavailable or the player cancels.

#### Scenario: Rescuer incapacitated
- **WHEN** the rescuer becomes incapacitated
- **THEN** another fit rescuer is assigned or the rescue ends without duplicating the casualty

#### Scenario: Casualty dies
- **WHEN** the casualty dies before evacuation
- **THEN** the rescue ends and the record becomes dead

#### Scenario: Rescue cancelled
- **WHEN** the player cancels a rescue
- **THEN** the operation stops at a safe state and the soldier states remain valid

### Requirement: Persistent identity

A rescued or evacuated soldier SHALL preserve its id, history, wounds and recovery
record. It SHALL NOT be deleted or replaced automatically.

#### Scenario: Evacuated soldier returns
- **WHEN** recovery ends
- **THEN** the same soldier becomes available again with its original id and history

#### Scenario: Recovery persists
- **WHEN** the battle ends and a new battle starts before recovery ends
- **THEN** the soldier remains unavailable

### Requirement: Rescue feedback

The unit panel SHALL show rescuer, casualty, rescue phase and progress.
Wounded, incapacitated, carried, treating, evacuated and dead soldiers SHALL be
visually distinguishable.

#### Scenario: Rescue progress
- **WHEN** a rescue is active
- **THEN** the panel shows rescuer, casualty, phase and progress

#### Scenario: Carried visual
- **WHEN** a soldier is being carried
- **THEN** the view shows the casualty attached to the rescuer rather than walking independently

#### Scenario: Sandbox casualty drill
- **WHEN** the sandbox incapacitates the selected soldier
- **THEN** the soldier enters the incapacitated state deterministically and a rescue can be assigned without combat randomness
