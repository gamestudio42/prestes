import type { ReactNode } from 'react';
import { CAMPAIGN_CHAPTERS, FIGURES, type MessageKey } from '@prestes/content';
import type { CommanderLoss, CommanderPresence, MapCommander, MapUse } from '@prestes/shared';

type T = (key: string, values?: Readonly<Record<string, string | number>>) => string;

/** add-historical-commander 4.1: the Commander section is offered for campaign maps only. */
export function offersCommander(use: MapUse): boolean {
  return use === 'campaign';
}

/** The figures the author can pick: the registry's playable ones. */
export function commanderChoices(): readonly { id: string; name: string; roleKey: MessageKey }[] {
  return FIGURES.filter((figure) => figure.playable).map((figure) => ({ id: figure.id, name: figure.displayName, roleKey: figure.roleKey }));
}

/** A new commander for a mission: its chapter's figure on the field, his loss a defeat. */
export function defaultCommander(mission: string | undefined): MapCommander {
  const chapter = CAMPAIGN_CHAPTERS.find((entry) => entry.id === mission);
  const figure = chapter?.commanderId ?? commanderChoices()[0]?.id ?? '';
  return { figure, presence: 'field', loss: 'defeat' };
}

const PRESENCES: readonly CommanderPresence[] = ['field', 'voice'];
const LOSSES: readonly CommanderLoss[] = ['defeat', 'continue'];

/**
 * The map's historical commander, in the map properties dialog: off by
 * default; the figure (playable figures), on the field or a voice, and what
 * losing him means. The map check reports a figure that is not the chapter's.
 */
export function CommanderField({ commander, mission, onChange, t }: { commander: MapCommander | undefined; mission: string | undefined; onChange: (commander: MapCommander | undefined) => void; t: T }): ReactNode {
  return (
    <fieldset className="editor-enemy" data-testid="map-commander">
      <legend>{t('editor.commander.title')}</legend>
      <label className="editor-row">
        <input type="checkbox" data-testid="map-commander-on" checked={commander !== undefined} onChange={(event) => onChange(event.target.checked ? defaultCommander(mission) : undefined)} />
        {t('editor.commander.on')}
      </label>
      <p className="editor-hint">{t('editor.commander.hint')}</p>
      {commander ? (
        <>
          <label>
            {t('editor.commander.figure')}
            <select data-testid="map-commander-figure" value={commander.figure} onChange={(event) => onChange({ ...commander, figure: event.target.value })}>
              {commanderChoices().map((figure) => (
                <option key={figure.id} value={figure.id}>{figure.name}</option>
              ))}
            </select>
          </label>
          <label>
            {t('editor.commander.presence')}
            <select data-testid="map-commander-presence" value={commander.presence} onChange={(event) => onChange({ ...commander, presence: event.target.value as CommanderPresence })}>
              {PRESENCES.map((presence) => (
                <option key={presence} value={presence}>{t(`editor.commander.presence.${presence}`)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('editor.commander.loss')}
            <select data-testid="map-commander-loss" value={commander.loss} onChange={(event) => onChange({ ...commander, loss: event.target.value as CommanderLoss })}>
              {LOSSES.map((loss) => (
                <option key={loss} value={loss}>{t(`editor.commander.loss.${loss}`)}</option>
              ))}
            </select>
          </label>
        </>
      ) : null}
    </fieldset>
  );
}
