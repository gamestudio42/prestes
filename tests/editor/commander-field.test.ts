import { describe, expect, it } from 'vitest';
import { createEditableMap, validateEditableMap } from '../../packages/shared/src';
import { CAMPAIGN_CHAPTERS, validateMapCommander } from '../../packages/content/src';
import { commanderChoices, defaultCommander, offersCommander } from '../../apps/game/src/editor/CommanderField';

// add-historical-commander 4.1: the Commander section of the map properties.
describe('editor commander field', () => {
  it('skirmish map in the editor: no Commander panel is offered', () => {
    expect(offersCommander('skirmish')).toBe(false);
    expect(offersCommander('test')).toBe(false);
    expect(offersCommander('campaign')).toBe(true);
  });

  it('the author picks among playable figures, and a new commander is the chapter’s on the field', () => {
    expect(commanderChoices().map((figure) => figure.id)).toEqual(['siqueira-campos', 'luis-carlos-prestes', 'miguel-costa', 'isidoro-dias-lopes']);
    expect(defaultCommander('a-divisao')).toEqual({ figure: 'miguel-costa', presence: 'field', loss: 'defeat' });
  });

  it('setting the commander: Miguel Costa, field, defeat on an in-memory Porto Mendes passes the checks', () => {
    const map = createEditableMap({ id: 'porto-mendes', size: 'small', use: 'campaign', mission: 'a-divisao', name: { en: 'X', 'pt-BR': 'X' } });
    map.columnForce = { sections: ['comando', 'fuzileiros', 'esquadra-5'] };
    map.commander = defaultCommander(map.mission);
    expect(validateEditableMap(map).filter((problem) => problem.code.startsWith('commander-'))).toEqual([]);
    expect(validateMapCommander(map, CAMPAIGN_CHAPTERS)).toEqual([]);
  });
});
