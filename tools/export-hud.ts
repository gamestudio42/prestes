/**
 * Exports the battle HUD art from its Aseprite source (redo-battle-hud D1).
 *
 *   pnpm hud-art          export assets/hud/prestes-hud.aseprite
 *   pnpm hud-art --seed   rebuild the .aseprite from the owner's reference first
 *                         (this overwrites edits made in Aseprite)
 *
 * Every slice becomes `apps/game/src/assets/hud/<slice>.png`, and
 * `hud.json` records each slice's size and nine-slice centre for the CSS
 * and its test. The exports are committed: building and testing the game
 * never need Aseprite. Set ASEPRITE to the executable if it is not in the
 * default install folder.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'assets/hud/prestes-hud.aseprite');
const reference = resolve(root, 'referencias para hud/Interface de comando da Coluna Prestes.png');
const outDir = resolve(root, 'apps/game/src/assets/hud');

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

const work = mkdtempSync(join(tmpdir(), 'prestes-hud-'));
try {
  if (process.argv.includes('--seed')) {
    execFileSync('python', ['-I', resolve(root, 'tools/hud/hud_pieces.py'), reference, work], { stdio: 'inherit' });
    execFileSync(
      aseprite,
      ['-b', '--script-param', `ornaments=${work}`, '--script-param', `out=${source}`, '--script', resolve(root, 'tools/hud/build-hud.lua')],
      { stdio: 'inherit' },
    );
  }

  execFileSync(aseprite, ['-b', source, '--split-slices', '--save-as', join(outDir, '{slice}.png')], { stdio: 'inherit' });
  const dataFile = join(work, 'hud-data.json');
  execFileSync(
    aseprite,
    ['-b', source, '--sheet', join(work, 'sheet.png'), '--data', dataFile, '--format', 'json-array', '--list-slices'],
    { stdio: 'inherit' },
  );
  const data = JSON.parse(readFileSync(dataFile, 'utf8')) as {
    meta: { slices: { name: string; keys: { bounds: { w: number; h: number }; center?: { x: number; y: number; w: number; h: number } }[] }[] };
  };
  const slices = Object.fromEntries(
    data.meta.slices
      .map((entry) => {
        const key = entry.keys[0]!;
        const centre = key.center;
        return [
          entry.name,
          {
            w: key.bounds.w,
            h: key.bounds.h,
            // border-image-slice: top right bottom left, in art pixels.
            ...(centre
              ? { slice: [centre.y, key.bounds.w - centre.x - centre.w, key.bounds.h - centre.y - centre.h, centre.x] }
              : {}),
          },
        ] as const;
      })
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(join(outDir, 'hud.json'), `${JSON.stringify(slices, null, 2)}\n`);
  console.log(`Exported ${Object.keys(slices).length} HUD slices to ${outDir}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
