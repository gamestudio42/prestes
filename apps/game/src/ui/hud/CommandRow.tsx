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
