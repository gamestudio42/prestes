## 1. Desk bugs and layout standard

- [x] 1.1 Add the reference pile's default spot to `DEFAULT_SPOTS` in `deskLayout.ts`, and set the spots so the default arrangement reproduces the approved `desk-start-screen` baseline (design D6); verify `pnpm typecheck` passes and a `desk-layout.test.ts` case places every `DESK_OBJECT_IDS` entry at a default position inside the view.
- [x] 1.2 Render open screens as centred overlays outside `layout`, remove `centerOnMeasure`, hide the closed art while open, and stack overlays by open order (design D9); verify an e2e test that drags the compendium, opens it, closes it and reads the same position, and that a reload while open keeps the pre-open position in `prestes.menu.desk.v1`.
- [x] 1.3 Put the drag grid on the art pixel and the keyboard steps on 3 and 12 art pixels (Shift); at the 2x standard (design D15) that is a 2 px grid and 6 px and 24 px steps. Verify unit tests assert that `clampDesk` returns multiples of `DESK_GRID` and that a stored layout off the grid snaps on load.
- [x] 1.4 Amend the `add-menu-desk` delta scenario "Drag an object" to the desk's grid (2 px after design D15), and its open-screen wording to the overlay behaviour; verify `openspec validate add-menu-desk` and `openspec validate polish-menu-desk` pass.

## 2. Scale and shadow from data

- [x] 2.1 Drive each closed object's CSS box from its `DESK_ART` source size with `--art-w`, `--art-h` and `--desk-scale: 2` on every screen (design D15; first done at 3x), and remove the hand-written per-object `width`/`height` rules. A sprite drawn off the standard sets `scale` in `DESK_ART` and is listed in `PENDING_REDRAW` (none at 2x). Verify with an e2e check that each closed box equals its source size times its scale, and is 2x for every sprite not pending.
- [x] 2.2 Add a unit test that reads each desk PNG header and compares it with `DESK_ART`; verify it fails when a size is edited by hand and passes on the committed sprites.
- [x] 2.3 Replace the five shadow offsets with the `--desk-shadow` and `--desk-shadow-held` tokens on every closed object; verify `rg "drop-shadow\(" apps/game/src/styles/menu-desk.css` shows only the token definitions and any open-screen shadows.
- [x] 2.4 Add the held state on `data-dragging="true"` (a one-art-pixel lift, the larger shadow, a `steps(1)` drop) and the reduced-motion variant without the lift; verify the e2e test reads the lifted transform while dragging and none under `reducedMotion: 'reduce'`.

## 3. Pixel-art cleanup and redraws (Aseprite)

- [ ] 3.1 Run Aseprite `preflight`; if the window is not ready, stop and ask. Clean up the campaign book (closed) over the current sprite as a locked reference layer, following design D3; verify with `look` against the old sprite, the same 128 x 96 size, the bottom row touching an opaque pixel, and the owner's side-by-side approval.
- [ ] 3.2 Clean up the compendium book (closed) the same way; verify as in 3.1.
  - Apply note (2026-11-08): 3.1 and 3.2 are drawn and exported by `tools/aseprite/desk-cleanup.lua` (Aseprite 1.3.16 in batch mode stood in for `preflight`); size, bottom row and palette are verified, and `docs/review/desk-art-before-after.png` shows old and new side by side. They stay open for the owner's approval.
- [ ] 3.3 Redraw the reference pile at 128 x 80 in the books' language, shown at 2x; verify with `look`, `validate`, the exported size and a bottom-aligned canvas.
- [ ] 3.4 Clean up the gramophone body at its 120 x 160 size (already 2x) with the groove layer kept separate, and re-export the grooves to match; verify the groove shimmer still aligns in the open screen and the closed sprite is bottom-aligned.
  - Apply note (2026-11-08): the scripted redraw of the pile and cleanup of the gramophone were rejected by the owner; both sprites are back to their earlier versions, and the art is to be refined later.
- [x] 3.5 Redraw the closed compass at 64 x 64 at the finer pixel, shown at 2x; verify with `look`, `validate`, the exported size and the `DESK_ART` size.
- [x] 3.6 Draw the open-book frame as a 2x 9-slice tinted by `--book-cover` (navy campaign, green compendium) and the placeholder section emblem (design D11, D14); verify with `look` and that the compendium visual baseline shows a green frame.
- [x] 3.7 Update `deskArt.ts` sizes and the `docs/assets.md` entries for every changed or new sprite (original art, Aseprite source, licence; the emblem marked as a placeholder); verify the PNG header test from 2.2 passes and every listed path exists.

## 4. Content: compendium

- [x] 4.1 Extend `CompendiumEntry` with `label?` and `images?`, add the `ImageRef` type, the compendium image list mirroring the register, and the long text (place, note, captions) keyed by entry id (design D12); verify `pnpm typecheck` and the existing compendium tests pass unchanged.
- [x] 4.2 Add `miguel-costa` and `isidoro-dias-lopes` to `figures.ts` (`playable: false`) and to the compendium, from `FIGURES.md` and their doc entries; verify `pnpm check:content` reports 4 figures.
- [x] 4.3 Import the short body, place and extended note of every doc entry in `docs/campaign/compendium/entries/` into the catalogs and `compendium-notes/{en,pt-BR}.ts`, translating any note that exists only in English; verify a test that every doc entry id exists in `COMPENDIUM` and that the note parity check passes.
- [x] 4.4 Wire the fourteen registered compendium images to their entries with caption, credit and licence; verify the content check fails on an unregistered path (a test case) and passes on the real data.
- [x] 4.5 Mark each imported doc entry `status: applied` with its runtime id; verify `rg "status: draft" docs/campaign/compendium/entries` lists only the entries left out on purpose, with the reason recorded in the entry.

## 5. Content: campaign chapters

- [x] 5.1 Add `packages/content/src/campaign/chapters.ts` with the prologue and chapters 2 to 8 (id, number, date, place, commanderId, label, sourceRefs, image, compendium links, `playable: false`), with dates and places matching `TIMELINE.md`; verify a unit test for order, commanders and playable flags.
- [x] 5.2 Add `campaign/text/{en,pt-BR}.ts` with each chapter's title, perspective, prose pages (one page per doc section, within the word budget) and briefing (pitch, objectives summary) from `docs/campaign/book/` and `docs/campaign/missions/`; verify the parity check passes and no page exceeds the budget.
- [x] 5.3 Extend `tools/check-content.ts` with chapter validation (unknown commander, source, compendium link, missing locale text, playable without mission); verify each failure with a test case and `pnpm check:content` passes on the real data.
- [x] 5.4 Mark each imported chapter doc `status: applied` with its runtime id, and each mission doc `playerText: applied` with its runtime id (its `status` keeps tracking the mission's own design); verify the docs list the runtime ids.

## 6. Open books

- [x] 6.1 Implement the page model in `apps/game/src/ui/menu/bookPages.ts` (title, contents, plate, text, briefing pages; spreads; ribbon targets; link targets) as pure functions; verify unit tests for spread counts, stable page numbers and link resolution in both locales.
- [x] 6.2 Rebuild `BookFrame.tsx` as the two-page spread with the 9-slice frame, page numbers, corner controls, arrow keys, ribbons and the reduced-motion instant turn (design D10, D11); verify an e2e test turns spreads with the keys and the controls and jumps with a ribbon.
- [x] 6.3 Rebuild `CompendiumBook.tsx` on the page model: contents spread, entry spreads with plate or emblem, label, date and place, body, note, sources with confidence, and related-entry links; verify e2e that the Miguel Costa entry shows his portrait, credit and label, and an entry without an image shows the emblem.
- [x] 6.4 Rebuild `CampaignBook.tsx` on the page model: title, contents, chapter opening, prose and briefing spreads, a disabled "in preparation" play action, the skirmish action, and compendium links that open the compendium at the entry; verify e2e that chapter 3 shows Miguel Costa as commander and its link opens the compendium entry.
- [x] 6.5 Add an e2e overflow check over every spread of both books at 1440 x 900 and 1280 x 720 in EN and PT-BR; verify no page content overflows and no page has a scroll bar.

## 7. Verification

- [x] 7.1 Add e2e checks for the shared label gap (lowest opaque art row to label top, equal for every closed object) and for the default arrangement including the reference pile; verify `pnpm e2e tests/e2e/desk.spec.ts` passes. (The arrangement check runs at 1440 x 900 and 1280 x 720 after 7.5.)
- [x] 7.2 Update the desk visual baselines (`desk-start-screen`, `desk-compendium`, `desk-gramophone`) and add `desk-campaign-chapter` after reviewing each diff; verify `pnpm e2e tests/e2e/visual.spec.ts` passes and the book-route baselines are unchanged except `codex`, which changed only because the compendium content changed (reviewed).
- [x] 7.3 Check manually over the live marching video, at desktop width and at the narrow layout: the outlines and shadows read against the moving scene, and both books read comfortably. Record the result and the new menu state in `docs/status.md`.
- [x] 7.4 Run `pnpm check`, `pnpm e2e` and `openspec validate polish-menu-desk`; verify all pass.
- [x] 7.5 Lower the desk standard to 2x on every screen (design D15): `--desk-scale`, `DESK_SCALE`, `DESK_GRID`, keyboard steps, the map fan box and a legend that fits the 2x parchment strip; extend the arrangement e2e to 1280 x 720 and refresh the four desk baselines after review; verify `pnpm check`, `pnpm e2e` and `openspec validate polish-menu-desk --strict` pass.
