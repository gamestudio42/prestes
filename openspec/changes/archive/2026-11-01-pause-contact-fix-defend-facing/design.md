## Context

See `proposal.md`. The boot camp chapter list is authored content; the tutorial
director consumes an ordered subset. Defend planning is shared by preview and
simulation, but the formation axis previously came only from the unit centroid to
the clicked point.

## Goals / Non-Goals

**Goals:**

- Remove the temporary training targets without leaving a checkpoint that cannot
  complete.
- Make the defend line and cover destination stay on the clicked side of a wall.
- Make facing, aim and the gameplay cone agree for defending soldiers.

**Non-Goals:**

- Designing the replacement training layout.
- Removing sandbox target dummies.
- Changing firing, vision range or cover protection rules.

## Decisions

- **Paused chapter, not deleted content.** Contact keeps its authored steps and
  locale keys but is excluded by a `paused` flag. The director uses the active
  chapter list; a saved Contact checkpoint advances to the next active chapter.
  This keeps the content ready for the new layout.
- **Threat axis for defensive formations.** `formationSlots` accepts an optional
  facing. Defend and ambush derive it from the destination toward the nearest
  enemy; movement keeps using the travel direction.
- **Near-side cover only.** Cover candidates behind the selected cover are rejected
  when the slot and candidate lie on opposite sides of that cover. The same check
  applies to automatic cover seeking.
- **Reserved cover slots.** Shared planning accepts already-used destinations and
  skips a candidate within 1.2 m; simulation and preview pass the same reserved
  list so six soldiers do not all target one sandbag.
- **Defensive facing.** A defending or ambushing unit with no target/path faces
  the nearest enemy. The existing target and path facing still take priority.

## Risks / Trade-offs

- **Paused Contact removes fire/suppression coverage.** → The acceptance run covers
  active chapters only; the missing coverage returns with the new layout.
- **Near-side rejection can leave a slot without cover.** → The slot remains the
  fallback, preserving the player's chosen side over automatic cover.
- **Threat-axis lines can look rotated for movement orders?** → The axis is only
  overridden for defend/ambush; movement remains travel-facing.
- **Old saves on Contact.** → Resume maps to the next active chapter instead of
  showing an unusable objective.

## Migration Plan

No save schema migration. Existing `prestes.bootcamp.v1` values are read and the
Contact checkpoint is mapped forward. Reverting the change restores the targets
and chapter by removing the pause flag.
