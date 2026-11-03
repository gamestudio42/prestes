import { Box, Crosshair, RotateCcw, StepForward, Users, Wrench, X } from 'lucide-react';
import { terrainHeightAt, terrainSpeedFactor, type Frame } from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';

export type SandboxTool =
  | 'sandbag'
  | 'stone'
  | 'trench'
  | 'dummy'
  | 'enemy-troop'
  | 'command-troop';

export interface SandboxPanelProps {
  locale: Locale;
  frame: Frame | null;
  selectedSquadId: number;
  tool: SandboxTool | null;
  controlBothSides: boolean;
  onAdvance: (ticks: number) => void;
  onClose: () => void;
  onIncapacitate: (unitId: number) => void;
  onRescueCasualty: (unitId: number) => void;
  onReinforce: (faction: 'column' | 'legalist') => void;
  onReset: () => void;
  onStep: () => void;
  onToggleControlBothSides: () => void;
  onStartBattle3v3: () => void;
  onTool: (tool: SandboxTool | null) => void;
}

export function SandboxPanel({
  locale,
  frame,
  selectedSquadId,
  tool,
  controlBothSides,
  onAdvance,
  onClose,
  onIncapacitate,
  onRescueCasualty,
  onReinforce,
  onReset,
  onStep,
  onToggleControlBothSides,
  onStartBattle3v3,
  onTool,
}: SandboxPanelProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const unit = frame?.units.find(
    (entry) =>
      entry.squadId === selectedSquadId &&
      entry.alive &&
      !entry.routed &&
      !entry.incapacitated &&
      !entry.dummy,
  );
  const casualty = frame?.units.find(
    (entry) =>
      entry.squadId === selectedSquadId &&
      (entry.faction === 'column' || entry.faction === 'legalist') &&
      entry.alive &&
      entry.incapacitated,
  );
  const target = unit?.targetId === null || unit?.targetId === undefined
    ? null
    : frame?.units.find((entry) => entry.id === unit.targetId) ?? null;
  const distance = unit && target
    ? Math.round(Math.hypot(target.x - unit.x, target.y - unit.y))
    : null;
  const weaponKey = unit ? (`weapon.${unit.weaponId}.name` as MessageKey) : null;
  const stateKey = unit ? (`state.${unit.state}` as MessageKey) : null;
  const tools: Array<{ id: SandboxTool; label: MessageKey }> = [
    { id: 'sandbag', label: 'sandbox.sandbag' },
    { id: 'stone', label: 'sandbox.stone' },
    { id: 'trench', label: 'sandbox.trench' },
    { id: 'dummy', label: 'sandbox.dummy' },
    { id: 'enemy-troop', label: 'sandbox.enemyTroop' },
    { id: 'command-troop', label: 'sandbox.commandTroop' },
  ];

  return (
    <aside className="sandbox-panel" data-testid="sandbox-panel">
      <header>
        <span>
          <Wrench aria-hidden="true" size={15} />
          {t('sandbox.title')}
        </span>
        <button type="button" className="secondary icon-button" onClick={onClose} data-testid="sandbox-close">
          <X aria-hidden="true" size={15} />
        </button>
      </header>

      <section className="sandbox-inspector">
        <h3>{t('sandbox.inspector')}</h3>
        {unit && stateKey && weaponKey ? (
          <dl>
            <div>
              <dt>{t('sandbox.weapon')}</dt>
              <dd>{t(weaponKey)}</dd>
            </div>
            <div>
              <dt>{t('sandbox.ammo')}</dt>
              <dd>
                {unit.magazine}/{unit.reserve}
              </dd>
            </div>
            <div>
              <dt>{t('sandbox.morale')}</dt>
              <dd>{Math.round(unit.morale)}</dd>
            </div>
            <div>
              <dt>{t('sandbox.suppression')}</dt>
              <dd>{Math.round(unit.suppression)}</dd>
            </div>
            <div>
              <dt>{t('sandbox.cohesion')}</dt>
              <dd>{Math.round(unit.cohesion)}%</dd>
            </div>
            <div>
              <dt>{t('sandbox.fatigue')}</dt>
              <dd>{Math.round(unit.fatigue)}</dd>
            </div>
            <div>
              <dt>{t('sandbox.wound')}</dt>
              <dd>{t(`wound.${unit.wound}` as MessageKey)}</dd>
            </div>
            <div>
              <dt>{t('sandbox.soldierState')}</dt>
              <dd>{t(`soldierState.${unit.soldierState}` as MessageKey)}</dd>
            </div>
            <div>
              <dt>{t('sandbox.state')}</dt>
              <dd>{t(stateKey)}</dd>
            </div>
            <div>
              <dt>{t('sandbox.cover')}</dt>
              <dd>{Math.round(unit.cover * 100)}%</dd>
            </div>
            <div>
              <dt>{t('sandbox.elevation')}</dt>
              <dd>{t('sandbox.meters', { value: terrainHeightAt(unit.x, unit.y).toFixed(1) })}</dd>
            </div>
            <div>
              <dt>{t('sandbox.speed')}</dt>
              <dd>{t('sandbox.multiplier', { value: terrainSpeedFactor(unit.x, unit.y).toFixed(2) })}</dd>
            </div>
            <div>
              <dt>{t('sandbox.target')}</dt>
              <dd>{target ? `${t('sandbox.target')} #${target.id} Â· ${distance} m` : t('sandbox.noTarget')}</dd>
            </div>
          </dl>
        ) : (
          <p>{t('sandbox.noUnit')}</p>
        )}
      </section>

      <section className="sandbox-tools">
        <h3>{t('sandbox.tools')}</h3>
        <div className="sandbox-tool-grid">
          {tools.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`secondary ${tool === entry.id ? 'active' : ''}`}
              onClick={() => onTool(tool === entry.id ? null : entry.id)}
              data-testid={`sandbox-tool-${entry.id}`}
            >
              {entry.id === 'dummy' || entry.id === 'enemy-troop' || entry.id === 'command-troop' ? (
                <Crosshair aria-hidden="true" size={15} />
              ) : (
                <Box aria-hidden="true" size={15} />
              )}
              {t(entry.label)}
            </button>
          ))}
        </div>
        <p className="sandbox-hint">
          {tool ? t('sandbox.place') : t('sandbox.toolHint')}
        </p>
      </section>

      <section className="sandbox-tools">
        <h3>{t('sandbox.control')}</h3>
        <button
          type="button"
          className={`secondary ${controlBothSides ? 'active' : ''}`}
          onClick={onToggleControlBothSides}
          data-testid="sandbox-both-sides"
        >
          <Users aria-hidden="true" size={15} />
          {t('sandbox.bothSides')}
        </button>
        <div className="sandbox-tool-grid">
          <button
            type="button"
            className="secondary"
            onClick={() => onReinforce('column')}
            data-testid="sandbox-reinforce-column"
          >
            <Box aria-hidden="true" size={15} />
            {t('sandbox.reinforceColumn')}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onReinforce('legalist')}
            data-testid="sandbox-reinforce-legalist"
          >
            <Box aria-hidden="true" size={15} />
            {t('sandbox.reinforceLegalist')}
          </button>
        </div>
      </section>

      <section className="sandbox-tools">
        <h3>{t('sandbox.battle')}</h3>
        <button
          type="button"
          className="secondary"
          onClick={onStartBattle3v3}
          data-testid="sandbox-battle-3v3"
        >
          <Users aria-hidden="true" size={15} />
          {t('sandbox.battle3v3')}
        </button>
      </section>

      <section className="sandbox-tools">
        <h3>{t('sandbox.casualty')}</h3>
        <div className="sandbox-tool-grid">
          <button
            type="button"
            className="secondary"
            onClick={() => unit && onIncapacitate(unit.id)}
            disabled={!unit || unit.incapacitated}
            data-testid="sandbox-incapacitate"
          >
            <Crosshair aria-hidden="true" size={15} />
            {t('sandbox.incapacitate')}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => casualty && onRescueCasualty(casualty.id)}
            disabled={!casualty}
            data-testid="sandbox-rescue"
          >
            <Users aria-hidden="true" size={15} />
            {t('sandbox.rescue')}
          </button>
        </div>
      </section>

      {frame?.events.some((event) => event.type === 'command_rejected') ? (
        <p className="sandbox-error" data-testid="sandbox-error">
          {frame.events
            .filter(
              (event): event is Extract<typeof event, { type: 'command_rejected' }> =>
                event.type === 'command_rejected',
            )
            .map((event) => t(`rejection.${event.reason}` as MessageKey))
            .join(' Â· ')}
        </p>
      ) : null}

      <p className="sandbox-counts" data-testid="sandbox-counts">
        {t('sandbox.covers')}: {frame?.covers.length ?? 0}
        {' \u00b7 '}
        {t('sandbox.dummies')}: {frame?.units.filter((unit) => unit.dummy).length ?? 0}
      </p>

      <section className="sandbox-actions">
        <button type="button" className="secondary" onClick={onStep} data-testid="sandbox-step">
          <StepForward aria-hidden="true" size={15} />
          {t('sandbox.step')}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => onAdvance(60)}
          data-testid="sandbox-advance"
        >
          <StepForward aria-hidden="true" size={15} />
          {t('sandbox.advance')}
        </button>
        <button type="button" className="secondary" onClick={onReset} data-testid="sandbox-reset">
          <RotateCcw aria-hidden="true" size={15} />
          {t('sandbox.reset')}
        </button>
      </section>
    </aside>
  );
}








