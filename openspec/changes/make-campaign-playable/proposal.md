## Why

The eight campaign maps exist (Copacabana to La Gaiba). Each has its
objectives, battle events, the column's fixed force, the chapter's historical
figure and its epilogue. Yet the campaign book still says "being prepared".
Every chapter's "Play" button is disabled. "Play the map" starts a loose 3 vs
3 with no briefing, no result kept and no way on to the next chapter. The
owner wants the campaign playable, one chapter after another. The owner also
wants to keep adjusting the campaign maps by hand in the editor as play shows
what needs changing (2026-11-15).

## What Changes

**Player fantasy and core loop.** The player opens the campaign book, reads a
chapter, and plays it from its briefing. The player fights the battle as the
figure who was there, sees the debrief and the epilogue, and goes on to the
next chapter. The loop per chapter: read, then brief, then deploy, then fight,
then debrief. A lost chapter is played again until it is won.

- **A chapter is played from its briefing.** "Play chapter" / "Jogar o
  capítulo" replaces both the disabled "Play" button and the loose "Play the
  map".
  - It starts the chapter's authored campaign map with the map's own forces,
    commander, events, time limit and epilogue.
  - It starts with no roster screen. The map fixes the column's force; with
    no fixed force, the column gets the default roster.
  - The battle knows it is a campaign chapter.
- **Progression: a chapter opens when the one before it is won.**
  - The prologue is always open.
  - Chapter *n* opens once chapter *n − 1* has ended in **victory**. Defeat
    and draw do not open it. This is the owner's choice of 2026-11-15:
    "precisa vencer".
  - A locked chapter can be read but not played. Its briefing says which
    chapter has to be won first.
  - A chapter already won can be replayed. A later result never locks a
    chapter again.
- **Campaign progress is kept in the browser.**
  - It is a small versioned record in `localStorage`: per chapter, whether it
    was won, how many times it was played, and the last and best results.
  - A broken or older record is ignored safely, never thrown at the player.
  - The book has a "Restart campaign" action, which asks first.
  - This is not save/load of a battle: a battle left half-way is not kept.
- **The debrief on the end panel.**
  - After a campaign battle, the panel shows the result, how it was decided,
    the losses and the chapter's epilogue, as it does today.
  - Its actions become:
    - "Next chapter" (only after a victory, when there is a next chapter);
    - "Play again";
    - "Back to the book", which opens the book at that chapter.
  - Winning chapter 8 closes the campaign with a closing line in the book.
- **Every chapter with a valid map is playable.**
  - A chapter's playability is derived at run time: the chapter is playable
    when an authored campaign map holds its mission id.
  - The hard-coded `playable: false` flags go.
  - The content check fails on a chapter without a map only in the published
    build. In development, a chapter without a map stays readable, with no
    play action.
- **The owner adjusts campaign maps by hand.**
  - In development builds, each chapter's briefing has "Edit this map" /
    "Editar este mapa". It opens `editor.html` on that chapter's map.
  - The editor's existing "Save to project" writes the map back to
    `packages/shared/src/maps/authored/`. The next campaign play uses it, with
    no code change.
  - `pnpm maps:accept <map-id> --reason "<why>"` re-runs the map check,
    re-records that map's determinism goldens with the reason, and redraws
    its preview, so a deliberate edit clears the gate in one step.
  - The published build has no edit link.
- **The difficulty level, once `add-difficulty-levels` lands.**
  - A campaign chapter starts at the level the player last chose.
  - The briefing shows the level and lets the player change it.
  - Progress records the level of each victory. The level does not gate
    progression.

**Historical scope.** The campaign is the eight chapters as written, from the
Forte de Copacabana (5 July 1922) to La Gaiba (July 1927). This change
changes no chapter's history, map content or commander assignment.

**Multi-perspective approach.** Each chapter is played as the historical
figure who commanded it, already set on each map by `add-historical-commander`:
- Siqueira Campos for the prologue;
- Miguel Costa for chapter 3;
- Isidoro Dias Lopes, as a command voice, for chapter 4;
- Luís Carlos Prestes for chapters 2, 5, 6, 7 and 8.

Prestes is the spine, never the hero of every chapter. Prestes's absence from
the Forte (typhus) stays in the prologue.

**MVP.**
- The eight chapters can be played in order, each from its briefing.
- Progress is kept.
- The debrief offers the next chapter, a replay and the way back to the book.
- The edit link and `maps:accept` are in.

**Non-goals.**
- Soldiers carried from one chapter to the next (identity, dead, wounded):
  each chapter is self-contained, by the owner's choice of 2026-11-15. A
  later change may carry them.
- Save/load of a battle in progress.
- Cloud or cross-device progress.
- New missions, maps or map edits. The owner edits maps by hand; maps are
  never generated.
- New scripting.
- An achievements or score system.
- Changes to the book's text.

**Legal and ethical note.**
- No book text is reproduced. Briefings, debrief lines and the closing line
  are the project's own words, bilingual and labelled like their chapter
  (`dramatized`).
- The campaign presents defeat, exile and the deaths at Copacabana and La
  Gaiba without glory or score-chasing:
  - progress names results, not points;
  - "victory" in a chapter is the scene's objective, framed by the chapter's
    text and epilogue, not a claim about the history;
  - the prologue's epilogue still tells the record against the legend.

## Capabilities

### New Capabilities

- `campaign-progression`: playing the campaign.
  - Starting a chapter from its briefing on its authored map.
  - Unlocking a chapter by winning the previous one.
  - The kept progress record and restarting it.
  - The campaign debrief actions and the closing of the campaign.
  - The difficulty a chapter is played at.

### Modified Capabilities

- `map-slots`: "Play a mission's map" is replaced by playing the chapter.
  The loose 3 vs 3 with default rosters goes. Development builds offer an
  edit link from the chapter to its map.
- `historical-content`: the campaign chapter registry's playable flag is
  derived from an authored map holding the chapter's mission, not stored as
  `false`. Validation of a playable chapter without a map changes to match.
- `delivery`: the determinism golden check gains a per-map accept step
  (`maps:accept`) that records a reason, for deliberate edits to an authored
  map.

## Impact

- **Content:**
  - `packages/content/src/campaign/chapters.ts`: playable becomes derived and
    `missionId` comes from the map index;
  - the chapter-registry checks in `tools/check-content.ts`;
  - new EN and PT-BR strings for play, lock, debrief, restart and the
    closing line.
- **App:**
  - `apps/game/src/ui/menu/CampaignBook.tsx`: play, lock, edit link, restart
    and the progress marks in the contents;
  - `apps/game/src/App.tsx`: the campaign battle start, and what the end
    panel does next;
  - `apps/game/src/ui/BattleEndPanel.tsx`: the campaign actions;
  - a new `apps/game/src/campaign/` holding the progress store and the
    unlock rules.
- **Editor:** `editor.html?map=<id>` opens a project map directly.
- **Simulation:** no rule changes. The start request already carries the map
  document. Campaign battles use the map's forces, which the engine already
  fields.
- **Tools:** `tools/maps-accept.ts` and the `maps:accept` script in
  `package.json`. It reuses `check-maps`, `check-determinism --update` (one
  map, with a reason) and `map-previews`.
- **Tests:**
  - unit tests for the progress store and the unlock rules;
  - e2e: play the prologue from the book, win it with a fixture, see chapter
    2 unlock, play again, restart the campaign; the edit link exists only in
    development.
- **Dependencies and order:**
  - The difficulty part waits for `add-difficulty-levels`, now applying in
    another session. It touches the start request and the simulation.
  - The branches `add-withdrawal-exits` (a withdrawal victory) and
    `add-artillery-bombardment` are compatible: a withdrawal victory counts as
    a victory. They are not needed.
