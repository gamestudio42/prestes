import { Crosshair } from '../icons';
import { ORDER_CATALOG, ORDER_CATEGORY_LABELS, type OrderActivation } from '@prestes/content';
import type { FireControl, FormationKind, Posture, Stance, TacticalOrder, UnitOrder } from '@prestes/shared';
import { Tooltip } from '../Tooltip';
import type { OrderMode } from '../Hud';
import {
  ACTIVATION_LABEL,
  ICONS,
  ORDER_SECTORS,
  orderIcon,
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
  fireControl: FireControl;
  stance: Stance;
  /** add-run-toggle: the selection's pace. */
  hurry: boolean;
  onHurry: (on: boolean) => void;
  formation: FormationKind;
  selectedCount: number;
  /** scrub-concealment-and-area-fire: a "?" or a ghost is shown to fire at. */
  areaFireReady: boolean;
  onActivateOrder: (order: string, activation: OrderActivation, queue?: boolean) => void;
  onPosture: (posture: Posture) => void;
  onFireControl: (mode: FireControl) => void;
  onStance: (stance: Stance) => void;
  onFormation: (formation: FormationKind) => void;
  t: Translate;
}


const StandIcon = ICONS['stance-standing'];
const CrouchIcon = ICONS['stance-crouched'];
const ProneIcon = ICONS['stance-prone'];
const HoldFireIcon = ICONS['hold-fire'];
const ContactIcon = ICONS['fire-contact'];
const FreeFireIcon = ICONS['fire-free'];

const FIRE_CONTROLS: ReadonlyArray<{
  mode: FireControl;
  icon: typeof Crosshair;
  label: 'hud.fireFree' | 'hud.fireContact' | 'hud.holdFire';
  tip: 'hud.tip.fireFree' | 'hud.tip.fireContact' | 'hud.tip.holdFire';
  testId: string;
}> = [
  { mode: 'free', icon: FreeFireIcon, label: 'hud.fireFree', tip: 'hud.tip.fireFree', testId: 'fire-free' },
  { mode: 'contact', icon: ContactIcon, label: 'hud.fireContact', tip: 'hud.tip.fireContact', testId: 'fire-contact' },
  { mode: 'hold', icon: HoldFireIcon, label: 'hud.holdFire', tip: 'hud.tip.holdFire', testId: 'hold-fire' },
];

const FORMATIONS: ReadonlyArray<{ kind: FormationKind; icon: typeof Crosshair }> = [
  { kind: 'line', icon: ICONS['formation-line'] },
  { kind: 'column', icon: ICONS['formation-column'] },
  { kind: 'wedge', icon: ICONS['formation-wedge'] },
  { kind: 'free', icon: ICONS['formation-free'] },
];

export function OrderBoard({
  currentOrder,
  pendingOrder,
  pendingTactical,
  aimPending,
  posture,
  fireControl,
  stance,
  hurry,
  onHurry,
  formation,
  selectedCount,
  areaFireReady,
  onActivateOrder,
  onPosture,
  onFireControl,
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
                const Icon = orderIcon(entry.id) ?? Crosshair;
                const active =
                  pendingOrder === entry.id ||
                  pendingTactical === entry.id ||
                  (entry.id === 'aim' && aimPending) ||
                  currentOrder === entry.id;
                // scrub-concealment-and-area-fire: Area fire needs a suspected contact on the map.
                const unavailable = entry.id === 'area-fire' && !areaFireReady;
                return (
                  <Tooltip
                    key={entry.id}
                    title={t(entry.labelKey)}
                    description={
                      unavailable
                        ? `${t(entry.tipKey)} · ${t('hud.areaFireUnavailable')}`
                        : `${t(entry.tipKey)} · ${t(ACTIVATION_LABEL[entry.activation])}`
                    }
                  >
                    <button
                      type="button"
                      className={`action-button order-card ${active ? 'active' : ''}`}
                      onClick={(event) => onActivateOrder(entry.id, entry.activation, event.shiftKey)}
                      disabled={selectedCount === 0 || unavailable}
                      aria-label={t(entry.labelKey)}
                      aria-pressed={active}
                      data-testid={`order-${entry.id === 'aim' ? 'face' : entry.id}`}
                    >
                      <Icon aria-hidden="true" size={20} />
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
              <StandIcon aria-hidden="true" size={18} />
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
              <CrouchIcon aria-hidden="true" size={18} />
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
              <ProneIcon aria-hidden="true" size={18} />
            </button>
          </Tooltip>
        </section>
        <section className="passive-group pace-group" data-testid="pace" data-value={hurry ? 'run' : 'walk'}>
          <span className="passive-label">{t('hud.pace')}</span>
          {([false, true] as const).map((on) => (
            <Tooltip key={String(on)} title={t(on ? 'hud.run' : 'hud.walk')} description={t('hud.tip.pace')}>
              <button
                type="button"
                className={`passive-button pace-button ${hurry === on ? 'active' : ''}`}
                onClick={() => onHurry(on)}
                aria-pressed={hurry === on}
                data-testid={on ? 'pace-run' : 'pace-walk'}
              >
                {t(on ? 'hud.run' : 'hud.walk')}
              </button>
            </Tooltip>
          ))}
        </section>
        <section className="passive-group fire-control-group" data-testid="fire-control">
          <span className="passive-label">{t('hud.fireControl')}</span>
          {FIRE_CONTROLS.map(({ mode, icon: Icon, label, tip, testId }) => (
            <Tooltip key={mode} title={t(label)} description={t(tip)}>
              <button
                type="button"
                className={`passive-button square-button ${mode === 'hold' ? 'hold-fire' : ''} ${fireControl === mode ? 'active' : ''}`}
                onClick={() => onFireControl(mode)}
                aria-label={t(label)}
                aria-pressed={fireControl === mode}
                data-testid={testId}
              >
                <Icon aria-hidden="true" size={18} />
              </button>
            </Tooltip>
          ))}
        </section>
        <section className="passive-group formation-group" data-testid="formation-select" data-value={formation}>
          <span className="passive-label">{t('hud.formation')}</span>
          {FORMATIONS.map(({ kind, icon: Icon }) => (
            <Tooltip key={kind} title={t(`formation.${kind}`)} description={t('hud.tip.formation')}>
              <button
                type="button"
                className={`passive-button square-button ${formation === kind ? 'active' : ''}`}
                onClick={() => onFormation(kind)}
                aria-label={t(`formation.${kind}`)}
                aria-pressed={formation === kind}
                data-testid={`formation-${kind}`}
              >
                <Icon aria-hidden="true" size={18} />
              </button>
            </Tooltip>
          ))}
        </section>
      </div>
    </div>
  );
}
