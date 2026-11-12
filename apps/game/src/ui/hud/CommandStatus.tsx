import { Close as X } from '../icons';
import type { MessageKey } from '@prestes/content';
import type { Stance, TacticalOrder, UnitOrder } from '@prestes/shared';
import { Tooltip } from '../Tooltip';
import type { OrderMode } from '../Hud';
import { orderLetter, type Translate } from './orderMeta';

interface CommandStatusProps {
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
}

/**
 * redo-battle-hud D5: what the command status row said, now in the Troop
 * summary: the selection and the current order as its header line, the
 * concealed, revealed and ferry counts as badges, and the body stance as
 * hidden text (the active body button shows it).
 */
export function CommandStatus({
  t,
  selectedCount,
  aliveCount,
  currentOrder,
  stance,
  concealedCount = 0,
  revealedCount = 0,
  ferryAboard = 0,
  ferryWaiting = 0,
}: CommandStatusProps) {
  const stanceKey =
    stance === 'crouched' ? 'hud.crouched' : stance === 'prone' ? 'hud.prone' : 'hud.standing';
  const orderKey = currentOrder === null ? 'hud.orderNone' : (`hud.order${orderLetter(currentOrder)}` as MessageKey);

  return (
    <div className="troop-status" data-testid="troop-status">
      <p className="troop-status-line">
        <span className="hud-selection" data-testid="selection-count" data-selected={selectedCount}>
          {t('hud.selection')}: {selectedCount}/{aliveCount}
        </span>
        {/* troop-thumbnails-and-panel 3.1: the header names the order; kept here for screen readers. */}
        <span className="hud-order-value visually-hidden" data-testid="order-value">
          {t(orderKey)}
        </span>
        <span className="hud-stance-value visually-hidden" data-testid="stance-value">
          {t('hud.body')}: {t(stanceKey)}
        </span>
      </p>
      {concealedCount > 0 || revealedCount > 0 || ferryAboard + ferryWaiting > 0 ? (
        <p className="troop-badges">
          {concealedCount > 0 ? (
            <Tooltip title={t('hud.concealed')} description={t('hud.concealedHint')}>
              <span className="troop-badge hud-concealed-value" data-testid="concealed-value" data-concealed={concealedCount}>
                {t('hud.concealed')}: {concealedCount}
              </span>
            </Tooltip>
          ) : null}
          {revealedCount > 0 ? (
            <Tooltip title={t('hud.revealed')} description={t('hud.revealedHint')}>
              <span className="troop-badge hud-revealed-value" data-testid="revealed-value" data-revealed={revealedCount}>
                {t('hud.revealed')}: {revealedCount}
              </span>
            </Tooltip>
          ) : null}
          {ferryAboard + ferryWaiting > 0 ? (
            <Tooltip title={t('hud.ferry')} description={t('hud.ferryHint')}>
              <span
                className="troop-badge hud-ferry-value"
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
        </p>
      ) : null}
    </div>
  );
}

interface OrderPromptProps {
  t: Translate;
  pendingOrder: OrderMode | null;
  pendingTactical: TacticalOrder | null;
  aimPending: boolean;
  onCancelOrder: () => void;
}

/** redo-battle-hud D5: an order waiting for a point, at the top centre of the map with Cancel. */
export function OrderPrompt({ t, pendingOrder, pendingTactical, aimPending, onCancelOrder }: OrderPromptProps) {
  if (!pendingOrder && !pendingTactical && !aimPending) return null;
  const pendingKey = pendingOrder === null ? null : (`hud.pick${orderLetter(pendingOrder)}` as MessageKey);
  const pendingLabel = aimPending ? t('hud.pickFace') : pendingKey ? t(pendingKey) : t('hud.tacticalHint');
  return (
    <div className="pending-banner order-prompt" data-testid="order-prompt" role="status">
      <p className="order-hint" data-testid="order-hint">
        {pendingLabel}
      </p>
      <button type="button" className="pending-cancel" onClick={onCancelOrder} data-testid="order-cancel">
        <X aria-hidden="true" size={14} />
        {t('hud.cancel')}
      </button>
    </div>
  );
}
