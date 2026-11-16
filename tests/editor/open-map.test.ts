import { describe, expect, it } from 'vitest';
import { createEditableMap, toMapDocument } from '../../packages/shared/src';
import { openChoice, openRequest } from '../../apps/game/src/editor/open-map';
import { editMapHref } from '../../apps/game/src/campaign/dev-edit';

// make-campaign-playable 3.1: the campaign book's edit link and what the editor opens.
describe('make-campaign-playable 3.1: opening a project map in the editor', () => {
  const project = toMapDocument(createEditableMap({ id: 'serra-nova', size: 'medium', use: 'campaign', name: { en: 'Serra Nova', 'pt-BR': 'Serra Nova' } }));

  it('reads the request from the address', () => {
    expect(openRequest('?map=serra-nova')).toEqual({ kind: 'map', id: 'serra-nova' });
    expect(openRequest('?mission=la-gaiba')).toEqual({ kind: 'mission', mission: 'la-gaiba' });
    expect(openRequest('')).toEqual({ kind: 'last' });
  });

  it('links to the map, or to New on the chapter slot when the chapter has none', () => {
    expect(editMapHref('serra-nova', 'serra-nova')).toBe('./editor.html?map=serra-nova');
    expect(editMapHref('la-gaiba', undefined)).toBe('./editor.html?mission=la-gaiba');
  });

  it('opens the project map without an autosave, or with an equal one', () => {
    expect(openChoice(project, null)).toBe('project');
    expect(openChoice(project, structuredClone(project))).toBe('project');
  });

  it('asks when the autosave of the same id differs, and ignores another id', () => {
    expect(openChoice(project, { ...project, name: { en: 'Serra Nova (draft)', 'pt-BR': 'Serra Nova (rascunho)' } })).toBe('ask');
    expect(openChoice(project, { ...project, id: 'outro' })).toBe('project');
  });
});
