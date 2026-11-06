## ADDED Requirements

### Requirement: Menu gramophone music

The start screen SHALL play the project's public-domain recordings as menu
music through a gramophone with previous, play/pause and next transport. The
music SHALL be presentation-only and SHALL NOT mutate frames, orders, RNG or
state hashes. The first track with no saved choice SHALL be Plangente. The
chosen track SHALL persist locally. The music SHALL stop when the battle
starts and SHALL NOT resume on its own.

#### Scenario: First gesture starts the gramophone

- **WHEN** the player clicks or presses a key on the start screen for the first
  time
- **THEN** the current track starts with a slow fade-in and the play control
  shows the playing state

#### Scenario: Transport controls the track

- **WHEN** the player pauses, plays, moves to the next track or moves to the
  previous track
- **THEN** the gramophone follows that state, the selected track persists, and
  next and previous wrap around the list

#### Scenario: Track ends

- **WHEN** a playing track ends
- **THEN** the next track starts and keeps playing

#### Scenario: Previous restarts a running track

- **WHEN** the player presses previous after the current track has played for
  more than three seconds
- **THEN** the current track restarts instead of moving to the previous one

#### Scenario: Menu-only

- **WHEN** the player starts a battle
- **THEN** the menu music stops and does not play during the battle

#### Scenario: Determinism is unchanged

- **WHEN** the same commands run with the gramophone playing, paused or
  unavailable
- **THEN** the simulation hash and event stream are identical

#### Scenario: Audio failure

- **WHEN** the browser blocks audio or a recording cannot load
- **THEN** the menu continues without an unhandled error and the gramophone
  controls remain available

### Requirement: Next-room treatment

Menu music SHALL be presented as if heard from another room: band-limited,
slightly reverberant and quieter than the interface's combat audio. The
treatment SHALL be presentation-only and SHALL NOT change the recording files
or the simulation.

#### Scenario: Distant sound

- **WHEN** menu music plays
- **THEN** its high frequencies are attenuated, a short room reverberation is
  present and its level stays below the combat mix

#### Scenario: Mute

- **WHEN** game sound is muted
- **THEN** the gramophone is silent until sound is enabled again

## MODIFIED Requirements

### Requirement: Gunshot from shot events

The client SHALL play a single original gunshot for simulation `shot` events.
Menu gramophone music is defined separately by the Menu gramophone music
requirement and SHALL NOT be triggered by simulation events. Audio SHALL be
presentation-only and SHALL NOT mutate frames, orders, RNG or state hashes.

#### Scenario: Shot is audible

- **WHEN** a frame contains a `shot` event after audio has been unlocked
- **THEN** the client plays the gunshot once for that event

#### Scenario: No shot, no sound

- **WHEN** a frame contains no `shot` event and no menu music is playing
- **THEN** the client stays silent

#### Scenario: Determinism is unchanged

- **WHEN** the same commands run with audio enabled or disabled
- **THEN** the simulation hash and event stream are identical
