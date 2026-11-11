# audio Specification

## Purpose
Defines presentation-only gunshot audio driven by simulation shot events, with browser lifecycle, bounded playback and player mute/volume control.

## Requirements

### Requirement: Gunshot from shot events

The client SHALL play a gunshot for simulation `shot` events, with a sound
for each kind of fire: the Mauser recording for aimed rifle and pistol fire,
an original machine-gun report for the machine gun, deeper than a rifle's,
with the clack of its action, louder and at a steadier pitch, so a burst is
told apart by ear, and an original lighter automatic report for the
automatic rifle. Every round of a burst or belt
SHALL be heard, spaced in time as the simulation fired them, at the game
speed in use. A rifle's bolt SHALL follow only aimed rifle fire of the
player's side, never automatic fire. Menu gramophone music is defined
separately by the Menu gramophone music requirement and SHALL NOT be
triggered by simulation events. Audio SHALL be presentation-only and SHALL
NOT mutate frames, orders, RNG or state hashes.

#### Scenario: Shot is audible

- **WHEN** a frame contains an aimed-fire `shot` event after audio has been unlocked
- **THEN** the client plays the gunshot once for that event

#### Scenario: A burst is heard as a burst

- **WHEN** a machine gun fires a burst of six rounds one tick apart at game speed 1
- **THEN** the client plays six machine-gun reports about 100 ms apart, and no rifle bolt

#### Scenario: Weapons sound different

- **WHEN** a Mauser, an automatic rifle and a machine gun each fire
- **THEN** each plays its own sound

#### Scenario: Rifles are heard under the gun

- **WHEN** a machine gun fires a belt while riflemen fire on the same ticks
- **THEN** the burst takes at most one automatic-fire voice and the rifle shots still play within their own voice cap

#### Scenario: No shot, no sound

- **WHEN** a frame contains no `shot` event and no menu music is playing
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

### Requirement: Menu gramophone music

The start screen SHALL play the project's public-domain recordings as menu
music through a gramophone with previous, play/pause and next transport. The
music SHALL be presentation-only and SHALL NOT mutate frames, orders, RNG or
state hashes. The first track with no saved choice SHALL be Plangente. The
chosen track SHALL persist locally. The music SHALL stop when the battle
starts and SHALL NOT resume on its own. The recordings and their public-domain
years SHALL follow the Discografia Brasileira register in `docs/assets.md`.

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
