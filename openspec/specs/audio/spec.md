# audio Specification

## Purpose
Defines presentation-only gunshot audio driven by simulation shot events, with browser lifecycle, bounded playback and player mute/volume control.

## Requirements

### Requirement: Gunshot from shot events

The client SHALL play a single original synthesized gunshot for simulation `shot` events.
It SHALL NOT play any other sound effect in this change. Audio SHALL be
presentation-only and SHALL NOT mutate frames, orders, RNG or state hashes.

#### Scenario: Shot is audible

- **WHEN** a frame contains a `shot` event after audio has been unlocked
- **THEN** the client plays the gunshot once for that event

#### Scenario: No shot, no sound

- **WHEN** a frame contains no `shot` event
- **THEN** the client stays silent

#### Scenario: Determinism is unchanged

- **WHEN** the same commands run with audio enabled or disabled
- **THEN** the simulation hash and event stream are identical

### Requirement: Browser audio lifecycle

Audio SHALL be created or resumed only after a player gesture, SHALL prepare the
synthesized buffer, SHALL cap concurrent voices, and SHALL fail silently if the
browser blocks playback.

#### Scenario: Start gesture unlocks audio

- **WHEN** the player starts the game
- **THEN** the audio context is created or resumed before combat sounds play

#### Scenario: Burst is bounded

- **WHEN** several shot events arrive in the same tick
- **THEN** the client limits concurrent gunshot voices and does not create
  unbounded nodes

#### Scenario: Audio unavailable

- **WHEN** the browser has no AudioContext or blocks audio
- **THEN** the game continues without an unhandled error

### Requirement: Audio control

The HUD overflow SHALL expose a muted/volume control for the single combat sound
channel, and the setting SHALL persist locally.

#### Scenario: Mute gunfire

- **WHEN** the player mutes combat audio
- **THEN** subsequent shot events are silent and the setting survives reload

#### Scenario: Unmute gunfire

- **WHEN** the player unmutes combat audio
- **THEN** subsequent shot events play at the stored volume

