import type { MessageKey } from '@prestes/content';
import { ARMIES, type Frame } from '@prestes/shared';
import { bar, type Translate } from './orderMeta';
import { positionName } from './positionName';
import { sectionThumbnail } from '../sectionThumbnail';
import type { CommanderView } from './commander';
import '../../styles/troop-thumbs.css';

interface SquadCardsProps {
  t: Translate;
  frame: Frame | null;
  selectedSquadId: number;
  controlBothSides: boolean;
  battleMode: boolean;
  onSelectSquad: (squadId: number) => void;
  /** refine-battle-controls: a double-click selects and centres the section. */
  onCenterSquad: (squadId: number) => void;
  /** add-historical-commander 3.1: the map's field commander, named on his section's card. */
  commander?: CommanderView | null;
}

export function SquadCards({
  t,
  frame,
  selectedSquadId,
  controlBothSides,
  battleMode,
  onSelectSquad,
  onCenterSquad,
  commander = null,
}: SquadCardsProps) {
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
    <div className="squad-cluster">
      <div className="squad-stack">
        {squadIds.map((squadId) => {
          const units = frame?.units.filter((unit) => unit.squadId === squadId) ?? [];
          // A rostered troop is named by its section type ("Comando", "Esquadra de 5").
          const sectionType = units.find((unit) => unit.sectionType !== undefined)?.sectionType;
          const nameKey: MessageKey = sectionType
            ? (`section.${sectionType}.name` as MessageKey)
            : (sectionNames[squadId] ?? 'hud.squad2');
          // faction-armies 4.4: the army the section belongs to, next to its name.
          const army = units.find((unit) => unit.army !== undefined)?.army;
          const leadsSection = commander !== null && units.some((unit) => unit.figure);
          const alive = units.filter((unit) => unit.alive && !unit.routed);
          const hp = alive.reduce((sum, unit) => sum + unit.hp, 0);
          const rounds = alive.reduce((sum, unit) => sum + unit.magazine + unit.reserve, 0);
          const averageMorale =
            alive.length === 0
              ? 0
              : Math.round(alive.reduce((sum, unit) => sum + unit.morale, 0) / alive.length);
          // garrison-and-assault 4.4: the position most of the section's men are inside.
          const inside = new Map<number, number>();
          for (const unit of alive) if (unit.garrison !== undefined) inside.set(unit.garrison, (inside.get(unit.garrison) ?? 0) + 1);
          const insideId = [...inside].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0];
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
                onDoubleClick={() => {
                  onSelectSquad(squadId);
                  onCenterSquad(squadId);
                }}
                data-testid={`squad-${squadId}`}
              >
                {/* troop-thumbnails-and-panel 3.5: the section type's picture in place of the placeholder. */}
                <img
                  className="section-portrait section-thumb"
                  src={sectionThumbnail(sectionType ?? (units[0]?.faction === 'legalist' ? 'infantaria-exercito' : 'fuzileiros'))}
                  alt=""
                  width={50}
                  height={50}
                  data-testid={`section-thumb-${squadId}`}
                />
                <span className="section-copy">
                  <strong data-testid={`squad-name-${squadId}`}>{t(nameKey)}</strong>
                  {leadsSection ? (
                    <small className="section-commander" data-testid={`squad-commander-${squadId}`} title={t(commander.roleKey)}>
                      {commander.name}
                    </small>
                  ) : null}
                  {army ? (
                    <small className="section-army" data-testid={`squad-army-${squadId}`}>
                      {t(ARMIES[army].nameKey as MessageKey)}
                    </small>
                  ) : null}
                  <span>
                    {t('hud.alive')}: {alive.length}
                  </span>
                  {insideId !== undefined && frame ? (
                    <span className="section-inside" data-testid={`squad-inside-${squadId}`}>
                      {t('hud.inside', { place: positionName(t, insideId, frame.covers) })}
                    </span>
                  ) : null}
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
    </div>
  );
}
