/**
 * make-campaign-playable D6: what the editor opens when the campaign book's
 * "Edit this map" sends it to `editor.html?map=<id>` (or `?mission=<chapter>`
 * for a chapter without a map).
 */
import type { MapDocument } from '@prestes/shared';

export type OpenRequest = { kind: 'map'; id: string } | { kind: 'mission'; mission: string } | { kind: 'last' };

/** The request in the editor's address; without one, the last map the editor had open. */
export function openRequest(search: string): OpenRequest {
  const params = new URLSearchParams(search);
  const id = params.get('map');
  if (id) return { kind: 'map', id };
  const mission = params.get('mission');
  if (mission) return { kind: 'mission', mission };
  return { kind: 'last' };
}

/**
 * Which copy of a map to open: the project's, unless the browser holds an
 * unsaved copy of the same id that differs from it, when the owner is asked.
 */
export function openChoice(project: MapDocument, local: MapDocument | null): 'project' | 'ask' {
  if (!local || local.id !== project.id) return 'project';
  return JSON.stringify(local) === JSON.stringify(project) ? 'project' : 'ask';
}
