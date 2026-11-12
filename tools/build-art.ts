/**
 * Rebuilds the low-poly models from their Blender scripts, then prepares them
 * for the game.
 *
 *   pnpm art                 every target
 *   pnpm art soldier props   only those targets
 *
 * Needs Blender (set BLENDER if it is not in the default install folder) and
 * the system Python with Pillow for the texture atlases. The exported models
 * are committed: building and testing the game never need Blender.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function findBlender(): string | undefined {
  const fixed = [
    process.env.BLENDER,
    '/Applications/Blender.app/Contents/MacOS/Blender',
    '/usr/bin/blender',
  ].filter((path): path is string => Boolean(path));
  const foundation = 'C:/Program Files/Blender Foundation';
  const installed = existsSync(foundation)
    ? readdirSync(foundation)
        .filter((name) => name.startsWith('Blender'))
        .sort()
        .reverse()
        .map((name) => `${foundation}/${name}/blender.exe`)
    : [];
  return [...fixed, ...installed].find((path) => existsSync(path));
}

const blender = findBlender();
if (!blender) {
  console.error('Blender not found. Set BLENDER to its executable.');
  process.exit(1);
}

// revise-buildings-and-stone 2.1: the battle's openings, which the building target cuts.
execFileSync(process.execPath, [resolve(root, 'node_modules/tsx/dist/cli.mjs'), resolve(root, 'tools/export-openings.ts')], {
  stdio: 'inherit',
});
execFileSync(process.platform === 'win32' ? 'python' : 'python3', [resolve(root, 'art-src/textures/make_textures.py')], {
  stdio: 'inherit',
});
execFileSync(
  blender,
  ['-b', '--factory-startup', '-P', resolve(root, 'art-src/blender/build.py'), '--', ...process.argv.slice(2)],
  { stdio: 'inherit' },
);
execFileSync(process.execPath, [resolve(root, 'node_modules/tsx/dist/cli.mjs'), resolve(root, 'tools/prepare-models.ts')], {
  stdio: 'inherit',
});
