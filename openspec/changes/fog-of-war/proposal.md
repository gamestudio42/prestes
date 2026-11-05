## Why

The user asked for fog of war after playing the 3 vs 3 (2026-11-05): only
what your soldiers see appears; an unseen enemy who fires leaves a "?" near
where the shot came from. Today every soldier of both sides is drawn at all
times, and the enemy commander reads the player's exact strength and
position, so the battle has no scouting, no surprise and no use for hiding.
Fog of war is the base the coming terrain relief (hills that hide a section)
and the map kit (woods and tall grass that conceal) build on.

## What Changes

- **Side vision**: a side sees an enemy soldier when any of its fit soldiers
  has him within 120 m, inside his 65-degree vision cone or within 15 m
  around him, with a clear line of sight. Vision is computed in the
  simulation, per side, and sent with each frame.
- **Only the seen is shown**: an enemy who is not seen is not drawn and
  cannot be selected or targeted. When he drops out of sight, a faded
  silhouette stays where he was last seen for 5 s. Enemies seen dead or
  incapacitated stay visible.
- **"?" at unseen fire**: a shot from an unseen enemy leaves a "?" marker
  near the shooter, not on him: off by an error that grows with distance and
  shrinks as more shots come from the same spot. It fades after 8 s. The
  tracer and the shot's sound start from the marker.
- **A fair enemy**: the enemy commander decides only from what its side has
  seen or heard (seen soldiers, "?" fire positions, last contacts), never
  from the player's real positions or strength.
- **Where it applies**: on in the 3 vs 3; off in the bootcamp (training, the
  enemy is staged); in the sandbox a toggle, off when controlling both sides.
  The toggle label is localized in PT-BR and EN.

## Capabilities

### New Capabilities

- `fog-of-war`: per-side vision, what the player is shown of the enemy, the
  unseen-fire marker, and the enemy commander's knowledge.

### Modified Capabilities

- `battle-lab`: the enemy commander's strength comparison and target choice
  use what its side knows.

## Impact

- `packages/shared` (frame and event protocol: per-side seen ids, unseen-fire
  event), `packages/simulation` (vision pass, marker error, commander
  knowledge), `packages/view3d` (hidden units, faded silhouettes, "?" markers,
  tracers from markers), `apps/game` (selection and targeting only of seen
  units, sandbox toggle, audio position), tests. The determinism golden
  changes (marker error draws).
- Player fantasy: an officer who knows only what his men see, and reads the
  enemy from the crack of rifles in the scrub.
- Historical scope: none; a game mechanic. Multi-perspective: unchanged.
- Legal and ethical note: none beyond the standing rules.
- MVP: vision, hiding and silhouettes, "?" markers, the fair commander, the
  sandbox toggle. Non-goals: concealment by vegetation and spotting delays
  (map kit), terrain blocking sight (terrain relief), area fire at a "?",
  multiplayer fog.
