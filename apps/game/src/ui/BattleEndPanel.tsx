import { translate, type Locale, type MessageKey } from '@prestes/content';
import type { Frame, UnitSnapshot } from '@prestes/shared';
import { Restart } from './icons';

export interface BattleEndPanelProps {
  locale: Locale;
  frame: Frame;
  onRestart: () => void;
  onMenu: () => void;
}

function formatTicks(ticks: number): string {
  const total = Math.max(0, Math.ceil(ticks / 10));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

interface Losses {
  dead: number;
  wounded: number;
  routed: number;
}

function losses(units: readonly UnitSnapshot[], faction: 'column' | 'legalist'): Losses {
  const side = units.filter((unit) => unit.faction === faction);
  return {
    dead: side.filter((unit) => !unit.alive && !unit.routed).length,
    wounded: side.filter((unit) => unit.alive && unit.incapacitated).length,
    routed: side.filter((unit) => unit.routed).length,
  };
}

/** The 3 vs 3 battle's end (battle-feel-3v3): result, time, each side's losses. */
export function BattleEndPanel({ locale, frame, onRestart, onMenu }: BattleEndPanelProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const victory = frame.outcome === 'victory';
  const sides = [
    ['column', losses(frame.units, 'column')],
    ['legalist', losses(frame.units, 'legalist')],
  ] as const;
  return (
    <div className="overlay" data-testid="battle-end">
      <section className="codex battle-end" role="dialog" aria-labelledby="battle-end-title">
        <div className="tutorial-graduation">
          <strong id="battle-end-title" data-testid="battle-end-result">
            {victory ? t('battle.end.victory') : t('battle.end.defeat')}
          </strong>
          <p>{victory ? t('battle.end.victoryText') : t('battle.end.defeatText')}</p>
        </div>
        <dl className="training-debrief-grid">
          <dt>{t('battle.end.time')}</dt>
          <dd data-testid="battle-end-time">{formatTicks(frame.tick)}</dd>
        </dl>
        <table className="battle-end-losses">
          <thead>
            <tr>
              <th scope="col">{t('battle.end.losses')}</th>
              <th scope="col">{t('battle.end.dead')}</th>
              <th scope="col">{t('battle.end.wounded')}</th>
              <th scope="col">{t('battle.end.routed')}</th>
            </tr>
          </thead>
          <tbody>
            {sides.map(([faction, side]) => (
              <tr key={faction} data-testid={`battle-end-${faction}`}>
                <th scope="row">{t(`battle.end.${faction}` as MessageKey)}</th>
                <td>{side.dead}</td>
                <td>{side.wounded}</td>
                <td>{side.routed}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="battle-end-actions">
          <button type="button" className="primary" onClick={onRestart} data-testid="battle-end-restart" autoFocus>
            <Restart aria-hidden="true" size={15} />
            {t('battle.end.restart')}
          </button>
          <button type="button" onClick={onMenu} data-testid="battle-end-menu">
            {t('battle.end.menu')}
          </button>
        </div>
      </section>
    </div>
  );
}
