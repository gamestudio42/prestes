import type { MessageKey } from '@prestes/content';
import type { UnitSnapshot } from '@prestes/shared';
import { Helmet } from '../icons';
import type { Translate } from './orderMeta';

interface TroopSummaryProps {
  t: Translate;
  squadUnits: readonly UnitSnapshot[];
  selectedIds: ReadonlySet<number>;
  /** Rounds a soldier of this troop carries when full (magazine plus reserve). */
  ammoFull: number;
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
export function TroopSummary({ t, squadUnits, selectedIds, ammoFull }: TroopSummaryProps) {
  const soldiers = [...squadUnits].filter((unit) => !unit.dummy).sort((left, right) => left.id - right.id);
  return (
    <ul className="troop-helmets" data-testid="troop-helmets" aria-label={t('hud.windowSummary')}>
      {soldiers.map((unit) => {
        const tone = toneOf(unit, selectedIds.has(unit.id));
        const rounds = unit.magazine + unit.reserve;
        const tip = t('hud.soldierTip', {
          id: unit.id,
          state: t(`state.${unit.alive ? unit.state : 'routed'}` as MessageKey),
          fatigue: Math.round(unit.fatigue),
          rounds,
        });
        return (
          <li
            key={unit.id}
            className={`troop-helmet tone-${tone}`}
            data-testid={`helmet-${unit.id}`}
            data-tone={tone}
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
                <span style={{ height: pct(ammoFull > 0 ? rounds / ammoFull : 0) }} />
              </span>
            </span>
            <span className="visually-hidden">{tip}</span>
          </li>
        );
      })}
    </ul>
  );
}
