import { NodeIO, type Document } from '@gltf-transform/core';
import { dedup, prune } from '@gltf-transform/functions';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { BUILDING_FILES, CATALOG_OBJECTS, ROCK_KINDS } from '../packages/shared/src';
import { addFarMeshes, ownerOf, subset, variantOf } from './model-split';
import { isTreeModel, meshTriangles, treeBudgetProblems } from './tree-budgets';

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
  // revise-buildings-and-stone 2.3: the buildings' marker empties are leaves the model check reads.
  await document.transform(prune({ keepLeaves: file.startsWith('buildings') }), dedup());
  // biome-trees-and-plants 1.2: a tree over its size class's budget fails the build.
  if (isTreeModel(file)) {
    const problems = treeBudgetProblems(meshTriangles(document), (model) => CATALOG_OBJECTS.find((entry) => entry.model === model)?.height);
    if (problems.length > 0) {
      console.error(`${input}: over the triangle budget\n  ${problems.join('\n  ')}`);
      process.exit(1);
    }
  }
  // revise-buildings-and-stone 6.1: the buildings by group, each with its
  // strategic-band meshes (D8); the stones by rock kind. A map loads the
  // files it uses (packages/shared modelFilesOf).
  if (file === 'buildings.glb') {
    const counts = addFarMeshes(document, Object.keys(BUILDING_FILES));
    const [before, after] = [...counts.values()].reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
    console.log(`buildings: strategic meshes for ${counts.size} models, ${before} -> ${after} triangles`);
    rmSync(output, { force: true });
    for (const group of new Set(Object.values(BUILDING_FILES))) {
      await writeSplit(join(OUTPUT, `${group}.glb`), await subset(document, (name) => BUILDING_FILES[ownerOf(name)] === group, true));
    }
    continue;
  }
  if (file === 'stones.glb') {
    for (const kind of ROCK_KINDS) {
      const target = kind === 'granite' ? 'stones' : `stones-${kind}`;
      await writeSplit(join(OUTPUT, `${target}.glb`), await subset(document, (name) => (variantOf(name) ?? 'granite') === kind, false));
    }
    continue;
  }
  await writeSplit(output, document);
}

async function writeSplit(output: string, document: Document): Promise<void> {
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

// revise-buildings-and-stone 3.5: the environment atlas's swatches, for the building variants' swaps.
const regions = JSON.parse(readFileSync(join(TEXTURES, 'regions.json'), 'utf8')) as Record<string, unknown>;
const ATLAS_OUT = 'packages/view3d/src/environment-atlas.ts';
writeFileSync(
  ATLAS_OUT,
  `// Written by tools/prepare-models.ts from art-src/textures/regions.json; do not edit.\n` +
    `/** The environment atlas: its size and each swatch's cell (x, y, width, height in pixels, rows down). */\n` +
    `export const ENVIRONMENT_ATLAS: { size: [number, number]; regions: Record<string, [number, number, number, number]> } = ${JSON.stringify(regions.environment)};\n`,
);
console.log(`${ATLAS_OUT}: atlas swatches written`);
