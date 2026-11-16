/**
 * make-campaign-playable D6: the campaign book's link to the editor, on the
 * dev server only. Used only behind `import.meta.env.DEV`, so the published
 * build drops this module and its words (tools/check-bundle.ts checks).
 */
import type { Locale } from '@prestes/content';

export const EDIT_MAP_LABEL: Readonly<Record<Locale, string>> = { en: 'Edit this map', 'pt-BR': 'Editar este mapa' };

/** The editor on the chapter's map, or on New with the chapter's slot when it has none. */
export function editMapHref(chapterId: string, mapId: string | undefined): string {
  return mapId ? `./editor.html?map=${encodeURIComponent(mapId)}` : `./editor.html?mission=${encodeURIComponent(chapterId)}`;
}
