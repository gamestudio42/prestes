import { NodeIO } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const SOURCE = 'art-src/characters';
const OUTPUT = 'apps/game/public/models';

mkdirSync(OUTPUT, { recursive: true });

if (!existsSync(SOURCE)) {
  console.log(`No source models at ${SOURCE}. Create .gltf exports there and rerun.`);
  process.exit(0);
}

const files = readdirSync(SOURCE).filter(
  (file) => file.endsWith('.gltf') || file.endsWith('.glb'),
);

if (files.length === 0) {
  console.log(`No .gltf or .glb files in ${SOURCE}; nothing to export.`);
  process.exit(0);
}

const io = new NodeIO();
for (const file of files) {
  const input = join(SOURCE, file);
  const output = join(OUTPUT, `${basename(file, file.endsWith('.gltf') ? '.gltf' : '.glb')}.glb`);
  const document = await io.read(input);
  await document.transform(prune(), dedup());
  await io.write(output, document);
  console.log(`${output}: ${document.getRoot().listMeshes().length} meshes`);
}
