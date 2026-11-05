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
- **Original modular 1920s kit.** One Blender-built soldier (about 400
  triangles, Mauser included) on one armature with authored clips; the column,
  the legalists and the officer differ only by texture. The view picks the clip
  from the unit snapshot and cross-fades. At strategic span an instanced proxy
  stands in, and it is also the fallback if the model fails to load.
  (Updated 2026-11-05, `low-poly-art-pass`.)
- **Low-poly shapes, pixel textures.** Models are built by Blender Python
  scripts and textured with small pixel-art atlases in the sepia palette,
  nearest filtering and no mipmaps, under the toon ramp and the pixel post, so
  the world matches the pixel interface. Shot feedback (muzzle flash, smoke,
  tracer, impacts by surface, dust) is pixel sprites from one effects sheet.
- **Corpse is its own pose.** A dead soldier is not a rotated prone soldier: a
  hard hit plays a stagger, then the model settles into its own corpse clip and
  loses the selection ring. The strategic proxy uses a flat dark corpse instance
  so death still reads at the widest zoom.
- **Rural 1920s environment kit.** Blender models for the barracks, farmhouse,
  barn, chapel and aid tent, the fortifications, trees, hedges, fences and small
  props; the sandbox's training house, ruin, windmill, crop rows, telegraph
  wires, rocks and grass stay procedural until they are modelled. Buildings and fields sit outside the tactical combat lane;
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
