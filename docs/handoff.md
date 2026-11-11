# Handoff: seven planned changes, `faction-armies` next

Written 2026-11-11 so any agent (or another AI model) can pick the work up
cold. Keep this file current as tasks close; update START HERE after each
task and delete the file once the last of these changes is archived.

## START HERE

- **Branch `plan-art-factions-sound`**, working tree clean, same commit
  line as `main` plus the planning commits. The old branch
  `refine-battle-maps` still exists at an older commit and is not used.
- **Nothing in the game changed in the planning session.** The only code
  changes of 2026-11-11 are the fog fix for defend and ambush, the test
  runner settings and the bundle budgets, all on `main` and described in
  `docs/status.md` ("Fixes of 2026-11-11").
- **NEXT STEP: `faction-armies` task 2.1** (the army registry and `army` on
  units). Tasks 1.1 to 1.4 are done: the research is in
  `docs/history/FORCES.md`, the owner approved the catalog, and the
  `force-roster` deltas are written. Read, in this order:
  `openspec/changes/faction-armies/catalog-proposal.md` (the approved
  table and the owner's five decisions), `design.md` (D1 two sides and three
  armies, D5 no new map field, D6 the successor table), `tasks.md`.
- The owner has **not** asked for the implementation yet. His last word was
  "prepare todas as tasks e handoff". Start task 2.1 only when he asks.

## Rules of this repository

- Reply to the owner in PT-BR; code, comments, docs, specs and commits in
  English. Commit messages follow the recent log (`feat(scope): …`,
  `fix(sim): …`, `docs(openspec): …`) and end with the co-author line the
  session gives.
- Read `AGENTS.md` and `.gs42/standards/AGENTS.md` first. OpenSpec is the
  plan of record: propose is planning only, apply implements, archive syncs
  the specs. Never hand-create a change directory.
- The project is local only: no remote, no push, no Pages. Do not merge,
  rebase or force-push without the owner's word. Commit small steps; the
  owner authorized commits and the fast-forward of `main` on 2026-11-11 for
  that session's work, not as a standing rule, so ask before moving `main`
  again.
- **Battle maps are the owner's hand work.** Never generate a map, never
  hand-write one in code, and never paint in the editor inside the shared
  preview pane (its autosave overwrites his map). Verify editor work with
  Playwright. Test-only maps built in code (`packages/simulation/test/
  open-field.ts`) are fine.
- Mute the game (`prestes.audio.v1`) before using the preview pane, unless
  the task is to listen.
- The simulation and the kernel import no Three.js, React, DOM, Node or
  wall-clock time (ESLint enforces it). Every player string goes through the
  locale catalogs, EN as source, PT-BR alongside.
- Book scans and OCR under `livros/` are never committed or quoted; notes
  are paraphrases with page numbers (PDF page = book page + 16 for
  Macaulay). Historical claims need a row in `docs/history`.
- The Refloreste project (`C:/projetos/Refloreste`) is the owner's own
  work; its models may be adapted without asking about the licence.

## Gates and how they behave on this machine

- `pnpm check` (typecheck, lint, unit tests, locales, content, maps): about
  six minutes. The unit run uses a third of the logical cores
  (`PRESTES_TEST_WORKERS` overrides); do not run other heavy work beside it.
- `pnpm verify` adds build, bundle budget, determinism, tick budget,
  `openspec validate --specs` and the e2e suite: about twenty-five minutes.
  Run it in the background and wait for it.
- Known failures, not to be "fixed" by loosening a test:
  - `tests/e2e/desk.spec.ts`, "every closed object keeps the same gap…":
    fails since the base `6412ac9` (the map sheet's label gap is 20 px, the
    others 8 px). Open point for `polish-menu-desk`.
  - `tests/e2e/performance.spec.ts`, tactical frame budget: can fail at the
    end of a loaded `pnpm verify` (23.7 ms against 16.7 ms on 2026-11-11)
    and passes alone. Re-run it alone before believing it.
- A simulation change that moves a golden is re-recorded with
  `pnpm check:determinism --update` and named in the commit message. The
  current goldens are in `tools/determinism-golden.json`.
- Bundle budgets (`tools/bundle-budget.json`): worker 206 KB of 240 KB,
  index JS 604 KB of 680 KB. Art and audio files are not in these budgets;
  the art and sound changes define their own.

## The changes, in the order they should land

`openspec list` shows them. Each has `proposal.md`, `design.md`, specs and
`tasks.md`; every one passes `openspec validate <name> --type change
--strict`. Every `tasks.md` (but `faction-armies`, already started) opens
with a task 0.1 of prerequisites.

| Order | Change | Tasks | State | Needs from the owner |
| --- | --- | --- | --- | --- |
| 1 | `faction-armies` | 4/18 | planning done, code not started | the go-ahead; the hand check (5.2) |
| 2 | `soldier-animation-and-textures` | 0/16 | planned | review of the clip and uniform sheets (4.1), the hand check (4.3) |
| 3 | `troop-thumbnails-and-panel` | 0/15 | planned | the hand check (4.3) |
| 4 | `biome-trees-and-plants` | 0/18 | planned | the species and caatinga list (1.1), the review sheet, the hand check (5.3) |
| 5 | `revise-buildings-and-stone` | 0/19 | planned | the lists of new buildings and rock kinds (1.1), the marked sheet (1.2), the hand check (5.4) |
| any time | `ambient-sound-and-voices` | 0/19 | planned | the sound source list (3.1), the review of the Portuguese lines (5.1), **the recordings** (5.6), the hand check (6.3) |
| on hold | `add-field-manual` | 0/11 | proposed, the owner said "not yet" | the go-ahead |
| the owner's | `polish-menu-desk` | 31/35 | four Aseprite redraws left (both closed books, the reference pile, the gramophone) | the drawings |

Dependencies: uniforms (2, section 3) need the armies (1, section 2);
thumbnails (3, section 1) need the uniforms and the full type list, but the
thumbnail tool and the troop panel can be built first and the pictures
re-run. Trees (4) and buildings (5) depend on nothing else and not on each
other. Sound touches only the client and can run beside any of them.

Two of them touch the same large file: 4 and 5 both take drawing code out
of `packages/view3d/src/battle-map-layer.ts` (1,375 lines). Do not run them
at the same time in one tree. 1 and 3 both touch `RosterBuilder.tsx` and
the section cards; do 1 first.

## What each change decided (so it is not re-litigated)

**faction-armies.** Two sides, three armies: the Coluna Prestes (player),
the Forças legalistas and the Batalhões patrióticos, both enemy. Approved
types: column 8 (Comando do destacamento, Fogão, Meio fogão, Fogão com
fuzil-metralhador, Guarnição de fuzil-metralhador, Peça de metralhadora,
Potreada, Veteranos gaúchos); legalists 6 (Comando de companhia, Infantaria
do Exército, Brigada Militar, Provisórios, Peça de metralhadora, Guarnição
de fuzil-metralhador); patriotic 5 (Chefe e capangas, Jagunços, Jagunços
com Mauser, Voluntários, Cangaceiros). Only the Brigada Militar among the
state forces. Cangaceiros are in, labelled dramatized, at most one section,
naming no person. Hollow-nosed bullets are out. No ammunition handicap: a
difficulty selector is a later change. A section id names its army, so
enemy presets need no new field; the column keeps its seven present ids
and old enemy presets and stored rosters go through a successor table. A
player-built enemy roster is of one army; only map presets mix.

**soldier-animation-and-textures.** Animation stays script-built
(`art-src/blender/target_soldier.py`), no hand animation, no new mesh. No
simulation change. Variety (corpse pose, uniform variant) comes from the
soldier's id, never from `Math.random`. Restraint in showing the dead and
wounded; the same for every army.

**troop-thumbnails-and-panel.** The owner chose thumbnails **rendered from
the 3D model**, built ahead by a tool and committed, not rendered at run
time and not hand-drawn (a hand-drawn portrait can replace a file later).
The troop panel becomes one row per soldier with words, labelled bars,
named gauges and alerts; bands come from shared data.

**biome-trees-and-plants.** The whole Refloreste suite (Atlantic forest,
cerrado, Amazon: nineteen species, bushes, stumps, dead and flowering
forms). Refloreste has no caatinga: cacti and caatinga plants are authored
in the Prestes kit. Present tree ids stay as aliases so saved maps and
goldens do not move. Bushes conceal by height and stop no bullets.

**revise-buildings-and-stone.** Every building modelled; the art build
reads the battle's doors and windows from shared data
(`packages/shared/src/maps/openings.ts`) so the model and the battle agree.
The present buildings' openings do not move. Variants change only the
drawing. A stone's cover depends on its size, never on its rock kind.

**ambient-sound-and-voices.** Sound belongs to what is near the point the
camera looks at; the commander's order and the section's answer are the
exception: full level, never attenuated, and they lower the rest. Enemy
footsteps play only for enemies the player's side sees. The enemy is heard
as shouts without words. Speech is Portuguese, recorded by the owner from a
generated script (`docs/audio/VOICE_SCRIPT.md`); a line with no recording
is silent; captions are on by default in English. Client only: no golden
moves.

## Research state (`docs/history/FORCES.md`)

Macaulay only, from the text layer; pages were checked against the running
heads, not against the page images. Blanc and the regional studies were not
read. Open in `docs/campaign/open-questions.md` ("Forces"): the Portuguese
names of the state forces other than the Brigada Militar, of the
provisionals and of the federal light infantry; the uniforms of the federal
army and the state militias; small-unit make-up; the strength of a
Patriotic Battalion. Until a source answers them, those names and uniforms
are game organization or placeholders and must be labelled so
(`armies` spec, "Period names").

## Leftovers nobody owns yet

- Unused training-ground code is still in the tree
  (`packages/shared/src/training-ground.ts`,
  `packages/view3d/src/training-layer.ts`, the `training_phase` and
  `despawn_role` commands). The dropped `video-tutorial-manual` was going to
  delete it. It needs its own small change.
- The worktree `.claude/worktrees/eloquent-feistel-ff9afe` (branch
  `claude/eloquent-feistel-ff9afe`, one commit, `fee3ea3`, the machine gun
  work). Its content appears to have landed through `fd19887`, but that was
  not proved commit for commit; do not delete it without the owner's word.
- The fog fix changed the HUD's order preview for defend and ambush
  (`packages/shared/src/preview.ts`); it has no test of its own and was not
  looked at in the browser.
- The araucária's crown (open point since 2026-11-09) is closed by
  `biome-trees-and-plants` 2.1.
- The owner's wish for later: each map as its own object on the desk
  instead of the sheet fan.

## How to work a task

1. `openspec instructions apply --change "<name>" --json`, then read the
   change's files and the task's "verify" clause.
2. Do the task as one vertical slice with its test; run the checks the task
   names, then `pnpm check`.
3. Tick the task in `tasks.md` and add an "Apply note (date): …" under it
   with what was done, what was measured and what was not verified.
4. Commit. Update START HERE in this file and the row in `docs/status.md`.
5. A task that says "the owner approves" or "hand check" stays open until
   he answers; put the question to him plainly and go on with tasks that do
   not depend on it.
