## Context

See `proposal.md` for motivation. The simulation already owns facing, cover,
targets and orders, and the shared planner already produces cover-first preview
destinations. The remaining work crosses three boundaries: shared vision/planner,
simulation target acquisition, and the React HUD.

## Goals / Non-Goals

**Goals:**

- Make the drawn vision cone the same rule the simulation uses for acquisition and
  fire, with no renderer dependency in the simulation.
- Make preview and simulation agree on defend destinations.
- Replace the dense HUD palette pass with a real compact layout while keeping every
  existing control, readout, test id and locale key.

**Non-Goals:**

- Final portrait art, audio, new orders, new resources or a new HUD state store.
- Terrain line of sight beyond the existing cover/terrain cover rules.
- A gameplay tutorial for the cone; the boot camp remains unchanged.
- Visual clipping of the cone mesh against every scenery prop.

## Decisions

- **Vision is a shared pure function.** `isPointInVision` compares the normalized
  direction to a 65-degree full cone. `visible` calls it after range and before
  line of sight. This keeps the rule testable without Three.js and prevents the
  preview and simulation from drifting.
- **Facing is owned by the simulation.** A unit faces its target, otherwise its
  path, otherwise its last facing. Auto-facing the nearest enemy was removed
  because it made the cone irrelevant. Explicit attack/suppress/flank/pursue orders
  turn the soldier toward the target, since the player has already chosen it.
- **Defend uses one shared clamp.** `DEFEND_REGION_RADIUS` and `clampToRegion` live
  in the shared planner. Preview applies the clamp after cover selection; the
  simulation uses the same function and constant. Cover destinations are treated
  as reachable cover at 2.4 m so an arrived soldier does not immediately seek again.
- **HUD layout is a compact deck, not another skin.** The top bar is a single grid
  row; secondary utilities are icon-only with titles/aria labels; the bottom deck
  uses one primary order row and one tactical row. Clipped corners and sepia
  hairlines carry the low-poly period look without adding art assets.
- **Tests follow the rule, not the old timing.** The reload test runs long enough
  for the cone-limited fire cadence to empty and reload. A new engine test places a
  dummy in front and behind the cone; only the front target is acquired. Vision and
  clamp tests live in `packages/shared`.

## Risks / Trade-offs

- **A 65-degree cone can feel blind.** → Explicit attack orders turn the unit, and
  path movement updates facing; only autonomous acquisition is restricted.
- **Idle units can be flanked while facing away.** → This is intended; the player can
  issue an attack or move order to turn them.
- **HUD icon-only controls can be undiscoverable.** → Every icon keeps a title,
  aria label, active state and the existing test id; Preview and Hide HUD remain
  directly visible.
- **Preview and simulation can drift again.** → Both import the same planning and
  clamp helpers; the preview test checks no mutation and clamp behavior.
- **Cone mesh can still overlap scenery visually.** → Gameplay line of sight is
  authoritative; visual clipping remains a presentation follow-up.

## Migration Plan

No save or protocol migration. The HUD and vision changes are client/simulation
changes with the same command boundary. Rollback is limited to reverting the
change directory and the affected source files.

## Open Questions

None for this slice.
