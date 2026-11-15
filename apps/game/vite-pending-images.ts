import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ResolvedConfig } from 'vite';

/**
 * complete-books-and-bibliography D3a: images used under a permission request.
 *
 * Their files live in the gitignored `art-src/compendium-pending/` and the book
 * asks for them at `assets/compendium/<entry>/<slot>.png`, like any plate.
 *
 * - The dev server answers those requests from the pending folder when the
 *   public folder has no such file.
 * - A build in the `review` mode (`pnpm --filter @prestes/game build:review`,
 *   output `apps/game/dist-review/`) copies the pending folder into the output,
 *   so the game can be shown to the rights holders the requests go to.
 * - Any other build leaves them out; the book then shows the section emblem
 *   with "image awaiting permission".
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PENDING_DIR = resolve(root, 'art-src/compendium-pending');
const PREFIX = '/assets/compendium/';

export function pendingImagesPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'prestes-pending-images',
    configResolved(resolved) {
      config = resolved;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = (request.url ?? '').split('?')[0]!;
        if (!url.startsWith(PREFIX) || !url.endsWith('.png')) return next();
        const file = resolve(PENDING_DIR, decodeURIComponent(url.slice(PREFIX.length)));
        if (!file.startsWith(PENDING_DIR + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
        response.setHeader('Content-Type', 'image/png');
        response.setHeader('Cache-Control', 'no-store');
        createReadStream(file).pipe(response);
      });
    },
    closeBundle() {
      if (config.command !== 'build' || config.mode !== 'review' || !existsSync(PENDING_DIR)) return;
      cpSync(PENDING_DIR, resolve(config.root, config.build.outDir, 'assets/compendium'), { recursive: true });
    },
  };
}
