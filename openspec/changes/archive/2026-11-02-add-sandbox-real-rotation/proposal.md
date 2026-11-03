## Why

Sandbox rotation currently affects only the preview and snaps in 90-degree steps. Placed covers and troops ignore the angle, and collision/pathfinding remain axis-aligned, so the preview is not trustworthy.

## What Changes

- Z/X rotate placement gradually at 90 degrees per second while held.
- Rotation is stored on covers and applied to troops at spawn.
- Rotated covers use oriented collision and pathfinding.
- Preview, collision and placed objects share the same rotation helpers.
- Troop facing follows formation rotation.

## Capabilities

### New Capabilities

### Modified Capabilities
- `sandbox`: rotation becomes real, continuous and shared by preview, placement and collision.

## Impact

- Shared protocol, world collision, pathfinding, simulation spawn commands, app placement input, scene rendering and sandbox tests.
