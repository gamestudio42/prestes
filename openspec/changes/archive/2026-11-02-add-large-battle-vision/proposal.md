## Why

The bootcamp and sandbox need to prove the combat mechanics at a larger scale. The rifle range was too short for a 240 m field, live vision cones did not represent acquisition range, and idle soldiers did not search for targets. A 66-soldier battle lab is needed to measure AI, cover, obstacle avoidance and rendering performance.

## What Changes

- Raise the Mauser range to 120 m.
- Make every unit use a live vision cone, LOS and target acquisition; idle units scan gradually toward nearby threats.
- Show selected-troop full-range cone outlines and target LOS, with short direction markers for other units as a performance LOD.
- Add a sandbox 3v3 preset: 3 player troops and 3 enemy troops of 11 soldiers each.
- Optimize target selection, vision rendering, character rendering and the camera for large battles.
- Add a 66-unit headless benchmark and E2E battle-lab coverage.

## Capabilities

### New Capabilities
- `battle-lab`: the 3v3 large-battle sandbox, 120 m vision/rifle range, AI acquisition and performance contract.

### Modified Capabilities

## Impact

- Weapon catalog, simulation targeting/facing, view3d vision and character rendering, sandbox UI, content locales, tests and benchmarks.
