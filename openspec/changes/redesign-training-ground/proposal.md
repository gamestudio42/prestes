## Why

The bootcamp works mechanically (all seven stations pass end to end and station 7
was finished by hand on 2026-11-04), but the user's play-through shows it does not
yet feel like the redesign agreed on 2026-11-03:

- **The map makes no sense.** Every station is crammed around two points in the
  middle of the sandbox map (`ASSEMBLY_POINT` 28,4 and `LINE_POINT` 52,-18),
  among sandbox props that belong to no place: loose logs, fences, walls and
  houses scattered over the field. Nothing reads as a training ground in Rio, and
  the player cannot see where the course goes next.
- **Soldiers look disorganized on the move.** Each soldier gets its own
  destination and path: line moves hand out slots by unit id rather than
  position, cover slots are picked greedily, and every soldier walks its own
  route. Paths cross, the section turns into a cluster while marching and sorts
  itself out only on arrival.
- **The game is slow by default.** It starts at the speed labelled 0.5x (one tick
  per 100 ms). The user wants the speed labelled 1x as the default and 0.5x kept
  only for players who want a slower game.
- The commander's orders are only text in the side panel; the plan was for the
  instructor to say them in a balloon over his head as well.

This is phase 2 of the redesign. The user asked that it be finished before any
campaign work. Phase 3 (pixel-art HUD, menus and compendium) and phase 4
(low-poly art pass) stay separate changes.

## What Changes

- **New training ground**: a dedicated bootcamp map, the *Campo de Instrução* of a
  fictional field near Vila Militar / Deodoro, Rio de Janeiro, 1922. One course
  runs west to east along a dirt road, with each station in its own area, in
  order: parade ground and barracks (formation), firing range with a sandbag
  firing line and earth target butts (fire), maneuver field with hedges and low
  walls (maneuver), training trench line (defense), farm hamlet with farmhouse,
  barn and chapel (recon), aid post tent (wounded), and an assault line of
  trenches and walls (final). The road links the stations in order; at each new
  station the section starts at its entry and the camera moves there. The
  default map's props are removed from the training map; the battle lab and
  the non-training engine keep their own maps.
- **Organized movement**: a section moves as a body. Destinations (formation
  slots, line slots and cover slots) are matched to soldiers so their paths do
  not cross. Soldiers going to the same place share one route (a path for the
  section and per-soldier offsets that keep the formation), instead of each
  finding its own way, and they spread to their slots at the end.
- **Default speed 1x**: the game starts at the speed labelled 1x (two ticks per
  100 ms). 0.5x (one tick) stays available as the slow option and 2x (four
  ticks) as the fast one. Speeds reset to 1x on start, retry and Continue.
- **Commander balloon**: the instructor's current order is shown in a speech
  balloon over him in the world and in the training panel. It changes when the
  objective changes.
- **Close-out**: play all seven stations by hand in Chrome on the new map, and do
  the EN pass carried over from `complete-bootcamp-tutorial`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bootcamp`: training ground layout, station areas in course order, commander
  balloon.
- `formations`: soldiers keep formation on the move and do not cross paths.
- `presentation`: default and labelled speeds, the commander balloon in the
  world.
- `terrain`: the training map has its own terrain and props.

## Impact

- `packages/shared` (training world data: covers, buildings, sight obstacles,
  terrain, points), `packages/content/src/bootcamp-exercise.ts` (station points),
  `packages/simulation` (destination matching, shared section routes),
  `packages/view3d` (training map props and the balloon anchor),
  `apps/game` (speed default, balloon, panel), locales, tests, e2e scripts, and
  the determinism golden.
- Player fantasy: a recruit section trained by its officer on an army training
  ground in Rio in 1922, before the revolt. Core loop unchanged: the instructor
  gives an order, the player issues it, the station checks it.
- Historical scope: Prestes served in the 1st Engineer Company at Deodoro in 1922
  and the conspiracy was organized around Vila Militar (Macaulay, *The Prestes
  Column*, 1974, ch. II, pp. 37-38). The training field and its layout are
  fictional; no real unit, officer or event is depicted. The instructor is a
  generic officer, not Prestes.
- Legal and ethical note: the book is a source, not adapted text; no quoted
  passages are used. No real person is shown being trained or wounded.
- Perspective: a single perspective, the player's training section; the
  instructor is an NPC. Campaign perspectives are not touched.
- Localization: new place names, station area labels and any reworded callouts
  in PT-BR and EN.
- Non-goals: pixel-art HUD and menus (phase 3), the low-poly art pass (phase 4),
  campaign, skirmish, new mechanics, voice audio.
