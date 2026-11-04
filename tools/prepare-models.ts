import { NodeIO } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const SOURCES = ['art-src/characters', 'art-src/environment'];
const OUTPUT = 'apps/game/public/models';

mkdirSync(OUTPUT, { recursive: true });

const files = SOURCES.filter((source) => existsSync(source)).flatMap((source) =>
  readdirSync(source)
    .filter((file) => (file.endsWith('.gltf') || file.endsWith('.glb')) && !file.startsWith('smoke'))
    .map((file) => join(source, file)),
);

if (files.length === 0) {
  console.log(`No .gltf or .glb files in ${SOURCES.join(', ')}; nothing to export.`);
  process.exit(0);
}

const io = new NodeIO();
for (const input of files) {
  const file = basename(input);
  const output = join(OUTPUT, `${basename(file, file.endsWith('.gltf') ? '.gltf' : '.glb')}.glb`);
  const document = await io.read(input);
  await document.transform(prune(), dedup());
  await io.write(output, document);
  console.log(`${output}: ${document.getRoot().listMeshes().length} meshes`);
}

// The pixel textures the game swaps at runtime (outfits, effects).
const TEXTURES = 'art-src/textures';
const TEXTURE_OUT = join(OUTPUT, 'textures');
mkdirSync(TEXTURE_OUT, { recursive: true });
for (const file of readdirSync(TEXTURES).filter((name) => name.endsWith('.png'))) {
  copyFileSync(join(TEXTURES, file), join(TEXTURE_OUT, file));
}
console.log(`${TEXTURE_OUT}: textures copied`);
