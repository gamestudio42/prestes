## Why

A battle has three sounds: the rifle, the automatic rifle and the machine
gun. There is no place (wind, water, birds), no movement (boots on a road
or through cane) and no voice. The owner asked (2026-11-11) for a plan of
the ambient sound and of the speech of the captain and the soldiers, which
he will record himself. His rule: sound always belongs to what is near,
except the commander giving an order and the troop answering it, which must
always be clear.

## What Changes

- **A listening point.** What is heard is what is near the point the
  camera looks at; zooming out makes near sounds thinner and the general
  ambience fuller.
- **Ambient beds by place and hour**: an air bed per biome (open cerrado,
  forest edge, caatinga, pasture, town) and by the map's time of day (dawn
  birds, midday insects, dusk, night), with occasional one-shots (a bird, a
  dog far off, a gust).
- **Water that is where the water is.** A wide river, a narrow stream and a
  pond each have their own sound, heard from the nearest stretch of water
  to the listening point and louder as it gets nearer; a ford sounds
  shallower than deep water; men wading are heard.
- **Troops on the ground they cross.** Footsteps of the sections near the
  listening point, by surface (road, dirt, grass, mud, stone, wooden
  bridge, shallow water, crops and scrub), by pace (walk, run, crawl) and
  by how many men move; equipment rattle on the run.
- **Voices.** The commander speaks each order the player gives, and the
  section that receives it answers. Soldiers also call out what happens to
  them: contact, a man down, out of ammunition, reloading, pinned, the gun
  set, an objective taken, falling back. Lines are short Portuguese speech
  recorded by the owner, with several takes each so they do not repeat.
- **Orders are always clear.** The commander's order and the section's
  answer are not thinned by distance and lower the rest of the mix while
  they play. Every other voice is heard by nearness, like any sound.
- **A recording script.** A document lists every line to record: its id,
  the text, who speaks, the mood, how many takes and the file name, so the
  owner can record in one sitting. A line with no recording is silent;
  nothing breaks while the set is incomplete.
- **Mix controls**: separate volumes for effects, ambience and voices, and
  captions for spoken lines, on by default in EN (the speech is Portuguese)
  and optional in PT-BR.
- Presentation only: no sound changes the simulation.

Design intent. Player fantasy: giving an order aloud and hearing it taken
up, in a country that sounds like itself. Pillar: readable tactics (you
hear what you cannot watch) and the land as a character. Loop beat: the
order and its acknowledgement; scanning the map by ear. Hypothesis: a
player knows an order was received, and that a section off screen is in
trouble, without looking at the panel.

MVP: the listening point, air beds for the four biomes and four hours,
river, stream and pond, footsteps on six surfaces, the commander's order
lines and the sections' answers for every order of the board, six event
call-outs, the mix controls and captions. Non-goals: music in battle,
enemy speech as intelligible lines (the enemy is heard as distant shouts),
radio or bugle signalling as a mechanic, lip sync, English voice
recordings, and positional audio for headphones beyond left-right panning.

Historical, legal and ethical note. The speech is original script in the
Portuguese of the period and region, without anachronisms; forms of
address and ranks follow `docs/history/FORCES.md` (from `faction-armies`)
and a line that leans on a period expression notes its source. No line is
taken from a book. The owner's recordings are original work; every ambient
recording that is not his is CC0 or public domain, or synthesized, and is
registered in `docs/assets.md` with its source and licence before it
ships. The wounded and the dying are voiced with restraint. The campaign's
multi-perspective approach is unchanged: the commander's voice is a
generic officer in the skirmish; a named historical figure's voice is a
later, per-mission decision.

## Capabilities

### New Capabilities

- `soundscape`: the listening point, ambient beds, water, footsteps, voice
  lines and their priority, captions, the recording script and the rules
  for missing recordings and loading.

### Modified Capabilities

- `audio`: "Audio control" goes from one combat channel to effects,
  ambience and voices.

## Impact

- `apps/game/src/audio`: a mixer with three buses, the listening point,
  ambient, water, footstep and voice players beside `ShotAudio.ts`.
- `packages/shared`: read-only helpers the client uses (nearest water to a
  point, the surface under a unit); no simulation change, no golden change.
- `packages/content`: the voice line catalog and captions (EN, PT-BR).
- `apps/game/public/audio/`: ambient, footstep and voice files, loaded on
  demand and kept out of the JS bundles; a size budget for the set.
- `tools/`: an audio preparation tool (trim, level, encode) beside
  `optimize-gramophone.ts`, and a check of the catalog against the files.
- `docs/audio/VOICE_SCRIPT.md` (the recording script), `docs/assets.md`.
- The HUD's audio control and the options compass.
