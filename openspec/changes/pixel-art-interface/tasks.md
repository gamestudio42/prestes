## 1. Visual system

- [x] 1.1 Add Pixelify Sans (Fontsource) and `styles/pixel.css` tokens (palette, 2 px unit, stepped-corner panel, hard shadow, pressed and focus states); verify the font serves from the build
- [x] 1.2 Record the asset changes in `docs/assets.md` (Pixelify Sans OFL, original icons and their Aseprite source)

## 2. Icons

- [x] 2.1 `tools/icons/build-icons.lua`: draw every icon (orders, postures, stances, top bar, status glyphs) from text grids into `assets/icons/prestes-icons.aseprite` with one named slice each; review them at 1x and 2x
- [x] 2.2 `pnpm icons` export script (Aseprite CLI) to `apps/game/src/assets/icons.png` and `icons.json`; commit both
- [x] 2.3 `PixelIcon` component (CSS mask, current colour, integer scale) and the icon map moved to slices; unit tests: every control has a slice, no shared slices, JSON matches the PNG

## 3. HUD and menus

- [x] 3.0 `FloatingWindow` (drag by title bar, clamp to view, minimize, keyboard move, persisted layout with defaults); Orders, Troops and Troop summary windows replace the docked bottom bar; Troop summary with a helmet and health, morale and ammunition bars per soldier; unit tests for the layout store and e2e for drag, minimize, reload and the helmets
- [x] 3.1 Restyle the top bar, order and troop content, weapon line and tooltips with the tokens and pixel icons
- [x] 3.2 Restyle the training panel, debrief, sandbox panel, field overlays, order callouts and the commander balloon
- [x] 3.3 Main menu: animated marching column in pixel art (reduced motion holds still), vertical keyboard menu; the photograph becomes the compendium cover
- [x] 3.4 Check every HUD string in PT-BR and EN at 1440 x 900 and 929 px; fix overflows through the catalogs

## 4. Compendium

- [x] 4.1 `COMPENDIUM` registry (figures, events, places, weapons, corrections) from `docs/history`, with sources and confidence; validation and unit tests
- [x] 4.2 PT-BR and EN texts for every entry; `pnpm check:locales`
- [x] 4.3 Pixel book UI: tabs, list, reading page with source line and confidence, corrections page; e2e: open Events, read the 1922 revolt, switch to EN

## 5. Close

- [x] 5.1 Remove Lucide, Barlow and Cinzel and the old custom icon; re-record visual baselines after reviewing each screen
- [x] 5.2 `pnpm verify`
- [x] 5.3 Hand check in Chrome (PT-BR and EN): start screen, a full station, sandbox and compendium; record in `docs/status.md`
