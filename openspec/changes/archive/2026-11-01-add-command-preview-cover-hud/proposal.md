## Why

Orders are currently chosen before the player can see where the section will go.
The map can also be obscured by the permanent HUD, and cover-aware movement is not
readable while soldiers travel. The player needs a preview of the intended paths,
destination slots and cover positions before committing, a readable cover/vision
cone and a HUD that can be hidden when looking at the map.

## What Changes

- Add an **optional hover preview** for the pending order before the player
  confirms it: movement paths, destination slots, cover points, ghost soldiers
  and facing/vision cones. The preview overlay SHALL be off by default and SHALL
  be enabled by an explicit HUD toggle.
- Cover preview for `move`, `attack`, `flank`, `suppress`, `hold`, `defend`,
  `ambush`, `regroup`, `pursue`, `disperse`, `protect-officer`, `recon` and
  `reserve` where a target or ground point is being chosen.
- Preview is presentation-only and must match the command the simulation will
  receive.
- Add a **cover-first movement plan**: where a valid cover position exists near
  the destination, soldiers enter cover before/while advancing instead of
  standing in the formation line exposed. Formation remains the fallback where
  no cover is reachable.
- Add a visual **cover/vision cone** per soldier showing the protected/facing
  arc, distinct from the selection ring.
- Redesign the HUD toward the supplied reference: top command bar, bottom-left
  section list with an eye toggle, centered order grid, right status panel, and
  explicit **Preview** and **Hide HUD** controls. The preview toggle is off by
  default.
- Preserve the existing boot-camp, sandbox and orders behaviour.

## Capabilities

### New Capabilities
- `tactical-preview`: hover previews of destinations, paths, cover, cones and
  resulting soldier positions before an order is committed.

### Modified Capabilities
- `orders`: add previewable order intent and cover-first destination planning.
- `formations`: make formation slots yield to reachable cover positions while
  preserving formation as the fallback.
- `presentation`: adopt the reference HUD layout and add a hide/restore HUD
  control.

## Impact

- New shared preview calculations reused by the React HUD and Three.js overlay.
- New preview and cone rendering in `packages/view3d`.
- HUD layout/CSS and an input command to hide/restore the HUD.
- Simulation destination planning changes for cover-first movement; no new
  renderer dependency enters `packages/simulation`.
- New unit tests for preview/cover planning, browser coverage for hover preview
  and HUD hiding, and updated screenshots/video.

