## Context

See `proposal.md` for motivation. The foundation already has a deterministic
simulation, a worker/mirror boundary, a perspective graybox scene and PT-BR/EN UI.
This change replaces the presentation layer with the studio's low-resolution
orthographic language while leaving simulation rules intact.

The visual reference is Vazante's implementation: orthographic camera with
continuous span, low internal resolution, toon materials, depth-edge composite,
dashed order paths and character scaling for strategic zoom. Its techniques are
reimplemented with attribution; its assets are not copied.

## Goals / Non-Goals

**Goals:**

- Continuous orthographic camera with tactical/transition/strategic bands.
- Strong Vazante-like post with a clean toggle.
- Prestes palette and toon materials.
- Original modular 1920s low-poly humanoids at 1.75 m, readable at all zooms.
- Dashed movement paths, waypoint crosses and order markers.
- Barlow/Barlow Condensed + Lucide UI.
- Original-model export pipeline and asset register.

**Non-Goals:**

- Combat, selection, squads, morale, logistics and missions.
- Full character roster, cavalry and horses.
- Audio production and final prop library.
- GitHub publishing.

## Decisions

### 1. Orthographic camera instead of perspective

Use an `OrthographicCamera` with a visible vertical span. Tactical tilt is 40°;
strategic is top-down. Span clamps to 25–200 m with tactical at ≤90 m and
strategic at ≥150 m. Zoom is exponential (1.18 per notch out, 0.85 in). The
camera snaps its position to whole internal texels while not rotating, which stops
the low-resolution image from crawling during pans.

Alternative considered: keep the perspective camera and narrow the FOV. Rejected
because the reference look depends on orthographic scale and the readability of
small units at different spans.

### 2. Strong post with a clean toggle

`PixelPost` renders into a half-float target with a depth texture at an internal
height of ~300 px. The composite applies a depth-edge outline, two-ring bloom from
values above 0.85, a soft shoulder, a slight contrast/saturation grade, posterize
(24 levels) with a 4×4 Bayer dither and a vignette. A toggle switches between the
strong look and a clean composite with the same resolution but no outline/dither.

Alternative considered: post-process only in the art pass. Rejected because the
outline and dither change how silhouettes and paths read; they must exist before
combat UI is designed.

### 3. Palette and toon materials

`PALETTE` becomes the single source of colours: sky/fog/sun, terrain, adobe/roof,
uniform factions, skin tones, path/selection/withdrawal, dust and muzzle. Lit
surfaces use `MeshToonMaterial` with a shared three-band gradient map. Flat
shading and vertex colours keep the look readable without textures.

### 4. Original modular character kit

One 1.75 m low-poly body and armature; modular headgear (officer cap, gaúcho hat,
cangaceiro leather hat, legalist cap, civilian), weapons (bolt-action rifle,
carbine, machete), gear (bandolier, pack, canteen, scarf) and faction colours.
The visual slice ships the column soldier and officer; the same rig and clips
cover later archetypes.

For this change the game uses a procedural low-poly proxy built from the same kit
proportions so the camera/path/scale work is testable without a Blender round
trip. The GLB export pipeline is added and documented; final meshes replace the
proxy in a content change.

Alternative considered: reuse the Vazante Quaternius soldier. Rejected because
the helmet, vest and AK are modern; CC0 does not make them historically right.

### 5. Unit scaling

The model is 1.75 m. At tactical span the scale is 1.0; at strategic span it grows
to `max(1, span / 60)` so silhouettes stay readable. The scale is presentation
only and never enters the simulation.

### 6. Path layer

One dynamic `LineSegments` buffer for all routes. Each order contributes a dashed
line from its origin to its target and a cross at each waypoint; an order marker
ring fades at the target. Colours come from the palette (`path`, `selection`,
`withdraw`). The layer reads `Frame.orders`; it never mutates the simulation.

### 7. Frame protocol

`UnitSnapshot` gains `faction`. `Frame` gains `orders: OrderPath[]`, where
`OrderPath` has `id`, `unitIds`, `points` and `kind`. The engine creates an order
on a valid `move` command and removes it when all units arrive. Order metadata is
not part of the world hash.

### 8. UI

Add `@fontsource/barlow`, `@fontsource/barlow-condensed` and `lucide-react`.
Barlow is the body font, Barlow Condensed the display font. Icons mark move,
codex, language, debug and post mode. The HUD keeps the read-only mirror contract.

### 9. Asset pipeline

`tools/prepare-models.ts` uses `@gltf-transform/core` and functions to prune and
deduplicate GLBs into `apps/game/public/models/`. Source `.blend` files live under
`art-src/characters/`; large sources may move to LFS later. The asset register
records original meshes as CC-BY-4.0, fonts as OFL and Lucide as ISC.

## Risks / Trade-offs

- **Original character work is the bottleneck** → ship a procedural proxy with the
  final proportions and one rig; replace meshes without changing the camera,
  paths or scale logic.
- **Strong post can hurt readability** → keep the HUD native, add the clean toggle
  and test the scene at both modes.
- **Orthographic texel snapping can look rigid** → snap only position, never
  rotation or zoom; blend span smoothly.
- **Path buffers can grow** → cap vertices per order and draw only active orders.
- **Protocol change ripples through tests** → update shared, simulation and frame
  fixtures together; keep order metadata out of the state hash.
- **Font/icon bundle size** → import only the needed Barlow weights and Lucide
  icons.

## Migration Plan

Greenfield presentation refactor. Replace the perspective scene internals behind
the existing `SceneView` API (`update`, `dispose`, `onBandChange`) so the app
shell and tests keep working. No save data or production state exists. Rollback is
a revert of the change.

## Open Questions

None blocking. The final Blender meshes, cavalry and audio are deferred to later
changes.
