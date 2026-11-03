## Context

The simulation already owns formation slots, cover positions and A* paths, but
only the simulation can currently calculate them. The HUD is a fixed layout with
no hide control. The reference image asks for a denser command bar, a lower-left
section list, a centered order grid and a right status panel.

## Goals / Non-Goals

**Goals:**
- Show the exact destination/path/cover plan before committing an order.
- Make cover take precedence over an exposed formation slot when reachable.
- Draw a readable facing/cover cone without confusing it with casualty red.
- Add a HUD hide/restore control and adopt the reference grouping.

**Non-Goals:**
- New combat balance or new order types.
- Reworking the simulation into an editor-grade planner.
- Final art for HUD icons or cones.
- Campaign/save changes.

## Decisions

### Shared planner, presentation renderer

Move the pure planning pieces (formation slots, cover candidate selection, path
preview) into `packages/shared` so the HUD preview and the simulation use one
implementation. The simulation remains authoritative; the preview calls the same
pure functions and never mutates the engine.

Alternative: duplicate the cover/formation math in React. Rejected because the
preview would drift from the committed plan.

### Cover-first destination policy

For each soldier in a movement/formation order:

1. compute the formation slot;
2. search reachable cover positions within a short radius around the slot;
3. choose the cover position with the best protection toward the threat and the
   shortest valid route;
4. fall back to the formation slot when no cover route exists.

The selected destination is stored in the preview and passed through the command
path so the committed order uses the same plan. Cover candidates use a 2 m offset
from the cover centre so the 1 m A* grid and its 0.8 m margin can represent them.

### Cone

The cone is a translucent wedge in the render layer, oriented along facing (or
the preview's intended facing). Default: 65Â° half-angle? The implementation will
use a 65Â° full field, 7 m radius, low alpha, and a separate colour from casualty
red. The cone is presentation-only; it does not alter line of sight or cover.

### Preview is opt-in

Ghost soldiers, planned paths and preview cones are hidden by default. A Preview button in the command bar enables the overlay; disabling it clears the overlay but keeps the pending order and its target/ground selection. This avoids a permanent clone layer obscuring the map. The preference is session state only; every new scene starts with preview off.

### HUD

Adopt the reference groups: top bar with camera/language/sandbox/codex/speed/post;
lower-left section cards with an eye toggle; center order grid; right status
panel. The section eye toggles the orders panel, while **Preview** and **Hide
HUD** are separate controls in the command bar. `H` also hides/restores the HUD.
While hidden, a small restore button remains; the canvas stays interactive.

## Risks / Trade-offs

- **Preview and commit disagree** â†’ shared pure planner plus a unit test that
  compares the preview plan with the committed destination.
- **Hover cost** â†’ compute only on pointer move and cap previews to the selected
  soldiers; no simulation ticks.
- **Cone clutter** â†’ scale alpha/radius with camera band and show detailed cones
  only for selected/preview units.
- **HUD remains too large at 720p** â†’ keep the bottom panel collapsible and test at
  1280Ã—720; the hide control always remains available.
- **Cover search causes units to leave formation** â†’ limit search radius and keep
  formation direction/spacing as a soft constraint; report fallback.

## Migration Plan

No save or protocol migration. Add the preview layer as an optional render path;
commands remain unchanged. Rollback is removing the preview overlay and restoring
formation-slot destinations.



