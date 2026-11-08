## Why

The bootcamp was retired (2026-11-05) because seven stations on the Vila
Militar ground were too long and too complex for what they taught. The user
asked for the teaching to move to short videos and a section of the book
menu, built on the three new battlefields. The campaign page now says the
manual is "in preparation"; this change delivers it, and removes the
simulation's training-ground course that nothing uses any more.

## What Changes

- **A Manual bookmark in the book menu**, between Campaign and Skirmish.
  Each lesson is a spread: a short localized text on the left page, a
  pixel-filtered video plate on the right with play, replay and pause, and
  an "Experimentar" action that opens the skirmish page with the lesson's
  map chosen.
- **Ten lessons** on the three battlefields, 20-45 s each:
  1. Selecionar e mover (Fazenda)
  2. Postura e ocultação: o canavial (Fazenda)
  3. Fogo apontado e supressão (Fazenda, trenches)
  4. Cobertura e posições (Bairro, walls and corners)
  5. Avançar por lanços, flanquear (Bairro)
  6. Defender e emboscar (Fazenda)
  7. Relevo e linha de visão (Serra e Rio)
  8. Travessias: vau, ponte e balsa (Serra e Rio)
  9. Neblina de guerra e o "?" (Serra e Rio)
  10. Feridos, moral e retirada (Bairro)

  Lessons added by the plan of 2026-11-08, for what lands before this
  change: 11. Desdobramento: posicionar antes da batalha (Fazenda, trench
  lines); 12. Objetivos: tomar e segurar (Fazenda); 13. Ocupar e assaltar
  posições (Bairro).
- **Videos recorded from the game itself** by a deterministic tool: each
  lesson is a script (map, units, camera moves, orders at given ticks, an
  on-screen cursor and highlights) played by the real simulation and view
  and recorded by Playwright. Re-running the tool after a game change
  re-records the videos. No voice; captions are WebVTT files generated from
  the locale catalog in PT-BR and EN and shown by the player, so the videos
  carry no burned-in text.
- **Lesson progress**: lessons watched are ticked on the Manual's contents
  page (local storage); nothing is locked.
- **Simulation clean-up**: the training-ground course leaves the code: the
  training ground map, its layer, the phase-setup and role commands and the
  instructor follow. The non-lethal fire and the dummies stay (the
  recordings use them).
- All lesson texts, captions, labels and alt texts in PT-BR and EN.

## Capabilities

### New Capabilities

- `tutorial`: the Manual section, the lesson catalog, the lesson videos and
  captions, the recording tool's guarantees, lesson progress.

### Modified Capabilities

- `simulation`: the training roles, phase setup and instructor follow are
  removed.
- `terrain`: the training ground terrain is removed.
- `presentation`: the training ground models requirement becomes a general
  environment models requirement (the Vila Militar field still uses those
  models).

## Impact

- `apps/game` (StartScreen: Manual bookmark and lesson spreads, a lesson
  video player built on `PixelVideo` with tracks, progress storage),
  `packages/content` (lesson catalog, texts, caption cues),
  `tools/record-lessons.ts` (Playwright recording, caption export),
  `apps/game/public/lessons/` (videos and `.vtt` files),
  `packages/shared` (remove `training-ground.ts`, the role and phase-setup
  protocol), `packages/simulation` (remove phase setup and instructor
  follow), `packages/view3d` (remove `TrainingLayer`), tests, asset
  register.
- Depends on `retire-bootcamp` (archived first) and `add-battle-maps`.
  Lessons 5 and 10 mention the Comando and section types only if
  `pre-battle-roster` has landed; otherwise they are written without them.
- **Player fantasy**: learning the command of a section by watching it done
  on the ground the player will fight on, then trying it at once.
- **Core loop**: Manual lesson → Experimentar (skirmish on that map) →
  back to the Manual.
- **Historical scope**: none new; lesson texts teach game mechanics and
  label any period remark as historical note with a source.
- **Multi-perspective**: unchanged; the lessons are commanded by a
  fictional tenente, never a historical figure.
- **Legal and ethical note**: videos are original recordings of the game;
  no third-party footage, music or voice; the Bairro lesson shows no
  civilians.
- **MVP**: Manual bookmark, ten lessons with videos and captions in both
  locales, Experimentar, progress, the recording tool, the training-ground
  removal.
- **Non-goals**: interactive drills with objectives (a later change),
  narration and voice, a campaign, video editing beyond what the tool
  records.
