## Why

The current build mixes a combat skirmish, a ten-mission campaign shell and a combat HUD with a training field. That makes the first playable experience hard to read and keeps battle systems in front of the player before the core movement, troop and command language is taught. The project now becomes a single large bootcamp: the player commands one 11-soldier troop through a continuous training ground while an officer instructor explains every available action in text. Combat remains only as non-lethal instruction at designated stations and as a sandbox laboratory.

## What Changes

- **BREAKING** Remove the skirmish/battle entry, the ten-mission campaign, the old boot-camp tutorial and the legacy combat start flow.
- Open the game directly into a single contiguous bootcamp map (240 x 240 m) with buildings, trees, obstacles, roads and training stations.
- Player troop is 11 soldiers. The officer instructor is a non-controllable NPC at the front of the command station. The three-soldier command troop is reserved for the sandbox and a future command-specific mission.
- Selection is troop-level: clicking any friendly soldier selects all 11; clicking any enemy selects the whole enemy troop. Select All is removed everywhere, including Ctrl/Cmd+A.
- Enemy troop targeting resolves to the nearest living member per attacker and retargets within the same troop.
- Add a thirteen-station bootcamp covering camera, selection, movement, hold, face, formations, terrain, stances, hold fire, attack, suppress, defend, ambush, recon, flank, pursue, withdraw, rescue and protect-officer.
- Combat stations use training targets/enemy troops and are non-lethal, with local retry. Dialogue is text only.
- Sandbox remains as a laboratory. It can insert full enemy troops (11) and the command troop (3).
- Every sandbox placement tool uses a preview ghost with valid/invalid feedback, Z/X rotation, click confirmation and cancel.
- Character models stay low-poly procedural and share a uniform rig; buildings and large structures may ship as Blender-authored GLB assets.
- Active order lines remain one per soldier; drawn lines remain whole when alternating movement is enabled.

## Capabilities

### New Capabilities
- `bootcamp`: the single bootcamp experience, station curriculum, instructor text, troop selection/targeting rules and completion flow.

### Modified Capabilities
- `sandbox`: whole-troop insertion, command-troop insertion and universal placement preview with Z/X rotation.

## Impact

- `apps/game/src/App.tsx`, start/campaign/training UI, HUD and sandbox panel.
- `packages/simulation`: bootcamp scenario, troop insertion, training targets, map bounds and pathfinding.
- `packages/shared`: map bounds, protocol commands, frames and placement/target metadata.
- `packages/content`: new bootcamp curriculum and locale catalogs; removal of old training campaign data.
- `packages/view3d`: larger map, training props, GLB loading, character uniformity and placement ghosts.
- Unit, E2E and documentation suites are rewritten around bootcamp and sandbox.
