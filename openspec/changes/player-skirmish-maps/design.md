## Context

The editor autosaves each map under its id in IndexedDB (`prestes-editor`,
store `maps`, plus the `__last__` and `__playtest__` keys). The desk shows the
authored skirmish maps as one pile (`SkirmishMaps`); a battle on a map the
worker does not know is given its `mapDocument` (the playtest path).

## Decisions

- **D1 The player's maps are the editor's kept maps.** No second store: what the
  editor keeps is what lies on the table. Records that do not parse, the two
  special keys, and ids of authored maps are skipped. Read once when the desk
  opens.
- **D2 One pile.** The player's maps join the skirmish pile after the authored
  ones. Loose sheets with their own places were built and dropped (the owner,
  2026-11-16); the desk's "tidy" is unchanged.
- **D3 Battle on a player map** goes through the same route as an authored map
  fetched on demand: the main thread registers the compiled map
  (`registerBattleMap`) and the document goes to the worker with the start.
- **D4 A drawn print**: a player map has no print in `maps/`, so one is drawn
  from the document on a 96 px canvas when the desk loads (ground colours under
  a north-west hill shade, low ground as water, woods darker, then ponds,
  rivers, roads and objects) and used on the sheet and the setup screen.

## Risks

- Drafts the player never meant to keep also join the pile. Accepted for now;
  removing a map can come later.
- The menu bundle is near its budget; the IndexedDB reader is small.
