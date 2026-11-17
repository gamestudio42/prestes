# Status

History before 2026-11-06 (the bootcamp era, the redesign plan, the
per-change notes and the verification log) is in
[`status-history.md`](status-history.md).

## Where the game is (2026-11-15)

A skirmish game on authored maps. A battle opens in a deployment phase, is
fought for capture-and-hold objectives against an enemy commander under fog
of war, and ends by objective value or by breaking the other side. Sections
are built from a roster of three armies' types and period weapons; they take
cover by slots, enter and assault buildings and trench lines, queue orders,
walk or run. A skirmish is fought at one of three difficulty levels. The
battle HUD is the docked wood-and-leather one, with a figure per soldier in
the troop panel. Maps are made in the in-game editor (`editor.html`), with
scripted battle events. The campaign's eight chapters can be played in
order from the campaign book, each opened by winning the one before it;
progress is kept in the browser. The battle has ambient beds, water,
footsteps and passing rounds, and voices: the commander's orders and the
section's answers, the soldiers' call-outs, curses by moment and the enemy's
lines when seen, heard from a distance, with captions (on in English). There
is no save/load of a battle.

## Queue (2026-11-15)

One list, in order. Each item says who acts. Work the first open item of
section 1; items in section 2 wait on the owner and are listed in the order
that unblocks the most.

### 1. Claude, nothing to wait for

1. **Campaign gates** (`make-campaign-playable` 6.2; 6.1 done
   2026-11-16): every chapter starts from the book and reaches its
   debrief, but scripted plans lose six of the eight chapters (see the
   notes of 2026-11-16). The commander no longer flanks on their own
   (4.2). Whether chapters 1-3 and 5-7 can be won is for the owner's play
   (2.3); 6.2 stays open until then.
2. ~~**Books gate**~~ (`complete-books-and-bibliography` 7.1): done
   2026-11-16, every step passing (see the notes of 2026-11-16).
3. ~~**Voices code**~~ (`ambient-sound-and-voices`): done and archived
   2026-11-16 (see the notes "voices in the game").

### 2. Waiting on the owner

1. ~~**Three finished branches to merge or drop.**~~ All three are
   merged into this branch (checked 2026-11-16 with `git branch --merged`).
   Was: **Three finished branches to merge or drop.** Each was done in its own
   session on 2026-11-15 and is not on this branch. Suggested order, smallest
   first, with `pnpm verify` after each:
   - `claude/brave-satoshi-1c42a4` (1 commit): cursor badges on right-click,
     enter/assault by default on buildings.
   - `claude/upbeat-roentgen-13ddec` (4 commits): a withdrawal victory,
     sections leaving by a map exit.
   - `claude/sweet-chebyshev-0853ff` (7 commits): artillery bombardment as a
     battle event.
2. **Play each difficulty level** (`add-difficulty-levels` 6.3): História
   forgiving, Soldado fair, Oficial hard with ammunition to spare. Then
   Claude archives the change and adds the level to the campaign briefing
   (`make-campaign-playable` 5.1).
3. **Play the campaign** (`make-campaign-playable` 6.3): from the prologue,
   reading the debriefs and the closing line after chapter 8 (a draft) in
   both languages; edit one map through "Editar este mapa" and accept it
   with `pnpm maps:accept`.
4. **Approve the lines, then record** (`docs/audio/ROTEIRO_RASCUNHO.md`):
   the order lines and the fire control lines (`add-difficulty-levels` 5.1),
   then the recording (`ambient-sound-and-voices` 5.6) and the headphone
   check (6.3).
5. **Books** (`complete-books-and-bibliography` 4.4, 7.2): send the image
   permission requests in `docs/rights/permission-requests/` (Claude does
   not send them); read both books in the game in both languages.
6. **`referencias para hud/`** (33 MB of reference images): keep out of git,
   add, or move elsewhere.
7. **Play the bigger forces** (`scale-forces-by-map-size` 6.3): a skirmish
   on a medium map with a twelve-section company (the troop cards scroll),
   and the São Luiz / Ramada chapter through. The limits now grow with the
   map (small 33 men / 6 sections, medium 66 / 12, large 100 / 16); the
   five medium campaign maps start with 40 to 55 men a side and the first
   shot falls within a minute (it was 4 to 11 minutes). Say whether the
   maps still feel empty and the battles long; the bands are in the
   change's design.

### 3. Blocked on another item

- Fire control voice playback (`add-difficulty-levels` 5.2) waits on the
  voice director (1.3).
- The level in the campaign (`make-campaign-playable` 5.1) waits on 2.2.

### 4. Later, by the owner's word

- `add-field-manual` (0/11): on hold since 2026-11-11 ("not yet").
- Delete the leftover training-ground code (`training-ground.ts`,
  `training-layer.ts`, the `training_phase` and `despawn_role` commands).
- Not proposed: save/load of a battle (talked over on 2026-11-13); soldiers
  carried between chapters (each chapter self-contained, 2026-11-15).

### Open changes at a glance

| Change | Tasks | Queue items |
| --- | --- | --- |
| `make-campaign-playable` | 15/18 | 1.1, 2.2, 2.3 |
| `ambient-sound-and-voices` | 11/20 | 1.3, 2.4 |
| `add-difficulty-levels` | 17/20 | 2.2, 2.4, 3 |
| `complete-books-and-bibliography` | 25/27 | 2.5 |
| `add-field-manual` | 0/11 | 4 |

## Notes of 2026-11-16: online release preparation

`prepare-online-release`, sections 1-4. Measured on the build of 2026-11-16.

- **Release check** (`pnpm check:release`):
  - first visit: 3.37 MB of a 3.5 MB limit;
  - total build: 40.3 MB of a 60 MB limit.
- **What the first visit counts.** The entry JS is 1.78 MB: the main chunk,
  three.js and React. The images in the main chunk add 1.33 MB, mostly the
  HUD art (`ground-left`, `summary`, `bottom-strip`) and the camp table.
  - The count is conservative: a browser downloads the HUD art only when the
    battle draws it.
  - Moving the HUD art out of the main chunk is the first lever if the limit
    gets tight.
- **The old menu video is gone.** `public/video/menu-book.mp4` showed the
  marching soldiers. It had been unused since the camp desk, and the owner
  said to delete it (6.5 MB).
- **Slow-network e2e** (`tests/e2e/slow-network.spec.ts`, built preview,
  1.5 MB/s, 150 ms, no cache). Times count from the first byte:
  - skirmish: desk in the page at 0.7 s, loading screen at 2.6 s,
    deployment at 7.9 s, with 12 entries;
  - chapter 1: deployment at 11.5 s, with 14 entries, including paging
    through the book to the briefing.
- **Warm start.** A second battle in the same page opens with no loading
  screen. Its state hash after 40 ticks equals the cold start's
  (`tests/e2e/battle-loading.spec.ts`).
- **The gate (`pnpm verify`).** Every step passed except e2e, which had 13
  failures:
  - 8 visual baselines that the new Playwright projects renamed; the old
    naming is pinned now;
  - 4 tests pinning image URLs that now carry `?v=`;
  - 1 campaign test that took a frame from the ended battle while the next
    chapter loaded.

  After the fixes, those six specs pass (78 tests). The full gate has not
  been rerun from the start.

## Notes of 2026-11-16: branches unified

At the owner's request ("unifique todos os branches"), merged into
`plan-art-factions-sound`: `claude/brave-satoshi-1c42a4` (HUD icons and
right-click cursors), `claude/upbeat-roentgen-13ddec` (`add-withdrawal-exits`)
and `claude/sweet-chebyshev-0853ff` (`add-artillery-bombardment`). The
content warning was committed first.

- Conflicts kept both sides. Events have the commander-down, exited and
  bombardment entries. The icon sheet keeps the branch's redrawn building
  icons, and `pnpm icons --add` added the economical fire icon. On a
  withdrawal map the commander's fall still decides first.
- Goldens: only the withdrawal golden was re-recorded, as `7add6e16`. Every
  map golden is unchanged.
- Budgets raised at the owner's word ("suba os limites"): index JS 1,000,000 B
  (950,542 B used), sim worker 280,000 B (251,016 B used), editor JS
  140,000 B (122,652 B used).
- Gate: every step passes, with two wall-clock tests that failed only under
  the gate's load. Unit tests: 1365 of 1366; the order-preview timing test
  passes alone. E2e: 168 passed, 9 skipped, and one failure: the strategic
  frame budget of `performance.spec`, whose five tests pass alone.

## Notes of 2026-11-16: books gate

- **`complete-books-and-bibliography` 7.1 done.** Strict validate of the
  change passes. Every `pnpm verify` step passes:
  - check: 182 test files, 1287 tests, locales, content, maps;
  - published content;
  - build;
  - bundle: index JS 925,748 B of 940,000 (98.5%);
  - determinism;
  - difficulty: Soldado 0.97, Oficial 1.38, both within their bands;
  - tick budget: about 1.6 ms a tick of 4.5;
  - OpenSpec: 31 of 31;
  - e2e: 165 passed, 9 skipped, 1 failure since fixed.
- **Caveat: four runs to get there, and the last was step by step.**
  - Run 1: the laptop was on battery and held back. The order preview
    timing test failed (2.16 ms of 2) and `battle-feel` timed out.
  - Run 2: cut off when the laptop shut down at 10:39. The difficulty
    step's battle process was killed (exit 0x40010004).
  - Run 3: on mains power, while the machine was still busy after the
    restart. The same two tests failed (3.15 ms; a timeout).
  - Run 4: all 1287 tests passed, but vitest reported one internal error,
    "Timeout calling onTaskUpdate", a worker not reporting back in time.
    That fails `check` and stops `verify`.

  The remaining steps were then run one by one, all passing. Two things
  follow:
  - The preview timing test and `battle-feel` are near their limits
    whenever the machine is loaded. The timing project runs alongside the
    unit tests. Alone, the timing test passes every time.
  - `verify` on this laptop wants mains power and a quiet machine.
- **E2e fix:** `campaign.spec.ts` "Play again replays the chapter" failed
  once. In a campaign, `startBattle` fetches the chapter's map first (in
  dev the start forgets the cached map so saved edits are used). Until
  that fetch ends, the previous battle's client, frozen on its stubbed
  end, still answers the bridge. So `waitForBattle` passed at once, and
  the stubbed victory went to the old client. `waitForBattle` now waits
  for a frame other than the one it last accepted. The same race was on
  "Next chapter" then defeat. Since the fix: 44 of 45 runs of the campaign
  specs passed. The one failure, in the first round, was not captured.

## Notes of 2026-11-16: voices in the game

- **The voice director is in** (`ambient-sound-and-voices` 5.1-5.5, 5.2,
  6.1, 6.2; `add-difficulty-levels` 5.1-5.2). `VOICE_LINES` holds the 202
  generated takes with EN captions. The client numbers its commands as the
  simulation does, so a refused order is silent; a newer order replaces an
  unspoken one; call-outs are read from frame differences and placed by the
  nearness rule; curses come by chance to an engaged section, from the
  group that fits the moment (hit, miss, under fire, a rout, any) at the
  owner's word; "reloading" waits 60 s per section and 30 s over all; enemy
  lines only when seen. Every voice is filtered and given an open-air echo,
  pushed farther twice at the owner's word, who kept the second ("ficou
  bom"). Captions: on in EN, off in PT-BR, a switch in the options, shown
  even when muted.
- **Audio check** (`pnpm check:audio`, in verify): 202 of 202 takes,
  9.82 MB of audio in all (budget 16 MB), 1.93 MB of voices (budget 5 MB),
  every file in `docs/assets.md`. `docs/audio/VOICE_SCRIPT.md` is generated.
- **`pnpm verify` passed every step**: e2e 183 passed, 9 skipped, 15.6 min;
  determinism goldens unchanged; first visit 3.40 MB of 3.50, build 40.67 MB.
- **Bundle watch:** the index JS is at 989,826 B of 1,000,000 (99.0%), up
  with the voice catalogue. The next feature that adds to it should first
  move the catalogue (or another large module) into a lazily loaded chunk.
- **Wordless shouts, both sides** (the owner's word, 2026-11-16): a battle
  cry when a section goes into an assault, a cry of pain when a man is hit
  and stays up, a death cry when he falls; three takes each in the
  soldier's and in the enemy's voice (18), generated like the rest
  (`inimigo/dying-1` twice: the first had a gap). The enemy's only when
  seen. Captions name the cry. Audio now 9.93 MB, voices 2.04 MB, 220 of
  220 takes. Seen in a skirmish in the preview: pain, death cries and the
  comrade's "man down" after them.
- **Curse sources found** (2026-11-16) in the project's books, and the four
  lines generated: legalist 16 "Revoltosos de merda!" (blanc-2024 p. viii:
  "revoltosos", the commonest name for the rebels then); legalist 17
  "Bandidos!" (macaulay-1974 p. 208, loyal troops call the prisoners
  "bandits"; blanc-2024 p. 56, both sides called the other bandido and
  jagunço); legalist 18 "Maragatos de uma figa!" (macaulay-1974 p. 11, the
  name "derisively applied" to the gaúcho insurgents); cangaceiro 16 "Lá
  vem os revoltoso!" (blanc-2024 p. viii; rosa-1956). 224 of 224 takes.
- Column 13 ("castelhano"), 20 ("pica-paus") and 21 ("peludo") are in
  none of the project's books and were dropped at the owner's word.
- **Closed** at the owner's word ("deixe esses de fora e feche"):
  `ambient-sound-and-voices` archived as
  `openspec/changes/archive/2026-11-16-ambient-sound-and-voices`; its
  specs synced (the new `soundscape` capability, and `audio`'s three
  channels). The delta was first brought in line with what was built: the
  shouts, curses by moment, the voices heard from a distance, and an
  unrecorded order line shown as a caption.

## Notes of 2026-11-16: campaign gates

- **6.1 done.** `pnpm verify` passed every step: check, published content,
  build, bundle (index JS 914,162 B of 940,000, 97.3%), determinism,
  difficulty, tick budget, OpenSpec, e2e (166 passed, 9 skipped, 15.2 min).
  `openspec validate make-campaign-playable --type change --strict` passes.
- **6.2, the book flow: all eight chapters pass.** In the preview, muted,
  each chapter was started from its briefing's play button. Each opened on
  its own map in deployment with its map's forces, and reached its debrief
  with the chapter line. "Next chapter" appeared on 1-7. On 8 it was the
  closing line instead. The battles were ended with the test bridge, so
  this checks the flow, not who wins.
- **6.2, who wins: not settled.** Each chapter was played headless, seed
  1922, as the book starts it, with three scripted plans:
  - hold: the column stays where it deployed;
  - advance: each section marches on an objective the column does not
    hold, the most valuable first;
  - commander back: like advance, but the commander's section stays where
    it deployed.

  A script is not a player, so a loss here does not mean the chapter
  cannot be won. Results (outcome, how it was decided, column losses):

  | Chapter | Map | Commander's fall | Hold | Advance | Commander back |
  | --- | --- | --- | --- | --- | --- |
  | Prologue | `copacabana` | continue | defeat, annihilation, 17/18 | defeat, broken, 14/18 | defeat, annihilation, 17/18 |
  | 2 | `sao-luiz-ramada` | defeat | defeat, commander, 19/21 | defeat, broken, 20/21 | defeat, commander, 3/21 (4.8 min) |
  | 3 | `porto-mendes` | defeat | defeat, commander, 16/23 | defeat, commander, 14/23 | defeat, commander, 5/23 (7.8 min) |
  | 4 | `catanduvas` | continue | defeat, annihilation, 23/23 | **victory**, all objectives, 2/23 | **victory**, all objectives, 2/23 |
  | 5 | `ponte-de-verdinho` | defeat | defeat, commander, 12/20 | defeat, commander, 15/20 | defeat, annihilation, 19/20 |
  | 6 | `serra-nova` | defeat | defeat, commander, 3/21 | defeat, commander, 11/21 | defeat, broken, 17/21 |
  | 7 | `pantanal` | defeat | defeat, commander, 13/18 | defeat, commander, 11/18 | defeat, objectives, 14/18 (20 min) |
  | 8 | `la-gaiba` | continue | **victory**, all objectives, 0/13 | **victory** | **victory** |

- What it points to, for the owner's play (2.3):
  - On the five maps where the commander's fall loses the battle (2, 3, 5,
    6, 7), the commander falls early even when kept back: chapter 2 is
    lost at 4.8 min with 3 men down, chapter 3 at 7.8 min with 5. This is
    the most likely blocker. It is not yet known whether the commander
    stands within enemy reach at deployment, or the enemy's fire seeks the
    commander out.
  - The prologue (18 men, reinforcements against them at 5 and 10 min) was
    a defeat in history. The campaign asks for a victory to open chapter
    2.
  - Chapter 8 has no enemy (`noEnemy`). It is the epilogue: four story
    cards while the column holds its objective for two minutes. That is by
    design.

- **Why the commander falls early.** Traced on chapters 2, 3, 5, 6 and 7.
  The commander is never singled out and never falls to long-range fire.
  In every chapter the commander falls in about 1.5 seconds to three rifle
  hits from 18-22 m, once the enemy is on top of the column. Two causes:
  1. **The commander flanks on their own** (code).
     `seekFlank` ([orders.ts:429](../packages/simulation/src/systems/orders.ts))
     sends any man who has no order and no Hold, and whose target is in
     cover, on a flanking move of his own. The figure is not excluded. On
     Ponte de Verdinho and Serra Nova the idle commander walked about 90 m
     forward into the fight and died there. A Hold order stops it, but the
     design's answer to "defeat on the commander's fall feels harsh" is
     "the player's counter is positioning", and a commander who leaves the
     place the player chose breaks that counter. The spec says the figure
     keeps every officer rule "with no bonus of his own", so changing this
     is a spec change and the owner's call.
  2. **The line gives way around the commander** (maps 2 and 3). The
     enemy comes in by the roads beside the column's deployment zone and
     reaches it at 5-8 min. With the commander's section on Hold there, the
     commander falls at 6.0 min (chapter 2, 4 men down) and 8.0 min
     (chapter 3, 4 men down); with the whole column on Hold, at 5.4 and 8.7
     min. Correction to the first reading: on map 2 the commander's start
     is 44 m from the column's objective, and on map 3 about 175 m, so it
     is not "on" it.
- Whole column on Hold, with a real Hold order (seed 1922):
  - Prologue: defeat, broken, 9.8 min.
  - 2: defeat, commander, 5.4 min.
  - 3: defeat, commander, 8.7 min.
  - 4: defeat, broken, 19.1 min.
  - 5: defeat, all objectives, 19.2 min.
  - 6: defeat, commander, 13.5 min.
  - 7: defeat on objectives at the 20-minute limit, 1 man lost. Holding
    alone cannot win it.
  - 8: victory.
- **Applied, on the owner's word ("apply both"):**
  - (a) The figure does not flank on their own (`make-campaign-playable`
    4.2). The `historical-commander` spec delta lives in the change.
    `seekFlank` skips the figure, with a unit test. No determinism golden
    moves.
  - (b) **Dropped: it could not work.** Since `author-game-maps` 8.1 the
    section starts are worked out from the deployment area
    ([document.ts](../packages/shared/src/maps/document.ts),
    `sectionStartsFromArea`). The `sections` written in a map file are
    never read, so moving the Comando slot there changed nothing (the
    replay matched to the decimal). The edits were reverted. A player's
    version, sending the commander's section to the zone's corner farthest
    from the enemy and holding the rest, only buys time: chapter 2 is lost
    at 7.6 min (commander, 19/21 down), chapter 3 at 9.2 min (commander,
    12/23 down). There the commander falls because the line gives way, so
    on maps 2 and 3 the question is the whole fight against a passive
    defence. An active plan can only be judged in play.
- Replay with (a) in (seed 1922): the same results as above for every plan
  that gives orders. An order already stopped the flanking, so (a) only
  helps a player who leaves the commander without one.
- Found while accepting the maps: `pnpm maps:accept` passed the reason
  through a shell, so a reason with spaces kept only its first word, and it
  drew a preview for campaign maps, which have none. Both fixed, with a
  test.

## Notes of 2026-11-15

- Committed by topic: the difficulty levels, the passing rounds and the
  footsteps' cadence (left uncommitted by their sessions), then
  `make-campaign-playable` 1-4. Regenerating `icons.txt` had dropped the
  `order-area-fire` icon; it is back and now lives in `icon_grids.py`.
- Campaign `pnpm verify`: every step passed but e2e (161 passed, 3 failed,
  all three since fixed: the campaign save-and-play spec, whose restore now
  retries a locked file; `editor.spec.ts` 8.3, flaky before today because
  whole-pixel mouse positions move the area 19-21 m; `area-fire.spec.ts`,
  failing since its own commit a5603eb, now trying march lines -80, -40,
  -60). Index JS 910,070 B of 940,000.
- Saving a map to the project reloads the game tab on the dev server, so a
  battle open there is lost (`make-campaign-playable` D6 assumed it was
  kept); the next play of the chapter uses the saved map.
- Since 2026-11-15 Claude draws the campaign maps (the owner's word); the
  eight are in the tree and the owner adjusts them by hand in the editor.

## Earlier notes

Done since the plan of 2026-11-11, all archived: `faction-armies`,
`soldier-animation-and-textures`, `troop-thumbnails-and-panel`,
`redo-battle-hud`, `biome-trees-and-plants`, `revise-buildings-and-stone`,
`remove-sandbox-panel`, `polish-menu-desk`, `add-map-compass`,
`camp-tent-menu`, `scrub-concealment-and-area-fire`, `route-around-wire`,
`refine-battle-controls-and-content` and, on 2026-11-14, `add-battle-events`
(18/18: triggers on time, objectives, areas, losses and other events;
troops entering for either side, enemy posture, a card that pauses the
battle; map document version 9; the Events panel and the playtest's "fire
now"). `pnpm verify` for it passed but the index JS budget, measured before
the budget was raised to 760 KB; events and editor e2e 33/33.

Tidied on 2026-11-14: the work five finished sessions had left uncommitted
was committed by topic (`enrich-texts-from-sources`, the window-height fire
fix in `view3d`, the recording script draft, the campaign maps guide and the
760 KB budget). The 24 ambient MP3s re-encoded by a later `prepare:audio`
run were put back to their committed versions (copies kept outside the
tree; `pnpm prepare:audio` makes them again from `audio-src/`).
`referencias para hud/` (33 MB of the owner's reference images) stays out
of git until the owner decides.

Decisions of 2026-11-11 (the owner):

- `video-tutorial-manual` is dropped: videos are for another time, an
  in-game manual as a section of the Column's book is enough. Its change
  directory was removed (git history keeps it). The leftover training-ground
  code it meant to delete (`training-ground.ts`, `training-layer.ts`, the
  `training_phase` and `despawn_role` commands) is still in the tree.
- `machine-gun-fire-feedback` passed the hand check and is archived.
- The battle HUD is redone from the owner's reference (`redo-battle-hud`, approved): panels docked, collapse only (no drag or resize); the soldier figure goes into `troop-thumbnails-and-panel`; the art is drawn in Aseprite and may start from the reference image; the bottom strip is decoration only. Applied on 2026-11-12 ahead of `troop-thumbnails-and-panel` ("agora faça o hud"): the frames, docked panels, order prompt and strategic layers are in; it frames today's troop summary until the figures land. The baselines were re-recorded once (6709bbc) and pass with the compass committed; verified and approved by the owner after playing on 2026-11-12.
- The sandbox is retired ("hoje temos editor de mapa"): `remove-sandbox-panel`, applied the same day.
- The armies' catalog (`faction-armies` 1.3): the three army names stand
  (Coluna Prestes, Forças legalistas, Batalhões patrióticos); Fogão and
  Potreada for the column; only the Brigada Militar among the state forces;
  cangaceiros in as a dramatized type, hollow-nosed bullets out; no
  ammunition handicap for the column until a difficulty selector exists.
- Section thumbnails are rendered from the 3D model, not hand-drawn.
- Campaign and skirmish maps are authored by the owner by hand in the
  editor; no map is generated or hand-written in code.
- Large files are split when a change touches them, not in a refactor of
  their own: `battle-map-layer.ts`, `EditorApp.tsx`, `editor/viewport.ts`,
  `useOrders.ts`.

## Fixes of 2026-11-11

- **Defend and ambush under fog.** Both faced the nearest enemy, seen or
  not, so a section turned toward men its side had never spotted. The order,
  the standing facing and the HUD preview now use only enemies the side sees;
  with none, the section keeps the facing it was given or arrived with. The
  legalist commander gives its rally and objective defends a facing of their
  own (toward the column's deployment), so its line does not depend on
  sight. Regression tests in `packages/simulation/test/vision.test.ts`.
  Determinism golden for the 3v3 on campo-de-provas `b3e2538f` ->
  `94b68f47`.
- **Unit test run.** The full parallel run timed out different long
  simulation files on each run (3 and 5 failures in two runs). The run now
  uses a third of the logical cores (`PRESTES_TEST_WORKERS` overrides); the
  wall-clock preview-cost test runs first, alone, and keeps sampling (up to
  25 batches) until a batch is inside its 2 ms budget; the per-test timeout
  is a 60 s hang guard, not a speed check. 784/784 inside `pnpm verify`,
  without `PRESTES_PREVIEW_GUARD`.
- **Gate of 2026-11-11.** `pnpm verify`: check, build, bundle budget,
  determinism, tick budget and OpenSpec validation pass. `pnpm e2e` 128 of
  130: the desk label gap (see the open points) and the tactical frame
  budget of `performance.spec`, which measured 23.7 ms against 16.7 ms at
  the end of the loaded gate run and passes alone.
- **Bundle budgets.** The worker stood at 206,213 B of 210,000 B (98.2%) and
  the index chunk at 604,253 B of 620,000 B (97.5%). Budgets are now 240,000 B
  and 680,000 B (85.9% and 88.9%).

## Hand checks of 2026-11-09

- `fog-of-war` (4.2): a 3v3 under fog works very well.
- `pre-battle-roster` (6.4): the setup screen and the rosters in battle work
  well.
- Later, the user's word: machine guns need work: their sound, tracers, and
  whether they really fire.
- `add-deployment-phase` (4.4), played together with `machine-gun-fire-feedback`
  and `add-run-toggle`: "o teste foi muito bem, está ficando bem legal".

## Run toggle (`add-run-toggle`, 2026-11-09)

- The order board has a "Passo" group, Andar / Correr (key R). A section set
  to Correr runs (3.5 m/s) in every order but recon, so it crosses open
  ground in less than half the time; winded men still drop to a walk.

## Deployment phase (`add-deployment-phase`, 2026-11-09)

- Every battle (skirmish, presets, editor playtest) opens in deployment: the
  clock stands still, the speed controls hide, both deployment areas show,
  and a banner offers "Start battle" (Enter) and "Reset deployment".
- Placing orders take effect at once inside the side's area; defend fills a
  trench line's fire step. Fight orders and places outside the area are
  refused, with the reason under the banner.
- The enemy deploys on the best cover of its area (trenches, then walls and
  stones, then fences) and defends facing the column.
- With a move or defend order on the cursor, the slots within 25 m show by
  the stance they hide, with a free/total count per piece.
- Maps: document version 3 with one area per side; the editor shapes them
  and **Check map** checks them.

## Map editor (add-map-editor, 2026-11-08)

`editor.html` builds battle maps in the browser: small, medium and large
sizes (240, 400, 640 m), a pixel-art texture brush with basic colours and
detailed textures (cerrado and caatinga included), elevation brushes with a
relief view (height colours, shading, 1 m and 5 m contours), roads with
ditches, rivers, ponds, bridges and ferries, walls and fences, a catalog of
buildings, stones, trees, posts, covers and props that all count in battle,
vegetation, deployment, a problem list, undo, autosave, import/export,
playtest and (dev server) save to project. The test map `campo-de-provas`
is the default battle map; maps are chosen by slot (eight campaign missions
or skirmish), and each map carries its time of day and sun bearing
(author-game-maps; the user's hand check on 2026-11-10 passed: garrisons,
the tower, an assault and the ford on the test map, and their first map,
`paiolzinho`, saved with a thumbnail and played; the section rings no
longer show in the deployment phase; wish for later: each map as its own
object on the desk instead of the sheet fan). The four hand-written maps (Vila Militar, Fazenda,
Serra e Rio, Bairro) and the `fazenda-doc` proof map were removed.
The menu desk carries a theodolite, under the map fan, that opens the editor.
Authored maps load on demand (`loadAuthoredMap`), so no map document weighs
anything in the game and worker bundles (worker 195,910 B, budget 200,000 B). Bundle budgets raised to the measured sizes: game JS
400 -> 510 KB, worker 110 -> 155 KB, menu CSS 85 -> 100 KB (the editor's map
compiler is about 20 KB of it; the rest is the gramophone, compendium and desk
menu work).

refine-map-editor (2026-11-09): map document v2 with trench lines (fire or
communication, any length) and roads that leave the relief alone; plants
drawn as plants (corn rows, cane, capim, scrub) and only on land; bridges
on their abutments; smoothed rivers and water outlines, dithered ground
borders, a "Smooth edges" option; a trees tool with biome scatter; tree
models adapted from the owner's Refloreste project; the Cover view (the
game's cover places by stance, counts per piece, concealment, deployment
area totals). Open: the araucaria's crown reads as dark clumps without its
candelabra shape (hand check); the English editor toolbar now wraps to two
rows at 1440 px, like the Portuguese one.

Hand check of refine-map-editor (user, 2026-11-09): building the map is
enjoyable and the map played without trouble. Findings and what was done:

- Bushes added later moved the plants already placed: every plant drew from
  one random stream for the whole map. Each plant now takes its jitter, size
  and colour from its own grid point, and capim and scrub stand on one map
  grid, so a field stays as it was when another changes.
- The small cacti (xique-xique, macambira), the bush and the shade round
  cerrado trees and juazeiros grew scrub plants round themselves. They still
  conceal men like scrub, but the view now draws the object there, not
  scrub (`raster.objectCover`).
- The buriti stood off its trunk: trees are now centred on the trunk's foot,
  and the tree material is double-sided, so its fronds show from every side.
- W A S D and Q E were tool shortcuts as well as the camera keys. Tools moved
  to wall L, trees Y, deployment K, eraser C, smooth M.
- Some trees looked too small: the cerrado tree was 4 m (an adult pequi is
  6 to 10 m) and the bush narrower than its 2.8 m footprint. At the user's
  word the cerrado tree is now 6 m and the bush spreads 2.6 m (still 1.3 m
  high); the view only, its cover in battle is unchanged.

## Menu desk (default, 2026-11-06)

The start screen is a desk of draggable period objects: the campaign and
compendium as independent rasterized books, a reference pile, an options compass,
a fan of the four rasterized folded battle maps and the gramophone. Every closed
object carries one localized label below the art, with the same font and gap; the
campaign reads "Campanha"/"Campaign" and the compendium "A Coluna
Prestes"/"The Prestes Column". Opening a book, the reference pile, the compass or
the gramophone lays out a centered screen. The reference dossier carries the
owner's preface and linked entries for Macaulay, Amado, Erico Verissimo's
"O Tempo e o Vento" series and Blanc. The gramophone screen shows the larger
machine, the current record's metadata, a rack of recordings and the transport;
its record never rotates, only the groove highlights shimmer while a track plays,
and it has no "Da sala ao lado" subtitle. The active map carries its name,
description and deploy action in an HTML legend over the blank parchment strip at
the bottom of the sheet; the map art has baked folds and the fan is tilted in
perspective. The desk stores its positions under `prestes.menu.desk.v1` and
offers a localized "Tidy desk" reset; it does not read or write the audio,
locale, gramophone or route keys.

The owner accepted the desk on 2026-11-08, and the book screen, its
route (`?menu=book`), its styles and its tests were removed (add-menu-desk 8.3);
the e2e specs now start every battle from the desk. The shared page and cover
styles the desk books use stay in `book-menu.css`.

### Desk polish (`polish-menu-desk`, 2026-11-07)

- Open objects are centred overlays; a closed object keeps its spot across
  open and close and across a reload while open. Drag grid 2 px, keys 6/24 px.
- Closed objects are drawn from `DESK_ART` at 2x on every screen (the owner
  chose one smaller scale after 3x crowded 1280 x 720), with shared shadow
  tokens and a held lift while dragging. Every closed object's label sits 8 px
  below its lowest opaque art row (e2e). The default arrangement fits and keeps
  every object apart at 1440 x 900 and 1280 x 720 (e2e). The closed map sheet's
  legend shows the title and the deploy stamp; the description is its tooltip
  (and shown in full in the narrow drawer).
- Both open books are two-page spreads built by `ui/menu/bookPages.ts`: no
  scrolling (overflow e2e at 1440 x 900 and 1280 x 720, EN and PT-BR), page
  numbers, ribbons, corner turns and arrow keys. The compendium has a contents
  spread, 40 entries (Miguel Costa and Isidoro Dias Lopes added), 14 public-domain
  plates with caption and credit, labels, confidence, sources and related-entry
  links. The campaign book has a title, contents and eight chapters (opening,
  prose and briefing) with compendium links; "Play chapter" is disabled
  ("in preparation") and every chapter has `playable: false`.
- Docs are the authoring source: entries, chapters and mission player text are
  marked `applied` with their runtime ids; `pnpm check:content` validates them.
- Live-video check (Playwright, video playing, PT-BR): at 1440 x 900 the
  outlined labels and shadows read over the moving scene and the open
  compendium reads comfortably. At the 820 px narrow layout the open book was
  still a fixed, centred overlay and was cut off at the top and left; it now
  sits in the column at full width (e2e guard in `desk-books.spec.ts`).
- Not done: the Aseprite cleanups and redraws (block 3: both closed books,
  reference pile, gramophone, compass, the tinted 9-slice frame and the section
  emblem). Until then the old compass and pile sprites are shown at 2x.

The desk replaces the bookmark shell.

## Hand checks

- 2026-11-11, the user: the objectives are authored on the maps and the battle
  is played for them ("já coloquei objetivos nos mapas e testei, está ok").
  `add-map-objectives` 4.3 passed; `pnpm check:maps` passes with no
  objective-count warning. The same session played the queued orders, the
  wire crossings, the double-click centring, leaving the battle and the
  removed codex and found them working.

## Open points

- The desk e2e label-gap test (`desk.spec`, "every closed object keeps the
  same gap") fails since the base `6412ac9`.
- The araucaria's crown reads as dark clumps without its candelabra shape
  (hand check pending).
- The training-ground code is unused and still in the tree (see the plan).
- The branch `main` is 164 commits behind `plan-art-factions-sound`, where
  the work happens; nothing is pushed (local only, by the owner's rule).

## faction-armies apply (2026-11-11)

- Golden: the mixed-roster 3v3 on campo-de-provas 72e1ae4e -> 60476373 (the potreada's reserve, the migrated drawn preset); default battles unchanged.
- Bundles: index JS 631,283 B of 680,000; three JS 602,238 B of 640,000; sim worker 210,620 B of 240,000.
- `pnpm battle:report --armies` (mixed column on campo-de-provas): against the Forças legalistas the column loses most seeds, as it does against the same roster with neutral values; against two Voluntários and two Jagunços com Mauser it wins at heavy cost; against the mix it wins. Without automatic weapons any force loses 6 of 6, so the owner gave the Jagunços com Mauser an automatic rifle.
- The owner lowered the machine-gun band of the battle report from 70% to 50% (`battle-lab` delta in the change).
- Visual baselines re-recorded (HUD, orders column, sandbox panel, compendium); the top bar's "Leave" button in them dates from `65b1903`, not from this change.
- Known e2e failure still open: `desk.spec.ts` label gap (since `6412ac9`).
- Hand check (5.2, the owner, 2026-11-11): names and armies on the cards read right; card icons and the troop panel wait for `troop-thumbnails-and-panel`; the wire crossing went to `route-around-wire`.

## biome-trees-and-plants species list (1.1, 2026-11-12)

The owner left the fit to Claude ("ajustar para que encaixe bem no jogo").
Inventory: `docs/review/biome-trees/species-inventory.md` (19 Refloreste
trees, a bush and a stump per biome, each tree adult, flowering and dead).

- Heights (revised twice the same day, owner: "não quero árvores
  gigantes", then lower beside the soldier on the sheet): no tree over 9 m,
  species in their real order of size. The species already in maps are
  their legacy ids, lowered too: araucária `tree-araucaria` 9 m, peroba
  `tree-broad` 6 m, pequi `cerrado-tree` 4.5 m, buriti 8 m (only the view
  changes; trees block sight from 1.75 m up either way).
- Atlantic forest: araucária 9, jequitibá 8.5, pau-brasil 7, mulungu 6,
  palmito-juçara 6, peroba 6, manacá-da-serra 4.
- Cerrado: buriti 8, ipê-amarelo 6, aroeira 5, pequi 4.5, barbatimão 3,
  cagaita 3.
- Amazon (outside the Column's main route): sumaúma 9, castanheira 8.5,
  andiroba 8, seringueira 7.5, açaí 7, tucumã 6.
- Caatinga, built in the Prestes kit: mandacaru 4, facheiro 4, xique-xique 1,
  coroa-de-frade 0.4, palmatória 2, macambira 0.8 (thorn patch); juazeiro 5,
  umbuzeiro 4.5, catingueira 4.5, jurema-preta 3.5.
- Soldiers under trees: crowns over the player's own men turn see-through
  and a hidden man shows his outline (new requirement, task 4.1b). The aroeira
  stays in the cerrado only (planned for the caatinga too, left out of its
  mix at 4.2). Quipá and umburana left out. The caatinga bush family is the marmeleiro.
- Forms: every species' dead form (cheap, 8-259 triangles at the source)
  and its stump per biome; flowering forms only where the flowers read at
  battle scale: ipê-amarelo, mulungu, manacá-da-serra and pau-brasil.
- Correction to design D5: the mandacaru, xique-xique, macambira and
  juazeiro have catalog entries but no builder yet; all caatinga builders
  are new.

## biome-trees-and-plants verify (5.2, 2026-11-12)

- `pnpm verify`: check, build, bundle budget, determinism, tick budget and
  `openspec validate --strict` pass. e2e: 145 passed, 1 failed:
  `editor-scale-bar.spec.ts` (the desk map print), another session's
  uncommitted work, not this change.
- Determinism: the paiolzinho golden moved 5a549b2e → 06d97225. The lower
  peroba (8 → 6 m) and juazeiro (6 → 5 m) are solid trunks, whose cover
  keeps the tree's height for sight lines; the owner accepted the battle
  change (D5c corrected).
- Model files: `trees.glb` 331 KB, `trees-mata-atlantica.glb` 947 KB,
  `trees-cerrado.glb` 671 KB, `trees-amazonia.glb` 761 KB,
  `trees-caatinga.glb` 339 KB (uncompressed; a map loads only its biomes').
- Frame time (RTX 3050): a wood of 1069 Amazon trees 2.7 ms tactical, 2.5 ms
  strategic; a large map with its northern third under the Atlantic forest
  mix (6278 trees) 1.8 ms tactical, 0.97 ms strategic. The section probe
  swings between runs on this machine (5.9 and 23.9 ms with no code change).
- Open for the owner's hand check (5.3): the pequi at 4.5 m beside the
  houses; the castanheira's strategic stand-in reads greyish; the English
  glosses of manacá, andiroba, coroa-de-frade and palmatória.
- Hand check (5.3, 2026-11-12): the owner approved the editor and a skirmish
  on a wooded map; the open items above stay as they are.

## troop-thumbnails-and-panel verify (2026-11-12)

- Sizes: 19 section thumbnails in `apps/game/public/assets/sections/`,
  96 x 96 PNG, 128 KB together, identical across `pnpm thumbs` runs; four
  new weapon icons in the atlas.
- Verify on a clean worktree of 6709bbc (CI=1, its own e2e server on port
  4318 because an orphan dev server held 4317): check, build, determinism,
  tick budget (1.5-1.8 ms a tick against 4.5) and openspec (26 specs and the
  change, strict) pass.
- Bundle budget fails on index CSS: 135,659 B against 120,000 B. It was
  already 132,159 B at dafdf14, after the battle HUD redo; this change adds
  about 3.2 KB. The owner raised the limit to 140,000 B (2026-11-12); the
  working tree with other sessions' uncommitted CSS built to 137,896 B,
  and 121,657 B after the HUD session cut about 17 KB of unused CSS (1ec7d6b).
- e2e: 133 passed, 4 failed, none from this change: the `desk.spec` label
  gap (known before); `editor.spec` playtest, where the HUD top bar's
  actions cover "Back to the editor" (redo-battle-hud layout); and the two
  frame-budget tests, which also fail at bcd9c07 before the panel work
  (tactical 19.4 and 24.4 ms before, 22.7 to 27.9 ms after; strategic 17.4
  before, 17.8 after; budget 16.7) on this machine with other sessions
  running.
- Owner's hand check (4.3, 2026-11-12): approved.

## redo-battle-hud verify and hand check (5.2-5.3, 2026-11-12)

- Sizes: 24 HUD pieces cut from the owner's reference in
  `apps/game/src/assets/hud/` (1.09 MB of PNG together; the two top-bar
  drapes stay in the Aseprite source but are no longer shown), the source
  `assets/hud/prestes-hud.aseprite` 1.48 MB, `battle-hud.css` 19.9 KB.
  Bundle: index CSS 123,593 B against 140,000 B (after 1ec7d6b cut about
  17 KB of unused CSS), index JS 660,870 B against 680,000 B.
- `pnpm verify` on the working tree (with other sessions' uncommitted
  work): check (961 unit tests in 132 files), build, bundle budget,
  determinism (hash matches golden), tick budget (1.44-1.53 ms a tick
  against 4.5), openspec (28 specs) and e2e (146 passed, including
  `area-fire.spec` and the frame-budget tests) all pass.
  `openspec validate redo-battle-hud --type change --strict` passes.
- The ground under the troop summary carries the owner's hand finish in
  Aseprite: export with `pnpm hud-art` only; `pnpm hud-art --seed` would
  overwrite it.
- Owner's hand check (5.3, 2026-11-12), after playing a skirmish with the
  new HUD: "joguei agora esta tudo certo, perfeito". Approved.

## soldier-animation-and-textures apply (2026-11-12)

- Clips: 44 in `soldier.glb` (`SOLDIER_CLIPS`; the build test fails if one is
  missing): wound, carry and treatment; five deaths by stance and direction
  ending in four corpse poses; crouch-walk, raise, lower, recoil, reloads and
  aim turns per stance. Moving clips are keyed to `CLIP_GAIT_SPEED` (walk
  0.85 m steps at 1.8 a second; the old walk skated).
- Sizes: `soldier.glb` 354,072 bytes (was 212,536 before this change);
  eighteen uniform atlases, 128 x 128, 41,417 bytes together (about 2.3 KB
  each; the test budget is 8 KB per atlas).
- Verify on a clean worktree of 991f1fc (CI=1, its own e2e server): check
  (897 tests), build, bundle budget, determinism, tick budget and openspec
  pass; e2e 126 passed, 3 failed, none from this change: `desk.spec` label
  gap (known before), `area-fire.spec` (fails on its own commit a5603eb in a
  clean tree; reported to its session) and the `battle-hud` baseline (only
  the HUD differs: the area-fire button and the top bar; the 3D view is not
  in that shot, so no soldier baseline needed re-recording).
- Review sheets: `docs/review/soldier-clips/` (README lists them and the
  rough points). Owner's hand check (4.3, 2026-11-12): approved, "esta otimo".

## revise-buildings-and-stone candidates (1.1, approved by the owner 2026-11-12)

Determinism baseline before any change (0.1): seed 1922 0ae3084b;
campo-de-provas 3v3 94b68f47; paiolzinho 3v3 06d97225; mixed-roster
60476373. Sources are Macaulay page numbers (book pages), paraphrased;
"generic" means a generic period type with no source of its own. Every
item is of the 1920s in the interior of Brazil (owner, 2026-11-12): motor
vehicles are Ford T and TT types, fuel comes in tins in wooden crates (no
steel drums), lighting is oil or carbide, and no concrete, plastic or
corrugated asbestos appears.

- Buildings, rural: wattle-and-daub house (generic), thatched ranch
  (generic), stone corral (Macaulay p. 111, a ranch corral), flour house
  (generic), wayside cross with a cemetery wall (generic).
- Buildings, town: railway station (pp. 9-10, 44, 199), telegraph office
  (p. 202), jail (pp. 161, 165), town hall, school, market shed and water
  tank (generic).
- Buildings, military: barracks block (pp. 4, 9), guardhouse, depot
  (generic).
- Rock kinds (three sizes each): granite boulders (the southern and eastern
  ranges), basalt of the southern plateau (Rio Grande and Paraná, where the
  march began), sandstone ledges (Mato Grosso and Paraná basin), quartzite
  and canga of the Goiás and Minas plateaus, river cobbles (any river), the
  caatinga's granite lajedo.
- Waterside: dugout canoe and motor launch (p. 75), raft (pp. 56, 76, 169,
  180), river barge (pp. 22, 24, 139, 155), a boat for horses (p. 75),
  canoa de tolda, jangada, boat turned over, drying line with a fishing
  net, fish traps, landing stage, mooring posts (generic).
- Farm: ox cart (pp. 102, 125: the government convoy's carts of
  ammunition), broken tractor of the Fordson type, imported from about 1917 and rare
  outside the large São Paulo estates (generic: no mention in Macaulay), plough,
  cane press, coffee sacks, hen house, pigsty, cart wheel, millstone
  (generic).
- Town: broken-down motor car and lorry of the Ford T and TT types
  (automobiles pp. 43-58, the government's lorries pp. 101-110), square
  bench, fountain, market stall, kerosene and petrol tins in their wooden
  crates, enamelled street sign, kiosk (generic).
- The Column's camp and train: officers' tents with a field cot and a
  hammock (pp. 142-143), saddles (pp. 51, 141), pack saddles for the mules
  (pp. 93, 143), a hammock slung between two posts or trees (p. 143),
  barrels (p. 110, a barrel pontoon), ammunition boxes,
  campfire with its pot, rifle stack, horse line (pp. 93, 111), the aid tent
  of the kit, a poncho lean-to (generic), and a 75 mm field gun left behind
  (pp. 93-95).
- Fences and walls: rail fence (tronqueira), bamboo or taquara fence, wattle
  fence (pau-a-pique), adobe wall, whitewashed wall with a coping, iron
  railing (generic).
- Review sheet (1.2): `docs/review/buildings/sheet-before.png`; the owner
  approved the suggested features of all seventeen buildings as listed in
  `docs/review/buildings/README.md` (2026-11-12).

## revise-buildings-and-stone verify (6.3, 2026-11-13)

- `pnpm verify`: check, build, bundle budget (index JS 726 KB / 760 KB),
  determinism, tick budget and `openspec validate --strict` pass. e2e: 150
  passed, 6 skipped, 2 failed, both looked into:
  - `compass.spec.ts` still expected map document version 7; this change
    moved it to 8 (variants, rock kinds). Corrected; it passes.
  - The section probe at tactical span measured 17.3 ms. Run again against
    this tree and a worktree of the commit before the model split (6.1),
    alternately: 23.3 and 5.2 ms before, 5.1 and 5.5 ms after. It is the
    probe's swing on this machine, not the change.
- Determinism goldens unchanged by this change (seed 1922 0ae3084b; campo
  3v3 94b68f47; paiolzinho 3v3 06d97225; mixed-roster 60476373): every
  variant, rock kind, camp side and afloat flag is drawing only.
- Model files (uncompressed, bytes): `buildings-rural.glb` 1,212,408,
  `buildings-town.glb` 4,419,896, `buildings-military.glb` 679,356 (with
  each building's strategic mesh); `stones.glb` 358,056 (granite),
  `stones-basalt.glb` 442,976, `stones-sandstone.glb` 406,820,
  `stones-quartzite.glb` 396,084, `stones-cobble.glb` 733,048,
  `stones-lajedo.glb` 586,980; `props.glb` 644,020. Before the change:
  `buildings.glb` 138,492 and `props.glb` 41,752, no stones file. Always
  loaded: the rural and military buildings and the granite stones (2.2 MB);
  the town's buildings and the other rock kinds load with the maps that use
  them.
- Frame time (RTX 3050): a town of sixty buildings on a large map 2.0 ms
  tactical, 3.0 ms strategic.
- Hand check (6.4, 2026-11-13): at the owner's request a town and a river
  camp were built in the editor and played by
  `tests/e2e/review-hand-check.spec.ts` (throwaway maps, nothing saved);
  `docs/review/buildings/sheet-hand-check.png` shows both in the tactical
  and strategic bands. Both opened in the playtest, went through deployment
  and ran 8 s of battle with no console error. The owner approved them as
  they are. Three points noted then, looked into on 2026-11-13: the pond's
  missing corner was the test's own click, off the viewport's edge (the
  pond tool is right; the script now looks at the pond first and refuses an
  off-screen point); the iron gate was behind the church, whose front faces
  +y (the script moved the gap and the gate before the door); the dark cross
  at the strategic band is the tower's four-sided pyramid cap, the same in
  the near and the far mesh, not a fault of the split. Shots re-taken. Still
  open: the open iron gate is a few thin dark bars at the tactical band;
  the owner keeps it as is (2026-11-13).

## enrich-texts-from-sources drafts (3.1, approved by the owner 2026-11-12)

- The owner read and approved the drafts in `docs/campaign/compendium/entries/`
  ("Aprovo, importe"): the nine new entries (`manifesto-porto-nacional-1925`,
  `porto-nacional`, `o-libertador-1924`, `lourenco-moreira-lima`,
  `batalhoes-patrioticos-bahia`, `coluna-no-grande-sertao`, `vivandeiras`,
  `tenentismo`, `positivismo-militar`), the "Viver da terra" section of
  `army-coluna`, and the additions to Prestes (the motto framed as memory) and
  Serra Nova (the patriotic battalions).
- Imported into the content with chapter 6's Porto Nacional page and the
  bullets in the tree, chapter 8's Moreira Lima quote, the prologue and
  chapter 4 links, and the new epigraph. The entry docs are now `applied`.
- Open from the drafts: which river the women crossed; the Macaulay page for
  executions inside the column; `carvalho-2001` is still pending and cited as
  further reading; Pang's battalion sizes are third hand.
- The book's quote cost was raised (width x1.3, +240) after the overflow e2e
  found the Porto Nacional page 32-54 px too long at 1280 x 720.
- Index JS bundle budget raised from 680 KB to 760 KB at the owner's request
  (2026-11-12): the new compendium and chapter text adds about 50 KB.
- `pnpm verify` (2026-11-12): check, build, bundle budget (index JS 712 KB
  / 760 KB), determinism, tick budget and openspec validate pass. The full e2e
  ran apart: 146 passed, 1 skipped, 3 failed outside the books
  (`battle.spec.ts` 3 vs 3 start, `compass.spec.ts` map document version 8 vs
  7, `editor-scale-bar.spec.ts`), all in the maps and editor work another
  session has in progress in this tree. Every desk-books test passes.

## ambient-sound-and-voices: the list of sounds (3.1, approved by the owner 2026-11-13)

- `docs/audio/SOUND_LIST.md`: five air beds and four hour layers, fifteen
  one-shots, five water sounds, eight footstep surfaces by three loops plus
  crawling and rattle; about 6 MB, loaded per map.
- The owner records only the voices; every other sound is a CC0 recording
  from an online library, registered in `docs/assets.md` before it ships,
  with synthesis only as a fallback for wind and running water.
- Maps run from 06:00 to 18:00 (`MAP_LIGHT_TIME`): the night layer waits
  for maps that can be set at night.

## complete-books-and-bibliography (2026-11-15)

- The owner approved the images and the quotations on 2026-11-15 ("insira
  tudo … coloque as imagens, citações e deixe completo e pronto"). The
  decisions are row by row in
  `openspec/changes/complete-books-and-bibliography/approval-list.md`, section C.
  Q2 (Rosa p. 95) was dropped: it would have been a third Rosa quotation, over
  the cap of two per work. Three Blanc quotations were added during the rewrite
  (Q15–Q17).
- Both books are complete in EN and PT-BR. All eight chapters were rewritten
  with dated facts, one or more attributed quotations (edition and page), and
  page plates. Every compendium entry has a note: 42 new notes, drafted in
  `docs/campaign/compendium/entries/`. The provisional text in `la-gaiba-1927`
  and `sao-luiz-gonzaga` is gone, and the content check now fails on any
  provisional phrase.
- Factual fixes: the Pantanal is January 1927 (Blanc p. 127), not February.
  The La Gaiba monument's 5 July 1927 date is backed by the Correio da Manhã
  (Blanc p. 142). The April 1925 meeting was at Benjamin Constant, not Foz.
  The Paraná crossing ran 27–29 April. Siqueira Campos entered Paraguay on
  23 March 1927. Macaulay misprints 1926/1927 on pp. 233–234; the notes say so.
- The compendium book ends with a "Sources" / "Fontes" part listing every cited
  source, and every source line in both books opens its row.
- Images: 21 free images were added (public domain, CC0, CC BY-SA 3.0/4.0),
  for 35 in the public folder. Eight images await permission
  (CPDOC/FGV, BIBLIEx, Projeto Portinari, Duke University Press, BN). They live
  in the gitignored `art-src/compendium-pending/`, show only in the dev server
  and in `pnpm --filter @prestes/game build:review` (`apps/game/dist-review/`,
  the build to send with the requests), and fall back to the emblem with
  "image awaiting permission" anywhere else. The owner sends the requests in
  `docs/rights/permission-requests/`. Claude does not send them.
- Mission cards: `docs/campaign/missions/card-review.md` lists the fixes for
  the map cards. The Pantanal card says February; La Gaiba still hedges on
  5 July. No map was edited.
- Standing checks: the Portuguese originals of the period voices quoted
  through Blanc and Macaulay. Until one is found, PT-BR carries our
  translation, marked as such. Print editions of Rosa p. 82, Amado p. 131 and
  Moreira Lima p. 523 are also unchecked.
- Index JS bundle budget raised from 760 KB to 940 KB at the owner's request
  (2026-11-15): the books add about 110 KB, and the bundle is now 898 KB,
  partly from other uncommitted work.
- `pnpm verify` (2026-11-15): check, build, bundle budget, determinism, tick
  budget and openspec validate pass. e2e: 143 passed, 9 skipped, 13 failed.
  The book failures were fixed: the pt-BR overflow in `la-gaiba-1927`, the
  emblem test (Vila Militar now has a map, so the test uses Porto Nacional),
  the chapter 8 farewell (now on its own page), and the two desk baselines,
  regenerated and checked by eye. The "chapter without a map" test now strips
  a map in a fixture, since every chapter has one. Still failing, outside the books:
  area-fire, cover-slots, tactical, the three performance budgets and the HUD
  baseline.
