# Review: ambient-sound-and-voices

One section per task, in the order the owner reviews them.

## 0.1 Prerequisites (2026-11-13)

- ffmpeg is not on the PATH; `tools/optimize-gramophone.ts` finds the
  copy installed with Kdenlive, and `pnpm optimize:music` ran and left
  every music file unchanged (the tool is repeatable).
- `docs/history/FORCES.md` has no forms of address yet: the voice lines
  (5.1) wait for them, as the task says.

## 1.1 The mixer (2026-11-13)

- `apps/game/src/audio/mixer.ts`: one audio context for the battle
  (`AudioEngine`) and a mixer of three buses under a master: effects,
  ambience, voices. Order lines and answers will come in on the voices
  bus's priority input; while one plays, effects and ambience drop to 35 %
  in 0.08 s and come back in 0.6 s after the last one ends.
- The shots (`ShotAudio.ts`) now play on the effects bus. Their volumes,
  pitches and timing are unchanged; every bus is at full level until the
  channel volumes of 2.1, so the battle sounds as before.
- Checked: `tests/audio/mixer.test.ts` (7 tests on a fake context: the
  graph, the bus volumes and mute, the duck and its release under 1 s,
  two overlapping lines, shots at the same volume through the effects bus
  and lowered by an order line, the shared context left open on dispose);
  the 27 shot tests unchanged; and a skirmish on campo-de-provas with sound
  on, three sections sent at the enemy: 114 sounds played through the
  buses, no console error.
- Nothing to listen to yet that differs: the duck has no caller until the
  voices (5.4).

Approved by the owner after listening in the preview, 2026-11-13.

## 1.2 The listening point (2026-11-13)

- `apps/game/src/audio/listening.ts`: the battle is heard from the ground
  point the camera looks at. `gainAt(distance, range, zoom)` is full at
  the point, falls smoothly and is silent at the sound's range; zoomed all
  the way out, a range is twice as long and a near sound 60 % thinner,
  while the general ambience goes from 60 % (closest zoom) to full.
  `panAt` places a source left or right by where it lies across the
  screen, never more than 80 % into one ear.
- The camera now gives the screen's right on the ground with its focus
  and span (`SceneView.view().right`), so the pan follows the camera when
  it turns (Q/E).
- Checked: `tests/audio/listening.test.ts` (11 tests: range, the river
  silent 200 m away, zoom thinning and reach, ambience share, pan left and
  right, a turned camera, the 80 % limit); in the game, at three camera
  turns, 10 m along that "right" lands 106 px right of the screen's
  centre.
- The owner asked (2026-11-13) for the shots to be panned too: each shot
  and bolt goes through a stereo panner by `panAt`; their loudness keeps
  its own rule, approved in 1.1. The water, footsteps and call-outs use
  `gainAt` and `panAt` as they arrive (3.3, 4.1, 5.4).
- Checked: 3 more tests (a shot on the left of the view panned left at its
  old volume, `shotPan` left, centre and right, centred with no view); a
  skirmish with sound on: all 116 shots went through the panner, none
  centred, no console error.

Approved by the owner, 2026-11-13.

## 1.3 The audio preparation tool and the loop test (2026-11-13)

- `pnpm prepare:audio` (`tools/prepare-audio.ts`): the owner's WAV files
  go under `audio-src/<group>/` (gitignored, like `gramofone/`), and come
  out as mono MP3 in `apps/game/public/audio/<group>/`. Per group:
  - `voice`: silence trimmed at both ends, -16 LUFS, 22.05 kHz, 48 kbps;
  - `oneshots`: trimmed, -20 LUFS, 32 kHz, 64 kbps;
  - `beds`, `water`: the last 2 s cross-faded into the start so they loop,
    -24 / -22 LUFS, 32 kHz, 64 kbps;
  - `footsteps`: looped with a 0.5 s cross-fade, -22 LUFS.
- Repeatable: the same sources give the same bytes (a test runs it twice).
- The loop test (`tools/audio-loop-check.ts`): a 30 s wind bed, made to
  loop, decoded in Chromium as the game does. MP3, Ogg Vorbis, Ogg Opus,
  WAV and the bed as the tool prepares it all decode to exactly 960,000
  samples, with no silence at the seam. Decision, in the design (D8): mono
  MP3 for everything.
- Found on the way: ffmpeg writes the MP3's gapless header only to a file;
  piped, the prepared bed gained 60 ms of silence at the seam (a click
  every 30 s). The tool now encodes to a file.
- Not measured: Firefox and Safari (only Chromium is installed).
- `findBinary` moved from the gramophone tool to `tools/audio-tools.ts`;
  `pnpm optimize:music` still runs and leaves the music unchanged.
- Checked: `tests/tools/prepare-audio.test.ts` (9 tests: trimming, the
  loop's seam no bigger than any step inside the sound, the WAV writer,
  and with ffmpeg the same bytes twice, a line trimmed to its sound, a bed
  shortened by its fade, the gapless header written).

Approved by the owner, 2026-11-13.

## 2.1 The mute and three channel volumes (2026-11-13)

- The battle's top bar has one menu, a dropdown (the owner, 2026-11-13:
  sound and leaving in a single menu): the mute, the volumes of effects,
  ambience and voices, and "Leave", which still asks for confirmation.
  The separate "Leave" button is gone. Escape or a click outside closes it.
  Picture: `battle-menu.png`.
- The options compass has the same three volumes under the sound switch:
  `options-compass.png`.
- Stored under the same key as before, `prestes.audio.v1`, with the new
  fields: `{ muted, effects, ambience, voices }`. An older `{ muted,
  volume }` reads as the mute and the effects volume (the old 0.35 is the
  effects at full), ambience at 80 % and voices at full. A muted game stays
  muted. Kept under the old key rather than a new one so every place that
  writes the old setting (the e2e tests, the preview's mute) still works.
- The volumes are the levels of the mixer's buses (1.1); the menu, the
  compass and the engine share one store, so a change shows in both and is
  saved at once.
- Labels in EN and PT-BR: Effects / Efeitos, Ambience / Ambiente, Voices /
  Vozes, Menu, Sound / Som.
- Checked: `tests/audio/audio-settings.test.ts` (8 tests: the old setting
  read as mute and effects, the new fields, nonsense and clamping, the
  store saving and surviving a reload, levels set before the mixer exists);
  `tests/e2e/audio-channels.spec.ts` (voices without ambience: the
  ambience bus at 0 and voices at full in the battle, kept over a reload;
  an older muted setting stays muted and the menu unmutes it; the compass
  sliders); the battle HUD's leave test now opens the menu first; the desk
  and gramophone e2e pass.
- Not yet: Save and Load. The game has no saved battles; that is a change
  of its own.

Approved by the owner, 2026-11-13.

## 3.2 Ambient beds by place and hour, and the one-shots (2026-11-13)

- Two looped layers play under the battle: the air of the place around the
  listening point (cerrado, forest edge, caatinga, pasture, town) and the
  hour over it (dawn, day, dusk; night is ready for maps set at night).
  The place is read within 60 m: a town where three buildings stand, a
  forest edge where fourteen trees stand, else the painted ground's
  majority, else the map's colour family. It must hold for two readings
  (half a second) before the bed changes, so a border does not flap.
- A change of bed or hour cross-fades over 2.5 s: the old one goes down as
  the new one comes up, with no silence and no cut. A bed not loaded yet
  leaves the old one playing until it is. Zooming out thins the ambience
  (1.2).
- One-shots every 7 to 22 s, only those that fit the place and the hour,
  never the same one twice in a row, panned a little left or right.
- The recordings: 21 CC0 field recordings from Freesound, picked from
  Brazilian interior recordings where one exists (Goiás, Minas Gerais);
  each in `docs/assets.md` with its author, page and the
  excerpt used. Downloaded with the owner's leave, 2026-11-13.
  - Beds, 44 to 53 s each: cerrado and pasture (afternoons in Mineiros,
    Goiás), forest edge (the edge of the Atlantic forest near Foz do Iguaçu,
    an afternoon with a faint wind), caatinga
    (wind in dry grass, recorded in Texas: no Brazilian caatinga recording
    is CC0), dawn (birds at a fazenda in Goiás), day (a Brazilian cricket
    at midday), dusk (crickets and cicadas, Minas Gerais), night (frogs and
    crickets in the Brazilian countryside).
  - One-shots: seriema, bem-te-vi, maritaca, inhambu, urutau, dogs far
    off, rooster, cattle, horse, ox cart, church bell, a gust, a creaking
    branch.
  - None yet: the town bed (no CC0 village recording without engines),
    the anu and the hawk. The town plays its hour layer and its one-shots
    alone; the list skips what is missing.
- New tool: `tools/cut-audio-sources.ts` (`pnpm cut:audio`) cuts each
  excerpt from the originals in the gitignored `audio-src/raw/`, with a
  0.12 s fade at both ends of a one-shot; `pnpm prepare:audio` then levels,
  loops and encodes, and writes `apps/game/src/audio/sound-files.ts`.
  About 3.7 MB in all (beds 3.0 MB, one-shots 0.7 MB), each fetched only
  when its place and hour come up.
- Checked: `tests/audio/ambience.test.ts` (bed choice by buildings, trees,
  paint, border and palette; the hour; the 2.5 s cross-fade with no gap;
  no change on one reading at a border; the old bed kept while the new one
  loads; one-shots fitting and never repeated); all 114 audio and tool
  tests pass. In the preview, Paiolzinho at dawn: the forest-edge bed and
  the dawn layer load and play, then the maritaca, horse, gust and branch
  one-shots, no console error.
- The owner played Paiolzinho (2026-11-13): a constant sound ran over the
  whole map. It was a river inside the first forest-edge recording
  (felix.blume 466046, recorded by a stream), so the woods sounded of water
  far from the river. Replaced, with the owner's leave, by tvilgiat 516295,
  a forest edge with no water. The river is heard only near it with the
  water emitters of 3.3.
- For the owner to hear: start a skirmish with the sound on and move the
  camera from the woods to the open ground and the houses.

Approved by the owner, 2026-11-13.
