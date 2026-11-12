/**
 * Exports the pixel icon sheet from its Aseprite source.
 *
 *   pnpm icons          export assets/icons/prestes-icons.aseprite
 *   pnpm icons --grids  rebuild the .aseprite from assets/icons/icons.txt first
 *                       (this overwrites edits made in Aseprite)
 *   pnpm icons --add    add the icons of icons.txt the .aseprite lacks, in new
 *                       cells, leaving the drawn ones as they are, then export
 *
 * The exported icons.png and icons.json are committed: building and testing
 * the game never need Aseprite. Set ASEPRITE to the executable if it is not
 * in the default install folder.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'assets/icons/prestes-icons.aseprite');
const grids = resolve(root, 'assets/icons/icons.txt');
const sheet = resolve(root, 'apps/game/src/assets/icons.png');
const data = resolve(root, 'apps/game/src/assets/icons.json');

const candidates = [
  process.env.ASEPRITE,
  'C:/Program Files/Aseprite/Aseprite.exe',
  'C:/Program Files (x86)/Steam/steamapps/common/Aseprite/Aseprite.exe',
  '/Applications/Aseprite.app/Contents/MacOS/aseprite',
  '/usr/bin/aseprite',
].filter((path): path is string => Boolean(path));
const aseprite = candidates.find((path) => existsSync(path));
if (!aseprite) {
  console.error('Aseprite not found. Set ASEPRITE to its executable.');
  process.exit(1);
}

if (process.argv.includes('--grids')) {
  execFileSync(
    aseprite,
    ['-b', '--script-param', `txt=${grids}`, '--script-param', `out=${source}`, '--script', resolve(root, 'tools/icons/build-icons.lua')],
    { stdio: 'inherit' },
  );
}

if (process.argv.includes('--add')) {
  execFileSync(
    aseprite,
    ['-b', '--script-param', `txt=${grids}`, '--script-param', `file=${source}`, '--script', resolve(root, 'tools/icons/add-icons.lua')],
    { stdio: 'inherit' },
  );
}

execFileSync(
  aseprite,
  ['-b', source, '--sheet', sheet, '--data', data, '--format', 'json-array', '--list-slices'],
  { stdio: 'inherit' },
);
console.log(`Exported ${sheet} and ${data}`);
