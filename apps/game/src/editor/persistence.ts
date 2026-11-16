import { parseMapDocument, type AuthoredMapEntry, type MapDocument, type ParseResult } from '@prestes/shared';

/**
 * Where the editor keeps maps in the browser (add-map-editor): IndexedDB,
 * one record per map id, plus the last open id and the playtest map. Every
 * call tolerates a browser without storage (private windows): it resolves
 * to nothing and the editor keeps working in memory.
 */

const DB_NAME = 'prestes-editor';
const STORE = 'maps';
const LAST_KEY = '__last__';
export const PLAYTEST_KEY = '__playtest__';

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function put(key: string, value: unknown): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(value, key);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function get(key: string): Promise<unknown> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result as unknown);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function autosave(document: MapDocument): Promise<boolean> {
  const saved = await put(document.id, document);
  if (saved) await put(LAST_KEY, document.id);
  return saved;
}

/** make-campaign-playable D6: the browser's autosave of one map id, if any. */
export async function loadStored(id: string): Promise<MapDocument | null> {
  const result = parseMapDocument(await get(id));
  return result.ok ? result.document : null;
}

/** The last map the editor had open, if the browser kept it. */
export async function loadLast(): Promise<MapDocument | null> {
  const id = await get(LAST_KEY);
  if (typeof id !== 'string') return null;
  const result = parseMapDocument(await get(id));
  return result.ok ? result.document : null;
}

export async function storePlaytest(document: MapDocument): Promise<boolean> {
  return put(PLAYTEST_KEY, document);
}

export async function loadPlaytest(): Promise<MapDocument | null> {
  const result = parseMapDocument(await get(PLAYTEST_KEY));
  return result.ok ? result.document : null;
}

/** Offers the document as a `<id>.map.json` download. */
export function exportDocument(document: MapDocument): void {
  const blob = new Blob([JSON.stringify(document, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${document.id}.map.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readDocumentFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    return parseMapDocument(JSON.parse(text) as unknown);
  } catch {
    return { ok: false, error: 'not-a-map', detail: 'json' };
  }
}

export type SaveResult = { ok: true; file: string; moved?: string } | { ok: false; reason: string; holder?: string };

/**
 * Dev server only: writes the document into the project's authored maps
 * folder. A mission another map holds comes back as `mission-taken` with
 * that map's id, unless `replace` (the other map then becomes a skirmish map).
 */
export async function saveToProject(document: MapDocument, replace = false): Promise<SaveResult> {
  try {
    const response = await fetch(`/__editor/save-map${replace ? '?replace=1' : ''}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(document),
    });
    const body = (await response.json()) as { ok?: boolean; file?: string; reason?: string; holder?: string; moved?: string };
    if (response.ok && body.ok && body.file) return { ok: true, file: body.file, ...(body.moved ? { moved: body.moved } : {}) };
    return { ok: false, reason: body.reason ?? String(response.status), ...(body.holder ? { holder: body.holder } : {}) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'network' };
  }
}

/** author-game-maps 4.2, dev server only: the project's maps (empty when there is no dev server). */
export async function listProjectMaps(): Promise<AuthoredMapEntry[]> {
  try {
    const response = await fetch('/__editor/maps');
    const body = (await response.json()) as { ok?: boolean; maps?: AuthoredMapEntry[] };
    return response.ok && body.ok && body.maps ? body.maps : [];
  } catch {
    return [];
  }
}

/** One project map, read and checked like an imported file. */
export async function loadProjectMap(id: string): Promise<ParseResult> {
  try {
    const response = await fetch(`/__editor/map?id=${encodeURIComponent(id)}`);
    if (!response.ok) return { ok: false, error: 'not-a-map', detail: String(response.status) };
    return parseMapDocument(JSON.parse(await response.text()) as unknown);
  } catch {
    return { ok: false, error: 'not-a-map', detail: 'network' };
  }
}

/** author-game-maps, dev server only: the editor's current view becomes the saved map's thumbnail. */
export async function saveThumbnail(id: string, dataUrl: string): Promise<{ ok: true; file: string } | { ok: false; reason: string }> {
  try {
    const response = await fetch(`/__editor/thumbnail?id=${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: dataUrl });
    const body = (await response.json()) as { ok?: boolean; file?: string; reason?: string };
    if (response.ok && body.ok && body.file) return { ok: true, file: body.file };
    return { ok: false, reason: body.reason ?? String(response.status) };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
