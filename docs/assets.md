# Asset Register

## Original game assets

| Asset | Path | Author / source | Licence | Notes |
| --- | --- | --- | --- | --- |
| Modular 1920s character proxy (soldier, officer) | `packages/view3d/src/character-layer.ts` | Prestes project | CC-BY-4.0 | Procedural low-poly part rig built from the 1.75 m kit proportions; walk cycle and standing/crouched/prone poses; replaced by exported meshes later |
| Terrain heightfield, terrain detail, layered covers, environment kit and target dummies | `packages/view3d/src/scene-view.ts`, `packages/view3d/src/world-layer.ts`, `packages/view3d/src/cover-layer.ts`, `packages/view3d/src/training-layer.ts`, `packages/view3d/src/character-layer.ts`, `packages/shared/src/terrain.ts` | Prestes project | CC-BY-4.0 | Procedural low-poly placeholders; ridge, trench, crater and road are fictional sandbox features; dummies are target boards, not soldiers |
| Fallen-soldier corpse and strategic corpse proxy | `packages/view3d/src/character-layer.ts` | Prestes project | CC-BY-4.0 | Separate body, muted uniform, dropped headgear and blood pool; deliberately distinct from the living prone pose |
| Farmhouse, barn, chapel, ruin, windmill, fields, fences, telegraph line, crops and ground clutter | `packages/view3d/src/world-layer.ts` | Prestes project | CC-BY-4.0 | Procedural 1920s rural kit; instanced fields, grass, rocks, fence posts and rails; visual only, not simulation cover |
| Layered sandbag, stone, low-wall, barrel and trench visuals | `packages/view3d/src/cover-layer.ts` | Prestes project | CC-BY-4.0 | Instanced bags, blocks, barrel bands and trench lips matched to the simulation cover footprint and rotation |
| Palette and toon materials | `packages/view3d/src/palette.ts`, `materials.ts` | Prestes project | CC-BY-4.0 | Theme colours and three-band toon ramp |
| Section portrait placeholder | `apps/game/src/ui/Hud.tsx` | Prestes project | AGPL-3.0-or-later | CSS hatch and the pixel `status-soldier` icon; explicitly a placeholder until final portraits |
| Start menu hero | `apps/game/src/assets/menu/coluna-prestes.webp` | Provided by the project owner | Public domain (verified by the project owner, 2026-11-03) | Historical photograph used as a sepia menu hero; copied from the user's reference folder |
| Camera, post and path layers | `packages/view3d/src/camera-rig.ts`, `post.ts`, `path-layer.ts` | Prestes project | AGPL-3.0-or-later | Code; techniques inspired by Vazante with attribution |

## Original model sources

Source `.blend` files live in `art-src/characters/` and are gitignored by default.
Exported `.gltf`/`.glb` files go through `pnpm models` and land in
`apps/game/public/models/`. No final character GLB ships in this change; the
in-game characters are procedural proxies.

## Interface

| Asset | Path | Author / source | Licence | Notes |
| --- | --- | --- | --- | --- |
| Pixelify Sans | `@fontsource/pixelify-sans` (npm, bundled) | Stefie Justprince, via Fontsource | SIL OFL 1.1 | The single interface font of the pixel kit, self-hosted |
| Pixel icon set | `assets/icons/prestes-icons.aseprite` (source), `apps/game/src/assets/icons.png` and `icons.json` (export) | Prestes project | AGPL-3.0-or-later | 61 original 16 x 16 icons, one named slice each; first drawn from `assets/icons/icons.txt` by `tools/icons/icon_grids.py` and `build-icons.lua`, edited in Aseprite and exported with `pnpm icons` |
| Mauser shot and bolt | `apps/game/public/audio/mauser-shot.wav`, `mauser-bolt.wav` | Project owner's own recording (video `sons referencia/mouser shot.mp4`, kept out of git) | Owner's own work, given for the game (2026-11-04) | Cut with Blender's audio library: one shot (0.9 s, the recording's saturation kept, -1 dBFS) and the bolt cycle (0.53 s, -6 dBFS). Played by `ShotAudio`, the bolt 1.3 s after each shot at 30% |
| Fallback gunshot | `apps/game/src/audio/ShotAudio.ts` | Prestes project | CC-BY-4.0 | Procedural gunshot synthesized at runtime, used only when the recording does not load |

## Rules

- Do not describe a placeholder as finished art.
- Record every third-party asset with source and licence before committing.
- Do not copy Vazante assets; its rendering techniques are reimplemented with
  attribution in `docs/decisions/0002-visual-language.md`.
- Book scans and extracted maps stay in `livros/` and are never committed.
- Character source `.blend` files are binary and may be large; keep a backup and
  remove the ignore rule deliberately if a source file is versioned.








