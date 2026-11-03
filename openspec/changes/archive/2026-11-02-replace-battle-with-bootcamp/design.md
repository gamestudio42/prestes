## Context

The deterministic simulation and worker boundary stay. Combat remains available only inside non-lethal bootcamp stations and the sandbox; the player-facing battle and campaign shells are removed. The bootcamp is one authored map with a linear station curriculum and persistent progress.

## Goals

- One readable entry: the bootcamp.
- Troop-level selection and targeting with no global select-all.
- Real pathfinding and walking between stations.
- Cover every current HUD action with a teaching station.
- Universal sandbox placement preview and rotation.
- Low-poly procedural soldiers with a shared uniform rig; GLB buildings where useful.

## Non-goals

- Voice acting or recorded dialogue.
- Final character GLB pipeline.
- Multiplayer, campaign branching or the future command-troop mission.
- Reintroducing regroup, disperse, reserve or advance.

## Decisions

### Troop identity
Introduce a troop key derived from faction and squad. The UI resolves a clicked soldier to its troop, stores `selectedTroopId` and derives member ids. Enemy targeting stores a target troop; attack-like commands assign each attacker its nearest living member. Sandbox-spawned troops receive unique squad ids.

### Bootcamp scenario
The simulation gains a bootcamp option with 11 player riflemen, one non-controllable instructor officer at the command station and no opposing AI. Stations that teach combat spawn non-lethal training targets or an 11-soldier training troop with no return fire. Player defeat is disabled. A station can reset its local state.

### Stations
A data-driven curriculum drives objective text, instructor lines, trigger type and completion. Station completion is evaluated from the frame and command actions. Movement stations require the troop to reach an area; action stations require the relevant command; combat stations require the action against a training target; rescue requires a simulated casualty and a rescue order; protect-officer requires the officer NPC and the posture/order.

### Selection and commands
No select-all action exists. Clicking any friendly selects its troop. Clicking any enemy selects its troop. Marquee selection is not needed for the single-troop bootcamp. Order paths are one per soldier.

### Sandbox placement
A placement mode carries a tool kind, anchor point, rotation and validity. View3d renders a ghost of the full element, including 11 soldier silhouettes for a troop. Z/X rotates. Click confirms only when valid; Escape or right click cancels. The same pipeline is shared by cover, obstacles, troops and future props.

### Map and presentation
Bounds grow to 240 x 240 m and pathfinding covers the new bounds. Stations are spaced for real marching. Buildings use collision proxies. Characters share one procedural rig and uniform palette. Bootcamp HUD is the existing command HUD with battle-only outcome/ammo panels hidden where not relevant.

## Risks

- Combat is interleaved in the tick; bootcamp must disable enemy fire and defeat without breaking movement.
- Expanding the A* grid increases cost; benchmark before finalizing.
- Existing tests assume a 6-unit battle squad and must be replaced.
- GLB assets need deterministic collision proxies and asset registration.
