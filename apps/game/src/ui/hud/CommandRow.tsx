import { ChevronDown, ChevronUp, Close as X } from '../icons';
import type { MessageKey } from '@prestes/content';
import type { Stance, TacticalOrder, UnitOrder } from '@prestes/shared';
import { Tooltip } from '../Tooltip';
import type { OrderMode } from '../Hud';
import { orderLetter, type Translate } from './orderMeta';

interface CommandRowProps {
  t: Translate;
  selectedCount: number;
  aliveCount: number;
  currentOrder: UnitOrder | null;
  stance: Stance;
  /** Soldiers of the section hidden in vegetation (add-battle-maps). */
  concealedCount?: number;
  /** Soldiers given away by their own fire, "Revelado" (refine-battle-maps 5.14). */
  revealedCount?: number;
  /** Soldiers aboard the ferry and waiting at a landing for it (refine-battle-maps 5.4). */
  ferryAboard?: number;
  ferryWaiting?: number;
  pendingOrder: OrderMode | null;
  pendingTactical: TacticalOrder | null;
  aimPending: boolean;
  ordersCollapsed: boolean;
  onToggleOrders: () => void;
  onCancelOrder: () => void;
}

export function CommandRow({
  t,
  selectedCount,
  aliveCount,
  currentOrder,
  stance,
  concealedCount = 0,
  revealedCount = 0,
  ferryAboard = 0,
  ferryWaiting = 0,
  pendingOrder,
  pendingTactical,
  aimPending,
  ordersCollapsed,
  onToggleOrders,
  onCancelOrder,
}: CommandRowProps) {
  const stanceKey =
    stance === 'crouched' ? 'hud.crouched' : stance === 'prone' ? 'hud.prone' : 'hud.standing';
  const orderKey = currentOrder === null ? 'hud.orderNone' : (`hud.order${orderLetter(currentOrder)}` as MessageKey);
  const pendingKey = pendingOrder === null ? null : (`hud.pick${orderLetter(pendingOrder)}` as MessageKey);
  const pendingLabel = aimPending
    ? t('hud.pickFace')
    : pendingKey
      ? t(pendingKey)
      : t('hud.tacticalHint');

  return (
    <>
    <div className="command-row hud-status-row">
      <span className="hud-selection" data-testid="selection-count" data-selected={selectedCount}>
        {t('hud.selection')}: {selectedCount}/{aliveCount}
      </span>
      <span className="hud-order-value" data-testid="order-value">
        {t(orderKey)}
      </span>
      <span className="hud-stance-value" data-testid="stance-value">
        {t('hud.body')}: {t(stanceKey)}
      </span>
      {concealedCount > 0 ? (
        <Tooltip title={t('hud.concealed')} description={t('hud.concealedHint')}>
          <span className="hud-concealed-value" data-testid="concealed-value" data-concealed={concealedCount}>
            {t('hud.concealed')}: {concealedCount}
          </span>
        </Tooltip>
      ) : null}
      {revealedCount > 0 ? (
        <Tooltip title={t('hud.revealed')} description={t('hud.revealedHint')}>
          <span className="hud-concealed-value hud-revealed-value" data-testid="revealed-value" data-revealed={revealedCount}>
            {t('hud.revealed')}: {revealedCount}
          </span>
        </Tooltip>
      ) : null}
      {ferryAboard + ferryWaiting > 0 ? (
        <Tooltip title={t('hud.ferry')} description={t('hud.ferryHint')}>
          <span
            className="hud-ferry-value"
            data-testid="ferry-value"
            data-aboard={ferryAboard}
            data-waiting={ferryWaiting}
          >
            <span className="hud-ferry-icon" aria-hidden="true">{ferryWaiting > 0 ? '⧖' : '≈'}</span>
            {t('hud.ferry')}: {ferryWaiting > 0 ? t('hud.ferryWaiting', { count: ferryWaiting }) : ''}
            {ferryWaiting > 0 && ferryAboard > 0 ? ' · ' : ''}
            {ferryAboard > 0 ? t('hud.ferryAboard', { count: ferryAboard }) : ''}
          </span>
        </Tooltip>
      ) : null}
      <div className="orders-slot">
        <Tooltip title={ordersCollapsed ? t('hud.showOrders') : t('hud.hideOrders')} description={t('hud.tip.orders')}>
          <button
            type="button"
            className="orders-toggle"
            onClick={onToggleOrders}
            aria-label={ordersCollapsed ? t('hud.showOrders') : t('hud.hideOrders')}
            data-testid="orders-toggle"
          >
            {ordersCollapsed ? (
              <ChevronUp aria-hidden="true" size={15} />
            ) : (
              <ChevronDown aria-hidden="true" size={15} />
            )}
          </button>
        </Tooltip>
      </div>
    </div>

    {pendingOrder || pendingTactical || aimPending ? (
      <div className="pending-banner">
        <p className="order-hint" data-testid="order-hint">
          {pendingLabel}
        </p>
        <button
          type="button"
          className="pending-cancel"
          onClick={onCancelOrder}
          data-testid="order-cancel"
        >
          <X aria-hidden="true" size={14} />
          {t('hud.cancel')}
        </button>
      </div>
    ) : null}
    </>
  );
}
