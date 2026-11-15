import { describe, expect, it } from 'vitest';
import { translate, type Locale } from '../../packages/content/src';
import { commanderDownText, commanderView } from '../../apps/game/src/ui/hud/commander';

// add-historical-commander 3.1 and 3.3: the figure's name on the card and the line when he falls.
const tFor = (locale: Locale) => (key: Parameters<typeof translate>[1], values?: Readonly<Record<string, string | number>>) => translate(locale, key, values);

describe('historical commander in the HUD', () => {
  it('name in the panel: the registry name, untranslated, with the role in the game language', () => {
    const view = commanderView({ figure: 'luis-carlos-prestes', presence: 'field', loss: 'defeat' })!;
    expect(view.name).toBe('Luís Carlos Prestes');
    expect(tFor('pt-BR')(view.roleKey)).toBe('Capitão; chefe do Estado-Maior da coluna');
    expect(tFor('en')(view.roleKey)).toBe('Captain; chief of staff of the column');
  });

  it('a voice, no commander or an unknown figure names no one', () => {
    expect(commanderView({ figure: 'isidoro-dias-lopes', presence: 'voice', loss: 'continue' })).toBeNull();
    expect(commanderView(undefined)).toBeNull();
    expect(commanderView({ figure: 'cordeiro', presence: 'field', loss: 'defeat' })).toBeNull();
  });

  it('loss reported in English, and in Portuguese, with his name', () => {
    const view = commanderView({ figure: 'siqueira-campos', presence: 'field', loss: 'continue' })!;
    expect(commanderDownText({ type: 'commander_down', tick: 1, unitId: 3, cause: 'killed' }, view, tFor('en'))).toBe('Antônio de Siqueira Campos has fallen.');
    expect(commanderDownText({ type: 'commander_down', tick: 1, unitId: 3, cause: 'incapacitated' }, view, tFor('pt-BR'))).toBe('Antônio de Siqueira Campos está ferido e fora de combate.');
  });
});
