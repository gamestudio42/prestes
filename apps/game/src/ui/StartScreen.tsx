import { Book as BookOpen, Languages, Play, Restart as RotateCcw, SoundOn as Volume2, SoundOff as VolumeX } from './icons';
import { translate, type Locale, type MessageKey } from '@prestes/content';
import heroImage from '../assets/menu/coluna-prestes.webp';

export interface StartScreenProps {
  locale: Locale;
  /** Station to resume (1-based) when unfinished bootcamp progress exists. */
  resumeStation: number | null;
  totalStations: number;
  audioMuted: boolean;
  onLocaleChange: (locale: Locale) => void;
  onStart: () => void;
  onRestart: () => void;
  onToggleAudio: () => void;
  onToggleCodex: () => void;
}

export function StartScreen({
  locale,
  resumeStation,
  totalStations,
  audioMuted,
  onLocaleChange,
  onStart,
  onRestart,
  onToggleAudio,
  onToggleCodex,
}: StartScreenProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);

  return (
    <main className="start-screen" data-testid="start-screen">
      <div className="start-backdrop" aria-hidden="true">
        <img src={heroImage} alt="" />
      </div>
      <div className="start-scrim" aria-hidden="true" />
      <div className="start-grain" aria-hidden="true" />
      <div className="start-light" aria-hidden="true" />
      <section className="start-card">
        <p className="eyebrow">{t('app.subtitle')}</p>
        <h1>{t('app.title')}</h1>
        <div className="start-actions">
          {resumeStation === null ? (
            <button type="button" className="primary" onClick={onStart} data-testid="start-button">
              <Play aria-hidden="true" size={18} />
              {t('start.bootcamp')}
            </button>
          ) : (
            <>
              <button type="button" className="primary" onClick={onStart} data-testid="start-continue">
                <Play aria-hidden="true" size={18} />
                {t('start.continue', { station: resumeStation, total: totalStations })}
              </button>
              <button type="button" className="secondary" onClick={onRestart} data-testid="start-restart">
                <RotateCcw aria-hidden="true" size={16} />
                {t('start.restart')}
              </button>
            </>
          )}

          <label className="field">
            <span>
              <Languages aria-hidden="true" size={14} />
              {t('start.language')}
            </span>
            <select
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as Locale)}
              data-testid="language-select"
            >
              <option value="en">{t('language.en')}</option>
              <option value="pt-BR">{t('language.ptBR')}</option>
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            onClick={onToggleAudio}
            aria-pressed={!audioMuted}
            data-testid="start-audio"
          >
            {audioMuted ? (
              <VolumeX aria-hidden="true" size={16} />
            ) : (
              <Volume2 aria-hidden="true" size={16} />
            )}
            {audioMuted ? t('start.audioOff') : t('start.audioOn')}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onToggleCodex}
            data-testid="start-codex"
          >
            <BookOpen aria-hidden="true" size={16} />
            {t('start.codex')}
          </button>
        </div>
        <p className="footer-note">{t('start.footer')}</p>
      </section>
    </main>
  );
}

