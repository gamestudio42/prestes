## ADDED Requirements

### Requirement: Every faction animates alike

Soldiers of every faction SHALL choose their clip from the same snapshot rules:
walking, running, crouching and lying down by stance and movement, the rifle at
the ready in contact, aiming and firing when shooting, staggering when hit and
the corpse when dead. An enemy soldier SHALL NOT hold one aiming clip while his
simulation state changes.

#### Scenario: Enemy takes cover
- **WHEN** an enemy soldier runs to cover and goes prone
- **THEN** he plays the run clip on the way and the prone clip in cover

#### Scenario: Enemy between shots
- **WHEN** an enemy soldier fires and then waits for his next aimed shot
- **THEN** he plays the fire clip for the shot and an aiming or ready clip in between, matching his stance
