Approved by the owner on 2026-11-11 ("Aprovo as três", with redo-battle-hud and the soldier figures); apply in the planned order: soldier-animation-and-textures, troop-thumbnails-and-panel, redo-battle-hud; remove-sandbox-panel at any time.

## 0. Before starting

- [x] 0.1 (Owner answered on 2026-11-11: figure into `troop-thumbnails-and-panel`, art in Aseprite from the reference, strip decorative, four cover classes, sandbox retired in `remove-sandbox-panel`; delta and design updated.) Record the owner's answers to design's open questions; verify: `openspec validate redo-battle-hud --type change --strict` green
- [x] 0.2 (2026-11-12: the owner asked for the HUD ahead of `troop-thumbnails-and-panel` ("agora faça o hud"); `remove-sandbox-panel` applied (6f6efd5); `soldier-animation-and-textures` in progress; `troop-thumbnails-and-panel` and `scrub-concealment-and-area-fire` not applied, so the HUD frames today's troop summary until the figures land) Read `docs/handoff.md`; prerequisites `soldier-animation-and-textures`, `troop-thumbnails-and-panel` (with the soldier figures) and `scrub-concealment-and-area-fire` applied, and whether `remove-sandbox-panel` is (this change restyles their panels); verify: `docs/handoff.md` records what was in place

## 1. Art

- [x] 1.1 (Exports one PNG per slice, `apps/game/src/assets/hud/<slice>.png`, plus `hud.json`; `tests/hud/hud-art.test.ts` checks every CSS nine-slice against it) `tools/hud/build-hud.lua` seeds `assets/hud/prestes-hud.aseprite` from the reference (crop, scale to the art grid, index to the HUD palette, one slice per element with nine-slice centres); `tools/export-hud.ts` and `pnpm hud-art` export `apps/game/src/assets/hud.png` and `hud.json`; verify: two exports give identical files, a unit test that every slice the CSS uses exists with its centre
- [x] 1.2 (2026-11-12, after the owner's review "ta bem longe ainda do modelo": frames, plates and ornaments are now cut from the reference at their own size instead of redrawn, type at the reference's sizes. Round 3: compass bezel, left flag and post, Orders drape, grass tufts and ground under the summary cut with grass/field clearing; Troops panel fixed at 428 px with a scrollbar. The owner approved the look on 2026-11-12 ("Aprovado") after hand-finishing ground-left in Aseprite; top-bar drapes dropped at his request) Clean the frames in Aseprite to tile without seams at 1x and 2x, and the ornaments (flag emblem, lantern, drapes, hat, canteen, compass bezel, bottom strip) to read at 1x; palette tokens in `pixel.css`; `docs/assets.md` rows (source, origin: the owner's reference, with permission); verify: a screenshot of every frame tiled at both scales reviewed, `pnpm check:content`
- [x] 1.3 (`remove-sandbox-panel` landed first; no sandbox button) Hide the sandbox button if `remove-sandbox-panel` has not landed; verify: battle-hud e2e finds no `sandbox-toggle`

## 2. Layout and panels

- [x] 2.1 (`DockedPanel` and `dockLayout.ts` (`prestes.hud.docks.v1`), `tests/hud/dock-layout.test.ts`, `tests/e2e/hud-windows.spec.ts`) `DockedPanel` replaces `FloatingWindow` (anchor, title plate, collapse toward its edge, new storage key, old key ignored); `windowLayout.ts` and its test replaced; verify: unit tests of the stored state and the storage-unavailable default, e2e collapse-and-reload for each panel
- [x] 2.2 (Rails, buttons, active tab, flag and lantern; band label visually hidden with its test id kept. The compass belongs to `add-map-compass` (another session) and keeps its look; the HUD only moves it left of the Orders column) Top bar rails restyled (band label text dropped, objective badges in brass, clock), compass bezel; verify: battle-hud e2e finds every top-bar test id in EN and PT-BR
- [x] 2.3 (Orders: eight groups, five buttons a row, labels hidden behind the tooltips) Troops docked top-left as the tall list with the portrait slot; Orders docked right as a column of eight labelled groups with the queue under it; verify: e2e that every catalogue order is in the column, and the 1280 x 720 overlap e2e
- [x] 2.4 (Titles 16, labels 12, data 11 px from 1440 wide; 14/11/10 and art at 1x below; overlap e2e at 1280 x 720 in both locales) Type sizes per D4 and the step down below 1440 wide; verify: overflow e2e at 1280 x 720 and 1790 x 878 in both locales

## 3. Troop summary

- [x] 3.1 (Leader mark and leader-first order landed with troop-thumbnails-and-panel section 3, 2026-11-12. The owner asked for the figures now (2026-11-12): `SoldierFigure` draws each man with the helmet by cover (none, light, good, inside), the body by health, a bandage, pinned and routed marks, and a five-round clip; leader marking and the gauges stay with `troop-thumbnails-and-panel`) Frame `troop-thumbnails-and-panel`'s header, soldier figures, gauges and alerts on the parchment card; verify: the troop-panel e2e of that change pass unchanged and the eleven-figure overflow e2e at 1280 x 720
- [x] 3.2 (`CommandStatus` in the summary card; `CommandRow` removed) Command status row redistributed (D5): header selection and order, concealed/revealed/ferry badges, hidden stance text; `CommandRow` row removed; verify: the existing e2e that read `selection-count`, `order-value`, `stance-value`, `concealed-value`, `ferry-value` pass unchanged
- [x] 3.3 (`OrderPrompt` (`order-prompt`)) Order prompt banner at the top centre with Cancel; verify: battle-orders e2e (pick, cancel, give)

## 4. Strategic layers

- [x] 4.1 (Deviation: a new `CoverMapLayer` in view3d (`cover-map-layer.ts`) draws the slots and hatch from the map alone; the editor keeps its own copy for now, since another session has uncommitted edits in `editor/viewport.ts`. Moving the editor onto it is a follow-up) Move the editor's cover dots and vegetation hatch into a view3d layer used by the editor and the battle; verify: the editor's cover-preview e2e unchanged, and a view test that the layer takes no unit data
- [x] 4.2 (`layer-contours`, `layer-cover` in the top bar; e2e in `hud-windows.spec.ts`) Strategic band switches for contours and cover, off at battle start, hidden in the tactical band; locale keys; verify: e2e off-by-default, contours on, cover on with an unseen enemy in a trench (no slot taken), band change hides and restores; `pnpm check:locales`

## 5. Gates

- [x] 5.1 Visual baselines (battle HUD, orders column, preview HUD) refreshed once and reviewed side by side with the reference; verify: `pnpm e2e`
  - Apply note (2026-11-12): `battle-hud`, `orders-column` and `roster-builder` baselines re-recorded in 6709bbc and reviewed side by side with the reference and the owner-approved look; visual spec 7/7 passes with the compass committed (c295bb5). The preview HUD has no visual baseline; `preview-hud.spec.ts` passes.
- [x] 5.2 (2026-11-12: verify and strict validate pass; sizes in `docs/status.md`.) `pnpm verify` and `openspec validate redo-battle-hud --type change --strict`; verify: all pass, sizes in `docs/status.md`
- [x] 5.3 (2026-11-12: the owner played a skirmish with the new HUD, "joguei agora esta tudo certo, perfeito"; recorded in `docs/status.md`.) Hand check by the owner: a skirmish played with the new HUD in both bands; findings in `docs/status.md`
