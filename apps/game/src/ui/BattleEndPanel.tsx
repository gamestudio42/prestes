import { translate, type Locale, type MessageKey } from '@prestes/content';
import type { Frame, LocalizedText, UnitSnapshot } from '@prestes/shared';
import { Restart } from './icons';

export interface BattleEndPanelProps {
  locale: Locale;
  frame: Frame;
  onRestart: () => void;
  onMenu: () => void;
  /** add-map-editor: a playtest returns to the editor. */
  onBackToEditor?: () => void;
  /** The map's epilogue (a mission's legend and record), under the result. */
  epilogue?: LocalizedText;
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

/** The 3 vs 3 battle's end (battle-feel-3v3): result, time, losses, and with objectives how it was decided. */
export function BattleEndPanel({ locale, frame, onRestart, onMenu, onBackToEditor, epilogue }: BattleEndPanelProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const end = frame.events.find((event) => event.type === 'outcome');
  const decidedBy = end?.type === 'outcome' ? end.decidedBy : undefined;
  const objectives = frame.objectives ?? [];
  const values =
    (end?.type === 'outcome' ? end.values : undefined) ??
    objectives.reduce(
      (sum, objective) => {
        if (objective.owner === 'column') sum.column += objective.value;
        else if (objective.owner === 'legalist') sum.legalist += objective.value;
        return sum;
      },
      { column: 0, legalist: 0 },
    );
  const sides = [
    ['column', losses(frame.units, 'column')],
    ['legalist', losses(frame.units, 'legalist')],
  ] as const;
  const resultKey: MessageKey =
    frame.outcome === 'victory'
      ? 'battle.end.victory'
      : frame.outcome === 'draw'
        ? 'battle.end.draw'
        : 'battle.end.defeat';
  const textKey: MessageKey =
    frame.outcome === 'victory'
      ? 'battle.end.victoryText'
      : frame.outcome === 'draw'
        ? 'battle.end.drawText'
        : 'battle.end.defeatText';
  return (
    <div className="overlay" data-testid="battle-end">
      <section className="codex battle-end" role="dialog" aria-labelledby="battle-end-title">
        <div className="tutorial-graduation">
          <strong id="battle-end-title" data-testid="battle-end-result">
            {t(resultKey)}
          </strong>
          <p>{t(textKey)}</p>
        </div>
        {epilogue ? (
          <div className="battle-end-epilogue" data-testid="battle-end-epilogue">
            {(epilogue[locale] || epilogue.en || epilogue['pt-BR']).split('\n').filter((line) => line.trim()).map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        ) : null}
        <dl className="training-debrief-grid">
          <dt>{t('battle.end.time')}</dt>
          <dd data-testid="battle-end-time">{formatTicks(frame.tick)}</dd>
          {decidedBy !== undefined ? (
            <>
              <dt>{t('battle.end.decided')}</dt>
              <dd data-testid="battle-end-decided">{t(`battle.end.decided.${decidedBy}` as MessageKey)}</dd>
            </>
          ) : null}
          {objectives.length > 0 ? (
            <>
              <dt>{t('battle.end.value')}</dt>
              <dd data-testid="battle-end-values">
                {t('battle.end.column')} {values.column} · {t('battle.end.legalist')} {values.legalist}
              </dd>
            </>
          ) : null}
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
        {objectives.length > 0 ? (
          <div className="battle-end-objectives" data-testid="battle-end-objectives">
            <h4>{t('battle.end.objectives')}</h4>
            <table className="battle-end-losses">
              <thead>
                <tr>
                  <th scope="col">{t('battle.end.objectives')}</th>
                  <th scope="col">{t('battle.end.value')}</th>
                </tr>
              </thead>
              <tbody>
                {objectives.map((objective) => (
                  <tr key={objective.id} data-testid={`battle-end-objective-${objective.id}`} data-owner={objective.owner}>
                    <th scope="row">
                      {objective.name[locale]} · {t(`objective.${objective.owner}` as MessageKey)}
                    </th>
                    <td>{objective.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p data-testid="battle-end-objective-total">
              {t('battle.end.total')}: {t('battle.end.column')} {values.column} · {t('battle.end.legalist')}{' '}
              {values.legalist}
            </p>
          </div>
        ) : null}
        <div className="battle-end-actions">
          <button type="button" className="primary" onClick={onRestart} data-testid="battle-end-restart" autoFocus>
            <Restart aria-hidden="true" size={15} />
            {t('battle.end.restart')}
          </button>
          <button type="button" onClick={onMenu} data-testid="battle-end-menu">
            {t('battle.end.menu')}
          </button>
          {onBackToEditor ? (
            <button type="button" onClick={onBackToEditor} data-testid="battle-end-editor">
              {t('battle.end.backToEditor')}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
