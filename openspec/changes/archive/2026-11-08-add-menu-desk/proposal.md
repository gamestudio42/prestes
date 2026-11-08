## Why

The start screen is a two-page book with four bookmarks. It reads as a menu,
not as the officer's working surface the game is about. A pre-battle menu built
as a desk of period objects — books, a compass, a fan of maps and a gramophone —
gives the player something to pick up, open, leaf through and lay down before
choosing the ground, matching the game's command fantasy and the historical
setting without changing the battle itself.

## What Changes

- The bookmark book is replaced, on the desk route, by a pixel-art desk with
  draggable objects: the campaign book, the compendium book, an options
  compass, a fan of skirmish maps and the gramophone.
- The campaign and the compendium become **two independent books**. Each closed
  cover carries the book name; opening one lays out a centered, full-screen
  spread. Both may stay open at once and the compendium turns pages with the
  existing entry content.
- Options become a **compass** with no text until it opens. Opening it lays out a
  centered options screen with the sound toggle and the language selector.
- Skirmish becomes a **fan of the four battle maps**. The active sheet carries a
  printed legend strip with the map's name, description and deploy action; the
  active sheet cycles to the next map and the deploy action starts the 3v3 on
  the selected map.
- The gramophone becomes a **closed desk object** drawn with pixel-art sprites.
  Opening it lays out a centered screen with the larger machine, the current
  recording's metadata, a rack of recordings and the transport. Its record never
  rotates; the groove highlights shimmer subtly while a track plays.
- Object positions persist under a new storage key and a localized "tidy desk"
  action restores the default arrangement. Dragging an object never selects its
  text.
- Keyboard users can move the focused object with the arrow keys, open it with
  Enter or Space and close it with Escape. Reduced motion disables page turns and
  the groove shimmer.
- The current book menu is preserved unchanged behind `?menu=book`. The desk is
  the default; reverting the promotion commit restores the book default.
- The desk is implemented as a new component set; the existing start screen,
  SVG gramophone and book styles are not rewritten or deleted.

Not **BREAKING** while the book fallback and the default-order rule remain in
place.

## Design intent

- **Player fantasy:** the player is the officer at the field desk, choosing the
  ground and consulting the record before the next march.
- **Core loop beat:** pre-battle planning and anticipation.
- **Pillars served:** "Read the ground before the fight" (the map fan) and
  "History with receipts" (the two books).
- **Hypothesis:** physical, draggable objects make choosing a battlefield and
  consulting the compendium feel more tactile and legible as a period desk than
  bookmarks. If the drag interferes with reading or the primary action, the
  book menu remains the fallback and the desk is not promoted to default.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: the start screen becomes a desk of draggable pixel-art
  objects; the two books, the options compass, the map fan, the draggable
  gramophone, layout persistence and keyboard/reduced-motion behavior are
  specified. The existing "Menu gramophone" requirement loses its fixed
  lower-left position and the "Marching menu" scenario loses the vertical-menu
  description.

## Impact

- `apps/game/src/ui/StartScreen.tsx` becomes a selector between the preserved
  book screen and the new desk screen; new components live under
  `apps/game/src/ui/menu/`.
- `apps/game/src/styles/menu-desk.css` is added; `book-menu.css` and
  `gramophone.css` stay for the book fallback. A new
  `apps/game/src/ui/menu/GramophoneDesk.tsx` reuses `useGramophone` and the
  audio engine; `Gramophone.tsx` is untouched.
- `apps/game/src/storage.ts` gains the desk layout key
  `prestes.menu.desk.v1`. Existing audio, locale, gramophone and route keys are
  not read or written by the desk.
- Pixel-art sources go to `art-src/menu/` and exported PNGs to
  `apps/game/src/assets/menu/desk/`; `docs/assets.md` records them.
- `packages/content/src/locales/en.ts` and `pt-BR.ts` gain the desk labels.
- `tests/e2e/start-screen.spec.ts`, `gramophone.spec.ts` and the visual
  baselines keep covering the book mode; a new desk spec covers the desk mode.
  `docs/status.md` or the design note records the new menu behavior.
- No simulation, determinism, command, audio-engine, battle-map data or
  in-battle HUD change.

## Scope

- **Historical scope:** the desk is a presentation frame for already sourced
  content; it introduces no new historical claim and no playable campaign
  mission. The campaign book keeps its "in preparation" spread.
- **Multi-perspective:** unchanged; the desk shows the same compendium and map
  material the game already carries.
- **MVP:** desk objects with drag, independent books with page turning, the
  options compass, the four-map fan, the draggable gramophone, persistence,
  reset, keyboard support and reduced motion.
- **Non-goals:** campaign missions or campaign prose, the Manual and
  pre-battle roster planned by other changes (the desk exposes an extension
  point), new audio, new battle maps, changes to the 3v3, a drawn desk
  background replacing the pixel scene, and removal of the book menu during
  this change.
- **Legal and ethical note:** all new art is original, drawn for this project
  and registered with its source and licence. No third-party menu art, book
  text or scan is used. The historical photographs already in the book remain
  under their recorded public-domain determination.
