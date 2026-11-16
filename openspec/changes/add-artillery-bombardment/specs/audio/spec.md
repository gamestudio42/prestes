## ADDED Requirements

### Requirement: Artillery sounds

On a `shell_incoming` event the game SHALL play an incoming whistle placed
at the landing point, timed to end as the shell lands. On a `shell_impact`
event it SHALL play a burst placed at the landing point: a close burst
within about 60 m of the listening point and a distant rumble beyond it,
picked deterministically from at least two recordings of each so
successive bursts differ. Both SHALL go through the effects volume and the
mute setting. A whistle for a shell beyond 250 m of the listening point
SHALL NOT play. Every recording SHALL be CC0 (or the owner's own), with its
author, source link, licence and excerpt listed in `docs/assets.md`.

#### Scenario: Whistle, then burst
- **WHEN** a shell is announced 30 m from the listening point and lands 2 s later
- **THEN** a whistle plays over those 2 s and a close burst plays as it lands

#### Scenario: Muted
- **WHEN** the game is muted and shells land
- **THEN** no whistle or burst is heard
