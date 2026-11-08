## Context

The current start screen (`apps/game/src/ui/StartScreen.tsx`) is a two-page
book with four bookmarks over a pixel-filtered video. It already owns the
campaign placeholder, the map selection, the compendium and the options. The
gramophone is an inline pixel SVG (`Gramophone.tsx`) with a separate audio
engine (`useGramophone`, `Gramophone`) and a fixed lower-left position.

The repo already has a tested pattern for draggable layout state:
`windowLayout.ts` clamps and snaps window positions, persists them under a
versioned key and falls back to defaults when storage is unavailable. The desk
reuses that pattern rather than inventing a second one.

The change must be reversible. The book screen is preserved unchanged behind
`?menu=book`, and the desk is reached with `?menu=desk` until it is promoted
to the default in a separate commit.

## Goals / Non-Goals

**Goals:**

- A desk of pixel-art objects that can be dragged, opened and closed.
- Two independent books with page turning and the existing content.
- A compass that reveals the existing sound and language controls.
- A four-map fan that selects the 3v3 battlefield.
- A reference pile that opens a linked dossier of the works consulted.
- One shared icon-label treatment below every closed desk object.
- A draggable pixel-art gramophone that keeps the existing engine.
- Persisted positions, a tidy-desk reset, keyboard control and reduced motion.
- No change to simulation, determinism, battle audio, map data or the 3v3.
- The book menu remains runnable during validation.

**Non-Goals:**

- Campaign missions, campaign prose or a real campaign progression.
- The Manual and pre-battle roster planned by other changes.
- New recordings, a playlist, a volume slider or battle music.
- A drawn wooden desk replacing the existing pixel scene.
- Removing the book menu in this change.

## Decisions

### 1. Parallel start screens behind a selector

`StartScreen.tsx` becomes a small selector. The current implementation moves to
`StartScreenBook.tsx` without logic changes; the desk is
`StartScreenDesk.tsx`. A single constant decides the default:

```ts
const DEFAULT_MENU: 'book' | 'desk' = 'desk';
// ?menu=book | ?menu=desk overrides it
```

The desk is developed and tested with `?menu=desk` and is now the default. It
can be reverted to the book in one line. The book screen and its tests stay
available at `?menu=book` until a later removal commit.

Alternative considered: rewrite `StartScreen.tsx` in place behind a feature
flag. Rejected because a crash in the new code would also break the fallback.

### 2. Desk state and drag

A pure module `apps/game/src/ui/menu/deskLayout.ts` owns:

- object ids (`campaign`, `compendium`, `references`, `options`, `maps`,
  `gramophone`);
- default positions as fractions of the viewport, measured once per mount;
- `clampDesk` (keep fully in view, 2 px grid) and `snap`;
- `loadDesk` / `saveDesk` under `prestes.menu.desk.v1`;
- `resetDesk`.

A `DeskObject` component handles pointer drag with `setPointerCapture`, the
same way `FloatingWindow` does. It also handles keyboard movement (arrow keys,
Shift for a larger step), Enter/Space to open, Escape to close, and raises the
object to the front on focus or pointer down.

There is no title bar: the object is dragged from its art, cover or open
frame, never from an interactive descendant (`button`, `a`, `select`, `input`).
Text selection is disabled on the desk objects, so a drag never turns into a
selection; the text is still exposed to assistive technology. A visually hidden
handle keeps keyboard movement, open/close and Escape available, and a small
brass clasp closes an open object.

Alternative considered: a canvas scene with objects drawn in one canvas.
Rejected because the book content must stay accessible and localized HTML;
canvas would require rebuilding text layout and accessibility.

### 3. Book art with an HTML page layer

Each book is a PNG pair: closed cover and open frame. The open frame draws the
leather boards, the page edges, the gutter and blank parchment pages. The HTML
content sits in absolutely positioned page boxes over the blank paper, using
the existing ink, parchment and typography rules. This keeps every label in the
locale catalogs and every control a real button.

Closing a book returns it to its named cover; opening it centers the measured
full-screen spread. Page turning reuses the existing `book-turn` idea: a keyed
animation on the page body, disabled under reduced motion. The campaign book
keeps its current placeholder spread and points to the map fan; the compendium
book reuses the existing entry content and page controls. The closed books are
icons: a rasterized cover with a single HTML label below it, using the shared
desk-label font and gap. The campaign reads "Campanha"/"Campaign", the
compendium "A Coluna Prestes"/"The Prestes Column"; no text is painted on the
cover.

Alternative considered: render text into the PNG. Rejected because it breaks
localization, accessibility, scaling and the content checks.

### 4. Options compass

The closed compass carries the "Opções"/"Options" label below its art. Opening it lays out a centered
field-manual screen with the "Options" heading, the compass, the sound toggle
and the language selector, then centers the measured screen. The sound toggle
keeps `data-no-autoplay`; the existing `useGramophone` first-gesture hook
ignores it, so opening the compass may start the music but toggling sound does
not.

### 5. Skirmish map fan

The fan renders the four maps from `battleMaps()` as absolutely stacked sheets
with a perspective tilt and a small offset. Each sheet is a rasterized folded
map modified from the owner's reference, with the fold creases baked into the
art and a blank parchment strip at the bottom. The selected sheet is the front
one; the HTML legend over that strip carries the localized name, description and
deploy action, so they read as part of the map rather than a separate panel. The
map area is a selectable region; activating the active sheet cycles to the next
map. The legend keeps
`data-testid="start-battle-3v3"` and each sheet keeps
`data-testid="map-option-<id>"`. The fan uses the current `battleMap` prop and
`onBattleMapChange`, so the 3v3 and the sandbox keep their data contract. The
map sits behind the smaller objects until the player touches it.

### 6. Gramophone

`GramophoneDesk.tsx` reuses `useGramophone`, `GramophoneTrack` and the existing
audio output. Closed, it is the PNG cabinet and horn with its record. Opening it
centers a large screen with the larger machine, the current recording's
metadata, a rack of the recordings and the transport. Selecting a rack row
calls the new `Gramophone.select(index)`. The record never rotates: a separate
transparent groove PNG lies over it and shimmers subtly only while a track
plays. The closed machine carries its "Gramofone"/"Gramophone" label below the
art, and the old "From the next room"/"Da sala ao lado" subtitle is gone from
both routes. The old `Gramophone.tsx` SVG component and its transient card stay
for the book fallback.

### 7. Art pipeline

The desk art mixes Aseprite drawing with rasterized reference work. The
compass, open book frames, record icon and groove overlay are drawn in Aseprite;
the two closed books, the reference pile and the maps are rasterized from
reference images supplied by the project owner, with the checkerboard background
removed, the visible pixels cropped, the colours limited to a small
leather/gold/cream palette and the two main covers hue-shifted to navy and
green. The gramophone body is rasterized the same way. Titles are never painted
into the art: a single HTML label below each icon carries the localized name,
using the same font and gap. Sources live in `art-src/menu/`; exported PNGs live
in `apps/game/src/assets/menu/desk/` and are imported by Vite, so the build has
no runtime path dependency. The reference images stay in the gitignored
`livros/` and `gramofone/` folders and are not committed.

Alternative considered: inline SVG like the current gramophone. Rejected by
the project owner in favour of pixel art for the desk objects.

### 8. Responsive and reduced motion

Above 900 px the desk is free-positioned. Below 900 px it becomes a vertical
drawer in the same order, with open/close and page turning but without free
drag; this avoids unusable overlap on phones. `prefers-reduced-motion: reduce`
removes the open, page-turn and record animations. Every control keeps a 2 px
gold focus ring and a localized accessible name.

### 8a. Reference dossier

The reference pile is a sixth desk object. Opening it centers a parchment
dossier with the owner's preface and four linked entries: Neill Macaulay's
*The Prestes Column*, Jorge Amado's *O Cavaleiro da Esperança*, Erico
Verissimo's *O Tempo e o Vento* series and Jacob Blanc's *Before the Flood*.
The entries link to catalogue records and reproduce no protected text; the
preface, kicker, heading, notes and labels come from the PT-BR and EN catalogs.
The pile closes back to its labeled icon.

### 9. Testing and baselines

The book tests keep running against `?menu=book` and their baselines follow the
removed gramophone subtitle. A new `desk.spec.ts` covers drag, persistence,
reset, both books, page turning, the reference dossier, the compass, the map fan
and the gramophone in `?menu=desk`. New visual baselines are named `desk-*`.
The default flip is its own commit with its own test update.

## Risks / Trade-offs

- **Dragging fights reading** → the whole object drags, text selection is
  disabled and interactive controls are excluded; the page body still scrolls
  with the wheel.
- **PNG pages reduce text room** → the open frame defines safe page boxes and
  the page body scrolls; long entries keep the existing layout.
- **Objects overlap when both books open** → the last interacted object comes
  to the front; the tidy-desk action restores a readable default; narrow
  screens use the drawer layout.
- **Saved positions off-screen after a resize** → clamp on load and on resize,
  with the default as fallback.
- **Aseprite unavailable** → stop and ask; do not silently fall back to SVG.
- **Visual baselines churn** → book baselines are untouched; desk baselines are
  new and reviewed separately.
- **Other in-flight changes assume bookmarks** → the desk keeps the existing
  props and an extensible object list so Manual and roster can be added as new
  objects; those features are not implemented here.

## Migration Plan

1. Commit the existing work as `menu-book-baseline` (done before this change).
2. Implement the desk behind `?menu=desk`; the book remains the default.
3. Validate with the app commands and a play session in both routes.
4. Flip `DEFAULT_MENU` to `desk` in a dedicated commit.
5. Remove the book screen and its tests only in a later, separate commit after
   the owner accepts the desk.

Rollback: open `?menu=book`, revert the default flip commit, or discard the
`add-menu-desk` branch. The new storage key is independent, so no player data
needs migration or cleanup.
