// React lives in the game app's dependencies; the test imports it from there (the component under test resolves the same copy).
// @ts-expect-error React's type declarations are installed for the game app only.
import { createElement } from '../../apps/game/node_modules/react';
// @ts-expect-error As above.
import { renderToStaticMarkup } from '../../apps/game/node_modules/react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Frame, WithdrawalSnapshot } from '../../packages/shared/src';
import { BattleEndPanel } from '../../apps/game/src/ui/BattleEndPanel';

// add-withdrawal-exits 3.2: the end panel counts the men who got out, whatever the result.
const noop = () => undefined;

function frameWith(outcome: Frame['outcome'], decidedBy: 'withdrawal' | 'cut-off', withdrawal: WithdrawalSnapshot): Frame {
  return {
    tick: 3000,
    units: [],
    orders: [],
    covers: [],
    events: [{ type: 'outcome', tick: 3000, outcome, decidedBy, withdrawal }],
    outcome,
    hash: '',
    withdrawal,
  };
}

const render = (frame: Frame, locale: 'pt-BR' | 'en') => renderToStaticMarkup(createElement(BattleEndPanel, { locale, frame, onRestart: noop, onMenu: noop }));

describe('the end panel after a withdrawal', () => {
  const won: WithdrawalSnapshot = { menOut: 31, sectionsOut: 2, sections: 3, required: 2, command: false, commandOut: false };

  it('victory with losses shows the men out, in both languages', () => {
    const pt = render(frameWith('victory', 'withdrawal', won), 'pt-BR');
    expect(pt).toContain('Saíram 31 homens · seções fora 2 de 3 (exigidas 2)');
    expect(pt).toContain('retirada');
    const en = render(frameWith('victory', 'withdrawal', won), 'en');
    expect(en).toContain('31 men got out · sections out 2 of 3 (2 required)');
  });

  it('cut off still counts the saved', () => {
    const html = render(frameWith('defeat', 'cut-off', { ...won, menOut: 12, sectionsOut: 1 }), 'pt-BR');
    expect(html).toContain('coluna cercada');
    expect(html).toContain('Saíram 12 homens');
    expect(html).toContain('data-testid="battle-end-column-exited">12<');
  });
});
