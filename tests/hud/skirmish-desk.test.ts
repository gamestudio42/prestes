// React lives in the game app's dependencies; the test imports it from there (the component under test resolves the same copy).
// @ts-expect-error React's type declarations are installed for the game app only.
import { createElement } from '../../apps/game/node_modules/react';
// @ts-expect-error As above.
import { renderToStaticMarkup } from '../../apps/game/node_modules/react-dom/server';
import { describe, expect, it } from 'vitest';
import { loadSkirmishMaps, skirmishMaps } from '../../packages/shared/src';
import { SkirmishMaps } from '../../apps/game/src/ui/menu/SkirmishMaps';

// author-game-maps 5.2: the desk fans the authored skirmish maps; the test map only on the dev server.

const noop = () => undefined;

describe('skirmish desk', () => {
  it('lists authored skirmish maps only, and the test map only when asked', async () => {
    const withTest = await loadSkirmishMaps({ includeTest: true });
    expect(withTest.map((map) => map.id)).toContain('campo-de-provas');
    expect(withTest.map((map) => map.id)).not.toContain('fazenda-doc');
    expect(skirmishMaps().map((map) => map.id)).not.toContain('campo-de-provas');
    for (const id of ['vila-militar', 'fazenda', 'serra-rio', 'bairro']) expect(withTest.map((map) => map.id)).not.toContain(id);
  });

  it('shows the empty sheet pointing to the editor when there is no map, in both languages', () => {
    const pt = renderToStaticMarkup(createElement(SkirmishMaps, { locale: 'pt-BR', maps: [], battleMap: 'x', onOpenSetup: noop, onSelect: noop }));
    expect(pt).toContain('data-testid="skirmish-empty"');
    expect(pt).toContain('Nenhum mapa ainda — abra o editor');
    expect(pt).not.toContain('open-skirmish');
    const en = renderToStaticMarkup(createElement(SkirmishMaps, { locale: 'en', maps: [], battleMap: 'x', onOpenSetup: noop, onSelect: noop }));
    expect(en).toContain('No maps yet — open the editor');
  });

  it('lays one sheet per map, the chosen one on top with its own name and thumbnail', async () => {
    const test = (await loadSkirmishMaps({ includeTest: true })).find((map) => map.id === 'campo-de-provas')!;
    const maps = [test, { ...test, id: 'zz-outro', text: { name: { en: 'Other', 'pt-BR': 'Outro' }, description: test.text!.description } }];
    const html = renderToStaticMarkup(createElement(SkirmishMaps, { locale: 'pt-BR', maps, battleMap: 'zz-outro', onOpenSetup: noop, onSelect: noop }));
    expect(html).toContain('data-count="2"');
    expect(html).toContain('data-testid="skirmish-sheet-campo-de-provas"');
    expect(html).toContain('data-testid="select-skirmish-campo-de-provas"');
    expect(html).toContain('maps/zz-outro.png');
    expect(html).toMatch(/desk-map-sheet active"[^>]*data-testid="skirmish-sheet-zz-outro"/);
    expect(html).toContain('>Outro<');
  });
});
