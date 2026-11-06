## Why

The book menu is silent. A gramophone playing public-domain Brazilian
recordings from the next room would give the menu the period and place the
game wants before a battle, and the recordings are already selected and
cleared for use. The music should feel like it comes from another room, not
like a soundtrack layered over the interface.

## What Changes

- The start screen gains a gramophone in the lower-left corner, with
  previous, play/pause and next controls, a track line and a transient
  metadata card when the track changes.
- Seventeen public-domain recordings, already supplied by the project owner,
  become menu music. The first track is **Plangente** (Odeon 10137,
  Ernesto Nazareth, 1928).
- The gramophone starts on the first click or key on the menu, fading in
  slowly so it does not startle. Pressing Play also turns game sound on when
  it is muted.
- Audio is presented as if heard from the next room: low-passed, slightly
  reverberant and kept at a low level. It is menu-only and stops when the
  battle starts.
- The recordings are optimized to mono 24 kbps MP3 at 22.05 kHz with
  loudness normalization, reducing the source set from about 40 MB to about
  9 MB. Originals stay out of the repository.
- The asset register records each recording, its composer, performer, year,
  public-domain year and source page.

## Capabilities

### New Capabilities

None. The menu gramophone extends the existing audio and presentation
capabilities.

### Modified Capabilities

- `audio`: adds menu gramophone music, transport and the "next room"
  treatment; clarifies that gunshot audio remains presentation-only and is
  not the only sound in the game.
- `presentation`: adds the gramophone widget on the start screen, its
  metadata card, first-gesture start, localized labels and menu-only scope.

## Impact

- `apps/game/public/music/` gains 17 optimized recordings; `gramofone/`
  becomes a local, gitignored source folder.
- `apps/game/src/audio/` gains the track manifest, the gramophone engine and
  its Web Audio output. `useGramophone` owns playback state and persistence.
- `apps/game/src/ui/StartScreen.tsx` places the widget; `gramophone.css`
  styles it. `packages/content` gains PT-BR and EN labels.
- `docs/assets.md` records the recordings and the encoding. New unit, e2e
  and visual tests cover the widget, the card and asset size.
- No simulation, determinism, command or history change.

**Player fantasy:** the player is planning the next fight in a quiet room
while a gramophone plays an old Brazilian record in the room next door.

**Core loop beat:** menu and anticipation, before the skirmish.

**Historical scope:** the recordings are period Brazilian popular music,
kept as historical documents; the metadata comes from Discografia
Brasileira and the project owner's public-domain set.

**Multi-perspective:** unchanged; no historical figure is portrayed by the
menu music.

**Legal and ethical note:** the recordings are public domain (the source
marks each recording with its public-domain year; the project owner verified
the set). They are not book text, not scans and not third-party game assets.

**MVP:** one gramophone on the menu, 17 tracks, transport, metadata card,
localization and tests.

**Non-goals:** music during battle, a playlist or track picker, a volume
slider of its own, streaming from an external host, new recordings and
changes to the simulation.
