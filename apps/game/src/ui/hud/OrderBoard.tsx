import {
  ChevronDown,
  Crosshair,
  Minus,
  PersonStanding,
  Shield,
  Split,
  Trash2,
} from 'lucide-react';
import { ORDER_CATALOG, ORDER_CATEGORY_LABELS, type OrderActivation } from '@prestes/content';
import type { FormationKind, Posture, Stance, TacticalOrder, UnitOrder } from '@prestes/shared';
import { Tooltip } from '../Tooltip';
import type { OrderMode } from '../Hud';
import {
  ACTIVATION_LABEL,
  ORDER_ICONS,
  ORDER_SECTORS,
  POSTURES,
  POSTURE_ICONS,
  POSTURE_LABELS,
  type Translate,
} from './orderMeta';

interface OrderBoardProps {
  currentOrder: UnitOrder | null;
  pendingOrder: OrderMode | null;
  pendingTactical: TacticalOrder | null;
  aimPending: boolean;
  posture: Posture;
  holdFire: boolean;
  boundingEnabled: boolean;
  stance: Stance;
  formation: FormationKind;
  selectedCount: number;
  canClear: boolean;
  onClear: () => void;
  onActivateOrder: (order: string, activation: OrderActivation) => void;
  onPosture: (posture: Posture) => void;
  onHoldFire: () => void;
  onToggleBounding: () => void;
  onStance: (stance: Stance) => void;
  onFormation: (formation: FormationKind) => void;
  t: Translate;
}


export function OrderBoard({
  currentOrder,
  pendingOrder,
  pendingTactical,
  aimPending,
  posture,
  holdFire,
  boundingEnabled,
  stance,
  formation,
  selectedCount,
  canClear,
  onClear,
  onActivateOrder,
  onPosture,
  onHoldFire,
  onToggleBounding,
  onStance,
  onFormation,
  t,
}: OrderBoardProps) {
  return (
    <div className="order-board" data-testid="order-board">
      <div className="order-sectors">
        {ORDER_SECTORS.map((category) => (
          <section
            className="order-sector"
            key={category}
            data-testid={`order-tab-${category}`}
          >
            <h3 className="order-sector-title">{t(ORDER_CATEGORY_LABELS[category])}</h3>
            <div className="order-sector-grid">
              {ORDER_CATALOG.filter((entry) => entry.category === category).map((entry) => {
                const Icon = ORDER_ICONS[entry.id] ?? Crosshair;
                const active =
                  pendingOrder === entry.id ||
                  pendingTactical === entry.id ||
                  (entry.id === 'aim' && aimPending) ||
                  currentOrder === entry.id;
                return (
                  <Tooltip
                    key={entry.id}
                    title={t(entry.labelKey)}
                    description={`${t(entry.tipKey)} · ${t(ACTIVATION_LABEL[entry.activation])}`}
                  >
                    <button
                      type="button"
                      className={`action-button order-card ${active ? 'active' : ''}`}
                      onClick={() => onActivateOrder(entry.id, entry.activation)}
                      disabled={selectedCount === 0}
                      aria-label={t(entry.labelKey)}
                      aria-pressed={active}
                      data-testid={`order-${entry.id === 'aim' ? 'face' : entry.id}`}
                    >
                      <Icon aria-hidden="true" size={22} />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="passive-row">
        <section className="passive-group posture-group">
          <span className="passive-label">{t('hud.posture')}</span>
          {POSTURES.map((value) => {
            const Icon = POSTURE_ICONS[value];
            const label = t(POSTURE_LABELS[value]);
            return (
              <Tooltip key={value} title={label} description={t('hud.tip.posture')}>
                <button
                  type="button"
                  className={`passive-button square-button ${posture === value ? 'active' : ''}`}
                  onClick={() => onPosture(value)}
                  aria-label={label}
                  aria-pressed={posture === value}
                  data-testid={`posture-${value}`}
                >
                  <Icon aria-hidden="true" size={18} />
                </button>
              </Tooltip>
            );
          })}
        </section>
        <section className="passive-group body-group">
          <span className="passive-label">{t('hud.body')}</span>
          <Tooltip title={t('hud.stand')} description={t('hud.tip.stance')}>
            <button
              type="button"
              className={`passive-button square-button ${stance === 'standing' ? 'active' : ''}`}
              onClick={() => onStance('standing')}
              aria-label={t('hud.stand')}
              data-testid="stance-stand"
            >
              <PersonStanding aria-hidden="true" size={18} />
            </button>
          </Tooltip>
          <Tooltip title={t('hud.crouch')} description={t('hud.tip.stance')}>
            <button
              type="button"
              className={`passive-button square-button ${stance === 'crouched' ? 'active' : ''}`}
              onClick={() => onStance('crouched')}
              aria-label={t('hud.crouch')}
              data-testid="stance-crouch"
            >
              <ChevronDown aria-hidden="true" size={18} />
            </button>
          </Tooltip>
          <Tooltip title={t('hud.lieDown')} description={t('hud.tip.stance')}>
            <button
              type="button"
              className={`passive-button square-button ${stance === 'prone' ? 'active' : ''}`}
              onClick={() => onStance('prone')}
              aria-label={t('hud.lieDown')}
              data-testid="stance-prone"
            >
              <Minus aria-hidden="true" size={18} />
            </button>
          </Tooltip>
        </section>
        <Tooltip title={t('hud.holdFire')} description={t('hud.tip.holdFire')}>
          <button
            type="button"
            className={`passive-button square-button hold-fire ${holdFire ? 'active' : ''}`}
            onClick={onHoldFire}
            aria-label={holdFire ? t('hud.holdingFire') : t('hud.holdFire')}
            aria-pressed={holdFire}
            data-testid="hold-fire"
          >
            <Shield aria-hidden="true" size={18} />
          </button>
        </Tooltip>
        <Tooltip
          title={t('hud.alternatingMove')}
          description={t('hud.tip.alternatingMove')}
        >
          <button
            type="button"
            className={`passive-button square-button ${boundingEnabled ? 'active' : ''}`}
            onClick={onToggleBounding}
            aria-label={t('hud.alternatingMove')}
            aria-pressed={boundingEnabled}
            data-testid="bounding-toggle"
          >
            <Split aria-hidden="true" size={18} />
          </button>
        </Tooltip>
        <Tooltip
          title={t('hud.clear')}
          description={canClear ? t('hud.tip.clear') : t('hud.tip.clearUnavailable')}
        >
          <button
            type="button"
            className="passive-button square-button clear-order"
            onClick={onClear}
            disabled={!canClear}
            aria-label={t('hud.clear')}
            data-testid="order-clear"
          >
            <Trash2 aria-hidden="true" size={18} />
          </button>
        </Tooltip>
        <label className="formation-control">
          <span>{t('hud.formation')}:</span>
          <select
            value={formation}
            onChange={(event) => onFormation(event.target.value as FormationKind)}
            title={t('hud.tip.formation')}
            data-testid="formation-select"
          >
            <option value="line">{t('formation.line')}</option>
            <option value="column">{t('formation.column')}</option>
            <option value="wedge">{t('formation.wedge')}</option>
            <option value="free">{t('formation.free')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
