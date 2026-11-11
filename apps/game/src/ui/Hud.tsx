import { translate, type Locale, type MessageKey, type OrderActivation } from '@prestes/content';
import type { CameraBand } from '@prestes/view3d';
import type {
  FireControl,
  FormationKind,
  Frame,
  Posture,
  Stance,
  TacticalOrder,
} from '@prestes/shared';
import { useEffect, useRef, useState } from 'react';
import { FloatingWindow } from './FloatingWindow';
import { CommandRow } from './hud/CommandRow';
import { OrderBoard } from './hud/OrderBoard';
import { SquadCards } from './hud/SquadCards';
import { TopBar } from './hud/TopBar';
import { DeploymentBanner, type DeploymentRefusal } from './hud/DeploymentBanner';
import { TroopSummary } from './hud/TroopSummary';
import { WeaponCard } from './hud/WeaponCard';
import {
  coversTitle,
  defaultPosition,
  loadLayout,
  saveLayout,
  type WindowId,
  type WindowLayout,
  type WindowState,
} from './windowLayout';

const troopsSize = () => {
  const rect = document.querySelector('[data-window="troops"]')?.getBoundingClientRect();
  return { w: rect?.width ?? 0, h: rect?.height ?? 0 };
};

const rectOf = (selector: string) => {
  const rect = document.querySelector(selector)?.getBoundingClientRect();
  return rect ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height } : null;
};

const layoutStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export type OrderMode = 'move' | 'attack' | 'suppress' | 'flank';

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
  sandboxOpen: boolean;
  onCancelOrder: () => void;
  onLocaleChange: (locale: Locale) => void;

  onActivateOrder: (order: string, activation: OrderActivation) => void;
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
  onToggleSandbox: () => void;
  onToggleCodex: () => void;
  /** Units currently selected (their helmets are highlighted). */
  selectedUnitIds?: readonly number[];
  /** Rounds a soldier carries when full, for the ammunition bars. */
  ammoFull?: number;
  /** add-deployment-phase 3.1: the deployment phase's controls and its latest refusal. */
  onStartBattle?: () => void;
  onResetDeployment?: () => void;
  deploymentRefusal?: DeploymentRefusal | null;
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
  sandboxOpen,
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
  onToggleSandbox,
  onToggleCodex,
  selectedUnitIds = [],
  ammoFull = 20,
  onStartBattle,
  onResetDeployment,
  deploymentRefusal = null,
}: HudProps) {
  const [layout, setLayout] = useState<WindowLayout>(() => loadLayout(layoutStorage()));
  const updateWindow = (id: WindowId) => (next: WindowState) =>
    setLayout((previous) => {
      const updated = { ...previous, [id]: next };
      saveLayout(layoutStorage(), updated);
      return updated;
    });
  // The summary is placed before the first frame fills it; grown, it can end
  // up over the Troops title bar (a layout saved like that too). Once there is
  // a frame, put it back above Troops if it covers that bar.
  const summaryChecked = useRef(false);
  useEffect(() => {
    if (summaryChecked.current || frame === null || !layout.summary || !layout.troops) return;
    const check = requestAnimationFrame(() => {
      summaryChecked.current = true;
      const summary = rectOf('[data-window="summary"]');
      const troopsTitle = rectOf('[data-testid="window-troops-title"]');
      if (!summary || !troopsTitle || !layout.summary || layout.summary.minimized) return;
      if (coversTitle(summary, troopsTitle)) {
        const view = { w: window.innerWidth, h: window.innerHeight };
        updateWindow('summary')({
          ...layout.summary,
          ...defaultPosition('summary', { w: summary.w, h: summary.h }, view, troopsSize()),
        });
      }
    });
    return () => cancelAnimationFrame(check);
  });
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const resizableLabels = {
    resize: t('hud.windowResize'),
    vertical: t('hud.windowVertical'),
    horizontal: t('hud.windowHorizontal'),
  };
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
        sandboxOpen={sandboxOpen}
        deploying={deploying}
        objectives={frame?.objectives ?? []}
        {...(frame?.clock ? { clock: frame.clock } : {})}
        onLocaleChange={onLocaleChange}
        onCameraBand={onCameraBand}
        onSetSpeed={onSetSpeed}
        onTogglePause={onTogglePause}
        onTogglePost={onTogglePost}
        onToggleRoutes={onToggleRoutes}
        onToggleSandbox={onToggleSandbox}
        onToggleCodex={onToggleCodex}
      />

      {deploying && onStartBattle && onResetDeployment ? (
        <DeploymentBanner t={t} refusal={deploymentRefusal} onStartBattle={onStartBattle} onReset={onResetDeployment} />
      ) : null}

      <div className="hud-windows" data-testid="squad-status">
        <FloatingWindow
          id="troops"
          title={t('hud.windowTroops')}
          state={layout.troops}
          place={(size, view) => defaultPosition('troops', size, view)}
          onChange={updateWindow('troops')}
          minimizeLabel={t('hud.windowMinimize')}
          restoreLabel={t('hud.windowRestore')}
          moveLabel={t('hud.windowMove')}
          resizable={resizableLabels}
        >
          <SquadCards
            t={t}
            frame={frame}
            selectedSquadId={selectedSquadId}
            controlBothSides={controlBothSides}
            battleMode={battleMode}
            onSelectSquad={onSelectSquad}
          />
        </FloatingWindow>

        <FloatingWindow
          id="summary"
          title={t('hud.windowSummary')}
          state={layout.summary}
          place={(size, view) => defaultPosition('summary', size, view, troopsSize())}
          onChange={updateWindow('summary')}
          minimizeLabel={t('hud.windowMinimize')}
          restoreLabel={t('hud.windowRestore')}
          moveLabel={t('hud.windowMove')}
        >
          <TroopSummary
            t={t}
            squadUnits={squadUnits}
            selectedIds={new Set(selectedUnitIds)}
            ammoFull={ammoFull}
            covers={frame?.covers ?? []}
          />
          <WeaponCard
            t={t}
            frame={frame}
            squadUnits={squadUnits}
            aliveUnits={aliveUnits}
          />
        </FloatingWindow>

        <FloatingWindow
          id="orders"
          title={t('hud.windowOrders')}
          state={layout.orders}
          place={(size, view) => defaultPosition('orders', size, view, troopsSize())}
          onChange={updateWindow('orders')}
          minimizeLabel={t('hud.windowMinimize')}
          restoreLabel={t('hud.windowRestore')}
          moveLabel={t('hud.windowMove')}
          resizable={{ ...resizableLabels, columnEdge: 'right' }}
        >
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
            onActivateOrder={onActivateOrder}
            onPosture={onPosture}
            onFireControl={onFireControl}
            onStance={onStance}
            hurry={hurry}
            onHurry={onHurry}
            onFormation={onFormation}
            t={t}
          />
          <CommandRow
            t={t}
            selectedCount={selectedCount}
            aliveCount={aliveUnits.length}
            currentOrder={currentOrder}
            stance={stance}
            concealedCount={concealedCount}
            revealedCount={revealedCount}
            ferryAboard={aboardCount}
            ferryWaiting={waitingCount}
            pendingOrder={pendingOrder}
            pendingTactical={pendingTactical}
            aimPending={aimPending}
            onCancelOrder={onCancelOrder}
          />
        </FloatingWindow>
      </div>
    </>
  );
}
