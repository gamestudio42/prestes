import { useEffect, useState } from 'react';
import { renderThumbnails } from '@prestes/view3d';

/**
 * refine-map-editor 5.1: prop thumbnails for the editor's panels, rendered
 * once per session and shared by every panel that asks.
 */
const cache = new Map<string, string>();
let pending: Promise<void> | null = null;
const waiting = new Set<string>();

function request(models: readonly string[]): Promise<void> {
  for (const model of models) if (!cache.has(model)) waiting.add(model);
  if (waiting.size === 0) return Promise.resolve();
  if (!pending) {
    pending = (async () => {
      while (waiting.size > 0) {
        const batch = [...waiting];
        waiting.clear();
        const pictures = await renderThumbnails(batch, 64);
        for (const [model, picture] of pictures) cache.set(model, picture);
      }
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export function useThumbnails(models: readonly string[]): ReadonlyMap<string, string> {
  const [, setVersion] = useState(0);
  const key = models.join('|');
  useEffect(() => {
    let live = true;
    void request(models).then(
      () => live && setVersion((version) => version + 1),
      () => undefined,
    );
    return () => {
      live = false;
    };
    // The key stands for the list: one request per distinct list.
  }, [key]);
  return cache;
}
