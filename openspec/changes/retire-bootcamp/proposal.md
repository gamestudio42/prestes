## Why

After playing the battle maps (2026-11-05) the user asked to take the
bootcamp out of the game: the seven-station Vila Militar course is too long
and too complex for what it teaches. The game's teaching moves to short
videos and a manual section of the book menu, built on the three new
battlefields; that is a later change. Until then the menu should lead to
what plays well: the 3 vs 3 on a chosen map.

## What Changes

- **BREAKING** The bootcamp leaves the game: its menu actions (Start,
  Continue, Restart), the exercise director, the training mission panel,
  objectives, markers, failure and debrief HUD, the instructor's balloon and
  the saved bootcamp progress.
- The book menu's campaign page says the campaign and its manual are in
  preparation and points to the skirmish page; the skirmish is the game's
  playable entry.
- Saved bootcamp progress in local storage is ignored and cleared on load.
- The simulation's training options (training ground, phase setups,
  non-lethal fire) stay for now: the simulation tests use them and the coming
  tutorial may reuse them. Their removal is decided by that change.
- Bootcamp-only strings leave the PT-BR and EN catalogs; the locale check
  keeps both in step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bootcamp`: every requirement is removed; the capability is retired.
- `presentation`: the start screen no longer offers the bootcamp; the
  bootcamp entry, mission objective HUD, objective markers and the failure
  and debrief HUD are removed.

## Impact

- `apps/game` (App, StartScreen, exercise director hook, training folder,
  TrainingMissionPanel, storage, styles), `packages/content` (bootcamp
  exercise and its strings), e2e specs (`training-campaign`, start screen,
  smoke and visual snapshots that open the bootcamp), unit tests of the
  exercise. The simulation is untouched; the determinism goldens hold.
- **Player fantasy and core loop**: unchanged for the skirmish; the
  campaign's entry waits for the tutorial and campaign changes.
- **Historical scope**: none. The compendium entry on Vila Militar stays (it
  is history, not the bootcamp).
- **Multi-perspective**: unchanged; no historical figure was playable in the
  bootcamp.
- **Legal and ethical note**: none beyond the standing rules.
- **MVP**: menu and app without the bootcamp, storage cleared, tests green.
- **Non-goals**: the video tutorial and the manual section (next change);
  removing the simulation's training mode; changing the 3 vs 3.
