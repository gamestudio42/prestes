import { writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import type * as SharedModule from '../../packages/shared/src';
import type * as CheckMapsModule from '../../tools/check-maps';

/**
 * add-map-editor: the dev server's "Save to project". POST /__editor/save-map
 * with a map document writes `<id>.map.json` into
 * packages/shared/src/maps/authored/ and regenerates the folder's index.
 * The file name comes from the validated id, never from the request; a map
 * with errors (a campaign map without its source note among them) or with a
 * built-in map's id is refused. Dev only: the built game has no endpoint.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_BYTES = 2 * 1024 * 1024;

type Shared = typeof SharedModule;
type CheckMaps = typeof CheckMapsModule;

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(new Error('too-large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

/** `dir` is the authored maps folder; tests pass a scratch copy. */
export async function saveMapDocument(server: Pick<ViteDevServer, 'ssrLoadModule'>, text: string, dir?: string): Promise<{ status: number; body: { ok: boolean; file?: string; reason?: string } }> {
  const shared = (await server.ssrLoadModule(resolve(root, 'packages/shared/src/index.ts'))) as Shared;
  const checks = (await server.ssrLoadModule(resolve(root, 'tools/check-maps.ts'))) as CheckMaps;
  const parsed = shared.parseMapDocumentText(text);
  if (!parsed.ok) return { status: 400, body: { ok: false, reason: `${parsed.error} (${parsed.detail ?? ''})` } };
  const document = parsed.document;
  if (!shared.isValidMapId(document.id)) return { status: 400, body: { ok: false, reason: 'invalid-id' } };
  if ((shared.BATTLE_MAP_IDS as readonly string[]).includes(document.id)) return { status: 409, body: { ok: false, reason: 'builtin-id' } };
  const problems = shared.validateEditableMap(shared.fromMapDocument(document));
  shared.setActiveMap(shared.VILA_MILITAR);
  const errors = problems.filter((problem) => problem.severity === 'error');
  if (errors.length > 0) return { status: 422, body: { ok: false, reason: errors.map((problem) => problem.code).join(', ') } };
  const folder = dir ?? checks.AUTHORED_DIR;
  const path = resolve(folder, `${document.id}.map.json`);
  writeFileSync(path, `${JSON.stringify(document, null, 1)}\n`);
  checks.writeIndex(folder);
  return { status: 200, body: { ok: true, file: relative(dir ? folder : root, path).replace(/\\/g, '/') } };
}

export function mapSavePlugin(): Plugin {
  return {
    name: 'prestes-map-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor/save-map', (request, response) => {
        const reply = (status: number, body: object): void => {
          response.statusCode = status;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(body));
        };
        if (request.method !== 'POST') {
          reply(405, { ok: false, reason: 'method' });
          return;
        }
        readBody(request)
          .then((text) => saveMapDocument(server, text))
          .then(({ status, body }) => reply(status, body))
          .catch((error: unknown) => reply(500, { ok: false, reason: error instanceof Error ? error.message : 'error' }));
      });
    },
  };
}
