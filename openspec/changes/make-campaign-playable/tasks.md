## 0. Before starting

- [x] 0.1 Read this change's proposal, design and specs.
  - Confirm `add-difficulty-levels` has committed its edits to `App.tsx`, `packages/shared/src/protocol.ts`, the simulation and the locales before touching those files. Section 5 waits until that change is archived.
  - Keep the game muted (`prestes.audio.v1`) in the preview pane.
  - Edit no map content: maps are the owner's hand work.
  - Commit with explicit paths (`git commit -- <paths>`).
  - Verify: `pnpm check` passes before any change.

## 1. Content and progress model

- [x] 1.1 Derived playable (D4).
  - Add `chapterMapId` and `isChapterPlayable` in `packages/content` from `authoredMapIndex()`.
  - Remove `playable` and `missionId` from `CampaignChapter`.
  - `tools/check-content.ts`: fail on two maps holding one mission; with `--published`, fail on a chapter without a map. `pnpm verify` runs the `--published` check.
  - Verify with unit tests: all eight chapters are playable with today's maps; an index fixture without La Gaiba makes only chapter 8 not playable; a duplicate mission fails and names both maps; `--published` fails and names a chapter without a map.
- [x] 1.2 The progress model in `apps/game/src/campaign/progress.ts` (D2): `emptyProgress`, `parseProgress`, `recordResult`, `isOpen`, `nextChapter`, `isCompleted`, and the best-result order.
  - Verify with unit tests: the prologue is open on an empty record; a victory opens the next chapter; a defeat, a draw and a commander's fall do not; a later defeat keeps a chapter won and its next open; a broken, foreign or wrong-version record parses to empty; the best result prefers victory, then fewer losses, then a shorter time.
- [x] 1.3 The storage adapter `apps/game/src/campaign/storage.ts`: `prestes.campaign.v1`, try/catch, in-memory fallback, and `clearProgress`.
  - Verify with unit tests: a stub `localStorage` that throws on read and write leaves the campaign playable in memory, and a write followed by a read gives the same record.

## 2. Playing a chapter

- [x] 2.1 The campaign start in `App.tsx` (D1).
  - Add `campaignChapter` state and `startCampaignChapter(id)`, which calls `startBattle(map, { column: DEFAULT_COLUMN_ROSTER })`.
  - In development, refetch the map through its loader, bypassing the catalog cache (D6).
  - Remove `handlePlayMap`.
  - Verify with a unit test of the start arguments, and a headless test: Copacabana started this way twice with one seed gives the same hash, and its column equals the map's `columnForce`.
- [x] 2.2 Record the result on the first ended frame (D3), guarded by a ref and cleared by "Play again". Leaving before the end records nothing.
  - Verify with unit tests of the result builder (outcome, `decidedBy`, ticks after deployment, column losses), and an e2e that ends a fixture battle and reads the stored record.
- [x] 2.3 The book (D5).
  - "Play chapter" on open chapters; "Win chapter N first" on locked ones.
  - Seals in the contents (won, open, locked, with text); "Restart campaign" with an inline confirm; the campaign marked completed after chapter 8.
  - `initialChapter` reopens the book at a briefing.
  - Remove "Play the map" and the disabled "Play"; replace "being prepared" with a line on how chapters open.
  - Add all strings in EN and PT-BR.
  - Verify: `pnpm check:locales` passes, and an e2e covers chapter 2 locked and then opened, and restart with confirm and with cancel.
- [x] 2.4 The campaign actions on the end panel (D5).
  - "Next chapter" (victory with a next chapter), "Play again" and "Back to the book".
  - The chapter's number and title; the closing line after chapter 8, as a draft labelled `dramatized` in EN and PT-BR, for the owner's reading in 6.3.
  - Verify with an e2e that wins the prologue through a fixture (the playtest's event firing or a stubbed outcome frame): it sees "Next chapter", which starts chapter 2. A defeat shows only "Play again" and "Back to the book", and "Back to the book" opens chapter 2's briefing.

## 3. Hand edits to campaign maps

- [x] 3.1 The edit link in development (D6).
  - "Edit this map" / "Editar este mapa" on briefings with a map, behind `import.meta.env.DEV`; `?mission=<chapter>` for an empty slot.
  - `EditorApp` opens `?map=<id>` from the project, and asks when an autosave of the same id differs (project or local).
  - Verify: an e2e on the dev server opens chapter 6's link and finds Serra Nova loaded in the editor; a unit test of the autosave choice; the built bundle contains no "Edit this map" string (`pnpm build`, then a grep test in `tools/check-bundle.ts`).
- [x] 3.2 "Save to project", then play.
  - Verify with an e2e on the dev server: move one prop on a copy of a campaign map in a temporary fixture, save to the project, play the chapter, and see the change in the battle's map document. Restore the fixture afterwards. A real campaign map is never left edited.
- [x] 3.3 `pnpm maps:accept <id> --reason` (D7).
  - Add the id filter to `check-maps.ts`, and `--map` to `check-determinism.ts --update`, which rewrites only that map's entries and keeps the others and the base hash.
  - `map-previews.ts <id>`; `tools/maps-accept.ts`; the `package.json` script.
  - Verify with unit tests of the golden merge (other maps untouched), and that a missing reason, an unknown id or a failing map check exits non-zero with nothing written. A dry run on an unchanged map gives the same hashes.
- [x] 3.4 Document the owner's loop: open from the book, edit, "Save to project", `pnpm maps:accept`, play.
  - Add it in PT-BR to `docs/maps/GUIA_MAPAS_CAMPANHA.md`.
  - Verify: the guide has the section, and `pnpm check` passes.

## 4. Docs

- [x] 4.1 `docs/campaign/progression.md`: mark what is now implemented (unlock by victory, kept results, debrief, restart) and what stays deferred (soldiers carried between chapters, save/load).
  - Verify: the doc's status line and the carry table say "not in this change" for carried soldiers.

- [x] 4.2 The figure does not flank on his own (found in 6.2: an idle commander walked about 90 m into the fight on Ponte de Verdinho and Serra Nova). `seekFlank` skips the figure. The determinism goldens do not move (no figure flanks in their first 1000 ticks).
  - Verify: a unit test where the figure and an ordinary officer stand in the same idle flanking situation; only the officer flanks.
- [x] 4.3 The prologue exception (the owner, 2026-11-16: "o 1 é derrota mesmo"). Any end of the prologue opens chapter 2; a played, unwon prologue shows as "played"; the locked chapter 2 says "play the prologue to its end"; the debrief offers "Next chapter" after any end of the prologue. Verify with unit tests in `tests/campaign/progress.test.ts` (prologue defeat and draw open chapter 2 and show "played"; a defeat in chapter 2 still does not open chapter 3), and with `pnpm check:locales`.

## 5. Difficulty (after `add-difficulty-levels` is committed)

- [x] 5.1 The briefing's level picker (reusing the skirmish's component and stored choice); the level sent on the campaign start; `Result.level` recorded and shown in the debrief.
  - Verify with an e2e: História set on chapter 3 starts at História, and the stored result says História. A unit test: a victory at História opens the next chapter.

## 6. Gates

- [x] 6.1 Run `pnpm verify` (check including `check:content --published`, build, budgets, determinism, OpenSpec, e2e) and `openspec validate make-campaign-playable --type change --strict`.
  - Verify: all pass, and the result and the index JS size are noted in `docs/status.md`.
- [ ] 6.2 A muted playthrough of every chapter in order in the preview pane, from the book, with the debrief after each.
  - Record each chapter's result and how it was decided in `docs/status.md`.
  - A chapter that could not be won is reported to the owner with what blocked it. It is fixed by the owner's hand edit, not by code.
  - Verify: the status note lists all eight chapters.
- [ ] 6.3 Hand check by the owner: play the campaign from the prologue, read the debriefs and the closing line in both languages, edit one map through the link, and accept it with `maps:accept`.
  - Findings go in `docs/status.md`. Approval is the owner's.
