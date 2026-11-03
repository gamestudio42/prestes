import { translate, type Locale, type MessageKey, type OrderActivation } from '@prestes/content';
import type { CameraBand } from '@prestes/view3d';
import type {
  FormationKind,
  Frame,
  Posture,
  Stance,
  TacticalOrder,
} from '@prestes/shared';
import { CommandRow } from './hud/CommandRow';
import { OrderBoard } from './hud/OrderBoard';
import { SquadCards } from './hud/SquadCards';
import { TopBar } from './hud/TopBar';
import { WeaponCard } from './hud/WeaponCard';

export type OrderMode = 'move' | 'attack' | 'suppress' | 'flank';

export interface HudProps {
  locale: Locale;
  frame: Frame | null;
  band: CameraBand;
  postStrong: boolean;
  selectedSquadId: number;
  controlBothSides: boolean;
  selectedCount: number;
  speed: 0 | 1 | 2 | 4;
  pendingOrder: OrderMode | null;
  pendingTactical: TacticalOrder | null;
  aimPending: boolean;
  posture: Posture;
  holdFire: boolean;
  boundingEnabled: boolean;
  battleMode: boolean;
  sandboxOpen: boolean;
  onCancelOrder: () => void;
  onClearOrder: () => void;
  onLocaleChange: (locale: Locale) => void;

  onActivateOrder: (order: string, activation: OrderActivation) => void;
  onPosture: (posture: Posture) => void;
  onHoldFire: () => void;
  onToggleBounding: () => void;
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
  onToggleSandbox: () => void;
  onToggleCodex: () => void;
  audioMuted: boolean;
  audioVolume: number;
  onToggleAudio: () => void;
  onAudioVolume: (volume: number) => void;
}

export function Hud({
  locale,
  frame,
  band,
  postStrong,
  selectedSquadId,
  controlBothSides,
  selectedCount,
  speed,
  pendingOrder,
  pendingTactical,
  aimPending,
  posture,
  holdFire,
  boundingEnabled,
  battleMode,
  sandboxOpen,
  onCancelOrder,
  onClearOrder,
  onLocaleChange,
  onActivateOrder,
  onPosture,
  onHoldFire,
  onToggleBounding,
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
  onToggleSandbox,
  onToggleCodex,
  audioMuted,
  audioVolume,
  onToggleAudio,
  onAudioVolume,
}: HudProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const squadUnits = frame?.units.filter((unit) => unit.squadId === selectedSquadId) ?? [];
  const aliveUnits = squadUnits.filter((unit) => unit.alive && !unit.routed);
  const stance = aliveUnits[0]?.stance ?? squadUnits[0]?.stance ?? 'standing';
  const formation = aliveUnits[0]?.formation ?? 'line';
  const currentOrder = aliveUnits.find((unit) => unit.order !== null)?.order ?? null;
  const canClear =
    pendingOrder !== null ||
    pendingTactical !== null ||
    aimPending ||
    (currentOrder !== null && currentOrder !== 'hold');

  return (
    <>
      <TopBar
        t={t}
        locale={locale}
        band={band}
        postStrong={postStrong}
        speed={speed}
        sandboxOpen={sandboxOpen}
        onLocaleChange={onLocaleChange}
        onCameraBand={onCameraBand}
        onSetSpeed={onSetSpeed}
        onTogglePause={onTogglePause}
        onTogglePost={onTogglePost}
        onToggleSandbox={onToggleSandbox}
        onToggleCodex={onToggleCodex}
      />

      <section
        className={`orders-panel ${ordersCollapsed ? 'collapsed' : ''}`}
        data-testid="squad-status"
      >
        <div className="hud-deck">
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

          <OrderBoard
            currentOrder={currentOrder}
            pendingOrder={pendingOrder}
            pendingTactical={pendingTactical}
            aimPending={aimPending}
            posture={posture}
            holdFire={holdFire}
            boundingEnabled={boundingEnabled}
            stance={stance}
            formation={formation}
            selectedCount={selectedCount}
            canClear={canClear}
            onClear={onClearOrder}
            onActivateOrder={onActivateOrder}
            onPosture={onPosture}
            onHoldFire={onHoldFire}
            onToggleBounding={onToggleBounding}
            onStance={onStance}
            onFormation={onFormation}
            t={t}
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
        </div>

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
      </section>
    </>
  );
}
