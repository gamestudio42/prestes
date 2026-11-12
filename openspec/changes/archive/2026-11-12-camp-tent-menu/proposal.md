## Why

The owner drew a new start screen (2026-11-12): a camp table under a tent at
dusk, with the menu objects drawn in the same style, and asked for it to be
rasterized and cut for the game, the objects to stay draggable, and the
skirmish maps to be a pile with one card per map, part of the scene. A
second drawing (`Menu Pixelado de São Paulo 1923.png`) fixes the size and
place of every object, and "tidy desk" returns them there.

## What Changes

- The start screen's backdrop is the camp table, rasterized from the owner's
  drawing (one art pixel per 2 x 2 reference block, indexed palette), in
  place of the pixel video. The baked-in reset plate and hint are painted
  out; the live controls are styled after them.
- The closed desk sprites are cut from the owner's item sheet: the navy and
  green books, the reference pile, a portable record player, a pocket
  compass and field glasses. The field glasses replace the theodolite as the
  way into the map editor.
- The objects are drawn at the camp table's scale (the cover scale of the
  drawing) instead of a fixed 2x, and their default places come from the
  owner's layout drawing; a resize carries placed objects with the table.
- Labels are small dark plates, as in the drawing.
- The skirmish map fan becomes a pile of yellowed parchment cards, one per
  map, lying flat in the table's perspective; the chosen map lies on top with
  its print, name and Prepare stamp, the others peek out turned beneath it.
- `tools/menu/camp_pieces.py` makes every piece from the two references.

## Capabilities

### New Capabilities

### Modified Capabilities

- `presentation`: the desk start screen and the skirmish map object.

## Impact

`apps/game/src/ui/menu/` (StartScreenDesk, MenuDesk, SkirmishMaps, deskArt,
deskLayout, the editor object), `apps/game/src/styles/menu-desk.css`, the desk
sprites and `camp-table.png`, `docs/assets.md`, desk tests. The desk visual
baselines change and wait for the owner's approval.
