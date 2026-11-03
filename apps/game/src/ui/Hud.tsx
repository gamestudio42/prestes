import { useState, type ReactNode } from 'react';
import {
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Code2,
  Compass,
  Contrast,
  Crosshair,
  Eye,
  EyeOff,
  Hand,
  Heart,
  Languages,
  Link2,
  Minus,
  MoreHorizontal,
  Move,
  Pause,
  PersonStanding,
  Play,
  Settings2,
  Shield,
  Split,
  Trash2,
  Undo2,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  ORDER_CATALOG,
  ORDER_CATEGORY_LABELS,
  translate,
  type Locale,
  type MessageKey,
  type OrderActivation,
  type OrderCategory,
} from '@prestes/content';
import type { CameraBand } from '@prestes/view3d';
import type {
  FormationKind,
  Frame,
  Outcome,
  Posture,
  Stance,
  TacticalOrder,
  UnitOrder,
} from '@prestes/shared';
import { RifleIcon } from './HudIcons';
import { Tooltip } from './Tooltip';

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
  outcome: Outcome;
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

interface IconButtonProps {
  testId: string;
  label: string;
  description: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

function IconButton({
  testId,
  label,
  description,
  children,
  onClick,
  active = false,
  disabled = false,
  className = '',
}: IconButtonProps) {
  return (
    <Tooltip title={label} description={description}>
      <button
        type="button"
        className={`icon-button ${active ? 'active' : ''} ${className}`.trim()}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active || undefined}
        data-testid={testId}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function bar(value: number, max: number): string {
  if (max <= 0) {
    return '0%';
  }
  return `${Math.max(0, Math.min(100, Math.round((value / max) * 100)))}%`;
}

function orderLetter(order: UnitOrder): string {
  switch (order) {
    case 'move':
      return 'Move';
    case 'attack':
      return 'Attack';
    case 'suppress':
      return 'Suppress';
    case 'flank':
      return 'Flank';
    case 'aim':
      return 'Face';
    case 'withdraw':
      return 'Withdraw';
    case 'hold':
      return 'Hold';
    case 'flee':
      return 'Flee';
    case 'advance':
      return 'Advance';
    case 'defend':
      return 'Defend';
    case 'ambush':
      return 'Ambush';
    case 'regroup':
      return 'Regroup';
    case 'pursue':
      return 'Pursue';
    case 'disperse':
      return 'Disperse';
    case 'protect-officer':
      return 'ProtectOfficer';
    case 'recon':
      return 'Recon';
    case 'reserve':
      return 'Reserve';
    case 'rescue':
      return 'Rescue';
  }
}

const ORDER_ICONS: Record<string, typeof Crosshair> = {
  attack: Crosshair,
  suppress: Shield,
  move: Move,
  withdraw: Undo2,
  hold: Hand,
  aim: Compass,
  flank: Users,
  rescue: Heart,
  recon: Eye,
  regroup: Users,
  disperse: Users,
  reserve: Box,
  ambush: Eye,
  pursue: Crosshair,
  advance: Move,
  defend: Shield,
};

const ACTIVATION_LABEL: Record<OrderActivation, MessageKey> = {
  target: 'hud.activationTarget',
  area: 'hud.activationArea',
  immediate: 'hud.activationImmediate',
  direction: 'hud.activationDirection',
};

const POSTURES: readonly Posture[] = [
  'balanced',
  'aggressive',
  'defensive',
  'protect-officer',
];

const POSTURE_ICONS: Record<Posture, typeof Shield> = {
  balanced: Shield,
  aggressive: Zap,
  defensive: Eye,
  'protect-officer': User,
};

const POSTURE_LABELS: Record<Posture, MessageKey> = {
  balanced: 'hud.postureBalanced',
  aggressive: 'hud.postureAggressive',
  defensive: 'hud.postureDefensive',
  'protect-officer': 'hud.postureProtectOfficer',
};

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
  t: (key: MessageKey, values?: Readonly<Record<string, string | number>>) => string;
}

const ORDER_SECTORS: readonly OrderCategory[] = ['fire', 'movement', 'troop'];

function OrderBoard({
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
export function Hud({
  locale,
  frame,
  band,
  postStrong,
  selectedSquadId,
  controlBothSides,
  selectedCount,
  speed,
  outcome,
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
  const [overflowOpen, setOverflowOpen] = useState(false);
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const bandKey =
    band === 'strategic' ? 'hud.strategic' : band === 'tactical' ? 'hud.tactical' : 'hud.transition';
  const postKey = postStrong ? 'hud.postStrong' : 'hud.postClean';
  const squadUnits = frame?.units.filter((unit) => unit.squadId === selectedSquadId) ?? [];
  const squadIds =
    frame === null
      ? [1]
      : [...new Set(
          frame.units
            .filter(
              (unit) =>
                !unit.dummy &&
                unit.squadId !== 99 &&
                (unit.faction === 'column' ||
                  (controlBothSides && unit.faction === 'legalist')),
            )
            .map((unit) => unit.squadId),
        )].sort((left, right) => left - right);
  const aliveUnits = squadUnits.filter((unit) => unit.alive && !unit.routed);
  const stance = aliveUnits[0]?.stance ?? squadUnits[0]?.stance ?? 'standing';
  const stanceKey =
    stance === 'crouched' ? 'hud.crouched' : stance === 'prone' ? 'hud.prone' : 'hud.standing';
  const formation = aliveUnits[0]?.formation ?? 'line';
  const wound = aliveUnits[0]?.wound ?? 'none';
  const weapon = aliveUnits[0];
  const coverValue =
    aliveUnits.length === 0
      ? 0
      : aliveUnits.reduce((sum, unit) => sum + unit.cover, 0) / aliveUnits.length;
  const cohesionValue =
    aliveUnits.length === 0
      ? 0
      : aliveUnits.reduce((sum, unit) => sum + unit.cohesion, 0) / aliveUnits.length;
  const fatigueValue =
    aliveUnits.length === 0
      ? 0
      : aliveUnits.reduce((sum, unit) => sum + unit.fatigue, 0) / aliveUnits.length;
  const suppressionValue =
    aliveUnits.length === 0
      ? 0
      : aliveUnits.reduce((sum, unit) => sum + unit.suppression, 0) / aliveUnits.length;
  const state =
    aliveUnits.find((unit) => unit.state === 'panicked')?.state ??
    aliveUnits.find((unit) => unit.state === 'pinned')?.state ??
    aliveUnits.find((unit) => unit.state === 'suppressed')?.state ??
    (aliveUnits.length === 0 && squadUnits.some((unit) => unit.routed) ? 'routed' : 'steady');
  const rescuer = aliveUnits.find((unit) => unit.rescueTargetId !== null);
  const interrupted = frame?.events.find((event) => event.type === 'order_interrupted');
  const reconContacts = aliveUnits.find((unit) => unit.reconContacts > 0)?.reconContacts ?? 0;
  const stateKey = `state.${state}` as MessageKey;
  const weaponKey = weapon ? (`weapon.${weapon.weaponId}.name` as MessageKey) : null;
  const magazine = aliveUnits.reduce((sum, unit) => sum + unit.magazine, 0);
  const reserve = aliveUnits.reduce((sum, unit) => sum + unit.reserve, 0);
  const outcomeKey =
    outcome === 'victory' ? 'hud.victory' : outcome === 'defeat' ? 'hud.defeat' : 'hud.playing';
  const currentOrder = aliveUnits.find((unit) => unit.order !== null)?.order ?? null;
  const advancingUnit = aliveUnits.find((unit) => unit.boundPhase === 'advance');
  const boundKey =
    advancingUnit?.boundTeam === 'a'
      ? 'hud.boundAadvance'
      : advancingUnit?.boundTeam === 'b'
        ? 'hud.boundBadvance'
        : null;
  const orderKey = currentOrder === null ? 'hud.orderNone' : (`hud.order${orderLetter(currentOrder)}` as MessageKey);
  const pendingKey = pendingOrder === null ? null : (`hud.pick${orderLetter(pendingOrder)}` as MessageKey);
  const canClear =
    pendingOrder !== null ||
    pendingTactical !== null ||
    aimPending ||
    (currentOrder !== null && currentOrder !== 'hold');
  const pendingLabel = aimPending
    ? t('hud.pickFace')
    : pendingKey
      ? t(pendingKey)
      : t('hud.tacticalHint');
  const sectionNames: Record<number, MessageKey> = battleMode
    ? {
        1: 'hud.squad1',
        2: 'hud.battleSquad2',
        3: 'hud.battleSquad3',
        11: 'hud.battleEnemy1',
        12: 'hud.battleEnemy2',
        13: 'hud.battleEnemy3',
      }
    : {
        1: 'hud.squad1',
        3: 'hud.squadLegalist',
      };

  return (
    <>
      <header className="hud-top" data-testid="hud">
        <div className="hud-rail brand-rail">
          <div className="hud-brand">
            {t('app.title')}
            <span className="hud-eyebrow">{t('hud.commandBar')}</span>
          </div>
        </div>

        <div className="hud-rail stat-rail">
          <span data-testid="tick-value">
            {t('hud.tick')}: {frame?.tick ?? 0}
          </span>
          <span data-testid="path-count">
            {t('hud.paths')}: {frame?.orders.length ?? 0}
          </span>
          <span data-testid="outcome">
            {t('hud.outcome')}: {t(outcomeKey)}
          </span>
        </div>

        <div className="hud-rail camera-rail">
          <span className="hud-band-value" data-testid="band-value">
            {t('hud.band')}: {t(bandKey)}
          </span>
          <Camera aria-hidden="true" size={15} className="camera-icon" />
          <div className="camera-segmented">
            <button
              type="button"
              className={band === 'tactical' ? 'active' : ''}
              onClick={() => onCameraBand('tactical')}
              aria-pressed={band === 'tactical'}
              data-testid="camera-tactical"
            >
              {t('hud.tactical')}
            </button>
            <button
              type="button"
              className={band === 'strategic' ? 'active' : ''}
              onClick={() => onCameraBand('strategic')}
              aria-pressed={band === 'strategic'}
              data-testid="camera-strategic"
            >
              {t('hud.strategic')}
            </button>
          </div>
        </div>

        <div className="hud-actions">
          <label className="language-control">
            <Languages aria-hidden="true" size={15} />
            <select
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as Locale)}
              title={t('hud.language')}
              data-testid="hud-language-select"
            >
              <option value="en">{t('language.en')}</option>
              <option value="pt-BR">{t('language.ptBR')}</option>
            </select>
          </label>
          <IconButton
            testId="sandbox-toggle"
            label={t('hud.sandbox')}
            description={t('hud.tip.sandbox')}
            onClick={onToggleSandbox}
            active={sandboxOpen}
            className="hud-icon"
          >
            <Box aria-hidden="true" size={15} />
          </IconButton>
          <IconButton
            testId="codex-toggle"
            label={t('hud.codex')}
            description={t('hud.tip.codex')}
            onClick={onToggleCodex}
            className="hud-icon"
          >
            <Code2 aria-hidden="true" size={15} />
          </IconButton>
          <div className="speed-control">
            <IconButton
              testId="pause-button"
              label={speed === 0 ? t('hud.resume') : t('hud.pause')}
              description={t('hud.tip.pause')}
              onClick={onTogglePause}
              className="hud-icon"
            >
              {speed === 0 ? (
                <Play aria-hidden="true" size={15} />
              ) : (
                <Pause aria-hidden="true" size={15} />
              )}
            </IconButton>
            {([1, 2, 4] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`speed-button ${speed === value ? 'active' : ''}`}
                onClick={() => onSetSpeed(value)}
                title={t('hud.tip.speed')}
                aria-label={value === 1 ? '0.5x' : value === 2 ? '1x' : '2x'}
                data-testid={`speed-${value}`}
              >
                {value === 1 ? '0.5x' : value === 2 ? '1x' : '2x'}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="post-button"
            onClick={onTogglePost}
            title={t('hud.tip.post')}
            data-testid="post-mode"
          >
            <Contrast aria-hidden="true" size={15} />
            <span>
              {t('hud.post')}: {t(postKey)}
            </span>
          </button>
        </div>
      </header>

      <section
        className={`orders-panel ${ordersCollapsed ? 'collapsed' : ''}`}
        data-testid="squad-status"
      >
        <div className="hud-deck">
          <div className="squad-cluster">
            <div className="squad-stack">
              {squadIds.map((squadId) => {
                const units = frame?.units.filter((unit) => unit.squadId === squadId) ?? [];
                const alive = units.filter((unit) => unit.alive && !unit.routed);
                const hp = alive.reduce((sum, unit) => sum + unit.hp, 0);
                const rounds = alive.reduce((sum, unit) => sum + unit.magazine + unit.reserve, 0);
                const averageMorale =
                  alive.length === 0
                    ? 0
                    : Math.round(alive.reduce((sum, unit) => sum + unit.morale, 0) / alive.length);
                return (
                  <div
                    className={`squad-card ${selectedSquadId === squadId ? 'selected' : ''}`}
                    key={squadId}
                  >
                    <button
                      type="button"
                      className="squad-select"
                      aria-pressed={selectedSquadId === squadId}
                      onClick={() => onSelectSquad(squadId)}
                      data-testid={`squad-${squadId}`}
                    >
                      <span
                        className="section-portrait"
                        title={t('hud.portraitPlaceholder')}
                        data-testid="portrait-placeholder"
                      >
                        <User aria-hidden="true" size={17} />
                      </span>
                      <span className="section-copy">
                        <strong>{t(sectionNames[squadId] ?? 'hud.squad2')}</strong>
                        <span>
                          {t('hud.alive')}: {alive.length}
                        </span>
                        <span className="mini-bar health">
                          <span style={{ width: bar(hp, alive.length * 100) }} />
                        </span>
                        <span className="mini-bar ammo">
                          <span style={{ width: bar(rounds, alive.length * 20) }} />
                        </span>
                        <span className="mini-bar morale">
                          <span style={{ width: `${averageMorale}%` }} />
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="squad-actions">
              <IconButton
                testId="preview-toggle"
                label={t('hud.preview')}
                description={t('hud.tip.preview')}
                onClick={onTogglePreview}
                active={previewEnabled}
              >
                {previewEnabled ? (
                  <Eye aria-hidden="true" size={17} />
                ) : (
                  <EyeOff aria-hidden="true" size={17} />
                )}
              </IconButton>
            </div>
          </div>

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

          <div className="weapon-cluster">
            <div className="weapon-card" data-testid="weapon-card">
              <div className="weapon-head">
                <RifleIcon size={22} />
                <strong data-testid="weapon-value">
                  {weaponKey ? t(weaponKey) : t('hud.noWeapon')}
                </strong>
                <span className="weapon-ammo">
                  {magazine}/{reserve}
                </span>
                <Tooltip title={t('hud.more')} description={t('hud.tip.more')}>
                  <button
                    type="button"
                    className="icon-button weapon-more"
                    aria-label={t('hud.more')}
                    aria-expanded={overflowOpen}
                    onClick={() => setOverflowOpen((value) => !value)}
                    data-testid="hud-more"
                  >
                    <MoreHorizontal aria-hidden="true" size={18} />
                  </button>
                </Tooltip>
              </div>
              <div className="status-row">
                <Tooltip title={t(stateKey)} description={t('hud.tip.morale')}>
                  <span className="status-chip">
                    <Heart aria-hidden="true" size={13} />
                    {t(stateKey)}
                  </span>
                </Tooltip>
                <Tooltip title={`${t('hud.cover')} ${Math.round(coverValue * 100)}%`} description={t('hud.tip.cover')}>
                  <span className="status-chip">
                    <Shield aria-hidden="true" size={13} />
                    {Math.round(coverValue * 100)}%
                  </span>
                </Tooltip>
                <Tooltip title={`${t('hud.cohesion')} ${Math.round(cohesionValue)}%`} description={t('hud.tip.cohesion')}>
                  <span className="status-chip">
                    <Link2 aria-hidden="true" size={13} />
                    {Math.round(cohesionValue)}%
                  </span>
                </Tooltip>
                <Tooltip title={`${t('hud.suppression')} ${Math.round(suppressionValue)}`} description={t('hud.tip.suppression')}>
                  <span className="status-chip">
                    <Zap aria-hidden="true" size={13} />
                    {Math.round(suppressionValue)}
                  </span>
                </Tooltip>
                <Tooltip title={t('hud.noEquipment')} description={t('hud.tip.equipment')}>
                  <span className="status-chip">
                    <Settings2 aria-hidden="true" size={13} />
                    {t('hud.noEquipment')}
                  </span>
                </Tooltip>
              </div>
              <div className="status-details">
                <span data-testid="morale-state">
                  {t('hud.state')}: {t(stateKey)} · {t('hud.cover')}: {Math.round(coverValue * 100)}%
                </span>
                <span>
                  {t('hud.cohesion')}: {Math.round(cohesionValue)}% · {t('hud.fatigue')}: {Math.round(fatigueValue)} ·{' '}
                  {t('hud.wound')}: {t(`wound.${wound}` as MessageKey)}
                </span>
                {reconContacts > 0 ? (
                  <span data-testid="recon-status">
                    {t('hud.reconContacts')}: {reconContacts}
                  </span>
                ) : null}
                {interrupted ? (
                  <span data-testid="interrupt-status">
                    {t('hud.interrupted')}: {t(`hud.order${orderLetter(interrupted.order)}` as MessageKey)}
                  </span>
                ) : null}
                {boundKey ? (
                  <span data-testid="bounding-status">{t(boundKey)}</span>
                ) : null}
                {rescuer ? (
                  <span data-testid="rescue-status">
                    {t('hud.rescue')}: #{rescuer.rescueTargetId} · {t(`soldierState.${rescuer.soldierState}` as MessageKey)} ·{' '}
                    {Math.round(rescuer.rescueProgress * 100)}%
                  </span>
                ) : null}
              </div>
              {overflowOpen ? (
                <div className="hud-overflow-menu">
                  <button type="button" onClick={onHideHud} data-testid="hide-hud">
                    <EyeOff aria-hidden="true" size={14} />
                    {t('hud.hideHud')}
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={!audioMuted}
                      onChange={onToggleAudio}
                      data-testid="audio-toggle"
                    />
                    {t('hud.audio')}
                  </label>
                  <label className="volume-control">
                    <span>{t('hud.audioVolume')}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioVolume}
                      onChange={(event) => onAudioVolume(Number(event.target.value))}
                      data-testid="audio-volume"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="command-row hud-status-row">
          <span className="hud-selection">
            {t('hud.selection')}: {selectedCount}/{aliveUnits.length}
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
      </section>
    </>
  );
}








































