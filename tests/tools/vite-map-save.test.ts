import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listMapDocuments, readMapDocument, saveMapDocument, saveMapThumbnail } from '../../apps/game/vite-map-save';
import { createEditableMap, toMapDocument } from '../../packages/shared/src';
import { writeIndex } from '../../tools/check-maps';

// add-map-editor: the dev server's "Save to project", on a scratch authored folder.

const server = { ssrLoadModule: (path: string) => import(pathToFileURL(path).href) as Promise<Record<string, unknown>> };
const ID = 'zz-teste-salvar';
let dir = '';

function documentText(patch: Record<string, unknown> = {}, id = ID): string {
  const map = createEditableMap({ id, size: 'small', name: { en: 'Save test', 'pt-BR': 'Teste de salvar' } });
  return JSON.stringify({ ...toMapDocument(map), ...patch });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'prestes-authored-'));
  writeIndex(dir);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('save to project', () => {
  it('writes <id>.map.json into the authored folder and lists it in the index', async () => {
    const result = await saveMapDocument(server, documentText(), dir);
    expect(result).toEqual({ status: 200, body: { ok: true, file: `${ID}.map.json` } });
    expect(readdirSync(dir).sort()).toEqual(['index.ts', `${ID}.map.json`]);
    expect(readFileSync(resolve(dir, 'index.ts'), 'utf8')).toContain(`${ID}.map.json`);
  });

  it('takes the file name from the validated id only', async () => {
    const result = await saveMapDocument(server, documentText({ id: '../../escape' }), dir);
    expect(result.status).toBe(400);
    expect(readdirSync(dir)).toEqual(['index.ts']);
    expect(existsSync(resolve(dir, '..', '..', 'escape.map.json'))).toBe(false);
  });

  it('refuses a built-in id, damaged JSON and a campaign map without its source note', async () => {
    expect((await saveMapDocument(server, documentText({ id: 'fazenda' }), dir)).status).toBe(409);
    expect((await saveMapDocument(server, '{ not json', dir)).status).toBe(400);
    const campaign = await saveMapDocument(server, documentText({ use: 'campaign' }), dir);
    expect(campaign.status).toBe(422);
    expect(campaign.body.reason).toContain('source-note-missing');
    expect(readdirSync(dir)).toEqual(['index.ts']);
  });
});

// author-game-maps 4.1, 4.2: one map per mission, and the Open dialog's list.
describe('campaign slots', () => {
  const campaign = (id: string) =>
    documentText({ use: 'campaign', mission: 'anel-de-ferro', setting: { label: 'historical-setting-fictional-place', sourceNote: 'Campaign book, chapter 02.' } }, id);

  it('refuses a mission another map holds, and replacing keeps the other map as a skirmish map', async () => {
    expect((await saveMapDocument(server, campaign('zz-anel-a'), dir)).status).toBe(200);
    const taken = await saveMapDocument(server, campaign('zz-anel-b'), dir);
    expect(taken).toEqual({ status: 409, body: { ok: false, reason: 'mission-taken', holder: 'zz-anel-a' } });
    expect(existsSync(resolve(dir, 'zz-anel-b.map.json'))).toBe(false);
    // Saving the holder again is not a conflict.
    expect((await saveMapDocument(server, campaign('zz-anel-a'), dir)).status).toBe(200);
    const replaced = await saveMapDocument(server, campaign('zz-anel-b'), dir, { replace: true });
    expect(replaced.body).toMatchObject({ ok: true, moved: 'zz-anel-a' });
    const old = JSON.parse(readFileSync(resolve(dir, 'zz-anel-a.map.json'), 'utf8')) as { use: string; mission?: string };
    expect(old.use).toBe('skirmish');
    expect(old.mission).toBeUndefined();
  });

  it('refuses a campaign map without its mission', async () => {
    const result = await saveMapDocument(server, documentText({ use: 'campaign', setting: { label: 'historical-setting-fictional-place', sourceNote: 'A note.' } }), dir);
    expect(result.status).toBe(422);
    expect(result.body.reason).toContain('mission-missing');
  });

  it('lists the folder maps with their slot, and reads one by checked id', async () => {
    await saveMapDocument(server, campaign('zz-anel-a'), dir);
    await saveMapDocument(server, documentText(), dir);
    const list = (await listMapDocuments(server, dir)).body as { maps: { id: string; use: string; mission?: string }[] };
    expect(list.maps.map(({ id, use, mission }) => ({ id, use, mission })).sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'zz-anel-a', use: 'campaign', mission: 'anel-de-ferro' },
      { id: ID, use: 'skirmish', mission: undefined },
    ]);
    const one = await readMapDocument(server, ID, dir);
    expect(one.status).toBe(200);
    expect((JSON.parse(one.text) as { id: string }).id).toBe(ID);
    expect((await readMapDocument(server, '../escape', dir)).status).toBe(400);
    expect((await readMapDocument(server, 'zz-nada', dir)).status).toBe(404);
  });
});

// author-game-maps 5.4: the editor's framed view becomes the saved map's preview.
describe('map thumbnail', () => {
  // A 1x1 PNG.
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==';

  it('writes <id>.png for a saved map and the index records the preview', async () => {
    const previews = mkdtempSync(join(tmpdir(), 'prestes-previews-'));
    try {
      expect((await saveMapThumbnail(server, ID, PNG, dir, previews)).body).toEqual({ ok: false, reason: 'save-first' });
      await saveMapDocument(server, documentText(), dir);
      const result = await saveMapThumbnail(server, ID, PNG, dir, previews);
      expect(result).toEqual({ status: 200, body: { ok: true, file: `${ID}.png` } });
      expect(readFileSync(resolve(previews, `${ID}.png`)).subarray(1, 4).toString()).toBe('PNG');
      expect(readFileSync(resolve(dir, 'index.ts'), 'utf8')).toContain('"preview":true');
      expect((await saveMapThumbnail(server, ID, 'data:text/plain,hi', dir, previews)).status).toBe(400);
      expect((await saveMapThumbnail(server, '../escape', PNG, dir, previews)).status).toBe(400);
    } finally {
      rmSync(previews, { recursive: true, force: true });
    }
  });
});
