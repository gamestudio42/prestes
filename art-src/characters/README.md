# Original character sources

This directory holds the original low-poly 1920s character kit. The exported
`.glb` files live in `apps/game/public/models/` and are what the game loads.

## Source layout

```text
art-src/characters/
  soldier.blend
  officer.blend
  shared/            # hats, rifles, gear, palette notes
```

`.blend` files are kept out of git by default because they are binary and can be
large. Keep a backup outside the repository and export `.gltf`/`.glb` files here
when rebuilding. If a source file is small enough to version, remove the ignore
rule for that file deliberately.

## Export

1. Export each character to `art-src/characters/<name>.gltf` (or `.glb`) with the
   armature and the clips idle, walk, run, aim, fire, reload and death.
2. Model height is 1.75 m, front faces -Z, origin at the feet.
3. Run `pnpm models`. The script prunes unused data, deduplicates and writes
   `apps/game/public/models/<name>.glb`.
4. Record the source and licence in `docs/assets.md`.

The current in-game characters are procedural proxies built from the same kit
proportions; they replace the old unit markers while the final meshes are authored.
