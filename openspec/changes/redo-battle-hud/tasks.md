Approved by the owner on 2026-11-11 ("Aprovo as três", with redo-battle-hud and the soldier figures); apply in the planned order: soldier-animation-and-textures, troop-thumbnails-and-panel, redo-battle-hud; remove-sandbox-panel at any time.

## 0. Before starting

- [x] 0.1 (Owner answered on 2026-11-11: figure into `troop-thumbnails-and-panel`, art in Aseprite from the reference, strip decorative, four cover classes, sandbox retired in `remove-sandbox-panel`; delta and design updated.) Record the owner's answers to design's open questions; verify: `openspec validate redo-battle-hud --type change --strict` green
- [ ] 0.2 Read `docs/handoff.md`; prerequisites `soldier-animation-and-textures`, `troop-thumbnails-and-panel` (with the soldier figures) and `scrub-concealment-and-area-fire` applied, and whether `remove-sandbox-panel` is (this change restyles their panels); verify: `docs/handoff.md` records what was in place

## 1. Art

- [ ] 1.1 `tools/hud/build-hud.lua` seeds `assets/hud/prestes-hud.aseprite` from the reference (crop, scale to the art grid, index to the HUD palette, one slice per element with nine-slice centres); `tools/export-hud.ts` and `pnpm hud-art` export `apps/game/src/assets/hud.png` and `hud.json`; verify: two exports give identical files, a unit test that every slice the CSS uses exists with its centre
- [ ] 1.2 Clean the frames in Aseprite to tile without seams at 1x and 2x, and the ornaments (flag emblem, lantern, drapes, hat, canteen, compass bezel, bottom strip) to read at 1x; palette tokens in `pixel.css`; `docs/assets.md` rows (source, origin: the owner's reference, with permission); verify: a screenshot of every frame tiled at both scales reviewed, `pnpm check:content`
- [ ] 1.3 Hide the sandbox button if `remove-sandbox-panel` has not landed; verify: battle-hud e2e finds no `sandbox-toggle`

## 2. Layout and panels

- [ ] 2.1 `DockedPanel` replaces `FloatingWindow` (anchor, title plate, collapse toward its edge, new storage key, old key ignored); `windowLayout.ts` and its test replaced; verify: unit tests of the stored state and the storage-unavailable default, e2e collapse-and-reload for each panel
- [ ] 2.2 Top bar rails restyled (band label text dropped, objective badges in brass, clock), compass bezel; verify: battle-hud e2e finds every top-bar test id in EN and PT-BR
- [ ] 2.3 Troops docked top-left as the tall list with the portrait slot; Orders docked right as a column of eight labelled groups with the queue under it; verify: e2e that every catalogue order is in the column, and the 1280 x 720 overlap e2e
- [ ] 2.4 Type sizes per D4 and the step down below 1440 wide; verify: overflow e2e at 1280 x 720 and 1790 x 878 in both locales

## 3. Troop summary

- [ ] 3.1 Frame `troop-thumbnails-and-panel`'s header, soldier figures, gauges and alerts on the parchment card; verify: the troop-panel e2e of that change pass unchanged and the eleven-figure overflow e2e at 1280 x 720
- [ ] 3.2 Command status row redistributed (D5): header selection and order, concealed/revealed/ferry badges, hidden stance text; `CommandRow` row removed; verify: the existing e2e that read `selection-count`, `order-value`, `stance-value`, `concealed-value`, `ferry-value` pass unchanged
- [ ] 3.3 Order prompt banner at the top centre with Cancel; verify: battle-orders e2e (pick, cancel, give)

## 4. Strategic layers

- [ ] 4.1 Move the editor's cover dots and vegetation hatch into a view3d layer used by the editor and the battle; verify: the editor's cover-preview e2e unchanged, and a view test that the layer takes no unit data
- [ ] 4.2 Strategic band switches for contours and cover, off at battle start, hidden in the tactical band; locale keys; verify: e2e off-by-default, contours on, cover on with an unseen enemy in a trench (no slot taken), band change hides and restores; `pnpm check:locales`

## 5. Gates

- [ ] 5.1 Visual baselines (battle HUD, orders column, preview HUD) refreshed once and reviewed side by side with the reference; verify: `pnpm e2e`
- [ ] 5.2 `pnpm verify` and `openspec validate redo-battle-hud --type change --strict`; verify: all pass, sizes in `docs/status.md`
- [ ] 5.3 Hand check by the owner: a skirmish played with the new HUD in both bands; findings in `docs/status.md`
