import type { MessageKey } from '@prestes/content';
import { ARMIES, type CoverPoint, type UnitOrder, type UnitSnapshot } from '@prestes/shared';
import { sectionThumbnail } from '../sectionThumbnail';
import { SoldierFigure, type CoverClass, type HealthClass } from './SoldierFigure';
import { orderLetter, type Translate } from './orderMeta';
import { positionName } from './positionName';
import { figureLook, orderSoldiers, soldierPlaces, troopHeader } from './troopPanel';
import '../../styles/troop-thumbs.css';

interface TroopSummaryProps {
  t: Translate;
  squadUnits: readonly UnitSnapshot[];
  selectedIds: ReadonlySet<number>;
  /** Rounds a soldier of the default troop carries when full (magazine plus reserve). */
  ammoFull: number;
  /** The frame's covers, to name the positions garrisoned men are inside. */
  covers: readonly CoverPoint[];
  /** The section's current order, named in the header. */
  currentOrder: UnitOrder | null;
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

const HEALTH_KEY: Record<HealthClass, MessageKey> = {
  fit: 'health.fit',
  wounded: 'health.wounded',
  badly: 'health.badly',
  down: 'health.down',
  dead: 'health.dead',
};

/**
 * troop-thumbnails-and-panel 3.1-3.2 over redo-battle-hud's figures: a header
 * with the section's picture, name, army, order and its men fit, wounded and
 * down; then one figure per man, leader first (with his star) and casualties
 * last, the helmet by cover, the body by health and a five-round clip.
 */
export function TroopSummary({ t, squadUnits, selectedIds, ammoFull, covers, currentOrder }: TroopSummaryProps) {
  const soldiers = orderSoldiers(squadUnits);
  const places = soldierPlaces(squadUnits);
  const header = troopHeader(squadUnits, currentOrder);
  const orderKey = currentOrder === null ? 'hud.orderNone' : (`hud.order${orderLetter(currentOrder)}` as MessageKey);
  return (
    <>
      {soldiers.length > 0 ? (
        <div className="troop-header" data-testid="troop-header" data-sections={header.sections}>
          {header.sectionType ? (
            <img className="section-thumb troop-thumb" src={sectionThumbnail(header.sectionType)} alt="" width={48} height={48} data-testid="troop-thumb" />
          ) : null}
          <div className="troop-header-copy">
            <p className="troop-heading" data-testid="troop-heading">
              {header.sections > 1 ? (
                <strong data-testid="troop-section">{t('hud.sectionsSelected', { count: header.sections })}</strong>
              ) : header.sectionType ? (
                <strong data-testid="troop-section">{t(`section.${header.sectionType}.name` as MessageKey)}</strong>
              ) : null}
              {header.army ? <small data-testid="troop-army">{t(ARMIES[header.army].nameKey as MessageKey)}</small> : null}
            </p>
            <p className="troop-header-line">
              <span className="troop-order" data-testid="troop-order">
                {t(orderKey)}
              </span>
              <span className="troop-counts" data-testid="troop-counts" data-fit={header.fit} data-wounded={header.wounded} data-down={header.down}>
                {t('hud.troopCounts', { fit: header.fit, wounded: header.wounded, down: header.down })}
              </span>
            </p>
          </div>
        </div>
      ) : null}
      <ul className="troop-helmets" data-testid="troop-helmets" aria-label={t('hud.windowSummary')}>
        {soldiers.map((unit) => {
          const tone = toneOf(unit, selectedIds.has(unit.id));
          const look = figureLook(unit, ammoFull);
          const place = places.get(unit.id);
          // garrison-and-assault 4.4: a man inside a position is marked and his tip names it.
          const inside = unit.alive && unit.garrison !== undefined ? positionName(t, unit.garrison, covers) : null;
          const role = t(`role.${place?.role ?? 'rifleman'}` as MessageKey);
          const tipText = t('hud.figureTip', {
            role: place?.leader ? `${role}, ${t('hud.leader')}` : role,
            weapon: t(`weapon.${unit.weaponId}.short` as MessageKey),
            state: t(`state.${unit.alive ? unit.state : 'routed'}` as MessageKey),
            cover: t(COVER_KEY[look.cover]),
            health: t(HEALTH_KEY[look.health]),
            morale: Math.round(unit.morale),
            rounds: look.rawRounds,
          });
          const tip = inside ? `${tipText} · ${t('hud.inside', { place: inside })}` : tipText;
          return (
            <li
              key={unit.id}
              className={`troop-helmet tone-${tone}${inside ? ' inside' : ''}`}
              data-testid={`helmet-${unit.id}`}
              data-tone={tone}
              data-inside={inside ?? undefined}
              data-weapon={unit.weaponId}
              data-cover={look.cover}
              data-health={look.health}
              data-mark={look.mark ?? undefined}
              data-leader={place?.leader ? 'true' : undefined}
              data-role={place?.role}
              data-rounds={look.rounds}
              title={tip}
            >
              <SoldierFigure cover={look.cover} health={look.health} ammo={look.ammo} mark={look.mark} selected={tone === 'selected'} leader={place?.leader ?? false} />
              <span className="visually-hidden">{tip}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
