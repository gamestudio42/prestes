## 1. Preservation and scaffold

- [x] 1.1 Confirm the `menu-book-baseline` tag and the clean worktree; verify `git status --short` shows only `.claude/launch.json`.
- [x] 1.2 Move the current start screen to `StartScreenBook.tsx` unchanged and add the `StartScreen.tsx` selector with `DEFAULT_MENU = 'book'` plus `?menu=book|desk`; verify `pnpm typecheck` and the existing start-screen e2e still pass on `/`.
- [x] 1.3 Add the empty desk component folder and art asset folder; verify the paths exist and the app still builds.

## 2. Desk layout and state

- [x] 2.1 Implement `deskLayout.ts` (object ids, default positions, clamp, snap, load/save under `prestes.menu.desk.v1`, reset); verify unit tests cover clamp, snap, defaults, persistence and blocked storage.
- [x] 2.2 Implement the desk state hook (positions, open set, front object, move, open, close, cycle, reset); verify unit tests for the reducers and persistence callbacks.
- [x] 2.3 Implement `DeskObject.tsx` pointer drag with `setPointerCapture`, keyboard movement, Enter/Space, Escape, focus z-order and the drag-exclusion rules; verify with a component-level or e2e drag test.

## 3. Pixel-art assets (Aseprite)

- [x] 3.1 Run Aseprite `preflight`; if the window is not ready, stop and ask. Create the shared sepia palette in `art-src/menu/desk-palette.pal` and verify it matches the `pixel.css` tokens.
- [x] 3.2 Draw and export the campaign book (closed/open) and the compendium book (closed/open); verify with `look`, `validate` and the exported PNG sizes and transparency.
- [x] 3.3 Draw and export the options compass (closed/open); verify with `look` and `validate`.
- [x] 3.4 Draw and export the four folded map sheets (Vila Militar, Fazenda, Serra e Rio, Bairro); verify each reads distinctly and matches its map description.
- [x] 3.5 Draw and export the gramophone body and the separate record disc; verify the disc rotation origin and the transport layout.
- [x] 3.6 Register every desk sprite in `docs/assets.md` with Aseprite source, author and licence; verify the paths listed exist.

## 4. Desk objects

- [x] 4.1 Implement `CampaignBook.tsx` (closed named cover, centered full-screen spread, skirmish action that focuses the map fan); verify open/close and the action in the desk e2e.
- [x] 4.2 Implement `CompendiumBook.tsx` reusing `CodexEntryArticle` and the compendium data with page turning; verify both books can be open, the covers are named and the entry pages turn.
- [x] 4.3 Implement `OptionsCompass.tsx` as a centered options screen with the sound toggle (`data-no-autoplay`) and language selector; verify the existing audio and locale behavior and that the closed compass has no text.
- [x] 4.4 Implement `SkirmishMaps.tsx` as the four-map fan with the printed legend strip, `map-option-*` and `start-battle-3v3`; verify selection, cycling, the selected map starting the 3v3 and the selection surviving a tidy desk.
- [x] 4.5 Implement `GramophoneDesk.tsx` as a closed PNG object opening a centered screen with the larger machine, record rack, metadata and transport; verify playback, track selection and the subtle groove animation.
- [x] 4.6 Implement `MenuDesk.tsx` wiring the objects, the tidy-desk action and the extension point for future objects; verify every object renders and the reset works.

## 5. Integration and styles

- [x] 5.1 Implement `StartScreenDesk.tsx` with the pixel scene, vignette, desk and gramophone; verify it renders only on `?menu=desk`.
- [x] 5.2 Add `styles/menu-desk.css` for the desk objects, open books, compass panel, map fan and gramophone placement using the pixel kit; verify no rounded corners, blur or CDN assets.
- [x] 5.3 Add the responsive drawer layout below 900 px and the reduced-motion rules; verify every control remains reachable on a narrow viewport and with reduced motion.
- [x] 5.4 Keep `StartScreenBook.tsx`, `Gramophone.tsx`, `book-menu.css` and `gramophone.css` intact for `?menu=book`; verify the book route is visually unchanged.

## 6. Localization and documentation

- [x] 6.1 Add the desk labels, hints, object names, tidy-desk, page and map actions to `packages/content/src/locales/en.ts` and `pt-BR.ts`; verify `pnpm check:locales`.
- [x] 6.2 Update the design/status note with the new menu behavior, what the player can do and the book fallback; verify the note mentions the fallback route and the promotion step.
- [x] 6.3 Add the art assets to the asset register and the desk description to `docs/assets.md`; verify no existing lines are removed.

## 7. Tests and validation

- [x] 7.1 Add `tests/e2e/desk.spec.ts` covering objects, drag, persistence, reset, both books, page turning, compass, map fan and gramophone on `?menu=desk`; verify `pnpm e2e` on the desk spec passes.
- [x] 7.2 Add the desk visual baselines (`desk-*`) and keep the book baselines unchanged; verify the visual tests pass for both routes.
- [x] 7.3 Run `pnpm check`, `pnpm e2e`, `pnpm build` and `openspec validate "add-menu-desk" --type change --strict`; typecheck, lint, locales, content, build, OpenSpec, all 417 unit tests and all 61 e2e tests pass. (Earlier full runs had two simulation tests time out under the parallel run; the final run passed both.)
- [x] 7.4 Play the desk slice (`pnpm dev`, `?menu=desk`): drag every object, open/close both books, turn a page, open the compass, select every map, start the 3v3 and play the gramophone; record the observations and any gap.

## 8. Promotion (separate commit, after validation)

- [x] 8.1 Flip `DEFAULT_MENU` to `'desk'` and verify `/` opens the desk while `?menu=book` still opens the book.
- [x] 8.2 Record the rollback instructions (`?menu=book`, revert the flip commit) in the change notes; verify the instructions match the code.
- [x] 8.3 Remove the book screen, its tests and its styles only after the owner accepts the desk; verify `pnpm check` and `pnpm e2e` after the removal.

## 9. Desk art refresh and reference dossier

- [x] 9.1 Rasterize the campaign cover, compendium cover and reference pile from the owner-supplied references; remove the checkerboard, crop to the visible pixels, hue-shift the two main books to navy and green, and export at 128x96 / 128x80 with `.aseprite` sources.
- [x] 9.2 Replace the cover lettering with one localized label below each closed object; use the same font, size and 8 px gap, no box, and label the campaign "Campanha", the compendium "A Coluna Prestes", the references, options, maps and gramophone.
- [x] 9.3 Add the reference pile as a sixth desk object and open a centered dossier with the preface and linked entries for Macaulay, Amado, the "O Tempo e o Vento" series and Blanc; register the object and its label.
- [x] 9.4 Pose the map fan as a perspective folded map with soft fold creases and keep the active legend readable.
- [x] 9.5 Remove the "From the next room"/"Da sala ao lado" gramophone subtitle from both the desk and book screens and their locale catalogs.
- [x] 9.6 Update the desk e2e (six objects, dossier links), regenerate the desk visual baselines and update `docs/assets.md`.
- [x] 9.7 Run the full `pnpm e2e`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:locales`, `pnpm check:content` and `openspec validate "add-menu-desk" --type change --strict`; all 61 e2e and 417 unit tests pass.
