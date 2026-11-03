import { useState } from 'react';
import { EyeOff, Heart, Link2, MoreHorizontal, Settings2, Shield, Zap } from 'lucide-react';
import type { MessageKey } from '@prestes/content';
import type { Frame, UnitSnapshot } from '@prestes/shared';
import { RifleIcon } from '../HudIcons';
import { Tooltip } from '../Tooltip';
import { orderLetter, type Translate } from './orderMeta';

interface WeaponCardProps {
  t: Translate;
  frame: Frame | null;
  squadUnits: readonly UnitSnapshot[];
  aliveUnits: readonly UnitSnapshot[];
  audioMuted: boolean;
  audioVolume: number;
  onHideHud: () => void;
  onToggleAudio: () => void;
  onAudioVolume: (volume: number) => void;
}

export function WeaponCard({
  t,
  frame,
  squadUnits,
  aliveUnits,
  audioMuted,
  audioVolume,
  onHideHud,
  onToggleAudio,
  onAudioVolume,
}: WeaponCardProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
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
  const advancingUnit = aliveUnits.find((unit) => unit.boundPhase === 'advance');
  const boundKey =
    advancingUnit?.boundTeam === 'a'
      ? 'hud.boundAadvance'
      : advancingUnit?.boundTeam === 'b'
        ? 'hud.boundBadvance'
        : null;

  return (
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
  );
}
