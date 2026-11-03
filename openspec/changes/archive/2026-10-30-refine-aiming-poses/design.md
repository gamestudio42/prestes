## Context

The part rig from `add-cover-stances` has a body group with legs, torso, head and
a weapon group. This change refines the weapon group so every stance is aiming.

## Goals / Non-Goals

**Goals:**

- Arms and rifle always point forward.
- Prone body lies face-down with the rifle level.
- No ground clipping and no rotated ring/shadow.

**Non-Goals:**

- Combat, firing, recoil, ammunition, cover calculations, final meshes.

## Decisions

- **Weapon group.** Arms and rifle are children of a `weapon` group at shoulder
  height. The group points forward (-Z) by default.
- **Prone counter-rotation.** The body rotates -90° around X to lie face-down;
  the weapon group rotates +90° locally, so its world orientation stays forward.
- **Prone lift.** The body group is raised 0.25 m in prone, and the weapon group
  is shifted 0.15 m locally to keep the head and rifle above the ground.
- **Ring and shadow stay siblings of the body**, so they remain flat in every
  stance.

## Risks / Trade-offs

- **Weapon/arm clipping in prone** → inspect the prone screenshot; adjust the
  local weapon offset if needed.
- **Long rifle reads oddly at small scale** → keep the simple box rifle; final
  meshes replace it later.
