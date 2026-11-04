## 1. Visual system

- [ ] 1.1 Add Pixelify Sans (Fontsource) and `styles/pixel.css` tokens (palette, 2 px unit, stepped-corner panel, hard shadow, pressed and focus states); verify the font serves from the build
- [ ] 1.2 Record the asset changes in `docs/assets.md` (Pixelify Sans OFL, original icons and their Aseprite source)

## 2. Icons

- [ ] 2.1 `tools/icons/build-icons.lua`: draw every icon (orders, postures, stances, top bar, status glyphs) from text grids into `assets/icons/prestes-icons.aseprite` with one named slice each; review them at 1x and 2x
- [ ] 2.2 `pnpm icons` export script (Aseprite CLI) to `apps/game/src/assets/icons.png` and `icons.json`; commit both
- [ ] 2.3 `PixelIcon` component (CSS mask, current colour, integer scale) and the icon map moved to slices; unit tests: every control has a slice, no shared slices, JSON matches the PNG

## 3. HUD and menus

- [ ] 3.1 Restyle the top bar, squad card, order board, command row, weapon card and tooltips with the tokens and pixel icons
- [ ] 3.2 Restyle the training panel, debrief, sandbox panel, field overlays, order callouts and the commander balloon
- [ ] 3.3 Start screen: pixelated, dithered sepia photograph and pixel title and buttons
- [ ] 3.4 Check every HUD string in PT-BR and EN at 1440 x 900 and 929 px; fix overflows through the catalogs

## 4. Compendium

- [ ] 4.1 `COMPENDIUM` registry (figures, events, places, weapons, corrections) from `docs/history`, with sources and confidence; validation and unit tests
- [ ] 4.2 PT-BR and EN texts for every entry; `pnpm check:locales`
- [ ] 4.3 Pixel book UI: tabs, list, reading page with source line and confidence, corrections page; e2e: open Events, read the 1922 revolt, switch to EN

## 5. Close

- [ ] 5.1 Remove Lucide, Barlow and Cinzel and the old custom icon; re-record visual baselines after reviewing each screen
- [ ] 5.2 `pnpm verify`
- [ ] 5.3 Hand check in Chrome (PT-BR and EN): start screen, a full station, sandbox and compendium; record in `docs/status.md`
