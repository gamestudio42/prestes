## Context

See proposal.md. Observed:

- `apps/game/src/audio`: `ShotAudio.ts` (shot events to voices, capped,
  bursts scheduled by tick), `context.ts` (the audio context and unlock),
  and the menu gramophone. Files shipped: `mauser-shot.wav`,
  `mauser-bolt.wav`; the automatic and machine-gun reports are synthesized.
- The audio setting is one mute and volume, stored under `prestes.audio.v1`.
- `tools/optimize-gramophone.ts` encodes the gramophone set to mono MP3 at
  a fixed sample rate with ffmpeg and checks the result.
- The client mirror already has what sound needs, without touching the
  simulation: each unit's position, stance, gait, order and state, the
  `seen` sets, the events (`unit_hit`, `unit_incapacitated`, `unit_died`,
  `unit_routed`, `objective_taken`, `side_fell_back`, `unit_entered`,
  `command_rejected`, `order_interrupted`), and the map (painted surfaces,
  vegetation, rivers with a width and deep or ford stretches, ponds,
  bridges, time of day). Whether "out of ammunition", "reloading" and "gun
  set" are read from unit state or need an event is settled at apply (task
  5.1); they are derivable from the snapshot's magazine, reserve and gun
  state, so no simulation change is expected.

Boundary: everything here is client-side. The simulation, the worker
bundle and the determinism goldens are untouched.

## Goals / Non-Goals

**Goals:**

- One mixer with three buses and one rule for nearness.
- The owner can record at his own pace: the game is complete with zero
  voice files and better with each one.
- Audio never blocks a battle from starting.

**Non-Goals:**

- Web Audio's 3D panner and listener orientation (an orthographic camera
  has no meaningful head direction); stereo panning by screen position is
  enough and cheaper.

## Decisions

**D1. A mixer with three buses and a ducking gain.** `effects`, `ambience`
and `voices` gain nodes under a master; the shot audio moves onto
`effects`. Order lines play on a `priority` input of the voices bus that
drives a side-chain: effects and ambience drop by a fixed amount with a
short attack and a release under one second.

**D2. The listening point and a single attenuation function.** The point is
the camera rig's ground focus, read each frame. `gainAt(distance, range,
zoom)` is one pure function used by every positioned sound; zoom scales
ranges and the ambience share. Unit-tested without an audio context.

**D3. Emitters are derived on a slow clock.** Every 200 to 250 ms the
client recomputes: the ambient bed (from the surface and vegetation sampled
around the listening point, and the map's hour), the nearest water stretch
of each kind (a helper over the map's river polylines and pond polygons),
and footstep groups (moving units of the listener's side or seen by it,
bucketed by section and surface). Sounds then glide to their new gains.
Per-frame recomputation was considered and rejected as cost with no
audible gain.

**D4. Footsteps are loops by group, not samples per step.** A section
walking on dirt is one loop whose density layer follows the number of men
moving (one, a few, many), with a per-surface set and a run and crawl
variant. Per-footstep one-shots tied to the walk clip were considered:
truer for one man, but a 3v3 has sixty-six feet, and the cap would cut
most of them.

**D5. Water as looped beds per kind, positioned at the nearest stretch.**
Wide river, narrow stream (by the river's width against a threshold in
shared data), ford and pond. One emitter per kind, moved to the nearest
point; two emitters when two stretches of a kind are both in range.

**D6. The voice director.** A small state machine owns speech: a priority
queue with three levels (order line, answer, call-out), the no-repeat rule
per line, the quiet time per section and kind, and the replacement rule
for rapid orders. Commander lines are triggered by the client's own order
command once the simulation accepts it (no `command_rejected` for its
sequence number); answers follow by a short gap.

**D7. The catalog is content; the script is generated.** `VOICE_LINES` in
`packages/content` (id, speaker, order or event, Portuguese text, takes).
`tools/voice-script.ts` writes `docs/audio/VOICE_SCRIPT.md`: per line the
text, the mood, the takes and file names
(`voice/<speaker>/<line>-<take>.<ext>`), marked recorded or to record by
looking at the files. A manifest of existing files is generated at build,
so the client never requests a missing take.

**D8. File format and preparation.** The owner records WAV. A preparation
tool trims silence, levels to a common loudness and encodes; the target
format follows the gramophone tool (mono MP3) unless a measurement at task
1.3 shows looping gaps in the ambient beds, in which case beds use a
gapless format and the decision is recorded. Voice files are mono.

**D9. Loading.** Audio is fetched after the battle starts, in priority
order: order lines and answers for the board, then the map's water and
beds, then footsteps, then call-outs. Each sound plays when decoded.

**D10. Ambient sources.** Beds, water and footsteps that the owner does not
record are synthesized where that reads well (wind, running water as
filtered noise), or taken from CC0 or public-domain field recordings,
registered before they ship. Each source is the owner's choice at task 3.1.

## Risks / Trade-offs

- [Too many voices at once is noise] → the director's quiet times and caps,
  tuned in the hand check; call-outs are the first to be dropped.
- [The owner's recordings arrive over weeks] → missing lines are silent by
  spec; the audio check reports coverage, it does not fail on it.
- [Download size] → the budget check; mono, short takes; on-demand loading.
- [Looping beds click or repeat audibly] → beds of 30 s or more with
  cross-faded loop points; one-shots carry the variety.
- [Speech in Portuguese for English players] → captions on by default in EN.

## Open Questions

- Whether the commander has one voice or one per army: one voice in this
  change; a second is new catalog rows, not new code.
