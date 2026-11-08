## 0. Prerequisites

- [ ] 0.1 Archive `retire-bootcamp` and `add-battle-maps` (verify: `openspec validate --specs`; `openspec list` shows neither in flight)

## 1. Remove the training-ground course

- [ ] 1.1 Delete `training-ground.ts`, `TRAINING_TERRAIN`, its tests and exports; the engine's `map` option keeps only the training kit; tests that used the ground move to the kit or a battle map (verify: typecheck; `pnpm test`; sandbox golden unchanged)
- [ ] 1.2 Delete `training_phase` and `despawn_role` commands, `UnitRole`, `updateInstructorFollow` and their tests (verify: typecheck; `pnpm test`; all goldens unchanged)
- [ ] 1.3 Delete `TrainingLayer`, the `trainingField` and `trainingMarkers` scene and canvas options and the training camera focus (verify: typecheck; `pnpm e2e` smoke)

## 2. Lesson scenario and data

- [ ] 2.1 Engine `scenario: 'lesson'`: battle map, no starting units, no enemy commander, fog off by default, sandbox on; dev bridge `startLesson(map)` (verify: unit test that a lesson engine starts empty and accepts spawns; determinism test of a 300-tick scripted lesson)
- [ ] 2.2 `lessons.ts` types and the step resolver (`{ squad: n }` → ids after spawns); a pure function `stepsDue(lesson, tick)` (verify: unit tests for resolution and ordering)
- [ ] 2.3 The ten lessons: scripts, cues, texts (PT-BR and EN, cues ≤ 90 characters), map and topics; content check of completeness (verify: `pnpm check:content`; `pnpm check:locales`)
- [ ] 2.4 Lessons 11-13 (deployment with trench lines, objectives, entering and assaulting positions), recorded once `add-deployment-phase`, `add-map-objectives` and `garrison-and-assault` are archived (verify: `pnpm check:content`; the recorder produces the three videos)

## 3. Recording tool

- [ ] 3.1 Dev-only `LessonOverlay` in the view: pixel cursor, click ripple, ring and arrow highlights driven by the bridge (verify: e2e shows the cursor and a ring through the bridge; overlay absent in production build)
- [ ] 3.2 `tools/record-lessons.ts`: 640 x 360 recording, scripted stepping, hashes file, still, `.vtt` per locale, budget check; `pnpm lessons:record` (verify: recording lesson 1 twice gives identical hashes files; budget check fails a forced 60 s script)
- [ ] 3.3 Record the ten lessons headed; commit videos, stills, captions and hashes; asset register entries (verify: content check of files and budgets; `docs/assets.md` lists the lesson media)

## 4. Manual in the book

- [ ] 4.1 Manual bookmark and contents spread with ticks; marks order Campaign, Manual, Skirmish, Compendium, Options; keyboard navigation (verify: e2e opens the Manual and lesson 8; start-screen e2e updated)
- [ ] 4.2 Lesson spread: text, map name, Experimentar, Sumário; corners and arrows turn lessons (verify: e2e "turn the pages")
- [ ] 4.3 `LessonVideo`: plate, controls, muted default, captions in the book's typeface from the active track, locale switch, fallback to still and text, `ended` marks watched (verify: e2e "captions follow the language"; e2e with a missing file shows the fallback; unit test of progress storage)
- [ ] 4.4 Experimentar opens the skirmish with the lesson's map; Menu from the battle end returns to the lesson (verify: e2e "try the crossings" and the return)
- [ ] 4.5 Campaign page text and entries (Manual, Skirmish) in PT-BR and EN (verify: locale check; start-screen e2e)

## 5. Close

- [ ] 5.1 Visual baselines for the Manual contents and a lesson spread (verify: `pnpm e2e` with refreshed snapshots reviewed)
- [ ] 5.2 Gates: `pnpm verify`, `pnpm e2e`, `openspec validate video-tutorial-manual --type change --strict` (verify: all pass)
- [ ] 5.3 Hand check by the user: watch three lessons in each language and try one; findings in `docs/status.md`
