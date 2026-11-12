import type { MessageKey } from '@prestes/content';
import { ARMIES, trainingLoad, type CoverPoint, type UnitSnapshot } from '@prestes/shared';
import { SoldierFigure, coverClassOf, healthClassOf, type CoverClass } from './SoldierFigure';
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

const COVER_KEY: Record<CoverClass, MessageKey> = {
  none: 'hud.coverNone',
  light: 'hud.coverLight',
  good: 'hud.coverGood',
  inside: 'hud.coverInside',
};

/**
 * One soldier figure per man of the troop (redo-battle-hud, the owner's
 * figure): helmet colour for his cover, body colour for his health and a
 * five-round clip for his ammunition; the fallen go last.
 */
export function TroopSummary({ t, squadUnits, selectedIds, ammoFull, covers }: TroopSummaryProps) {
  const soldiers = [...squadUnits]
    .filter((unit) => !unit.dummy)
    .sort((left, right) => Number(!left.alive) - Number(!right.alive) || left.id - right.id);
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
        const cover = coverClassOf(unit);
        const health = healthClassOf(unit);
        const mark = !unit.alive ? null : unit.routed || unit.state === 'routed' ? 'routed' : unit.state === 'pinned' ? 'pinned' : null;
        const ammo = full > 0 ? rounds / full : 0;
        const withCover = `${soldierTip} · ${t(COVER_KEY[cover])}`;
        const tip = inside ? `${withCover} · ${t('hud.inside', { place: inside })}` : withCover;
        return (
          <li
            key={unit.id}
            className={`troop-helmet tone-${tone}${inside ? ' inside' : ''}`}
            data-testid={`helmet-${unit.id}`}
            data-tone={tone}
            data-inside={inside ?? undefined}
            data-weapon={unit.weaponId}
            data-cover={cover}
            data-health={health}
            data-mark={mark ?? undefined}
            data-rounds={Math.round(Math.min(1, ammo) * 5)}
            title={tip}
          >
            <SoldierFigure cover={cover} health={health} ammo={ammo} mark={mark} selected={tone === 'selected'} />
            <span className="visually-hidden">{tip}</span>
          </li>
        );
      })}
    </ul>
    </>
  );
}
