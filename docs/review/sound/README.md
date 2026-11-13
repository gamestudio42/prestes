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
