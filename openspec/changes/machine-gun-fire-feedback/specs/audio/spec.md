## MODIFIED Requirements

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
