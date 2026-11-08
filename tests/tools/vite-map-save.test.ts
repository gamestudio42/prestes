import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveMapDocument } from '../../apps/game/vite-map-save';
import { createEditableMap, toMapDocument } from '../../packages/shared/src';
import { writeIndex } from '../../tools/check-maps';

// add-map-editor: the dev server's "Save to project", on a scratch authored folder.

const server = { ssrLoadModule: (path: string) => import(pathToFileURL(path).href) as Promise<Record<string, unknown>> };
const ID = 'zz-teste-salvar';
let dir = '';

function documentText(patch: Record<string, unknown> = {}): string {
  const map = createEditableMap({ id: ID, size: 'small', name: { en: 'Save test', 'pt-BR': 'Teste de salvar' } });
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
