import { Soldier as User } from '../icons';
import type { MessageKey } from '@prestes/content';
import type { Frame } from '@prestes/shared';
import { IconButton } from './IconButton';
import { ICONS, bar, type Translate } from './orderMeta';

interface SquadCardsProps {
  t: Translate;
  frame: Frame | null;
  selectedSquadId: number;
  controlBothSides: boolean;
  battleMode: boolean;
  previewEnabled: boolean;
  onSelectSquad: (squadId: number) => void;
  onTogglePreview: () => void;
}

export function SquadCards({
  t,
  frame,
  selectedSquadId,
  controlBothSides,
  battleMode,
  previewEnabled,
  onSelectSquad,
  onTogglePreview,
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
                  <strong data-testid={`squad-name-${squadId}`}>{t(nameKey)}</strong>
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
          <ICONS.preview aria-hidden="true" size={17} />
        </IconButton>
      </div>
    </div>
  );
}
