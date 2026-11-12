import type { MessageKey } from '@prestes/content';
import type { Frame, UnitSnapshot } from '@prestes/shared';
import { Rifle as RifleIcon } from '../icons';
import { orderLetter, type Translate } from './orderMeta';
import { gunStateLabel, mainWeapon, weaponLines } from './weaponLines';

interface WeaponCardProps {
  t: Translate;
  frame: Frame | null;
  squadUnits: readonly UnitSnapshot[];
  aliveUnits: readonly UnitSnapshot[];
}

export function WeaponCard({
  t,
  frame,
  squadUnits,
  aliveUnits,
}: WeaponCardProps) {
  const wound = aliveUnits[0]?.wound ?? 'none';
  const lines = weaponLines(aliveUnits);
  const weapon = mainWeapon(lines);
  const squadId = squadUnits[0]?.squadId;
  const gunPool = squadId !== undefined ? frame?.gunPools?.[squadId] : undefined;
  // A mixed section, or a gun crew, lists each weapon with its rounds.
  const listed = lines.length > 1 || lines.some((line) => line.gunSet !== undefined);
  // machine-gun-fire-feedback 3.2: a gun crew whose gun has no fit man left to serve it.
  const noGunner = gunPool !== undefined && aliveUnits.length > 0 && !lines.some((line) => line.gunSet !== undefined);
  const fatigueValue =
    aliveUnits.length === 0
      ? 0
      : aliveUnits.reduce((sum, unit) => sum + unit.fatigue, 0) / aliveUnits.length;
  const rescuer = aliveUnits.find((unit) => unit.rescueTargetId !== null);
  const interrupted = frame?.events.find((event) => event.type === 'order_interrupted');
  const reconContacts = aliveUnits.find((unit) => unit.reconContacts > 0)?.reconContacts ?? 0;
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
          {listed ? null : (
            <span className="weapon-ammo">
              {magazine}/{reserve}
            </span>
          )}
        </div>
        {listed ? (
          <ul className="weapon-lines" data-testid="weapon-lines">
            {lines.map((line) => (
              <li key={line.weaponId} className="weapon-line" data-testid={`weapon-line-${line.weaponId}`}>
                <span className="weapon-line-name">
                  {t(`weapon.${line.weaponId}.short` as MessageKey)} ×{line.men}
                </span>
                {line.gunSet !== undefined
                  ? (() => {
                      const label = gunStateLabel(line);
                      return (
                        <span className={`weapon-gun-state ${label.tone}`} data-testid="gun-state" data-gun-state={label.tone}>
                          {t(label.key, { seconds: label.seconds })}
                        </span>
                      );
                    })()
                  : null}
                <span className="weapon-line-rounds">
                  {line.magazine}/{line.total}
                </span>
                {line.gunSet !== undefined && gunPool !== undefined ? (
                  <span className="weapon-line-pool" data-testid="gun-pool">
                    {t('hud.gunPool', { rounds: gunPool })}
                  </span>
                ) : null}
              </li>
            ))}
            {noGunner ? (
              <li className="weapon-line">
                <span className="weapon-gun-state none" data-testid="gun-state" data-gun-state="none">
                  {t('hud.gunNoGunner')}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
        <div className="status-details">
          {/* troop-thumbnails-and-panel 3.3: state, cover and cohesion are the panel's gauges now. */}
          <span>
            {t('hud.fatigue')}: {Math.round(fatigueValue)} · {t('hud.wound')}: {t(`wound.${wound}` as MessageKey)}
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
      </div>
    </div>
  );
}
