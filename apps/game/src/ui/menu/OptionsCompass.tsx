import { useState } from 'react';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { loadGraphicsSettings, saveGraphicsSettings } from '../../storage';
import { AudioChannels } from '../AudioChannels';
import { Languages, PostEffect, SoundOff, SoundOn } from '../icons';
import { DESK_ART, deskArtData, deskArtStyle } from './deskArt';

export interface OptionsCompassProps {
  locale: Locale;
  open: boolean;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  onToggleAudio: () => void;
}

/**
 * The options compass: the closed brass case is a desk icon with its name
 * below. Opening it lays out a centered field-manual screen with the compass
 * and the sound and language controls. The sound toggle keeps its no-autoplay
 * behavior.
 */
export function OptionsCompass({
  locale,
  open,
  audioMuted,
  onLocaleChange,
  onToggleAudio,
}: OptionsCompassProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  // refine-map-editor D4: smooth edges, applied when the next battle view is made.
  const [smoothEdges, setSmoothEdges] = useState(() => loadGraphicsSettings().smoothEdges);
  const toggleSmoothEdges = (): void => {
    const next = !smoothEdges;
    setSmoothEdges(next);
    saveGraphicsSettings({ smoothEdges: next });
  };

  if (!open) {
    return (
      <div
        className="desk-compass-cover desk-art-box"
        style={deskArtStyle(DESK_ART.compassClosed)}
        {...deskArtData(DESK_ART.compassClosed)}
      >
        <img
          className="desk-object-art desk-object-art-closed"
          src={DESK_ART.compassClosed.src}
          width={DESK_ART.compassClosed.width}
          height={DESK_ART.compassClosed.height}
          alt=""
          draggable={false}
        />
        <span className="desk-object-label">{t('menu.mark.options')}</span>
      </div>
    );
  }

  return (
    <div className="desk-options-screen">
      <header className="desk-options-header">
        <p className="desk-book-eyebrow">{t('app.subtitle')}</p>
        <h2 className="desk-book-heading">{t('menu.options.heading')}</h2>
      </header>
      <div className="desk-options-list">
        <button
          type="button"
          className="desk-options-row"
          onClick={onToggleAudio}
          aria-pressed={!audioMuted}
          data-testid="start-audio"
          data-no-autoplay
        >
          <span className="desk-options-icon">
            {audioMuted ? <SoundOff aria-hidden="true" size={18} /> : <SoundOn aria-hidden="true" size={18} />}
          </span>
          <span>{audioMuted ? t('start.audioOff') : t('start.audioOn')}</span>
        </button>
        {/* ambient-sound-and-voices 2.1: the three channel volumes. */}
        <AudioChannels t={t} className="desk-audio-channels" rowClassName="desk-options-row desk-audio-row" />
        <button
          type="button"
          className="desk-options-row"
          onClick={toggleSmoothEdges}
          aria-pressed={smoothEdges}
          aria-describedby="smooth-edges-note"
          data-testid="smooth-edges"
        >
          <span className="desk-options-icon">
            <PostEffect aria-hidden="true" size={18} />
          </span>
          <span>{smoothEdges ? t('options.smoothEdges.on') : t('options.smoothEdges.off')}</span>
        </button>
        <p id="smooth-edges-note" className="desk-options-note">
          {t('options.smoothEdges.note')}
        </p>
        <label className="desk-options-row desk-language">
          <span className="desk-options-icon">
            <Languages aria-hidden="true" size={18} />
          </span>
          <span>{t('start.language')}</span>
          <select
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value as Locale)}
            data-testid="language-select"
          >
            <option value="en">{t('language.en')}</option>
            <option value="pt-BR">{t('language.ptBR')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
