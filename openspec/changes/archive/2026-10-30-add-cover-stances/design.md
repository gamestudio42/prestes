## Context

The visual language change ships a static procedural proxy. Stance is the next
cheap, high-value animation: it makes cover readable and gives combat a state to
consume later. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- A `Stance` enum and `stance` command with the existing rejection semantics.
- A small part rig that can walk, idle, crouch and lie down.
- Smooth pose blending and a ground-fixed selection ring/shadow.
- HUD debug controls and localized labels.

**Non-Goals:**

- Combat, cover geometry, LOS, hit chance and formation stances.
- Final Blender meshes, cavalry and audio.
- Any GitHub action.

## Decisions

### 1. Stance belongs to the simulation

`UnitSnapshot.stance` is authoritative. The command targets unit ids exactly like
`move`; empty or unknown units produce `command_rejected`. Stance is included in
the world hash because it changes gameplay-relevant state.

### 2. Part rig instead of whole-body scaling

The proxy is rebuilt as a small hierarchy: root, body group, two leg groups, two
arm groups, head, hat, rifle and gear. The selection ring and shadow are siblings
of the body group, so a prone body does not rotate them. This also gives the
walk cycle pivots at the hips and shoulders.

### 3. Procedural animation

- Walk phase advances with distance travelled, not wall-clock time, so the feet
  do not slide.
- Legs swing opposite each other; arms counter-swing; body bobs slightly.
- Stance blends use a numeric crouch/prone weight, eased each frame, so the body
  lowers and tips instead of snapping.
- Prone rotates the body group around X and lowers it; the ring/shadow stay flat.
- Idle returns the limbs to a neutral pose.

### 4. HUD controls

Three buttons send stance commands for units 1–3. They are debug affordances, not
the final order UI; tactical core will replace them with real selection and order
controls.

### 5. No Blender yet

Procedural animation validates the feel and the state contract. Final low-poly
meshes and animation clips can replace the proxy through `pnpm models` without
changing the stance or camera code.

## Risks / Trade-offs

- **Procedural poses can look stiff** → keep the rig simple, add easing and
  distance-based walk phase; inspect screenshots at tactical and strategic span.
- **Prone can clip the ground** → keep the body group above y=0 and test the pose.
- **Command surface grows** → reuse the same validation and rejection path as
  movement; keep stance as a separate command.
- **Combat coupling** → stance is metadata now; combat decides its own cover rules
  later.

## Migration Plan

Additive protocol change. Existing frames gain a `stance` field; tests and
fixtures are updated. No save data exists. Rollback is a revert.
