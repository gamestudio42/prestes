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
