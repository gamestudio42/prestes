import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
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
 *
 * author-game-maps 4.1, 4.2: a campaign map for a mission another map holds
 * is refused (409 `mission-taken`) unless the request says `replace`; then
 * the other map is kept as a skirmish map (nothing is deleted). GET
 * /__editor/maps lists the folder's maps; GET /__editor/map?id= returns one.
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
export async function saveMapDocument(
  server: Pick<ViteDevServer, 'ssrLoadModule'>,
  text: string,
  dir?: string,
  options: { replace?: boolean } = {},
): Promise<{ status: number; body: { ok: boolean; file?: string; reason?: string; holder?: string; moved?: string } }> {
  const shared = (await server.ssrLoadModule(resolve(root, 'packages/shared/src/index.ts'))) as Shared;
  const checks = (await server.ssrLoadModule(resolve(root, 'tools/check-maps.ts'))) as CheckMaps;
  const parsed = shared.parseMapDocumentText(text);
  if (!parsed.ok) return { status: 400, body: { ok: false, reason: `${parsed.error} (${parsed.detail ?? ''})` } };
  const document = parsed.document;
  if (!shared.isValidMapId(document.id)) return { status: 400, body: { ok: false, reason: 'invalid-id' } };
  const problems = shared.validateEditableMap(shared.fromMapDocument(document));
  const errors = problems.filter((problem) => problem.severity === 'error');
  if (errors.length > 0) return { status: 422, body: { ok: false, reason: errors.map((problem) => problem.code).join(', ') } };
  const folder = dir ?? checks.AUTHORED_DIR;
  // One map per mission: another map holding it is kept, as a skirmish map, only when the author said replace.
  let moved: string | undefined;
  if (document.use === 'campaign' && document.mission) {
    const holder = checks.authoredEntries(folder).find((entry) => entry.use === 'campaign' && entry.mission === document.mission && entry.id !== document.id);
    if (holder && !options.replace) return { status: 409, body: { ok: false, reason: 'mission-taken', holder: holder.id } };
    if (holder) {
      const holderPath = resolve(folder, `${holder.id}.map.json`);
      const held = shared.parseMapDocumentText(readFileSync(holderPath, 'utf8'));
      if (held.ok) {
        const { mission: _mission, ...rest } = held.document;
        void _mission;
        writeFileSync(holderPath, `${JSON.stringify({ ...rest, use: 'skirmish' }, null, 1)}\n`);
        moved = holder.id;
      }
    }
  }
  const path = resolve(folder, `${document.id}.map.json`);
  writeFileSync(path, `${JSON.stringify(document, null, 1)}\n`);
  checks.writeIndex(folder);
  return { status: 200, body: { ok: true, file: relative(dir ? folder : root, path).replace(/\\/g, '/'), ...(moved ? { moved } : {}) } };
}

/**
 * author-game-maps: the map's thumbnail, framed by the author in the editor:
 * a PNG data URL written as the map's preview (the desk and the setup screen
 * show it); the index is rewritten so it records the preview.
 */
export async function saveMapThumbnail(
  server: Pick<ViteDevServer, 'ssrLoadModule'>,
  id: string,
  dataUrl: string,
  dir?: string,
  previews?: string,
): Promise<{ status: number; body: { ok: boolean; file?: string; reason?: string } }> {
  const shared = (await server.ssrLoadModule(resolve(root, 'packages/shared/src/index.ts'))) as Shared;
  const checks = (await server.ssrLoadModule(resolve(root, 'tools/check-maps.ts'))) as CheckMaps;
  if (!shared.isValidMapId(id)) return { status: 400, body: { ok: false, reason: 'invalid-id' } };
  const folder = dir ?? checks.AUTHORED_DIR;
  if (!existsSync(resolve(folder, `${id}.map.json`))) return { status: 404, body: { ok: false, reason: 'save-first' } };
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) return { status: 400, body: { ok: false, reason: 'not-a-png' } };
  const out = previews ?? checks.PREVIEW_DIR;
  const path = resolve(out, `${id}.png`);
  writeFileSync(path, Buffer.from(dataUrl.slice(prefix.length), 'base64'));
  checks.writeIndex(folder, out);
  return { status: 200, body: { ok: true, file: relative(previews ? out : root, path).split(sep).join('/') } };
}

/** author-game-maps 4.2: the folder's maps, as the index lists them. */
export async function listMapDocuments(server: Pick<ViteDevServer, 'ssrLoadModule'>, dir?: string): Promise<{ status: number; body: object }> {
  const checks = (await server.ssrLoadModule(resolve(root, 'tools/check-maps.ts'))) as CheckMaps;
  return { status: 200, body: { ok: true, maps: checks.authoredEntries(dir ?? checks.AUTHORED_DIR) } };
}

/** One map document by id (the id is checked; the file name comes from it). */
export async function readMapDocument(server: Pick<ViteDevServer, 'ssrLoadModule'>, id: string, dir?: string): Promise<{ status: number; text: string }> {
  const shared = (await server.ssrLoadModule(resolve(root, 'packages/shared/src/index.ts'))) as Shared;
  const checks = (await server.ssrLoadModule(resolve(root, 'tools/check-maps.ts'))) as CheckMaps;
  if (!shared.isValidMapId(id)) return { status: 400, text: JSON.stringify({ ok: false, reason: 'invalid-id' }) };
  const path = resolve(dir ?? checks.AUTHORED_DIR, `${id}.map.json`);
  if (!existsSync(path)) return { status: 404, text: JSON.stringify({ ok: false, reason: 'not-found' }) };
  return { status: 200, text: readFileSync(path, 'utf8') };
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
        const replace = new URL(request.url ?? '', 'http://localhost').searchParams.get('replace') === '1';
        readBody(request)
          .then((text) => saveMapDocument(server, text, undefined, { replace }))
          .then(({ status, body }) => reply(status, body))
          .catch((error: unknown) => reply(500, { ok: false, reason: error instanceof Error ? error.message : 'error' }));
      });
      server.middlewares.use('/__editor/thumbnail', (request, response) => {
        const id = new URL(request.url ?? '', 'http://localhost').searchParams.get('id') ?? '';
        const reply = (status: number, body: object) => {
          response.statusCode = status;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(body));
        };
        if (request.method !== 'POST') return reply(405, { ok: false });
        readBody(request)
          .then((text) => saveMapThumbnail(server, id, text.trim()))
          .then(({ status, body }) => reply(status, body))
          .catch((error: unknown) => reply(500, { ok: false, reason: error instanceof Error ? error.message : 'error' }));
      });
      server.middlewares.use('/__editor/maps', (request, response) => {
        listMapDocuments(server)
          .then(({ status, body }) => {
            response.statusCode = status;
            response.setHeader('content-type', 'application/json');
            response.end(JSON.stringify(body));
          })
          .catch(() => {
            response.statusCode = 500;
            response.end('{"ok":false}');
          });
      });
      server.middlewares.use('/__editor/map', (request, response) => {
        const id = new URL(request.url ?? '', 'http://localhost').searchParams.get('id') ?? '';
        readMapDocument(server, id)
          .then(({ status, text }) => {
            response.statusCode = status;
            response.setHeader('content-type', 'application/json');
            response.end(text);
          })
          .catch(() => {
            response.statusCode = 500;
            response.end('{"ok":false}');
          });
      });
    },
  };
}
