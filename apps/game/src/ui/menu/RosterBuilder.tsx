import type { KeyboardEvent } from 'react';
import {
  canAdd,
  defaultRoster,
  ROSTER_MAX_MEN,
  ROSTER_MAX_SECTIONS,
  SECTION_TYPE_IDS,
  SECTION_TYPES,
  validateRoster,
  WEAPONS,
  type ArmyId,
  type Roster,
  type SectionTypeId,
  type WeaponId,
  type WeaponKind,
} from '@prestes/shared';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { ChevronDown, ChevronUp, Close, Rifle, WeaponAutomatic, WeaponCarbine, WeaponMachineGun, WeaponPistol, type PixelIconComponent } from '../icons';
import '../../styles/troop-thumbs.css';
import { refusalMessage } from './setupState';
import { sectionThumbnail } from '../sectionThumbnail';

export interface RosterBuilderProps {
  locale: Locale;
  roster: Roster;
  /** faction-armies 4.3: the army the roster is built for; only its types are offered. */
  army: ArmyId;
  onChange: (roster: Roster) => void;
  /** Test id prefix: `roster` for the player's force, `enemy-roster` for a built enemy. */
  testPrefix: string;
  /** The column the builder sits in, for its accessible names. */
  label: string;
}

/** Each weapon a section carries, with how many, in catalog order. */
export function sectionWeapons(type: SectionTypeId): { weapon: WeaponId; count: number }[] {
  const counts = new Map<WeaponId, number>();
  for (const man of SECTION_TYPES[type].men) {
    counts.set(man.weapon, (counts.get(man.weapon) ?? 0) + 1);
    if (man.sidearm) counts.set(man.sidearm, (counts.get(man.sidearm) ?? 0) + 1);
  }
  return (Object.keys(WEAPONS) as WeaponId[]).filter((id) => counts.has(id)).map((weapon) => ({ weapon, count: counts.get(weapon)! }));
}

/** 2.1: the icon of a weapon by its kind. */
const WEAPON_ICONS: Readonly<Record<WeaponKind, PixelIconComponent>> = {
  'bolt-rifle': Rifle,
  'lever-rifle': WeaponCarbine,
  'automatic-rifle': WeaponAutomatic,
  'machine-gun': WeaponMachineGun,
  pistol: WeaponPistol,
};
export const weaponIcon = (weapon: WeaponId): PixelIconComponent => WEAPON_ICONS[WEAPONS[weapon].kind] ?? Rifle;

/** Arrow keys move between the entries of a list; Home and End jump to its ends. */
export function moveFocus(event: KeyboardEvent<HTMLElement>): void {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-nav]')];
  if (items.length === 0) return;
  const at = items.findIndex((item) => item === document.activeElement || item.contains(document.activeElement));
  const next =
    event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? Math.min(items.length - 1, at + 1) : Math.max(0, at - 1);
  event.preventDefault();
  items[next]?.focus();
}

/**
 * pre-battle-roster 5.5: the section types to add and the roster in order,
 * with its counters, the reason a type is refused, order and remove, and the
 * default roster. The enemy's "Montar" uses the same builder (5.6).
 */
export function RosterBuilder({ locale, roster, army, onChange, testPrefix, label }: RosterBuilderProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) => translate(locale, key, values);
  const check = validateRoster(roster, army);
  const types = SECTION_TYPE_IDS.filter((type) => SECTION_TYPES[type].army === army);
  const add = (type: SectionTypeId) => {
    if (canAdd(roster, type, army)) return;
    onChange({ sections: [...roster.sections, type] });
  };
  const remove = (index: number) => onChange({ sections: roster.sections.filter((_, at) => at !== index) });
  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= roster.sections.length) return;
    const sections = [...roster.sections];
    [sections[index], sections[to]] = [sections[to]!, sections[index]!];
    onChange({ sections });
  };

  return (
    <div className="roster-builder" data-testid={`${testPrefix}-builder`}>
      <ul className="roster-types" aria-label={t('setup.types', { side: label })} onKeyDown={moveFocus}>
        {types.map((type) => {
          const section = SECTION_TYPES[type];
          const refusal = canAdd(roster, type, army);
          const reason = refusal ? refusalMessage(refusal) : null;
          const name = t(section.nameKey as MessageKey);
          return (
            <li key={type}>
              <button
                type="button"
                className="roster-type"
                data-nav
                aria-disabled={refusal ? true : undefined}
                aria-describedby={`${testPrefix}-type-${type}-desc`}
                onClick={() => add(type)}
                data-testid={`${testPrefix}-add-${type}`}
              >
                <img className="section-thumb roster-type-thumb" src={sectionThumbnail(type)} alt="" width={48} height={48} data-testid={`${testPrefix}-thumb-${type}`} />
                <span className="roster-type-body">
                <span className="roster-type-head">
                  <span className="roster-type-name">{name}</span>
                  <span className="roster-type-men">{t('setup.men', { count: section.men.length })}</span>
                </span>
                <span className="roster-weapons">
                  {sectionWeapons(type).map(({ weapon, count }) => (
                    <span key={weapon} className="roster-weapon" data-weapon={WEAPONS[weapon].kind}>
                      {(() => {
                        const Icon = weaponIcon(weapon);
                        return <Icon aria-hidden="true" size={16} />;
                      })()}
                      {count} {t(WEAPONS[weapon].shortNameKey as MessageKey)}
                    </span>
                  ))}
                </span>
                <span className="roster-type-desc" id={`${testPrefix}-type-${type}-desc`}>
                  {reason ? (
                    <span className="roster-refusal" data-testid={`${testPrefix}-refusal-${type}`}>
                      {t(reason.key, reason.values)}
                    </span>
                  ) : (
                    t(section.descriptionKey as MessageKey)
                  )}
                </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="roster-list">
        <p className="roster-counters" data-testid={`${testPrefix}-counters`}>
          {t('setup.counters', { men: check.men, maxMen: ROSTER_MAX_MEN, sections: check.sections, maxSections: ROSTER_MAX_SECTIONS })}
        </p>
        {roster.sections.length === 0 ? (
          <p className="roster-empty">{t('setup.refuse.empty')}</p>
        ) : (
          <ol
            className="roster-rows"
            aria-label={t('setup.rosterRows', { side: label })}
            onKeyDown={(event) => {
              moveFocus(event);
              if (event.key !== 'Delete' && event.key !== 'Backspace') return;
              const row = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-row]');
              if (!row) return;
              event.preventDefault();
              remove(Number(row.dataset.row));
            }}
          >
            {roster.sections.map((type, index) => (
              <li key={`${type}-${index}`} className="roster-row" data-row={index} data-testid={`${testPrefix}-row-${index}`}>
                <img className="section-thumb roster-row-thumb" src={sectionThumbnail(type)} alt="" width={24} height={24} />
                <span className="roster-row-name" tabIndex={0} data-nav>
                  {index + 1}. {t(SECTION_TYPES[type].nameKey as MessageKey)}
                </span>
                <span className="roster-row-men">{SECTION_TYPES[type].men.length}</span>
                <button type="button" className="roster-row-action" aria-label={t('setup.moveUp')} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ChevronUp aria-hidden="true" size={16} />
                </button>
                <button
                  type="button"
                  className="roster-row-action"
                  aria-label={t('setup.moveDown')}
                  disabled={index === roster.sections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
                <button
                  type="button"
                  className="roster-row-action"
                  aria-label={t('setup.remove')}
                  onClick={() => remove(index)}
                  data-testid={`${testPrefix}-remove-${index}`}
                >
                  <Close aria-hidden="true" size={16} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <button
          type="button"
          className="secondary roster-default"
          onClick={() => onChange(defaultRoster(army))}
          data-testid={`${testPrefix}-default`}
        >
          {t('setup.defaultRoster')}
        </button>
      </div>
    </div>
  );
}
