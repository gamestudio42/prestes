## Context

See `proposal.md`. This change depends on the visual tokens and HUD primitives from
`refine-command-hud-visual-audio`; it should land after that change so the campaign
screen and mission HUD use the same controls.

The current boot camp owns a tutorial director, locale keys, checkpoints and E2E
coverage. The simulation already supports selection, movement, cover, stances,
formations and orders, so missions 1-2 can be authored on the command boundary
without new combat rules.

## Goals / Non-Goals

**Goals:**

- Establish the ten-mission campaign as the single training entry.
- Make missions 1-2 playable, resumable and acceptance-tested on the new field.
- Show the full campaign map and briefings for 3-10 while keeping them locked.
- Preserve deterministic simulation and the existing sandbox for mechanics tests.
- Reuse the HUD visual language rather than building a second UI system.

**Non-Goals:**

- Implementing missions 3-10 mechanics (targets, equipment, logistics, urban
  combat, final objective).
- Rebuilding the full 3D camp for all ten areas; only areas 1-2 are built now.
- New combat AI, economy or save/load beyond training progress.
- Copying the reference map as a raster asset.

## Decisions

- **Campaign data is content, not a second simulation.** `TrainingMission` records
  live in `packages/content`: id, number, title, subtitle, briefing, objective,
  steps, mechanics, zone, estimated time, reward, status and unlock rule. The
  director observes frames/events and never mutates health or positions.
- **One campaign capability, internal `boot-camp` name.** The player-facing title
  becomes Campanha de Treinamento; the existing capability is modified rather than
  creating a near-duplicate `training-campaign` spec.
- **Ten missions, two playable.** Missions 3-10 have complete metadata and
  briefings but `status: planned` and no mission runtime. The overview shows them
  locked; selecting one opens its briefing and a localized "not available" state.
- **Mission 1 is UI/camera only.** Steps are presentation actions: move camera
  with WASD and edge pan, zoom, rotate, select a unit, box select and select all.
  No combat, no targets, no simulation orders beyond selection.
- **Mission 2 is movement/cover/stance.** The field spawns the existing section at
  the training yard, marks three waypoints and three cover stations. Completion
  requires reaching the marked area, occupying cover and using standing,
  crouched and prone stances. No enemies or targets.
- **New field as a scene skin over deterministic covers.** The first field slice
  reuses the existing simulation cover volumes and unit spawns, arranged as a camp
  yard. Original low-poly tents, sheds, fences, poles, crates, roads and vegetation
  surround them. No new collision profile in missions 1-2; the full camp terrain
  and zones 3-10 are later work.
- **Campaign overview is original SVG low-poly art.** A React-rendered SVG map
  uses camp shapes, roads, river, trees, numbered zones 1-10, dashed tutorial flow
  and a legend. It is inspired by the reference composition, not traced or copied.
- **Mission shell.** A campaign screen opens from the start screen; selecting a
  playable mission shows a briefing, then starts the field with a compact mission
  panel (number, title, objective, hint, progress, pause/continue). The HUD stays
  the same command deck.
- **Persistence and migration.** `prestes.training.v1` stores completed mission
  ids, unlocked ids and the active mission. A one-time read of
  `prestes.bootcamp.v1` maps completed ground/field to missions 1/2; unknown or
  paused Contact values are ignored. Reset clears only training progress.
- **Testing boundary.** Unit tests cover content validity, unlock/persistence and
  mission-step evaluation. Playwright completes missions 1-2 from the campaign
  screen, verifies locked 3-10, reloads to prove resume and records a video.

## Mission catalog

| # | Mission | Mechanics | Status |
|---|---------|-----------|--------|
| 1 | Bem-vindo, comandante | camera, selection, UI tour | playable |
| 2 | Movimentação e cobertura | movement, cover, stances | playable |
| 3 | Combate básico | fire, suppression, morale | locked |
| 4 | Equipamentos especiais | grenades, mines, charges | locked |
| 5 | Flanqueamento e coordenação | flank, split, timing | locked |
| 6 | Logística e suprimentos | resupply, equipment | locked |
| 7 | Resgate e primeiros socorros | casualty, rescue, aid station | locked |
| 8 | Defesa de posição | defend, suppress, area control | locked |
| 9 | Combate urbano | buildings, windows, urban flank | locked |
| 10 | Objetivo tático final | flag capture, final assault | locked |

## Risks / Trade-offs

- **The new field is a skin, not a full camp.** → Areas 1-2 read as a camp, while
  zones 3-10 remain map-only until their missions are built.
- **Retiring the boot camp removes current chapter coverage.** → Sandbox keeps
  every mechanic testable; later missions restore directed coverage.
- **Campaign map art can become a large illustration task.** → Use reusable SVG
  shapes and a fixed 16:9 composition; no raster tracing.
- **Mission 1 can feel like a menu tour.** → Keep it short, gate it on real
  pointer/keyboard actions and show immediate completion feedback.
- **LocalStorage mismatch.** → Namespaced key, schema version and reset button;
  unknown values fall back safely.
- **HUD dependency.** → If the HUD change slips, build the campaign screen on the
  existing tokens and port the new tokens when they land; do not fork controls.
