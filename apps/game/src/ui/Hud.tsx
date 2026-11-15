import { translate, type Locale, type MessageKey, type OrderActivation } from '@prestes/content';
import type { CameraBand } from '@prestes/view3d';
import type {
  FireControl,
  FogExtras,
  FormationKind,
  Frame,
  Posture,
  Stance,
  TacticalOrder,
  LocalizedText,
} from '@prestes/shared';
import { useState } from 'react';
import { DockedPanel } from './DockedPanel';
import { CommandStatus, OrderPrompt } from './hud/CommandStatus';
import { OrderBoard } from './hud/OrderBoard';
import { SquadCards } from './hud/SquadCards';
import { TopBar, type MapLayers } from './hud/TopBar';
import { orderLetter } from './hud/orderMeta';
import { DeploymentBanner, type DeploymentRefusal } from './hud/DeploymentBanner';
import { TroopSummary } from './hud/TroopSummary';
import { WeaponCard } from './hud/WeaponCard';
import { hasSuspectedContact } from '../hooks/suspectedContact';
import { loadDocks, saveDocks, toggleDock, type DockId, type DockLayout } from './dockLayout';
import bottomStrip from '../assets/hud/bottom-strip.png';
import drapeOrders from '../assets/hud/drape-orders.png';
import flagLeft from '../assets/hud/flag-left.png';
import postLeft from '../assets/hud/post-left.png';
import tuftLeft from '../assets/hud/tuft-left.png';
import groundLeft from '../assets/hud/ground-left.png';

/** redo-battle-hud: decoration cut from the owner's reference; takes no clicks. */
const ornament = (src: string, className: string) => (
  <img className={`hud-ornament ${className}`} src={src} alt="" aria-hidden="true" draggable={false} />
);

const layoutStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export type OrderMode = 'move' | 'attack' | 'suppress' | 'flank' | 'area-fire';

export interface HudProps {
  locale: Locale;
  frame: Frame | null;
  band: CameraBand;
  postStrong: boolean;
  routesVisible: boolean;
  selectedSquadId: number;
  controlBothSides: boolean;
  selectedCount: number;
  speed: 0 | 1 | 2 | 4 | 8;
  pendingOrder: OrderMode | null;
  pendingTactical: TacticalOrder | null;
  aimPending: boolean;
  posture: Posture;
  fireControl: FireControl;
  battleMode: boolean;
  onCancelOrder: () => void;
  onLocaleChange: (locale: Locale) => void;

  onActivateOrder: (order: string, activation: OrderActivation, queue?: boolean) => void;
  onPosture: (posture: Posture) => void;
  onFireControl: (mode: FireControl) => void;
  onSelectSquad: (squadId: number) => void;
  onCameraBand: (band: CameraBand) => void;
  onFormation: (formation: FormationKind) => void;
  onStance: (stance: Stance) => void;
  hurry: boolean;
  onHurry: (on: boolean) => void;
  onSetSpeed: (speed: 0 | 1 | 2 | 4 | 8) => void;
  onTogglePause: () => void;
  onTogglePost: () => void;
  onToggleRoutes: () => void;
  /** redo-battle-hud D6: the strategic map layers. */
  mapLayers?: MapLayers;
  onToggleLayer?: (layer: keyof MapLayers) => void;
  /** refine-battle-controls: centre the view on a section, and leave the battle. */
  onCenterSquad: (squadId: number) => void;
  onLeave: () => void;
  /** Units currently selected (their helmets are highlighted). */
  selectedUnitIds?: readonly number[];
  /** Rounds a soldier carries when full, for the ammunition bars. */
  ammoFull?: number;
  /** add-deployment-phase 3.1: the deployment phase's controls and its latest refusal. */
  onStartBattle?: () => void;
  onResetDeployment?: () => void;
  deploymentRefusal?: DeploymentRefusal | null;
  /** refine-battle-controls: a refused battle order, shown for a few seconds. */
  orderNotice?: string | null;
  /** add-withdrawal-exits 7.2: a section that just got out, and by which exit. */
  exitNotice?: { command: boolean; exit: LocalizedText } | null;
}

export function Hud({
  locale,
  frame,
  band,
  postStrong,
  routesVisible,
  selectedSquadId,
  controlBothSides,
  selectedCount,
  speed,
  pendingOrder,
  pendingTactical,
  aimPending,
  posture,
  fireControl,
  battleMode,
  onCancelOrder,
  onLocaleChange,
  onActivateOrder,
  onPosture,
  onFireControl,
  onSelectSquad,
  onCameraBand,
  onFormation,
  onStance,
  hurry,
  onHurry,
  onSetSpeed,
  onTogglePause,
  onTogglePost,
  onToggleRoutes,
  mapLayers,
  onToggleLayer,
  onCenterSquad,
  onLeave,
  selectedUnitIds = [],
  ammoFull = 20,
  onStartBattle,
  onResetDeployment,
  deploymentRefusal = null,
  orderNotice = null,
  exitNotice = null,
}: HudProps) {
  // redo-battle-hud D3: which docked panels are collapsed.
  const [docks, setDocks] = useState<DockLayout>(() => loadDocks(layoutStorage()));
  // refine-battle-controls: the leave-battle confirmation.
  const [leaveOpen, setLeaveOpen] = useState(false);
  const toggle = (id: DockId) => () =>
    setDocks((previous) => {
      const next = toggleDock(previous, id);
      saveDocks(layoutStorage(), next);
      return next;
    });
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const panelLabels = { collapseLabel: t('hud.windowMinimize'), expandLabel: t('hud.windowRestore') };
  const squadUnits = frame?.units.filter((unit) => unit.squadId === selectedSquadId) ?? [];
  const aliveUnits = squadUnits.filter((unit) => unit.alive && !unit.routed);
  const stance = aliveUnits[0]?.stance ?? squadUnits[0]?.stance ?? 'standing';
  // add-battle-maps: how many of the section are hidden in vegetation.
  const concealedCount = aliveUnits.filter((unit) => unit.concealed).length;
  // refine-battle-maps 5.14: how many gave themselves away by firing.
  const revealedCount = aliveUnits.filter((unit) => unit.revealed).length;
  // refine-battle-maps 5.4: the section at the ferry, aboard or waiting at a landing.
  const aboardCount = aliveUnits.filter((unit) => unit.aboardFerry).length;
  const waitingCount = aliveUnits.filter((unit) => unit.waitingFerry).length;
  const formation = aliveUnits[0]?.formation ?? 'line';
  const currentOrder = aliveUnits.find((unit) => unit.order !== null)?.order ?? null;
  // refine-battle-controls: the orders Shift queued for this section.
  const queuedOrders = (frame?.queuedOrders ?? []).filter((entry) => entry.squadId === selectedSquadId);
  const deploying = frame?.phase === 'deployment';

  return (
    <>
      <TopBar
        t={t}
        locale={locale}
        band={band}
        postStrong={postStrong}
        routesVisible={routesVisible}
        speed={speed}
        deploying={deploying}
        objectives={frame?.objectives ?? []}
        {...(frame?.clock ? { clock: frame.clock } : {})}
        {...(frame?.withdrawal ? { withdrawal: frame.withdrawal } : {})}
        {...(mapLayers && onToggleLayer ? { layers: mapLayers, onToggleLayer } : {})}
        onLocaleChange={onLocaleChange}
        onCameraBand={onCameraBand}
        onSetSpeed={onSetSpeed}
        onTogglePause={onTogglePause}
        onTogglePost={onTogglePost}
        onToggleRoutes={onToggleRoutes}
        onLeave={() => setLeaveOpen(true)}
      />

      {deploying && onStartBattle && onResetDeployment ? (
        <DeploymentBanner t={t} refusal={deploymentRefusal} onStartBattle={onStartBattle} onReset={onResetDeployment} />
      ) : null}
      {exitNotice ? (
        <div className="hud-notice" data-testid="exit-notice" role="status">
          {t(exitNotice.command ? 'hud.commandExited' : 'hud.sectionExited', { exit: exitNotice.exit[locale === 'pt-BR' ? 'pt-BR' : 'en'] || exitNotice.exit.en })}
        </div>
      ) : null}
      {orderNotice ? (
        <div className="hud-notice" data-testid="order-notice" role="status">
          {t(`rejection.${orderNotice}` as MessageKey)}
        </div>
      ) : null}

      <div className="hud-docks" data-testid="squad-status">
        <div className="hud-dock-left">
          <DockedPanel id="troops" title={t('hud.windowTroops')} collapsed={docks.troops} onToggle={toggle('troops')} {...panelLabels}>
            <SquadCards
              t={t}
              frame={frame}
              selectedSquadId={selectedSquadId}
              controlBothSides={controlBothSides}
              battleMode={battleMode}
              onSelectSquad={onSelectSquad}
              onCenterSquad={onCenterSquad}
            />
          </DockedPanel>

          <DockedPanel
            id="summary"
            title={t('hud.windowSummary')}
            collapsed={docks.summary}
            onToggle={toggle('summary')}
            variant="parchment"
            {...panelLabels}
          >
            <div
              onDoubleClick={() => onCenterSquad(selectedSquadId)}
              data-testid="troop-summary"
              title={t('hud.tip.center')}
            >
              <TroopSummary
                t={t}
                squadUnits={squadUnits}
                selectedIds={new Set(selectedUnitIds)}
                ammoFull={ammoFull}
                covers={frame?.covers ?? []}
                currentOrder={currentOrder}
              />
            </div>
            <CommandStatus
              t={t}
              selectedCount={selectedCount}
              aliveCount={aliveUnits.length}
              currentOrder={currentOrder}
              stance={stance}
              concealedCount={concealedCount}
              revealedCount={revealedCount}
              ferryAboard={aboardCount}
              ferryWaiting={waitingCount}
            />
            <WeaponCard
              t={t}
              frame={frame}
              squadUnits={squadUnits}
              aliveUnits={aliveUnits}
            />
          </DockedPanel>
        </div>

        <div className="hud-dock-right">
          <DockedPanel id="orders" title={t('hud.windowOrders')} collapsed={docks.orders} onToggle={toggle('orders')} {...panelLabels}>
            <OrderBoard
              currentOrder={currentOrder}
              pendingOrder={pendingOrder}
              pendingTactical={pendingTactical}
              aimPending={aimPending}
              posture={posture}
              fireControl={fireControl}
              stance={stance}
              formation={formation}
              selectedCount={selectedCount}
              areaFireReady={hasSuspectedContact(frame as (Frame & FogExtras) | null)}
              onActivateOrder={onActivateOrder}
              onPosture={onPosture}
              onFireControl={onFireControl}
              onStance={onStance}
              hurry={hurry}
              onHurry={onHurry}
              onFormation={onFormation}
              t={t}
            />
            {queuedOrders.length > 0 ? (
              <ol className="order-queue" data-testid="order-queue" aria-label={t('hud.queuedOrders')}>
                {queuedOrders.map((entry, index) => (
                  <li key={`${entry.squadId}-${index}`} data-testid={`order-queue-${index + 1}`}>
                    {t(`hud.order${orderLetter(entry.order)}` as MessageKey)}
                  </li>
                ))}
              </ol>
            ) : null}
          </DockedPanel>
        </div>
      </div>
      <OrderPrompt
        t={t}
        pendingOrder={pendingOrder}
        pendingTactical={pendingTactical}
        aimPending={aimPending}
        onCancelOrder={onCancelOrder}
      />
      <div className="hud-ornaments hud-ornaments-back" aria-hidden="true">
        {ornament(flagLeft, 'hud-flag-left')}
        {ornament(postLeft, 'hud-post-left')}
        {docks.orders ? null : ornament(drapeOrders, 'hud-drape-orders')}
        {docks.summary ? null : ornament(groundLeft, 'hud-ground-left')}
      </div>
      <img className="hud-bottom-strip" src={bottomStrip} alt="" aria-hidden="true" draggable={false} />
      <div className="hud-ornaments hud-ornaments-front" aria-hidden="true">
        {ornament(tuftLeft, 'hud-tuft-left')}
      </div>
      {leaveOpen ? (
        <div className="overlay" data-testid="leave-battle-dialog">
          <section className="codex battle-end" role="dialog" aria-labelledby="leave-title">
            <div className="tutorial-graduation">
              <strong id="leave-title">{t('hud.leaveTitle')}</strong>
              <p>{t('hud.leaveText')}</p>
            </div>
            <div className="battle-end-actions">
              <button
                type="button"
                className="primary"
                data-testid="leave-confirm"
                onClick={() => {
                  setLeaveOpen(false);
                  onLeave();
                }}
              >
                {t('hud.leaveConfirm')}
              </button>
              <button type="button" data-testid="leave-cancel" onClick={() => setLeaveOpen(false)}>
                {t('hud.leaveCancel')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
