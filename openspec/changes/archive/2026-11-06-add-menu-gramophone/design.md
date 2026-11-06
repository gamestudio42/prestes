## Context

The start screen is a pixel-art book over a menu video, with campaign,
skirmish, compendium and options spreads. The only audio today is the
combat gunshot (`ShotAudio`), created after a player gesture. The project
owner supplied 17 public-domain Brazilian recordings and asked for a
gramophone on the menu that sounds as if it plays in another room, with
previous, play/pause and next controls and a metadata card on track change.

The recordings are already identified against Discografia Brasileira by
their catalog numbers, which is how the manifest is built: a filename alone
would not distinguish, for example, the 1928 Odeon Plangente from the 1914
recording of the same title.

## Goals / Non-Goals

**Goals:**

- A menu-only gramophone with a small memory and network cost.
- A convincing "next room" presentation without changing the recordings at
  runtime beyond filtering.
- Correct, traceable metadata for every recording.
- No impact on the simulation, determinism or combat audio.

**Non-Goals:**

- Music during battle, a playlist screen, track search, a second volume
  control or streaming.
- Re-recording, restoring or cleaning the source audio.
- Replacing the existing gunshot path.

## Decisions

### 1. Asset pipeline and compression

The 17 source files stay in `gramofone/`, which is gitignored. A reproducible
script, `tools/optimize-gramophone.ts`, encodes them into
`apps/game/public/music/` at mono 24 kbps MP3, 22.05 kHz, with a 120 Hz
high-pass, a 3.5 kHz low-pass and two-pass loudness normalization to
-20 LUFS (true peak -2 dB). Tags are stripped; the manifest is the source of
metadata. The target set is about 9 MB instead of about 40 MB.

MP3 is chosen over Opus so every supported desktop browser can play it
without a second asset variant. The 3.5 kHz low-pass is well above the
runtime filter that creates the room effect, so the low bitrate costs little
in the band the player actually hears.

The script locates `ffmpeg`/`ffprobe` through `FFMPEG`/`FFPROBE`, the PATH or
the local Kdenlive install. The optimized files are committed, so CI and
builds never need ffmpeg.

### 2. Playback graph

`HtmlGramophoneOutput` uses one `HTMLAudioElement` through a
`MediaElementAudioSourceNode`:

```text
element -> highpass 120 Hz -> lowpass 1.8 kHz -> dry 0.85 ----------> volume -> mute -> destination
                                          \-> convolver 1.8 s -> wet 0.35 -/
```

The convolver uses a small synthetic stereo impulse response generated at
runtime; no impulse asset is committed. The final level is deliberately low.
A gain ramp fades in over about three seconds on the first start, over about
0.4 s on resume and over about 0.35 s on a track change; pause fades out
briefly to avoid clicks. The first `element.play()` call happens
synchronously inside the player gesture, before any `await`, so autoplay
policy does not reject it.

If the browser has no `AudioContext`, the output falls back to the plain
media element at a low volume and the menu keeps working.

### 3. Transport and state

`Gramophone` owns the track index and transport, with an injectable output so
unit tests do not need a browser. It starts on Plangente when storage is
empty, wraps next/previous, advances on `ended`, restarts the current track
when previous is pressed after three seconds, and never touches the
simulation. The selected index persists under `prestes.gramophone.v1`.

`useGramophone` creates the engine for the mounted start screen, mirrors its
state into React, and registers one-time `pointerdown`/`keydown` listeners on
the window. Elements marked `data-no-autoplay` (the options sound toggle) do
not start the music. The engine is disposed when the player leaves the menu,
so battle never plays menu music.

### 4. Sound enable from Play

Pressing the gramophone's Play when game sound is muted calls the existing
sound toggle to enable sound and then starts the track. The automatic
first-gesture start never overrides an explicit mute; it simply waits.

### 5. Metadata card

On a track change (not on the first play), the widget shows a parchment card
with title, composer, performer, year, genre, label, catalog, public-domain
year and a source link. It is `aria-live="polite"`, dismisses after about
eight seconds and leaves the persistent track line in place. The values come
from the manifest; only the labels are localized.

### 6. Presentation

The gramophone is drawn as inline pixel SVG (cabinet, horn, record and
crank), following the code-drawn `MarchingScene` precedent. The record turns
with a stepped CSS animation only while playing and stops under reduced
motion. The widget sits below the book at the reference desktop size and
becomes a compact bar on narrow screens.

## Risks / Trade-offs

- 24 kbps is intentionally lossy. The room filter and the 78 rpm surface
  noise mask most artifacts, but a listener may still prefer 32 kbps; the
  script makes that a one-value change.
- The first-gesture start may surprise a player who did not expect sound. The
  three-second fade, the low level and the mute exception reduce that risk.
- A track change opens an external source link; the card is transient and the
  link is the only external navigation.
- The menu video and the gramophone both compete for attention; the widget is
  deliberately small and below the book.

## Migration Plan

No data migration. A missing or invalid saved index falls back to Plangente.
The options mute setting keeps its existing key. No simulation or save data
changes.

## Open Questions

None.
