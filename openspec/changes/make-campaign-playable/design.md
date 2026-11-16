## Context

See `proposal.md` (Why) and the specs for the requirements. What is in the
tree today (2026-11-15):

- **Maps.** Eight authored campaign maps under
  `packages/shared/src/maps/authored/`, each with `use: 'campaign'` and the
  chapter's `mission` id. The fields a mission uses are already in map
  document version 9 and fielded by the engine: `columnForce`,
  `enemyForces`, `noEnemy`, `commander`, `events`, `objectives` and
  `epilogue`. `authoredMapIndex()` lists them; `loadAuthoredMap(id)` fetches
  the campaign map's chunk on demand and caches it in the thread.
- **Rosters.** `resolveRosters` (`packages/simulation/src/engine.ts`): a
  map's `columnForce` wins over the player's column. With **no** rosters
  sent and no fixed force, both sides field the default and the map's enemy
  presets are ignored. With a column roster sent, the enemy is drawn from
  the map's presets with the engine RNG.
- **The book.** `CampaignBook.tsx` already maps a mission to its map and
  shows "Play the map" (`handlePlayMap` in `App.tsx`, which sends no
  rosters), next to a disabled "Play".
- **The registry.** `chapters.ts` stores `playable: false` and an unused
  `missionId`.
- **The end panel.** `BattleEndPanel.tsx` offers Restart, Menu and (in a
  playtest) Back to editor, and already shows the epilogue.
- **The outcome.** `combat.ts` decides it: `victory` / `defeat` / `draw`,
  with `decidedBy`.
- **The editor.** It keeps maps in IndexedDB and, on the dev server only,
  writes them into the project with "Save to project"
  (`vite-map-save.ts`, `/__editor/save-map`). Open lists the campaign slots.
- **Goldens.** `tools/check-determinism.ts` keeps one golden per authored
  map (3v3 and mixed rosters), and `--update` rewrites all of them.
  `tools/map-previews.ts` takes map ids.

**Figure roster.** The roster is unchanged from `add-historical-commander`;
each map already carries its figure (see the proposal). **Research method.**
Unchanged: chapter facts come from `docs/history/SOURCES.md` under the
tier hierarchy, and this change adds no historical claim. The debrief and
closing lines are the project's own `dramatized` text, checked by the
owner like every chapter text.

## Goals / Non-Goals

**Goals:**
- No simulation rule changes. The campaign is a presentation-side layer
  over the existing battle.
- Determinism is untouched: nothing campaign-specific crosses into the
  worker beyond what a battle start already carries (the map, the rosters,
  and the level once it exists).
- A hand edit to a campaign map needs no code edit to reach the campaign.

**Non-Goals:**
- Carrying soldiers between chapters.
- Save/load of a battle.
- A campaign-wide difficulty lock.
- New end-panel statistics beyond what it shows today.

## Decisions

**D1. A campaign battle is an ordinary battle plus a chapter id held in the
app.**

`App.tsx` keeps `campaignChapter: string | null` beside the battle state.
"Play chapter" sets it and calls `startBattle(mapId, { column:
DEFAULT_COLUMN_ROSTER })`.

The column roster is sent on purpose. With rosters sent, the map's enemy
presets are honoured (drawn by the engine RNG, so deterministic per seed),
and the map's `columnForce`, when present, still replaces the column. With
no rosters sent (today's "Play the map"), a map without a fixed force would
ignore its own enemy presets.

The chapter id never goes to the worker: the simulation does not need it,
and the goldens stay as they are.
- *Alternative:* a `campaign` flag in the start request. Rejected: it would
  widen the protocol for something only the menu and the end panel use.

**D2. Progress is a pure model with a thin storage adapter.**

The model lives in `apps/game/src/campaign/progress.ts`. Its pure functions
(`emptyProgress`, `recordResult`, `isOpen`, `nextChapter`, `isCompleted`,
`parseProgress`) work on a plain object:

```text
{
  version: 1,
  chapters: {
    [id]: { won, plays, last?: Result, best?: Result }
  }
}
Result = { outcome, decidedBy?, ticks, columnLost, level? }
```

- **Storage.** `campaign/storage.ts` reads and writes
  `localStorage['prestes.campaign.v1']` inside try/catch. It falls back to
  an in-memory copy when storage throws.
- **Parsing.** `parseProgress` returns `emptyProgress()` for anything that
  does not validate (wrong version, wrong shape), so no error reaches the
  player.
- **Best result.** "Best" is ordered by victory first, then fewer column
  losses, then a shorter time.
- **Open chapters.** `isOpen(n)` is true when `n === 1` or chapter `n − 1`
  is `won`. It is computed, never stored, so a record can never hold an
  open chapter whose previous chapter is not won.
- *Alternative:* IndexedDB like the editor. Rejected: the record is small
  and synchronous reads keep the book's first render simple.

**D3. The result is recorded from the outcome event, once.**

- **When.** On the first frame whose outcome is not `playing` in a campaign
  battle, the app builds the `Result` and calls `recordResult`. The data
  comes from that frame: outcome, `decidedBy`, battle ticks since
  deployment ended, and column men dead or incapacitated. This happens
  before the end panel renders.
- **Once.** A ref guards against recording twice. "Play again" clears it.
- **Not recorded.** Leaving a battle before its end records nothing.

**D4. Playable is derived in content from the map index.**

`packages/content` already depends on `@prestes/shared`. It gains
`chapterMapId(chapterId)` and `isChapterPlayable(chapterId)`, built from
`authoredMapIndex()` (campaign entries whose `mission` equals the chapter
id). The chapter's mission id is its own id, so `missionId` and `playable`
leave `CampaignChapter`.

`tools/check-content.ts` checks the following:
- **Always.** No two authored maps hold one mission.
- **With `--published`.** Every chapter has a map. `pnpm verify` runs it
  this way before the build.
- *Alternative:* keep the flags and flip them to `true`. Rejected: a flag
  would drift from the maps the owner edits or moves between slots.

**D5. The book and the end panel take campaign props; the book opens at a
chapter.**

- **The book.** `CampaignBook` receives the progress, an `initialChapter`
  (to reopen at the chapter's briefing from "Back to the book"), and three
  callbacks: `onPlayChapter`, `onRestartCampaign` and `onEditMap`.
  - **Contents.** The contents list marks each chapter won, open or locked,
    with a small seal and text (never colour alone).
  - **Briefing.** A locked briefing replaces the play action with "Win
    chapter N first" / "Vença o capítulo N antes".
  - **Restart.** "Restart campaign" sits on the contents spread and asks in
    an inline confirm, not `window.confirm`, so e2e and the desk style work.
- **The end panel.** `BattleEndPanel` gets an optional `campaign` prop:
  `{ number, title, next?: { id, number, title }, completed: boolean }`,
  plus `onNextChapter` and `onBackToBook`.
  - **Actions.** In a campaign battle these replace Restart / Menu with
    "Next chapter" (victory, a next chapter exists), "Play again" and "Back
    to the book".
  - **Closing.** After winning chapter 8 the closing line replaces "Next
    chapter".

**D6. The edit link opens the editor on a project map; the next play
re-reads it.**

- **Edit link.** In `import.meta.env.DEV` only, the briefing shows "Edit
  this map", a link to `editor.html?map=<id>` (or `?mission=<chapter>` for
  an empty slot, which opens New with that slot chosen). The published
  bundle drops the branch through the `DEV` constant, so no edit string or
  link ships in it.
- **Opening the map.** `EditorApp` reads `map` on load and opens the
  project's version through `loadAuthoredMap`. If IndexedDB holds an
  autosave of the same id that differs from it, the editor asks which one
  to open (the project's, or the unsaved local one), and keeps both until
  the owner chooses.
- **Re-reading after a save.** After "Save to project", the game tab can
  still hold the old document in the catalog cache. In development,
  `startCampaignChapter` refetches the map through the loader, bypassing
  `AUTHORED`. Vite serves the rewritten JSON module, so the next "Play
  chapter" uses the edit without a page reload.
- *Alternative:* edit inside the game's tab. Rejected: the editor is its
  own page, and duplicating it is out of scope.

**D7. `maps:accept` composes the existing tools for one map.**

`tools/maps-accept.ts <id> --reason "<why>"` runs these steps:

1. It checks that the id is an authored map.
2. It runs the map check for that map. `check-maps.ts` gains an id filter.
3. It runs `check-determinism.ts --update --map <id> --reason`.
   `--map` restricts both computing and rewriting to that map's
   `battleMaps` and `mixedRosters` entries, and keeps the other entries and
   the base hash.
4. It runs `map-previews.ts <id>`.

It stops at the first failure. Nondeterminism (the two runs differ) is
reported as such and writes nothing.

**D8. Difficulty is a late, separate step.**

The level parts wait for `add-difficulty-levels` to be archived. Then:
- the briefing reuses its level picker component and its stored choice;
- `startBattle` passes the level as the skirmish does;
- the `Result.level` field is filled.

Until then, `Result.level` stays absent and the briefing shows no level.

## Risks / Trade-offs

- **[Risk] A chapter may be very hard or impossible to win once "must win"
  gates the next chapter.** The prologue's text says "there is no victory",
  but its map is decided on objectives like every map.
  → Mitigation: task 6.2 plays every chapter and records each one's result
  in `docs/status.md`. A chapter no one can win is reported to the owner,
  who adjusts its map by hand (D6, D7). Difficulty, once it lands, also
  helps. This change does not add a per-chapter exception.
- **[Risk] Progress lost when site data is cleared.** It lives in the
  browser only.
  → Accepted for this change. Save/load and export are separate ideas.
- **[Risk] Editing a map in another tab while a battle is running.**
  → The running battle keeps its document. Only the next start re-reads it.
- **[Risk] The difficulty change touches `App.tsx`, `startBattle` and the
  start request at the same time.**
  → Apply after `add-difficulty-levels` has been committed: tasks 1-4 do
  not depend on its code, but they edit the same files. Section 5 starts
  only after it is archived.
- **[Trade-off] The chapter id stays out of the simulation.** A headless
  run cannot say "this was chapter 3". That is acceptable: the battle
  report and the goldens work per map.

## Migration Plan

- **Progress.** No player data exists yet. `prestes.campaign.v1` starts
  empty for everyone.
- **Registry.** Removing `playable` and `missionId` from `CampaignChapter`
  is internal. The registry tests and `check-content` change with it.
- **Rollback.** Revert the change's commits. The maps and their goldens
  are untouched by this change (`maps:accept` changes goldens only when the
  owner runs it).

## Open Questions

- The closing line after chapter 8: the owner reads and approves the draft
  (EN and PT-BR) in the final hand check. The wording does not change the
  specs.
