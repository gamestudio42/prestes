## Context

The existing simulation is deterministic and drives the HUD through the read-only
`Frame`/events boundary. It already exposes the commands the boot camp needs:
movement, formations, stances, tactical orders, rescue, casualty drill, dummies,
cover spawning and reinforcements. There is no mission/scenario director yet;
the start screen always boots the skirmish and the sandbox is a debugging panel.

See `proposal.md` for motivation and `specs/boot-camp/spec.md` for the behavior
contract.

## Goals / Non-Goals

**Goals:**
- Add one fictional training scenario that is playable from start to graduation.
- Keep tutorial flow outside authoritative combat state.
- Reuse the existing simulation, terrain heightfield, cover model, character
  proxies, orders HUD and sandbox commands.
- Make chapter triggers deterministic and observable from frames/events.
- Persist chapter checkpoints locally with a versioned schema.
- Keep the boot camp fully localized in EN and PT-BR.

**Non-Goals:**
- Campaign progression, mission selection, save slots or strategic layer.
- New combat mechanics or rebalancing.
- Final art, audio or new character models.
- A second simulation for tutorials.
- Historical reconstruction; the training ground is fictional.

## Decisions

### Tutorial director in presentation, not simulation

The director is a React-side controller fed by `Frame` and `SimEvent`. It holds
chapter definitions, objective predicates and checkpoint state. It never owns
unit positions, health or combat state.

Alternative: a tutorial state machine inside the simulation. Rejected because it
mixes training presentation with combat determinism and would make every campaign
mission carry tutorial metadata.

The director may send existing commands through `GameClient` to shape the
exercise (spawn dummy, reinforce, set up a casualty), but commands and their
results remain authoritative in the simulation.

### Training scenario mode

Add a `training` scenario flag to the simulation start options, separate from
`sandbox`. It enables the scenario-only spawn/reinforce/casualty commands needed by
the director, while the player-facing sandbox controls remain gated until chapter
six.

Alternative: reuse `sandbox: true` for the whole boot camp. Rejected because it
exposes debug affordances during basic training and weakens checkpoint discipline.

### Chapter model and checkpoints

Each chapter declares an id, title key, objective steps, completion predicates,
hint keys and optional setup/spawn actions. A chapter completes when every required
step is satisfied in order. Replaying an earlier chapter starts from its checkpoint
and keeps later completions.

Checkpoints are stored in `localStorage` under a versioned key, e.g.
`prestes.bootcamp.v1`, with:
- completed chapter ids;
- highest unlocked chapter;
- last active chapter.

No unit health or campaign roster is stored in this change; roster persistence is
already available at the simulation boundary but campaign save is deferred.

### Map composition

The training ground reuses the sandbox heightfield and cover kinds, with a new
fictional cover layout: firing lanes, target boards, low wall, stone wall,
sandbags, trench, ridge, crater and a casualty lane. The layout ships as content
data, not hardcoded scene coordinates.

The first three chapters use training dummies only. Chapter four spawns a real
opposing section. Chapter five uses the casualty lane and rescue queue. Chapter
six enables the existing both-sides and sandbox controls.

### Entry and HUD

The start screen gets a separate Boot Camp action. During training, a tutorial
panel shows chapter, objective, hint, checkpoint state and completion feedback.
The normal skirmish HUD is unchanged when the tutorial is inactive.

### Localization and content schema

Chapter titles, objectives, hints, feedback, checkpoint labels and graduation copy
are locale keys. Mission metadata identifies the commander as a fictional training
cadre instructor and the perspective as section command; it is labelled fictional
and carries no historical source claim.

## Risks / Trade-offs

- **Tutorial steps become brittle when combat RNG changes** → use dummies through
  chapter three, fixed seed, event-driven predicates and checkpoints; real combat
  only after the basic verbs are complete.
- **Director drifts into owning simulation state** → keep it read-only over frames,
  with commands as the only write path; test that the same command sequence gives
  the same hash.
- **Long chapters hide failures** → checkpoint every chapter; acceptance test
  asserts each checkpoint independently.
- **Scenario commands leak into normal play** → gate them behind the training
  scenario flag and keep the player sandbox UI hidden until chapter six.
- **Video recording slows CI** → record only the dedicated Boot Camp E2E run and
  keep the ordinary check path free of video.
- **The training map is mistaken for history** → label it fictional in the start
  entry, tutorial panel and content metadata.

## Migration Plan

No save migration is needed for existing skirmish data. The boot camp checkpoint
key is new and versioned; a missing or malformed value starts at chapter one.
Deleting the key resets the tutorial without touching other storage.

## Open Questions

None blocking. Chapter pacing and exact copy can be tuned during the first play
session without changing the capability contract.
