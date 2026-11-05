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
import { useState } from 'react';
import { FloatingWindow } from './FloatingWindow';
import { CommandRow } from './hud/CommandRow';
import { OrderBoard } from './hud/OrderBoard';
import { SquadCards } from './hud/SquadCards';
import { TopBar } from './hud/TopBar';
import { TroopSummary } from './hud/TroopSummary';
import { WeaponCard } from './hud/WeaponCard';
import {
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
  speed: 0 | 1 | 2 | 4;
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
  ordersCollapsed: boolean;
  previewEnabled: boolean;
  onToggleOrders: () => void;
  onTogglePreview: () => void;
  onHideHud: () => void;
  onCameraBand: (band: CameraBand) => void;
  onFormation: (formation: FormationKind) => void;
  onStance: (stance: Stance) => void;
  onSetSpeed: (speed: 0 | 1 | 2 | 4) => void;
  onTogglePause: () => void;
  onTogglePost: () => void;
  onToggleRoutes: () => void;
  onToggleSandbox: () => void;
  onToggleCodex: () => void;
  audioMuted: boolean;
  audioVolume: number;
  onToggleAudio: () => void;
  onAudioVolume: (volume: number) => void;
  /** Units currently selected (their helmets are highlighted). */
  selectedUnitIds?: readonly number[];
  /** Rounds a soldier carries when full, for the ammunition bars. */
  ammoFull?: number;
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
  ordersCollapsed,
  previewEnabled,
  onToggleOrders,
  onTogglePreview,
  onHideHud,
  onCameraBand,
  onFormation,
  onStance,
  onSetSpeed,
  onTogglePause,
  onTogglePost,
  onToggleRoutes,
  onToggleSandbox,
  onToggleCodex,
  audioMuted,
  audioVolume,
  onToggleAudio,
  onAudioVolume,
  selectedUnitIds = [],
  ammoFull = 20,
}: HudProps) {
  const [layout, setLayout] = useState<WindowLayout>(() => loadLayout(layoutStorage()));
  const updateWindow = (id: WindowId) => (next: WindowState) =>
    setLayout((previous) => {
      const updated = { ...previous, [id]: next };
      saveLayout(layoutStorage(), updated);
      return updated;
    });
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const squadUnits = frame?.units.filter((unit) => unit.squadId === selectedSquadId) ?? [];
  const aliveUnits = squadUnits.filter((unit) => unit.alive && !unit.routed);
  const stance = aliveUnits[0]?.stance ?? squadUnits[0]?.stance ?? 'standing';
  const formation = aliveUnits[0]?.formation ?? 'line';
  const currentOrder = aliveUnits.find((unit) => unit.order !== null)?.order ?? null;

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
        onLocaleChange={onLocaleChange}
        onCameraBand={onCameraBand}
        onSetSpeed={onSetSpeed}
        onTogglePause={onTogglePause}
        onTogglePost={onTogglePost}
        onToggleRoutes={onToggleRoutes}
        onToggleSandbox={onToggleSandbox}
        onToggleCodex={onToggleCodex}
      />

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
        >
          <SquadCards
            t={t}
            frame={frame}
            selectedSquadId={selectedSquadId}
            controlBothSides={controlBothSides}
            battleMode={battleMode}
            previewEnabled={previewEnabled}
            onSelectSquad={onSelectSquad}
            onTogglePreview={onTogglePreview}
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
          />
          <WeaponCard
            t={t}
            frame={frame}
            squadUnits={squadUnits}
            aliveUnits={aliveUnits}
            audioMuted={audioMuted}
            audioVolume={audioVolume}
            onHideHud={onHideHud}
            onToggleAudio={onToggleAudio}
            onAudioVolume={onAudioVolume}
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
          className={ordersCollapsed ? 'orders-collapsed' : ''}
        >
          {!ordersCollapsed ? (
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
              onFormation={onFormation}
              t={t}
            />
          ) : null}
          <CommandRow
            t={t}
            selectedCount={selectedCount}
            aliveCount={aliveUnits.length}
            currentOrder={currentOrder}
            stance={stance}
            pendingOrder={pendingOrder}
            pendingTactical={pendingTactical}
            aimPending={aimPending}
            ordersCollapsed={ordersCollapsed}
            onToggleOrders={onToggleOrders}
            onCancelOrder={onCancelOrder}
          />
        </FloatingWindow>
      </div>
    </>
  );
}
