# 0002 — Visual language

- **Orthographic camera.** Continuous span 25–200 m; tactical tilt 40°, strategic
  top-down; texel snapping while not rotating. The orthographic scale keeps small
  1.75 m characters readable and makes the low-resolution look stable.
- **Small characters.** Model height is 1.75 m; presentation scales by
  `max(1, span / 60)` so silhouettes survive strategic zoom. The scale never enters
  the simulation.
- **Strong post with a clean toggle.** Depth-edge outline, restrained bloom, soft
  shoulder, grade, 24-level Bayer posterize and vignette in the strong mode; the
  clean mode keeps the resolution and grade without outline/dither/vignette.
- **Original modular 1920s kit.** One body/armature; period hats, bolt-action
  rifles, gear and faction colours. The current proxy uses the kit proportions;
  final meshes will replace it without changing camera or path code.
- **Corpse is its own kit.** A dead soldier is not a rotated prone soldier: it
  swaps to a separate corpse group with a muted uniform, dropped headgear, splayed
  limbs and a blood pool, and loses the selection ring. The strategic proxy uses a
  flat dark corpse instance so death still reads at the widest zoom.
- **Rural 1920s environment kit.** Adobe and whitewashed houses, tiled or dark roofs,
  barn, chapel, ruin, windmill, crop rows, rail fences, telegraph wires, layered
  trees, rocks and grass. Buildings and fields sit outside the tactical combat lane;
  simulation cover stays readable because the cover layer is built from its exact
  footprint and rotation.
- **Movement paths.** Dashed route, waypoint crosses and an order ring, drawn from
  `Frame.orders` in one dynamic line buffer. Order metadata is presentation data
  and is excluded from the world hash.
- **Palette and toon.** One `PALETTE` and a shared three-band `MeshToonMaterial`
  ramp; no per-object colour invention.
- **Attribution.** Vazante's rendering techniques (camera bands, low-res composite,
  path preview, unit scaling) inspired this implementation. No Vazante asset or
  code is copied wholesale.
