import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { groundAtlasPixels } from '../packages/view3d/src/ground-atlas';
import { encodePng } from './png';

/**
 * add-map-editor: writes the generated ground atlas (placeholder pixel-art
 * tiles) to apps/game/public/models/textures/ground-atlas.png, so the author
 * can retouch it. The view loads this file and falls back to the generated
 * pixels when it is missing.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'apps/game/public/models/textures/ground-atlas.png');

const atlas = groundAtlasPixels();
writeFileSync(out, encodePng(atlas.width, atlas.height, atlas.data));
console.log(`Ground atlas written: ${out} (${atlas.width}x${atlas.height})`);
