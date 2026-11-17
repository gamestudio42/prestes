## Why

The online game ships the map editor, and the owner wants players to make their
own skirmish maps and play them, and to send a map to someone who imports the
file through the editor and plays it too (2026-11-16). Today a map made or
imported in the editor is kept in the browser, but it can only be played through
the editor's playtest: it never reaches the skirmish maps on the camp table. The
campaign stays as it is: players do not change it.

## What Changes

- Every map the editor keeps in the player's browser (made there or imported
  from a file) is a **sheet of the skirmish pile** on the camp table, after the
  game's own maps, and is chosen like any of them. (Loose sheets beside the
  pile were tried and dropped by the owner on 2026-11-16: one pile is enough.
  "Tidy the desk" keeps arranging the desk objects as before.)
- A player map's sheet shows a **print drawn from the map** (ground colours,
  hill shade, water, woods, roads and objects), in the same sepia as the
  game's prints; the setup screen shows the same print.
- Choosing it opens the skirmish setup on it; the battle plays the player's
  document, as the playtest does.
- A player map never replaces an authored map: one with an authored map's id is
  left off the pile. Campaign chapters only ever play their authored maps.
- The editor's **Open** lists the maps kept in the browser, so a player with
  several maps can go back to any of them (the project's maps stay dev only),
  and a new map gets an id of its own from the date and time, so it does not
  overwrite the last one.

## Capabilities

### New Capabilities

- `player-maps`: the player's own maps on the camp table and in the skirmish.

## Impact

- `apps/game/src/editor/persistence.ts` (list the kept maps), `EditorApp.tsx`
  (Open lists them).
- `apps/game/src/ui/menu/` (the pile, the print), `App.tsx` (battle on a player
  map), new `playerMaps.ts` and `playerPrint.ts`.
- No change to the simulation, the campaign or the authored maps.
