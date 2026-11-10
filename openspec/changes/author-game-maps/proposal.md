## Why

The user wants to author the game's maps in the editor, rather
than keep tuning the four generated maps (Vila Militar, Fazenda, Serra e
Rio, Bairro). Each campaign mission (docs/campaign/CAMPAIGN.md, one map per
mission) should become playable as soon as its map is drawn, while its book
text and photos keep evolving separately; and the skirmish list should hold
only maps the user made. Decided with the user on 2026-11-09, when closing
`garrison-and-assault`.

## What Changes

- **Map slots in the editor**: New map and Open ask which slot the map is
  for: a campaign mission (the eight chapters of the campaign book, from
  `prologue-18-do-forte` to `la-gaiba`, ids and titles from the content
  registry) or a skirmish map (new, or one of the saved ones). The map
  document records its mission id; one map per mission.
- **Menus list only authored maps**: the skirmish map fan shows the saved
  skirmish maps, however many (none: "No maps yet — open the editor"). A
  campaign chapter whose mission has a saved map offers "Play the map"
  (a 3 vs 3 on it, no mission scripting yet); without a map it stays as
  it is.
- **BREAKING: the generated maps leave the game**: Vila Militar, Fazenda,
  Serra e Rio, Bairro and the proof map `fazenda-doc` leave the catalog, the
  menu and the bundles. The simulation worker goes back under its 200 KB
  budget.
- **One test map**: a map document laid out to exercise the systems
  quickly (a house, a sobrado and a church with its tower close together, a
  trench line, a walled yard, a stream with a ford, open ground crossed by
  cover lines, and room for objectives). It is shown only in development
  builds and in the sandbox panel, and it carries the determinism goldens,
  the battle reports, the e2e suites and the bench. The garrison hand check
  moved from `garrison-and-assault` 5.4 runs on it.
- **Time of day per map**: the editor's map properties get a time of day
  (morning to late afternoon) and a sun direction, previewed live and saved
  in the document; the battle lights the map with them, so the author can
  make the relief read. Visual only: no simulation or hash change.
- Objectives are not part of this change: `add-map-objectives` is reworked
  next to author them in the editor (four types, the two-stage flag).

## Capabilities

### New Capabilities

- `map-slots`: which slot a map fills (campaign mission or skirmish), the
  editor's slot choice, campaign chapters playable through their map, the
  test map and where it shows.

### Modified Capabilities

- `battle-maps`: the catalog holds the authored maps and the test map; the
  hand-written maps, the proof map and their requirements are removed; the
  performance budget is measured on the test map; maps carry a time of day.
- `map-editor`: New map and map properties gain the slot and the time of
  day, with a live preview.
- `presentation`: the skirmish map fan shows the saved skirmish maps,
  however many, with an empty state.
- `battle-lab`: the battle feel report runs on the test map.

## Impact

- `packages/shared/src/maps` (catalog, document format: mission id, time of
  day; the generated maps and `fazenda-doc` removed; the test map document),
  `packages/view3d` (sun from the map's time of day), `apps/game` (editor
  slot dialog and time of day; skirmish fan and campaign book; sandbox
  panel), `packages/content` (chapter registry gives the slots; map names
  and compendium links of the removed maps), tools (`check-maps`,
  `check-determinism`, `battle-report`, `sim-bench`, `map-review`,
  bundle budget), about 40 test files and the e2e suites that name the old
  maps, new goldens.
- **Player fantasy**: unchanged in play; for the author, drawing a mission's
  ground and walking into it at once.
- **Core loop**: author, playtest, adjust in the editor; the game grows map
  by map.
- **Historical scope**: maps of campaign missions carry their setting label
  and source note (already required on save); places stay game
  abstractions of the sources. No new historical claim.
- **Multi-perspective**: unchanged; each mission keeps the commander the
  campaign document names (Siqueira Campos, Prestes, Miguel Costa, Isidoro
  Dias Lopes); this change only gives the mission a map.
- **Legal and ethical note**: the maps are the user's own work; no map,
  art or layout from another game. Book adaptation rules are unchanged.
- **MVP**: slots, menus from authored maps, test map carrying the tests,
  time of day.
- **Non-goals**: mission scripting, briefings in play, campaign progression,
  objectives (next change), night fighting or any vision change.
