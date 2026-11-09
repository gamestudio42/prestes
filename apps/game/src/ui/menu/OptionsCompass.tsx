import { useState } from 'react';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import { loadGraphicsSettings, saveGraphicsSettings } from '../../storage';
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
      <div className="desk-options-body">
        <img
          className="desk-options-art"
          src={DESK_ART.compassOpen.src}
          width={DESK_ART.compassOpen.width}
          height={DESK_ART.compassOpen.height}
          alt=""
          draggable={false}
        />
        <div className="desk-options-controls">
          <ul className="desk-book-list">
            <li>
              <button
                type="button"
                className="desk-entry"
                onClick={onToggleAudio}
                aria-pressed={!audioMuted}
                data-testid="start-audio"
                data-no-autoplay
              >
                {audioMuted ? (
                  <SoundOff aria-hidden="true" size={16} />
                ) : (
                  <SoundOn aria-hidden="true" size={16} />
                )}
                {audioMuted ? t('start.audioOff') : t('start.audioOn')}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="desk-entry"
                onClick={toggleSmoothEdges}
                aria-pressed={smoothEdges}
                aria-describedby="smooth-edges-note"
                data-testid="smooth-edges"
              >
                <PostEffect aria-hidden="true" size={16} />
                {smoothEdges ? t('options.smoothEdges.on') : t('options.smoothEdges.off')}
              </button>
              <p id="smooth-edges-note" className="desk-options-note">
                {t('options.smoothEdges.note')}
              </p>
            </li>
            <li>
              <label className="desk-entry desk-language">
                <Languages aria-hidden="true" size={16} />
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
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
