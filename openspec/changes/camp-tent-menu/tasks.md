## 1. Art

- [x] 1.1 Write `tools/menu/camp_pieces.py`: rasterize the camp table whole (reset plate and hint painted out), cut the six objects from the item sheet, draw the map card and the record's groove layer; verify the sprites by eye at 2x and that each PNG is indexed and cropped to its pixels.
- [x] 1.2 Install the sprites, update `DESK_ART` and `docs/assets.md`; verify `tests/hud/desk-art.test.ts` passes.

## 2. Desk

- [x] 2.1 Replace the pixel video with the camp table, covering the view and cropping the sky first; verify `start-screen.spec.ts`.
- [x] 2.2 Draw closed objects at the camp table's scale and place them from the owner's layout; tidy desk returns there and a resize carries placed objects with the table; verify `desk.spec.ts` at 1440 x 900 and 1280 x 720.
- [x] 2.3 Swap the theodolite for the field glasses as the map editor's object; verify the editor test.
- [x] 2.4 Style labels, hint and the tidy-desk plate after the drawing.

## 3. Map pile

- [x] 3.1 Turn the fan into a pile of yellowed cards, one per map, in the table's perspective, the chosen one on top; verify `desk.spec.ts`, `skirmish-setup.spec.ts` and `battle-maps.spec.ts`.

## 4. Review

- [x] 4.1 The owner checks the start screen; then update the desk visual baselines (`desk-start-screen`, `desk-compendium`, `desk-campaign-chapter`, `desk-gramophone`).
