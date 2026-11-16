## MODIFIED Requirements

### Requirement: Audio control

The HUD overflow SHALL expose a mute control for all battle sound and
separate volume controls for three channels: effects (gunfire and impacts),
ambience (air, water and footsteps) and voices. The settings SHALL persist
locally, and a setting stored before the channels existed SHALL be read as
the mute state and the effects volume, with ambience and voices at their
defaults. The labels SHALL come from the PT-BR and EN catalogs.

#### Scenario: Mute gunfire

- **WHEN** the player mutes combat audio
- **THEN** subsequent shot events are silent and the setting survives reload

#### Scenario: Unmute gunfire

- **WHEN** the player unmutes combat audio
- **THEN** subsequent shot events play at the stored volume

#### Scenario: Voices without ambience

- **WHEN** the player sets the ambience volume to zero and leaves voices up
- **THEN** orders and answers are heard and no air, water or footstep sound plays

#### Scenario: An older setting

- **WHEN** a player who had muted the game before this change opens it
- **THEN** the game is still muted
