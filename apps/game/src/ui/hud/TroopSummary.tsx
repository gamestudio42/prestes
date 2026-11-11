import type { MessageKey } from '@prestes/content';
import { ARMIES, trainingLoad, type CoverPoint, type UnitSnapshot } from '@prestes/shared';
import { Helmet } from '../icons';
import type { Translate } from './orderMeta';
import { positionName } from './positionName';

interface TroopSummaryProps {
  t: Translate;
  squadUnits: readonly UnitSnapshot[];
  selectedIds: ReadonlySet<number>;
  /** Rounds a soldier of the default troop carries when full (magazine plus reserve). */
  ammoFull: number;
  /** The frame's covers, to name the positions garrisoned men are inside. */
  covers: readonly CoverPoint[];
}

type HelmetTone = 'fit' | 'selected' | 'wounded' | 'down' | 'dead';

function toneOf(unit: UnitSnapshot, selected: boolean): HelmetTone {
  if (!unit.alive) return 'dead';
  if (unit.incapacitated || unit.routed) return 'down';
  if (unit.wound !== 'none' || unit.hp < 60) return 'wounded';
  return selected ? 'selected' : 'fit';
}

const pct = (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

/**
 * One helmet per soldier of the troop, each with three vertical bars: health,
 * morale and ammunition. The helmet's colour gives the soldier's condition.
 */
export function TroopSummary({ t, squadUnits, selectedIds, ammoFull, covers }: TroopSummaryProps) {
  const soldiers = [...squadUnits].filter((unit) => !unit.dummy).sort((left, right) => left.id - right.id);
  // faction-armies 4.4: the section's name and its army above the helmets.
  const sectionType = soldiers.find((unit) => unit.sectionType !== undefined)?.sectionType;
  const army = soldiers.find((unit) => unit.army !== undefined)?.army;
  return (
    <>
      {sectionType || army ? (
        <p className="troop-heading" data-testid="troop-heading">
          {sectionType ? <strong data-testid="troop-section">{t(`section.${sectionType}.name` as MessageKey)}</strong> : null}
          {army ? <small data-testid="troop-army">{t(ARMIES[army].nameKey as MessageKey)}</small> : null}
        </p>
      ) : null}
    <ul className="troop-helmets" data-testid="troop-helmets" aria-label={t('hud.windowSummary')}>
      {soldiers.map((unit) => {
        const tone = toneOf(unit, selectedIds.has(unit.id));
        const rounds = unit.magazine + unit.reserve;
        // A rostered man is full at his own weapon's load; the gun's belts are the crew's pool.
        const load = unit.sectionType !== undefined ? trainingLoad(unit.weaponId) : null;
        const full = load ? load.magazine + load.reserve : ammoFull;
        // garrison-and-assault 4.4: a man inside a position is marked and his tip names it.
        const inside = unit.alive && unit.garrison !== undefined ? positionName(t, unit.garrison, covers) : null;
        const soldierTip = t('hud.soldierTip', {
          id: unit.id,
          weapon: t(`weapon.${unit.weaponId}.short` as MessageKey),
          state: t(`state.${unit.alive ? unit.state : 'routed'}` as MessageKey),
          fatigue: Math.round(unit.fatigue),
          rounds,
        });
        const tip = inside ? `${soldierTip} · ${t('hud.inside', { place: inside })}` : soldierTip;
        return (
          <li
            key={unit.id}
            className={`troop-helmet tone-${tone}${inside ? ' inside' : ''}`}
            data-testid={`helmet-${unit.id}`}
            data-tone={tone}
            data-inside={inside ?? undefined}
            data-weapon={unit.weaponId}
            title={tip}
          >
            <Helmet size={16} />
            <span className="helmet-bars" aria-hidden="true">
              <span className="helmet-bar health" title={t('hud.health')}>
                <span style={{ height: pct(unit.alive ? unit.hp / 100 : 0) }} />
              </span>
              <span className="helmet-bar morale" title={t('hud.morale')}>
                <span style={{ height: pct(unit.alive ? unit.morale / 100 : 0) }} />
              </span>
              <span className="helmet-bar ammo" title={t('hud.ammo')}>
                <span style={{ height: pct(full > 0 ? rounds / full : 0) }} />
              </span>
            </span>
            <span className="visually-hidden">{tip}</span>
          </li>
        );
      })}
    </ul>
    </>
  );
}
